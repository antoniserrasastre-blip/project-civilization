/**
 * Tests de recolección activa — Sprint 4.2.
 */

import { describe, it, expect } from 'vitest';
import { tickHarvests, INVENTORY_CAP_PER_TYPE } from '@/lib/harvest';
import { makeTestNPC } from '@/lib/npcs';
import { RESOURCE, type ResourceSpawn } from '@/lib/world-state';

function spawn(over: Partial<ResourceSpawn> & { id: ResourceSpawn['id'] }): ResourceSpawn {
  return {
    x: 0,
    y: 0,
    quantity: 10,
    initialQuantity: 10,
    regime: 'regenerable',
    depletedAtTick: null,
    ...over,
  };
}

describe('tickHarvests — sobre tile con spawn', () => {
  it('NPC sobre baya → inventory.berry += 1', () => {
    const npc = makeTestNPC({ id: 'a', position: { x: 5, y: 5 } });
    const s = spawn({ id: RESOURCE.BERRY, x: 5, y: 5, quantity: 10 });
    const r = tickHarvests([npc], [s], 0);
    expect(r.npcs[0].inventory.berry).toBe(1);
    expect(r.resources[0].quantity).toBe(9);
  });

  it('NPC sobre leña → inventory.wood += 1', () => {
    const npc = makeTestNPC({ id: 'a', position: { x: 2, y: 3 } });
    const s = spawn({ id: RESOURCE.WOOD, x: 2, y: 3 });
    const r = tickHarvests([npc], [s], 0);
    expect(r.npcs[0].inventory.wood).toBe(1);
  });

  it('no recolecta agua (no va a inventario)', () => {
    const npc = makeTestNPC({ id: 'a', position: { x: 5, y: 5 } });
    const s = spawn({ id: RESOURCE.WATER, x: 5, y: 5, quantity: 999, regime: 'continuous' });
    const r = tickHarvests([npc], [s], 0);
    // Agua no entra en inventory.
    expect(Object.values(r.npcs[0].inventory).every((v) => v === 0)).toBe(true);
    // Quantity no cambia (water es continuo).
    expect(r.resources[0].quantity).toBe(999);
  });

  it('no recolecta si NPC no sobre el spawn', () => {
    const npc = makeTestNPC({ id: 'a', position: { x: 0, y: 0 } });
    const s = spawn({ id: RESOURCE.BERRY, x: 5, y: 5, quantity: 10 });
    const r = tickHarvests([npc], [s], 0);
    expect(r.npcs[0].inventory.berry).toBe(0);
    expect(r.resources[0].quantity).toBe(10);
  });

  it('no recolecta si quantity <= 0', () => {
    const npc = makeTestNPC({ id: 'a', position: { x: 5, y: 5 } });
    const s = spawn({ id: RESOURCE.BERRY, x: 5, y: 5, quantity: 0 });
    const r = tickHarvests([npc], [s], 0);
    expect(r.npcs[0].inventory.berry).toBe(0);
  });
});

describe('tickHarvests — cap de inventario', () => {
  it(`NPC con ${INVENTORY_CAP_PER_TYPE} ya en berry no recolecta más`, () => {
    const npc = makeTestNPC({
      id: 'a',
      position: { x: 5, y: 5 },
      inventory: {
        wood: 0,
        stone: 0,
        berry: INVENTORY_CAP_PER_TYPE,
        game: 0,
        fish: 0,
      },
    });
    const s = spawn({ id: RESOURCE.BERRY, x: 5, y: 5, quantity: 10 });
    const r = tickHarvests([npc], [s], 0);
    expect(r.npcs[0].inventory.berry).toBe(INVENTORY_CAP_PER_TYPE);
    expect(r.resources[0].quantity).toBe(10);
  });
});

describe('tickHarvests — agotamiento', () => {
  it('quantity llega a 0 → marca depletedAtTick si regenerable', () => {
    const npc = makeTestNPC({ id: 'a', position: { x: 5, y: 5 } });
    const s = spawn({ id: RESOURCE.BERRY, x: 5, y: 5, quantity: 1 });
    const r = tickHarvests([npc], [s], 42);
    expect(r.resources[0].quantity).toBe(0);
    expect(r.resources[0].depletedAtTick).toBe(42);
  });

  it('depletable también marca depletedAtTick al agotarse', () => {
    const npc = makeTestNPC({ id: 'a', position: { x: 5, y: 5 } });
    const s = spawn({
      id: RESOURCE.STONE,
      x: 5,
      y: 5,
      quantity: 1,
      regime: 'depletable',
    });
    const r = tickHarvests([npc], [s], 42);
    expect(r.resources[0].quantity).toBe(0);
    expect(r.resources[0].depletedAtTick).toBe(42);
  });
});

describe('tickHarvests — simultaneidad', () => {
  it('dos NPCs sobre mismo spawn → 2 unidades extraídas si hay cantidad', () => {
    const a = makeTestNPC({ id: 'a', position: { x: 5, y: 5 } });
    const b = makeTestNPC({ id: 'b', position: { x: 5, y: 5 } });
    const s = spawn({ id: RESOURCE.BERRY, x: 5, y: 5, quantity: 10 });
    const r = tickHarvests([a, b], [s], 0);
    expect(
      r.npcs.reduce((acc, n) => acc + n.inventory.berry, 0),
    ).toBe(2);
    expect(r.resources[0].quantity).toBe(8);
  });

  it('dos NPCs sobre spawn con 1 unidad → solo el lex-menor recolecta', () => {
    const a = makeTestNPC({ id: 'alpha', position: { x: 5, y: 5 } });
    const b = makeTestNPC({ id: 'zulu', position: { x: 5, y: 5 } });
    const s = spawn({ id: RESOURCE.BERRY, x: 5, y: 5, quantity: 1 });
    const r = tickHarvests([a, b], [s], 0);
    const alpha = r.npcs.find((n) => n.id === 'alpha')!;
    const zulu = r.npcs.find((n) => n.id === 'zulu')!;
    expect(alpha.inventory.berry).toBe(1);
    expect(zulu.inventory.berry).toBe(0);
  });
});

describe('tickHarvests — pureza', () => {
  it('no muta inputs', () => {
    const npc = makeTestNPC({ id: 'a', position: { x: 5, y: 5 } });
    const s = spawn({ id: RESOURCE.BERRY, x: 5, y: 5, quantity: 10 });
    const snapNpc = JSON.stringify(npc);
    const snapS = JSON.stringify(s);
    tickHarvests([npc], [s], 0);
    expect(JSON.stringify(npc)).toBe(snapNpc);
    expect(JSON.stringify(s)).toBe(snapS);
  });
});
