/**
 * Tests de construcción del monumento — Sprint 6.2.
 */

import { describe, it, expect } from 'vitest';
import {
  canStartMonument,
  startMonument,
  tickMonumentProgress,
  initialMonumentState,
  monumentUnlockStatus,
  MONUMENT_COST,
  BUILD_TICK_HOURS,
  MIN_WORKERS,
  MIN_CONSECUTIVE_NIGHTS,
} from '@/lib/monument';
import { addStructure } from '@/lib/structures';
import { CRAFTABLE } from '@/lib/crafting';
import { makeTestNPC, LINAJE } from '@/lib/npcs';
import { initialVillageState } from '@/lib/village';

function stockedNpcs(n: number, opts: Partial<{ stone: number; wood: number }> = {}) {
  return Array.from({ length: n }, (_, i) =>
    makeTestNPC({
      id: `n${i}`,
      linaje: i < 2 ? LINAJE.TRAMUNTANA : LINAJE.MIGJORN,
      inventory: {
        wood: opts.wood ?? 10,
        stone: opts.stone ?? 30,
        berry: 0,
        game: 0,
        fish: 0, obsidian: 0, shell: 0,
      },
    }),
  );
}

function all5Built() {
  let s: ReturnType<typeof addStructure> = [];
  for (const k of [
    CRAFTABLE.REFUGIO,
    CRAFTABLE.FOGATA_PERMANENTE,
    CRAFTABLE.PIEL_ROPA,
    CRAFTABLE.DESPENSA,
  ]) {
    s = addStructure(s, k, { x: 0, y: 0 }, 0, s.length);
  }
  return s;
}

describe('canStartMonument', () => {
  it('false si desbloqueo falta', () => {
    const npcs = stockedNpcs(10);
    const v = initialVillageState();
    expect(canStartMonument([], npcs, v, initialMonumentState())).toBe(false);
  });

  it('false si recursos del clan insuficientes', () => {
    const npcs = stockedNpcs(10, { stone: 5, wood: 1 }); // pooled = 50 + 10
    const v = { ...initialVillageState(), consecutiveNightsAtFire: MIN_CONSECUTIVE_NIGHTS };
    const s = all5Built();
    expect(canStartMonument(s, npcs, v, initialMonumentState())).toBe(false);
  });

  it('true si todo OK', () => {
    const npcs = stockedNpcs(10, { stone: 30, wood: 10 });
    const v = { ...initialVillageState(), consecutiveNightsAtFire: MIN_CONSECUTIVE_NIGHTS };
    const s = all5Built();
    expect(canStartMonument(s, npcs, v, initialMonumentState())).toBe(true);
  });
});

describe('startMonument', () => {
  it('consume stone y wood del pooled inventory', () => {
    const npcs = stockedNpcs(10, { stone: 30, wood: 10 });
    const { npcs: after, structures: afterStructures, monument } = startMonument(
      npcs,
      [],
      initialMonumentState(),
      100,
    );
    expect(monument.phase).toBe('building');
    expect(monument.startedAtTick).toBe(100);
    const totalStone = [...after, ...afterStructures].reduce((a, n) => a + (n.inventory?.stone ?? 0), 0);
    const totalWood = [...after, ...afterStructures].reduce((a, n) => a + (n.inventory?.wood ?? 0), 0);
    expect(totalStone).toBe(10 * 30 - MONUMENT_COST.stone);
    expect(totalWood).toBe(10 * 10 - MONUMENT_COST.wood);
  });

  it('tira si ya en construcción o built', () => {
    const m: import('@/lib/monument').MonumentState = {
      phase: 'building',
      progress: 0,
      startedAtTick: 0,
    };
    expect(() => startMonument(stockedNpcs(10), [], m, 0)).toThrow();
  });
});

describe('tickMonumentProgress', () => {
  it('acumula aliveWorkers por tick; completa al llegar al objetivo', () => {
    const npcs = Array.from({ length: 14 }, (_, i) => makeTestNPC({ id: `n${i}` }));
    let m: import('@/lib/monument').MonumentState = {
      phase: 'building',
      progress: 0,
      startedAtTick: 0,
    };
    // 14 NPCs vivos por tick → necesita BUILD_TICK_HOURS/14 ticks.
    const expectedTicks = Math.ceil(BUILD_TICK_HOURS / 14);
    for (let i = 0; i < expectedTicks; i++) {
      m = tickMonumentProgress(m, npcs);
    }
    expect(m.phase).toBe('built');
    expect(m.progress).toBe(BUILD_TICK_HOURS);
  });

  it('colapso a ruina si vivos < MIN_WORKERS', () => {
    const npcs = Array.from({ length: 14 }, (_, i) =>
      makeTestNPC({ id: `n${i}`, alive: i < MIN_WORKERS - 1 }),
    );
    let m: import('@/lib/monument').MonumentState = {
      phase: 'building',
      progress: 100,
      startedAtTick: 0,
    };
    m = tickMonumentProgress(m, npcs);
    expect(m.phase).toBe('ruin');
  });

  it('no-op si fase != building', () => {
    const npcs = stockedNpcs(14);
    const m = initialMonumentState();
    expect(tickMonumentProgress(m, npcs)).toEqual(m);
  });
});
