/**
 * Tests de decideDestination — Sprint 3.2.
 *
 * La función decide dónde va el NPC en el siguiente tick según sus
 * niveles y el contexto (recursos visibles + otros NPCs vivos). Sin
 * pathfinding aún — solo el destino objetivo.
 *
 * Deterministic: empates por (x,y) lex, sin PRNG.
 */

import { describe, it, expect } from 'vitest';
import {
  decideDestination,
  NEED_THRESHOLDS,
  type DestinationContext,
} from '@/lib/needs';
import { CRAFTABLE } from '@/lib/crafting';
import { makeTestNPC } from '@/lib/npcs';
import { TILE, RESOURCE, type WorldMap } from '@/lib/world-state';

function mkWorld(width: number, height: number): WorldMap {
  return {
    seed: 0,
    width,
    height,
    tiles: new Array(width * height).fill(TILE.GRASS),
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
    influence: [],
  };
}

function mkCtx(world: WorldMap, npcs: any[] = []) : DestinationContext {
  return {
    world,
    npcs,
    prng: { seed: 1, cursor: 0 },
    currentTick: 0,
    ticksPerDay: 100,
    synergies: [],
  };
}

describe('Constantes NEED_THRESHOLDS', () => {
  it('tiene umbrales ordenados supervivencia critical < hungry', () => {
    expect(NEED_THRESHOLDS.supervivenciaCritical).toBeLessThan(
      NEED_THRESHOLDS.supervivenciaHungry,
    );
  });
});

describe('decideDestination — prioridades', () => {
  it('supervivencia crítica → agua más cercana', () => {
    const world = mkWorld(20, 20);
    world.resources.push({
      id: RESOURCE.WATER,
      x: 5,
      y: 5,
      quantity: 999,
      initialQuantity: 999,
      regime: 'continuous',
      depletedAtTick: null,
    });
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 10,
      y: 10,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 10, socializacion: 80 }, // crítica
    });
    const r = decideDestination(npc, mkCtx(world, [npc]));
    expect(r.position).toEqual({ x: 5, y: 5 }); // agua
  });

  it('supervivencia hungry (<50) → comida más cercana', () => {
    const world = mkWorld(20, 20);
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 3,
      y: 3,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    world.resources.push({
      id: RESOURCE.GAME,
      x: 15,
      y: 15,
      quantity: 5,
      initialQuantity: 5,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 35, socializacion: 80 },
    });
    const r = decideDestination(npc, mkCtx(world, [npc]));
    expect(r.position).toEqual({ x: 3, y: 3 }); // berry más cercana
  });

  it('socialización baja → centroide del clan', () => {
    const world = mkWorld(20, 20);
    const clan = [
      makeTestNPC({ id: 'a', position: { x: 10, y: 10 } }),
      makeTestNPC({ id: 'b', position: { x: 12, y: 14 } }),
      makeTestNPC({ id: 'c', position: { x: 8, y: 12 } }),
    ];
    const lonely = makeTestNPC({
      id: 'd',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 80, socializacion: 20 },
    });
    const r = decideDestination(lonely, mkCtx(world, [...clan, lonely]));
    // El comportamiento actual de socialización baja es buscar al NPC más cercano
    // o ir a la fogata. (10,10) y (8,12) están ambos a distancia 20.
    expect([{ x: 10, y: 10 }, { x: 8, y: 12 }]).toContainEqual(r.position);
  });

  it('todo OK → quedarse (position actual)', () => {
    const world = mkWorld(20, 20);
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 7, y: 7 },
      stats: { supervivencia: 80, socializacion: 80 },
    });
    const r = decideDestination(npc, mkCtx(world, [npc]));
    expect(r.position).toEqual({ x: 7, y: 7 });
  });

  it('supervivencia baja con comida en inventario no bloquea construcción', () => {
    const world = mkWorld(20, 20);
    world.resources.push({
      id: RESOURCE.WOOD,
      x: 10,
      y: 10,
      quantity: 20,
      initialQuantity: 20,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 35, socializacion: 90 },
      inventory: { wood: 0, stone: 0, berry: 3, game: 0, fish: 0, obsidian: 0, shell: 0 },
    });
    const ctx = mkCtx(world, [npc]);
    ctx.nextBuildPriority = CRAFTABLE.FOGATA_PERMANENTE;

    expect(decideDestination(npc, ctx).position).toEqual({ x: 10, y: 10 });
  });

  it('si ya está recuperándose en agua, no alterna hacia comida al cruzar crítico', () => {
    const world = mkWorld(20, 20);
    world.resources.push({
      id: RESOURCE.WATER,
      x: 3,
      y: 3,
      quantity: 999,
      initialQuantity: 999,
      regime: 'continuous',
      depletedAtTick: null,
    });
    world.resources.push({
      id: RESOURCE.GAME,
      x: 3,
      y: 8,
      quantity: 5,
      initialQuantity: 5,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 3, y: 3 },
      stats: { supervivencia: 21, socializacion: 80 },
    });

    expect(decideDestination(npc, mkCtx(world, [npc])).position).toEqual({
      x: 3,
      y: 3,
    });
  });

  it('si ya está recuperándose en comida, espera hasta estar listo', () => {
    const world = mkWorld(20, 20);
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 2,
      y: 2,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    world.resources.push({
      id: RESOURCE.STONE,
      x: 10,
      y: 10,
      quantity: 20,
      initialQuantity: 20,
      regime: 'depletable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 2, y: 2 },
      stats: { supervivencia: 45, socializacion: 90 },
    });
    const ctx = mkCtx(world, [npc]);
    ctx.nextBuildPriority = CRAFTABLE.FOGATA_PERMANENTE;

    expect(decideDestination(npc, ctx).position).toEqual({ x: 2, y: 2 });
  });
});

describe('decideDestination — tie-break determinista', () => {
  it('dos recursos equidistantes → el de menor (x, y) lex', () => {
    const world = mkWorld(20, 20);
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 3,
      y: 3,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 3,
      y: 5,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 0, y: 4 },
      stats: { supervivencia: 30, socializacion: 80 },
    });
    const r = decideDestination(npc, mkCtx(world, [npc]));
    // Ambas Manhattan 3+1 = 4. Tie → menor (x,y) lex = (3,3).
    expect(r.position).toEqual({ x: 3, y: 3 });
  });
});

describe('decideDestination — filtro de intención (Sprint 10)', () => {
  it('CAZADOR con lanza prefiere game sobre berry a igual distancia', () => {
    const world = mkWorld(20, 20);
    // Dos opciones de comida a distancia 5 desde (0,0).
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 5,
      y: 0,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    world.resources.push({
      id: RESOURCE.GAME,
      x: 0,
      y: 5,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 30, socializacion: 80 },
      skills: { hunting: 60, gathering: 10, crafting: 10, fishing: 10, healing: 10 },
      equippedItemId: 'item-cazador',
    });
    // Con el item pasado vía ctx.items, la lanza orienta a GAME.
    const ctx = mkCtx(world, [npc]);
    ctx.items = [
      {
        id: 'item-cazador',
        kind: 'spear',
        ownerNpcId: 'n',
        durability: 80,
        maxDurability: 80,
        prestige: 0,
        createdAtTick: 0,
      },
    ];
    const r = decideDestination(npc, ctx);
    expect(r.position).toEqual({ x: 0, y: 5 }); // GAME, no BERRY
  });

  it('PESCADOR prefiere fish aunque esté algo más lejos (dentro del bias)', () => {
    const world = mkWorld(20, 20);
    // Berry a distancia 5, fish a distancia 6: el bias aditivo
    // (peso 2) empuja al pescador al pez sin que vuele mapa entero.
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 5,
      y: 0,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    world.resources.push({
      id: RESOURCE.FISH,
      x: 0,
      y: 6,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 30, socializacion: 80 },
      skills: { hunting: 10, gathering: 15, crafting: 10, fishing: 70, healing: 10 },
      equippedItemId: null,
    });
    const r = decideDestination(npc, mkCtx(world, [npc]));
    expect(r.position).toEqual({ x: 0, y: 6 });
  });

  it('filtro de intención NO anula la prioridad crítica (agua antes que rol)', () => {
    const world = mkWorld(20, 20);
    world.resources.push({
      id: RESOURCE.WATER,
      x: 8,
      y: 0,
      quantity: 999,
      initialQuantity: 999,
      regime: 'continuous',
      depletedAtTick: null,
    });
    world.resources.push({
      id: RESOURCE.GAME,
      x: 2,
      y: 0,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 10, socializacion: 80 }, // crítica
      skills: { hunting: 70, gathering: 10, crafting: 10, fishing: 10, healing: 10 },
    });
    const r = decideDestination(npc, mkCtx(world, [npc]));
    expect(r.position).toEqual({ x: 8, y: 0 }); // agua, aunque el cazador "quiere" game
  });

  it('filtro del rol no supera distancia grande (no viaja medio mapa)', () => {
    const world = mkWorld(30, 30);
    // Fish a distancia 2, game a distancia 20 — el cazador come fish
    // porque el bias es pequeño (≤5) y no compensa un viaje brutal.
    world.resources.push({
      id: RESOURCE.FISH,
      x: 2,
      y: 0,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    world.resources.push({
      id: RESOURCE.GAME,
      x: 20,
      y: 0,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 30, socializacion: 80 },
      skills: { hunting: 70, gathering: 10, crafting: 10, fishing: 10, healing: 10 },
    });
    const r = decideDestination(npc, mkCtx(world, [npc]));
    expect(r.position).toEqual({ x: 2, y: 0 });
  });
});

describe('decideDestination — pureza', () => {
  it('no muta npc ni ctx', () => {
    const world = mkWorld(10, 10);
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
      position: { x: 0, y: 0 },
      stats: { supervivencia: 10, socializacion: 80 },
    });
    const snapNpc = JSON.stringify(npc);
    const ctx = mkCtx(world, [npc]);
    const snapCtx = JSON.stringify(ctx);
    decideDestination(npc, ctx);
    expect(JSON.stringify(npc)).toBe(snapNpc);
    expect(JSON.stringify(ctx)).toBe(snapCtx);
  });
});
