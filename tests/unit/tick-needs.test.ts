/**
 * Tests del feed-forward de necesidades — Sprint 4.1.
 *
 * tickNeeds(npcs, ctx) aplica:
 *   - Decay de supervivencia (entropía pasiva).
 *   - Recovery de supervivencia si el NPC está sobre un tile con
 *     comida/agua disponible (sin inventario — modelo on-the-spot
 *     hasta Sprint 4.2).
 *   - Socialización: sube si hay otros NPCs cerca, baja si está
 *     solo.
 *   - Feed-forward: NPC con supervivencia < 30 drena socialización
 *     de otros NPCs cercanos.
 *
 * Puro. Clamp [0, 100].
 */

import { describe, it, expect } from 'vitest';
import { tickNeeds, NEED_TICK_RATES } from '@/lib/needs';
import { makeTestNPC } from '@/lib/npcs';
import { RESOURCE, TILE, type WorldMap } from '@/lib/world-state';

function mkWorld(w = 20, h = 20): WorldMap {
  return {
    seed: 0,
    width: w,
    height: h,
    tiles: new Array(w * h).fill(TILE.GRASS),
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
    influence: [],
  };
}

describe('Constantes', () => {
  it('tasas positivas y razonables (entre 1 y 10)', () => {
    expect(NEED_TICK_RATES.supervivenciaDecay).toBeGreaterThan(0);
    expect(NEED_TICK_RATES.supervivenciaDecay).toBeLessThan(10);
    expect(NEED_TICK_RATES.supervivenciaRecover).toBeGreaterThan(0);
    expect(NEED_TICK_RATES.socializacionAlone).toBeGreaterThan(0);
  });
});

describe('Decay pasivo de supervivencia', () => {
  it('NPC sin comida cerca → supervivencia -supervivenciaDecay', () => {
    const world = mkWorld();
    const npc = makeTestNPC({
      id: 'n',
      stats: { supervivencia: 80, socializacion: 60 },
    });
    const [after] = tickNeeds([npc], { world, npcs: [npc] });
    expect(after.stats.supervivencia).toBe(
      80 - NEED_TICK_RATES.supervivenciaDecay,
    );
  });

  it('supervivencia nunca baja de 0 (clamp)', () => {
    const world = mkWorld();
    const npc = makeTestNPC({
      id: 'n',
      stats: { supervivencia: 0, socializacion: 60 },
    });
    const [after] = tickNeeds([npc], { world, npcs: [npc] });
    expect(after.stats.supervivencia).toBe(0);
  });

  it('supervivencia a 0 mata al NPC', () => {
    const world = mkWorld();
    const npc = makeTestNPC({
      id: 'n',
      stats: { supervivencia: 1, socializacion: 60 },
    });
    const [after] = tickNeeds([npc], { world, npcs: [npc] });
    // Con decay 1 y supervivencia inicial 1 → 0, muere.
    if (NEED_TICK_RATES.supervivenciaDecay >= 1) {
      expect(after.alive).toBe(false);
    }
  });
});

describe('Recovery on-the-spot', () => {
  it('NPC sobre spawn de baya con sv baja → supervivencia sube (no baja)', () => {
    // Recovery on-tile solo activa cuando sv < SV_RECOVERY_CAP (70).
    // Con sv=60 y berry=4: 60+4=64.
    const world = mkWorld();
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 5,
      y: 5,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 5, y: 5 },
      stats: { supervivencia: 60, socializacion: 60 },
    });
    const [after] = tickNeeds([npc], { world, npcs: [npc] });
    expect(after.stats.supervivencia).toBe(64); // 60 + FOOD_NUTRITION.berry(4)
  });

  it('NPC sobre caza recupera más que sobre baya', () => {
    const berryWorld = mkWorld();
    berryWorld.resources.push({
      id: RESOURCE.BERRY,
      x: 5,
      y: 5,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const gameWorld = mkWorld();
    gameWorld.resources.push({
      id: RESOURCE.GAME,
      x: 5,
      y: 5,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 5, y: 5 },
      stats: { supervivencia: 40, socializacion: 60 },
    });

    const [berry] = tickNeeds([npc], { world: berryWorld, npcs: [npc] });
    const [game] = tickNeeds([npc], { world: gameWorld, npcs: [npc] });

    expect(game.stats.supervivencia).toBeGreaterThan(
      berry.stats.supervivencia,
    );
  });

  it('sv al máximo decae aunque esté sobre recurso (recovery solo activa < 70)', () => {
    // Con sv=100 ≥ SV_RECOVERY_CAP(70): no hay recovery on-tile.
    // El NPC está sobre agua pero sv=100 ≥ 55 (no come inventario) → decay.
    const world = mkWorld();
    world.resources.push({
      id: RESOURCE.WATER,
      x: 5,
      y: 5,
      quantity: 999,
      initialQuantity: 999,
      regime: 'continuous',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 5, y: 5 },
      stats: { supervivencia: 100, socializacion: 60 },
    });
    const [after] = tickNeeds([npc], { world, npcs: [npc] });
    // sv=100 → decay -1 = 99 (recovery no compensa porque sv >= 70)
    expect(after.stats.supervivencia).toBe(99);
  });
});

describe('Consumo de comida en inventario', () => {
  it('NPC con baya en inventario consume 1 y recupera supervivencia', () => {
    // sv=35 < supervivenciaEatFromInventory(55) → come baya del inventario.
    // FOOD_NUTRITION.berry = 4 → 35+4 = 39.
    const world = mkWorld();
    const npc = makeTestNPC({
      id: 'n',
      stats: { supervivencia: 35, socializacion: 60 },
      inventory: { wood: 0, stone: 0, berry: 2, game: 0, fish: 0, obsidian: 0, shell: 0 },
    });

    const [after] = tickNeeds([npc], { world, npcs: [npc] });

    expect(after.inventory.berry).toBe(1);
    expect(after.stats.supervivencia).toBe(39); // 35 + berry(4)
  });

  it('consume comida en orden berry → fish → game de forma determinista', () => {
    const world = mkWorld();
    const npc = makeTestNPC({
      id: 'n',
      stats: { supervivencia: 35, socializacion: 60 },
      inventory: { wood: 0, stone: 0, berry: 0, game: 1, fish: 1, obsidian: 0, shell: 0 },
    });

    const [after] = tickNeeds([npc], { world, npcs: [npc] });

    expect(after.inventory).toMatchObject({ berry: 0, game: 1, fish: 0, obsidian: 0, shell: 0 });
  });

  it('no come automáticamente si la supervivencia aún está holgada', () => {
    const world = mkWorld();
    const npc = makeTestNPC({
      id: 'n',
      stats: { supervivencia: 70, socializacion: 60 },
      inventory: { wood: 0, stone: 0, berry: 2, game: 0, fish: 0, obsidian: 0, shell: 0 },
    });

    const [after] = tickNeeds([npc], { world, npcs: [npc] });

    expect(after.inventory.berry).toBe(2);
    expect(after.stats.supervivencia).toBe(
      70 - NEED_TICK_RATES.supervivenciaDecay,
    );
  });

  it('game llena más que fish y fish más que berry', () => {
    const world = mkWorld();
    const berry = makeTestNPC({
      id: 'berry',
      stats: { supervivencia: 30, socializacion: 60 },
      inventory: { wood: 0, stone: 0, berry: 1, game: 0, fish: 0, obsidian: 0, shell: 0 },
    });
    const fish = makeTestNPC({
      id: 'fish',
      stats: { supervivencia: 30, socializacion: 60 },
      inventory: { wood: 0, stone: 0, berry: 0, game: 0, fish: 1, obsidian: 0, shell: 0 },
    });
    const game = makeTestNPC({
      id: 'game',
      stats: { supervivencia: 30, socializacion: 60 },
      inventory: { wood: 0, stone: 0, berry: 0, game: 1, fish: 0, obsidian: 0, shell: 0 },
    });

    const [afterBerry, afterFish, afterGame] = tickNeeds(
      [berry, fish, game],
      { world, npcs: [berry, fish, game] },
    );

    expect(afterFish.stats.supervivencia).toBeGreaterThan(
      afterBerry.stats.supervivencia,
    );
    expect(afterGame.stats.supervivencia).toBeGreaterThan(
      afterFish.stats.supervivencia,
    );
  });

  it('con fogata la comida cocinada llena más y sube socialización', () => {
    const world = mkWorld();
    const npc = makeTestNPC({
      id: 'n',
      stats: { supervivencia: 35, socializacion: 40 },
      inventory: { wood: 0, stone: 0, berry: 1, game: 0, fish: 0, obsidian: 0, shell: 0 },
    });

    const [raw] = tickNeeds([npc], { world, npcs: [npc] });
    const [cooked] = tickNeeds([npc], {
      world,
      npcs: [npc],
      firePosition: { x: 0, y: 0 },
    });

    expect(cooked.stats.supervivencia).toBeGreaterThan(
      raw.stats.supervivencia,
    );
    expect(cooked.stats.socializacion).toBeGreaterThan(raw.stats.socializacion);
  });

  it('un NPC hambriento recibe comida de un compañero cercano', () => {
    const world = mkWorld();
    const hungry = makeTestNPC({
      id: 'hungry',
      position: { x: 5, y: 5 },
      stats: { supervivencia: 35, socializacion: 40 },
    });
    const donor = makeTestNPC({
      id: 'donor',
      position: { x: 6, y: 5 },
      inventory: { wood: 0, stone: 0, berry: 1, game: 0, fish: 0, obsidian: 0, shell: 0 },
    });

    const [afterHungry, afterDonor] = tickNeeds([hungry, donor], {
      world,
      npcs: [hungry, donor],
    });

    expect(afterHungry.stats.supervivencia).toBeGreaterThan(35);
    expect(afterDonor.inventory.berry).toBe(0);
  });

  it('con fogata el reparto de comida es comunal aunque estén lejos', () => {
    const world = mkWorld();
    const hungry = makeTestNPC({
      id: 'hungry',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 35, socializacion: 40 },
    });
    const donor = makeTestNPC({
      id: 'donor',
      position: { x: 19, y: 19 },
      inventory: { wood: 0, stone: 0, berry: 1, game: 0, fish: 0, obsidian: 0, shell: 0 },
    });

    const [withoutFire] = tickNeeds([hungry, donor], {
      world,
      npcs: [hungry, donor],
    });
    const [withFire, donorAfterFire] = tickNeeds([hungry, donor], {
      world,
      npcs: [hungry, donor],
      firePosition: { x: 10, y: 10 },
    });

    expect(withoutFire.stats.supervivencia).toBeLessThan(35);
    expect(withFire.stats.supervivencia).toBeGreaterThan(35);
    expect(donorAfterFire.inventory.berry).toBe(0);
  });
});

describe('Socialización — radio del clan', () => {
  it('NPC aislado baja socialización', () => {
    const world = mkWorld();
    const npc = makeTestNPC({
      id: 'solo',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 80, socializacion: 60 },
    });
    const [after] = tickNeeds([npc], { world, npcs: [npc] });
    expect(after.stats.socializacion).toBeLessThan(60);
  });

  it('dos NPCs juntos suben socialización', () => {
    const world = mkWorld();
    const a = makeTestNPC({
      id: 'a',
      position: { x: 5, y: 5 },
      stats: { supervivencia: 80, socializacion: 60 },
    });
    const b = makeTestNPC({
      id: 'b',
      position: { x: 6, y: 5 },
      stats: { supervivencia: 80, socializacion: 60 },
    });
    const [afterA] = tickNeeds([a, b], { world, npcs: [a, b] });
    expect(afterA.stats.socializacion).toBeGreaterThan(60);
  });
});

describe('Feed-forward: hambre alta drena socialización cercanos', () => {
  it('NPC con supervivencia <30 hace caer socializacion de vecinos', () => {
    const world = mkWorld();
    const hungry = makeTestNPC({
      id: 'hungry',
      position: { x: 5, y: 5 },
      stats: { supervivencia: 15, socializacion: 60 },
    });
    const neighbor = makeTestNPC({
      id: 'neighbor',
      position: { x: 6, y: 5 },
      stats: { supervivencia: 80, socializacion: 60 },
    });
    const [, after] = tickNeeds([hungry, neighbor], {
      world,
      npcs: [hungry, neighbor],
    });
    // Sin feed-forward el vecino subiría socialización (están
    // juntos). Con feed-forward debe bajar o mantenerse — menos
    // que si el hungry no estuviera hambriento.
    const well = makeTestNPC({
      id: 'well',
      position: { x: 5, y: 5 },
      stats: { supervivencia: 80, socializacion: 60 },
    });
    const [, afterWithoutHunger] = tickNeeds([well, neighbor], {
      world,
      npcs: [well, neighbor],
    });
    expect(after.stats.socializacion).toBeLessThan(
      afterWithoutHunger.stats.socializacion,
    );
  });
});

describe('Pureza', () => {
  it('no muta los NPCs del input', () => {
    const world = mkWorld();
    const npc = makeTestNPC({ id: 'n' });
    const snap = JSON.stringify(npc);
    tickNeeds([npc], { world, npcs: [npc] });
    expect(JSON.stringify(npc)).toBe(snap);
  });
});
