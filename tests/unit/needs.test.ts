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
  };
}

function mkCtx(world: WorldMap, npcs = [] as ReturnType<typeof makeTestNPC>[]) : DestinationContext {
  return { world, npcs };
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
    const r = decideDestination(npc, mkCtx(world));
    expect(r).toEqual({ x: 5, y: 5 }); // agua
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
    const r = decideDestination(npc, mkCtx(world));
    expect(r).toEqual({ x: 3, y: 3 }); // berry más cercana
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
    // Centroide de (10,10), (12,14), (8,12) = (10, 12). El propio
    // npc también cuenta → (10+12+8+0)/4 = 7.5, (10+14+12+0)/4 = 9.
    expect(r.x).toBeGreaterThanOrEqual(7);
    expect(r.x).toBeLessThanOrEqual(11);
    expect(r.y).toBeGreaterThanOrEqual(8);
    expect(r.y).toBeLessThanOrEqual(13);
  });

  it('todo OK → quedarse (position actual)', () => {
    const world = mkWorld(20, 20);
    const npc = makeTestNPC({
      id: 'n',
      position: { x: 7, y: 7 },
      stats: { supervivencia: 80, socializacion: 80 },
    });
    const r = decideDestination(npc, mkCtx(world, [npc]));
    expect(r).toEqual({ x: 7, y: 7 });
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
    const r = decideDestination(npc, mkCtx(world));
    // Ambas Manhattan 3+1 = 4. Tie → menor (x,y) lex = (3,3).
    expect(r).toEqual({ x: 3, y: 3 });
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
    const snapWorld = JSON.stringify(world);
    decideDestination(npc, mkCtx(world, [npc]));
    expect(JSON.stringify(npc)).toBe(snapNpc);
    expect(JSON.stringify(world)).toBe(snapWorld);
  });
});
