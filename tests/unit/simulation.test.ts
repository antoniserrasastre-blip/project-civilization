/**
 * Tests del tick integrado — Sprint 3.3.
 *
 * El tick mueve NPCs, tickea recursos, actualiza fog. Puro.
 * Determinismo sobre N ticks.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { tick } from '@/lib/simulation';
import { initialGameState } from '@/lib/game-state';
import { makeTestNPC } from '@/lib/npcs';
import { TILE, RESOURCE, type WorldMap } from '@/lib/world-state';
import type { NPC } from '@/lib/npcs';
import { isDiscovered } from '@/lib/fog';

function mkFlatWorld(w = 32, h = 32): WorldMap {
  return {
    seed: 0,
    width: w,
    height: h,
    tiles: new Array(w * h).fill(TILE.GRASS),
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
  };
}

function sha(state: unknown): string {
  return createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

describe('tick — pureza + avance determinista', () => {
  it('no muta el state recibido', () => {
    const world = mkFlatWorld();
    const npcs: NPC[] = [
      makeTestNPC({ id: 'a', position: { x: 5, y: 5 } }),
    ];
    const s = initialGameState(1, npcs, world);
    const snap = JSON.stringify(s);
    tick(s);
    expect(JSON.stringify(s)).toBe(snap);
  });

  it('tick++ en cada paso', () => {
    const s = initialGameState(1, [makeTestNPC({ id: 'a' })], mkFlatWorld());
    const s1 = tick(s);
    expect(s1.tick).toBe(1);
    expect(tick(s1).tick).toBe(2);
  });

  it('10.000 ticks no crashean con NPC sobre recurso (sobrevive)', () => {
    const world = mkFlatWorld();
    // NPC sobre agua continuo → supervivencia recupera y no muere.
    world.resources.push({
      id: RESOURCE.WATER,
      x: 10,
      y: 10,
      quantity: 999,
      initialQuantity: 999,
      regime: 'continuous',
      depletedAtTick: null,
    });
    const npcs: NPC[] = [
      makeTestNPC({
        id: 'ok',
        position: { x: 10, y: 10 },
        stats: { supervivencia: 90, socializacion: 90 },
      }),
    ];
    let s = initialGameState(1, npcs, world);
    for (let i = 0; i < 10_000; i++) {
      s = tick(s);
    }
    expect(s.tick).toBe(10_000);
    expect(s.npcs[0].alive).toBe(true);
  });
});

describe('tick — determinismo', () => {
  it('misma seed + mismos NPCs → estado byte-idéntico tras 100 ticks', () => {
    const makeRun = () => {
      const npcs: NPC[] = [
        makeTestNPC({ id: 'a', position: { x: 2, y: 2 } }),
        makeTestNPC({ id: 'b', position: { x: 8, y: 8 } }),
      ];
      let s = initialGameState(42, npcs, mkFlatWorld());
      for (let i = 0; i < 100; i++) s = tick(s);
      return s;
    };
    const a = makeRun();
    const b = makeRun();
    expect(sha(a)).toBe(sha(b));
  });
});

describe('tick — movimiento hacia comida', () => {
  it('NPC hambriento converge hacia baya', () => {
    const world = mkFlatWorld(20, 20);
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
      id: 'hungry',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 30, socializacion: 80 },
    });
    let s = initialGameState(1, [npc], world);
    const startD =
      Math.abs(s.npcs[0].position.x - 10) + Math.abs(s.npcs[0].position.y - 10);
    for (let i = 0; i < 25; i++) s = tick(s);
    const endD =
      Math.abs(s.npcs[0].position.x - 10) + Math.abs(s.npcs[0].position.y - 10);
    expect(endD).toBeLessThan(startD);
  });
});

describe('tick — fog', () => {
  it('posición del NPC y alrededores quedan descubiertos', () => {
    const npc = makeTestNPC({
      id: 'a',
      position: { x: 10, y: 10 },
      visionRadius: 3,
    });
    let s = initialGameState(1, [npc], mkFlatWorld(32, 32));
    s = tick(s);
    expect(isDiscovered(s.fog, 10, 10)).toBe(true);
    // Radio 3 alrededor de (10,10).
    expect(isDiscovered(s.fog, 12, 10)).toBe(true);
    expect(isDiscovered(s.fog, 20, 20)).toBe(false);
  });
});
