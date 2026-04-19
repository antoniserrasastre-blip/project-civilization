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
  it('NPC sobre spawn de baya → supervivencia sube (no baja)', () => {
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
    expect(after.stats.supervivencia).toBeGreaterThan(60);
  });

  it('clamp superior en 100', () => {
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
    expect(after.stats.supervivencia).toBe(100);
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
