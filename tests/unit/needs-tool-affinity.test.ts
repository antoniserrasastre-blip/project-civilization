/**
 * Tests Red — Filtrado de intención por herramienta equipada.
 *
 * Contrato (decideDestination con ctx.items):
 *   - NPC con Lanza equipada prefiere ir hacia caza (game) cuando
 *     las necesidades básicas están cubiertas.
 *   - NPC con Cesta equipada prefiere ir hacia bayas (berry) o madera (wood).
 *   - NPC sin herramienta sigue el comportamiento legacy (sin cambio).
 *   - La herramienta NO sobreescribe las prioridades de supervivencia.
 */

import { describe, it, expect } from 'vitest';
import { decideDestination } from '../../lib/needs';
import { makeTestNPC } from '../../lib/npcs';
import { RESOURCE, type ResourceSpawn } from '../../lib/world-state';
import { ITEM_KIND, createItem } from '../../lib/items';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeWorld(resources: Partial<ResourceSpawn>[] = []) {
  const tiles = new Array(10 * 10).fill(2); // GRASS
  return {
    seed: 0,
    width: 10,
    height: 10,
    tiles,
    resources: resources.map((r) => ({
      id: RESOURCE.BERRY,
      x: 5,
      y: 5,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable' as const,
      depletedAtTick: null,
      ...r,
    })),
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
    influence: [],
  };
}

function spear(suffix = 0) {
  return createItem(ITEM_KIND.SPEAR, null, 0, suffix);
}

function basket(suffix = 0) {
  return createItem(ITEM_KIND.BASKET, null, 0, suffix);
}

// ── tool intent filtering ────────────────────────────────────────────────────

describe('decideDestination — filtrado por herramienta', () => {
  it('NPC con Lanza se dirige a caza cuando hay game y berry equidistantes', () => {
    const npc = makeTestNPC({
      id: 'a',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 80, socializacion: 80 },
      equippedItemId: 'spear-1',
    });
    const item = { ...spear(), id: 'spear-1', ownerNpcId: 'a' };
    const world = makeWorld([
      { id: RESOURCE.GAME, x: 3, y: 0 },
      { id: RESOURCE.BERRY, x: 4, y: 0 },
    ]);
    const ctx = {
      world,
      npcs: [npc],
      items: [item],
    };
    const result = decideDestination(npc, ctx);
    const dest = 'position' in result ? result.position : result;
    // Debe elegir la posición de caza, no la de bayas
    const gameSpawn = world.resources.find((r) => r.id === RESOURCE.GAME)!;
    expect(dest).toEqual({ x: gameSpawn.x, y: gameSpawn.y });
  });

  it('NPC con Cesta se dirige a bayas cuando hay bayas y caza equidistantes', () => {
    const npc = makeTestNPC({
      id: 'b',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 80, socializacion: 80 },
      equippedItemId: 'basket-1',
    });
    const item = { ...basket(), id: 'basket-1', ownerNpcId: 'b' };
    const world = makeWorld([
      { id: RESOURCE.GAME, x: 3, y: 0 },
      { id: RESOURCE.BERRY, x: 3, y: 1 },
    ]);
    const ctx = {
      world,
      npcs: [npc],
      items: [item],
    };
    const result = decideDestination(npc, ctx);
    const dest = 'position' in result ? result.position : result;
    const berrySpawn = world.resources.find((r) => r.id === RESOURCE.BERRY)!;
    expect(dest).toEqual({ x: berrySpawn.x, y: berrySpawn.y });
  });

  it('la herramienta NO anula la prioridad de supervivencia crítica', () => {
    const npc = makeTestNPC({
      id: 'c',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 10, socializacion: 80 }, // crítica
      equippedItemId: 'spear-2',
    });
    const item = { ...spear(2), id: 'spear-2', ownerNpcId: 'c' };
    const world = makeWorld([
      { id: RESOURCE.GAME, x: 3, y: 0 },
      { id: RESOURCE.WATER, x: 1, y: 0, regime: 'continuous' as const },
    ]);
    const ctx = {
      world,
      npcs: [npc],
      items: [item],
    };
    const result = decideDestination(npc, ctx);
    const dest = 'position' in result ? result.position : result;
    // Supervivencia crítica → agua, no caza
    const waterSpawn = world.resources.find((r) => r.id === RESOURCE.WATER)!;
    expect(dest).toEqual({ x: waterSpawn.x, y: waterSpawn.y });
  });

  it('NPC sin herramienta no cambia de comportamiento respecto al legacy', () => {
    const npc = makeTestNPC({
      id: 'd',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 80, socializacion: 80 },
      equippedItemId: null,
    });
    const world = makeWorld([{ id: RESOURCE.BERRY, x: 3, y: 0 }]);
    const ctxWithItems = { world, npcs: [npc], items: [] };
    const ctxLegacy = { world, npcs: [npc] };
    const destWithItems = decideDestination(npc, ctxWithItems);
    const destLegacy = decideDestination(npc, ctxLegacy);
    expect(destWithItems).toEqual(destLegacy);
  });
});
