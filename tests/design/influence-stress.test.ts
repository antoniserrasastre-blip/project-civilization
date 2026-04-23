/**
 * Tests de Rotura — clan estático agota su entorno y colapsa.
 *
 * Verifica la presión de nomadismo: un clan que no se mueve consume
 * los reserves de sus tiles hasta agotarlos, no puede cosechar y sus
 * stats de supervivencia caen. El sistema obliga a explorar.
 */

import { describe, it, expect } from 'vitest';
import { tickHarvests } from '@/lib/harvest';
import { makeTestNPC } from '@/lib/npcs';
import { RESOURCE, type ResourceSpawn } from '@/lib/world-state';

const W = 20;
const H = 20;

function makeWoodSpawn(x: number, y: number, qty: number): ResourceSpawn {
  return {
    id: RESOURCE.WOOD,
    x, y,
    quantity: qty,
    initialQuantity: qty,
    regime: 'regenerable',
    depletedAtTick: null,
  };
}

function initReserves(spawns: ResourceSpawn[]): number[] {
  const r = new Array<number>(W * H).fill(0);
  for (const s of spawns) r[s.y * W + s.x] += s.initialQuantity;
  return r;
}

describe('Clan estático — depleción forzada', () => {
  it('14 NPCs en un tile agotan reserves en pocos ticks', () => {
    const RESERVE = 20;
    const spawn = makeWoodSpawn(10, 10, RESERVE);
    let npcs = Array.from({ length: 14 }, (_, i) =>
      makeTestNPC({ id: `n${i}`, position: { x: 10, y: 10 } }),
    );
    let resources = [spawn];
    let reserves = initReserves([spawn]);

    let ticks = 0;
    while (reserves[10 * W + 10] > 0 && ticks < 200) {
      const r = tickHarvests(npcs, resources, ticks, reserves, W);
      npcs = r.npcs;
      resources = r.resources;
      reserves = r.reserves;
      ticks++;
    }
    // Con 14 NPCs y 20 reserve, debe agotarse en muy pocos ticks
    expect(reserves[10 * W + 10]).toBe(0);
    expect(ticks).toBeLessThanOrEqual(20);
  });

  it('tras el agotamiento ningún NPC puede seguir cosechando', () => {
    const spawn = makeWoodSpawn(5, 5, 5);
    let npcs = Array.from({ length: 14 }, (_, i) =>
      makeTestNPC({ id: `n${i}`, position: { x: 5, y: 5 } }),
    );
    let resources = [spawn];
    let reserves = initReserves([spawn]);

    // Agotar
    for (let t = 0; t < 30; t++) {
      const r = tickHarvests(npcs, resources, t, reserves, W);
      npcs = r.npcs;
      resources = r.resources;
      reserves = r.reserves;
    }
    expect(reserves[5 * W + 5]).toBe(0);

    // Después del agotamiento: inventarios no crecen más
    const woodBefore = npcs.map((n) => n.inventory.wood);
    const final = tickHarvests(npcs, resources, 30, reserves, W);
    for (let i = 0; i < final.npcs.length; i++) {
      expect(final.npcs[i].inventory.wood).toBe(woodBefore[i]);
    }
  });

  it('clan con múltiples spawns cercanos los agota todos si no se mueve', () => {
    // 4 spawns alrededor de (10,10), mismo tile = misma posición
    const spawns = [
      makeWoodSpawn(10, 10, 8),
      makeWoodSpawn(10, 10, 4), // segundo spawn en mismo tile
    ];
    const totalReserve = 8 + 4;
    let npcs = Array.from({ length: 14 }, (_, i) =>
      makeTestNPC({ id: `n${i}`, position: { x: 10, y: 10 } }),
    );
    let resources = [...spawns];
    let reserves = initReserves(spawns);

    expect(reserves[10 * W + 10]).toBe(totalReserve);

    for (let t = 0; t < 50; t++) {
      const r = tickHarvests(npcs, resources, t, reserves, W);
      npcs = r.npcs;
      resources = r.resources;
      reserves = r.reserves;
    }
    expect(reserves[10 * W + 10]).toBe(0);
  });
});

describe('Presión de nomadismo — tile vecino permite recuperación', () => {
  it('NPC que se mueve a tile no agotado puede seguir cosechando', () => {
    const exhaustedSpawn = makeWoodSpawn(5, 5, 3);
    const freshSpawn = makeWoodSpawn(6, 5, 10);

    let npcs = [makeTestNPC({ id: 'n1', position: { x: 5, y: 5 } })];
    let resources = [exhaustedSpawn, freshSpawn];
    let reserves = initReserves([exhaustedSpawn, freshSpawn]);

    // Agotar tile (5,5)
    for (let t = 0; t < 10; t++) {
      const r = tickHarvests(npcs, resources, t, reserves, W);
      npcs = r.npcs;
      resources = r.resources;
      reserves = r.reserves;
    }
    expect(reserves[5 * W + 5]).toBe(0);

    // Mover a tile fresco (6,5)
    npcs = npcs.map((n) => ({ ...n, position: { x: 6, y: 5 } }));
    const woodBeforeMove = npcs[0].inventory.wood;
    const result = tickHarvests(npcs, resources, 10, reserves, W);
    // Puede cosechar del tile fresco
    expect(result.npcs[0].inventory.wood).toBeGreaterThan(woodBeforeMove);
  });

  it('reserves de tile fresco se reduce correctamente al cosechar', () => {
    const spawn = makeWoodSpawn(8, 8, 15);
    const npc = makeTestNPC({ id: 'n1', position: { x: 8, y: 8 } });
    const reserves = initReserves([spawn]);
    const result = tickHarvests([npc], [spawn], 0, reserves, W);
    expect(result.reserves[8 * W + 8]).toBe(14); // 15 - 1
  });
});
