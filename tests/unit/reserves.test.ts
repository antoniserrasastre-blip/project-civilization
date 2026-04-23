/**
 * Tests de lib/harvest.ts + WorldMap.reserves — agotamiento territorial.
 *
 * Contrato:
 *   - reserves[y*w+x] arranca en la suma de initialQuantity de los spawns del tile.
 *   - tickHarvests consume 1 unidad de reserves por harvest exitoso.
 *   - Cuando reserves[tile] === 0, el tile está agotado y no se puede cosechar.
 *   - El resultado es puro: devuelve reserves nuevo sin mutar el input.
 *   - Round-trip JSON del array de reserves.
 */

import { describe, it, expect } from 'vitest';
import { tickHarvests } from '@/lib/harvest';
import { makeTestNPC } from '@/lib/npcs';
import { RESOURCE, type ResourceSpawn } from '@/lib/world-state';

const W = 10;
const H = 10;

function makeSpawn(
  x: number, y: number,
  quantity: number,
  initialQuantity = quantity,
): ResourceSpawn {
  return {
    id: RESOURCE.WOOD,
    x, y, quantity,
    initialQuantity,
    regime: 'regenerable',
    depletedAtTick: null,
  };
}

function makeReserves(spawns: ResourceSpawn[], width = W): number[] {
  const res = new Array<number>(width * H).fill(0);
  for (const s of spawns) {
    res[s.y * width + s.x] += s.initialQuantity;
  }
  return res;
}

// ── Describe 1: Initialización de reserves ────────────────────────────

describe('Initialización de reserves', () => {
  it('reserves arranca como array de ceros sin spawns', () => {
    const res = makeReserves([]);
    expect(res.every((v) => v === 0)).toBe(true);
    expect(res).toHaveLength(W * H);
  });

  it('tile con spawn tiene reserves = initialQuantity del spawn', () => {
    const spawn = makeSpawn(3, 4, 10, 20);
    const res = makeReserves([spawn]);
    expect(res[4 * W + 3]).toBe(20);
  });

  it('dos spawns en el mismo tile acumulan sus initialQuantity', () => {
    const s1 = { ...makeSpawn(2, 2, 5, 10), id: RESOURCE.WOOD };
    const s2 = { ...makeSpawn(2, 2, 3, 8), id: RESOURCE.BERRY };
    const res = makeReserves([s1, s2]);
    expect(res[2 * W + 2]).toBe(18);
  });

  it('round-trip JSON', () => {
    const res = makeReserves([makeSpawn(1, 1, 5)]);
    expect(JSON.parse(JSON.stringify(res))).toEqual(res);
  });
});

// ── Describe 2: Harvest consume de reserves ───────────────────────────

describe('tickHarvests — consume de reserves', () => {
  it('harvest exitoso reduce reserves en 1', () => {
    const spawn = makeSpawn(2, 2, 5);
    const npc = makeTestNPC({ id: 'n1', position: { x: 2, y: 2 } });
    const reserves = makeReserves([spawn]);
    const result = tickHarvests([npc], [spawn], 0, reserves, W);
    expect(result.reserves[2 * W + 2]).toBe(spawn.initialQuantity - 1);
  });

  it('no muta el array de reserves de entrada', () => {
    const spawn = makeSpawn(2, 2, 5);
    const npc = makeTestNPC({ id: 'n1', position: { x: 2, y: 2 } });
    const reserves = makeReserves([spawn]);
    const original = reserves[2 * W + 2];
    tickHarvests([npc], [spawn], 0, reserves, W);
    expect(reserves[2 * W + 2]).toBe(original);
  });

  it('sin NPC en el tile reserves no cambia', () => {
    const spawn = makeSpawn(2, 2, 5);
    const npc = makeTestNPC({ id: 'n1', position: { x: 0, y: 0 } });
    const reserves = makeReserves([spawn]);
    const result = tickHarvests([npc], [spawn], 0, reserves, W);
    expect(result.reserves[2 * W + 2]).toBe(spawn.initialQuantity);
  });

  it('round-trip JSON de reserves resultantes', () => {
    const spawn = makeSpawn(2, 2, 5);
    const npc = makeTestNPC({ id: 'n1', position: { x: 2, y: 2 } });
    const result = tickHarvests([npc], [spawn], 0, makeReserves([spawn]), W);
    expect(JSON.parse(JSON.stringify(result.reserves))).toEqual(result.reserves);
  });
});

// ── Describe 3: Agotamiento del tile ─────────────────────────────────

describe('Resource Exhaustion — tile agotado bloquea harvest', () => {
  it('cuando reserves[tile] = 0, el NPC no puede cosechar', () => {
    const spawn = makeSpawn(3, 3, 5);
    const npc = makeTestNPC({ id: 'n1', position: { x: 3, y: 3 } });
    // reserves agotadas en ese tile
    const exhaustedReserves = makeReserves([spawn]);
    exhaustedReserves[3 * W + 3] = 0;

    const before = npc.inventory.wood;
    const result = tickHarvests([npc], [spawn], 0, exhaustedReserves, W);
    const npcAfter = result.npcs.find((n) => n.id === 'n1')!;
    expect(npcAfter.inventory.wood).toBe(before);
  });

  it('tras agotar un tile, múltiples NPCs no pueden cosechar', () => {
    const spawn = makeSpawn(5, 5, 10);
    const npcs = Array.from({ length: 4 }, (_, i) =>
      makeTestNPC({ id: `n${i}`, position: { x: 5, y: 5 } }),
    );
    const exhausted = makeReserves([spawn]);
    exhausted[5 * W + 5] = 0;

    const result = tickHarvests(npcs, [spawn], 0, exhausted, W);
    for (const npc of result.npcs) {
      expect(npc.inventory.wood).toBe(0);
    }
  });

  it('reserves nunca caen por debajo de 0', () => {
    const spawn = makeSpawn(1, 1, 1); // solo 1 unidad
    const npcs = Array.from({ length: 5 }, (_, i) =>
      makeTestNPC({ id: `n${i}`, position: { x: 1, y: 1 } }),
    );
    let result = tickHarvests(npcs, [spawn], 0, makeReserves([spawn]), W);
    // Repetir hasta agotar
    for (let t = 1; t < 10; t++) {
      result = tickHarvests(result.npcs, result.resources, t, result.reserves, W);
    }
    expect(result.reserves.every((v) => v >= 0)).toBe(true);
  });

  it('sin reserves pasado, tickHarvests funciona como antes (sin fricción)', () => {
    const spawn = makeSpawn(2, 2, 5);
    const npc = makeTestNPC({ id: 'n1', position: { x: 2, y: 2 } });
    const result = tickHarvests([npc], [spawn], 0);
    // Sin reserves: harvest normal
    expect(result.npcs[0].inventory.wood).toBe(1);
  });
});

// ── Describe 4: Depleción acumulativa ────────────────────────────────

describe('Depleción acumulativa — N ticks de harvest', () => {
  it('tras N harvests consecutivos reserves llega a 0', () => {
    const INITIAL = 8;
    const spawn = makeSpawn(4, 4, INITIAL);
    // 2 NPCs: cap=5 c/u → pueden absorber 10 unidades, suficiente para 8
    let npcs = [
      makeTestNPC({ id: 'n1', position: { x: 4, y: 4 } }),
      makeTestNPC({ id: 'n2', position: { x: 4, y: 4 } }),
    ];
    let resources = [spawn];
    let reserves = makeReserves([spawn]);

    for (let t = 0; t < INITIAL + 5; t++) {
      const r = tickHarvests(npcs, resources, t, reserves, W);
      npcs = r.npcs;
      resources = r.resources;
      reserves = r.reserves;
    }
    expect(reserves[4 * W + 4]).toBe(0);
  });

  it('determinismo: misma secuencia de harvests produce mismo resultado', () => {
    const spawn = makeSpawn(6, 6, 10);
    const runN = (n: number) => {
      let npcs = [makeTestNPC({ id: 'n1', position: { x: 6, y: 6 } })];
      let resources = [spawn];
      let reserves = makeReserves([spawn]);
      for (let t = 0; t < n; t++) {
        const r = tickHarvests(npcs, resources, t, reserves, W);
        npcs = r.npcs;
        resources = r.resources;
        reserves = r.reserves;
      }
      return reserves[6 * W + 6];
    };
    expect(runN(5)).toBe(runN(5));
  });
});
