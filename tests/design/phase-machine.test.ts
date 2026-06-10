/**
 * Suite de diseño TDD — Sprint 02: máquina de fases día/preparación.
 *
 * Contrato (spec 02_maquina-de-fases):
 *  - `phasedMode: true` → en el último tick del día (tick+1 % TICKS_PER_DAY === 0)
 *    la sim PAUSA: phase = 'preparation', el tick NO avanza.
 *  - En 'preparation', tick() es un no-op congelado (byte-idéntico).
 *  - `phasedMode: false` (default) → comportamiento continuo de siempre
 *    (los tests viejos de multi-día no cambian).
 *  - initialGameState produce phase 'day' y phasedMode false por defecto.
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { initialGameState } from '@/lib/game-state';
import { TICKS_PER_DAY } from '@/lib/resources';
import { makeTestNPC, makeFullInventory } from '../helpers/npc-fixtures';
import { TILE, type WorldMap } from '@/lib/world-state';

function mkFlatWorld(w = 32, h = 32): WorldMap {
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

function mkState(phasedMode: boolean) {
  const npc = makeTestNPC({
    id: 'a',
    position: { x: 5, y: 5 },
    stats: { supervivencia: 90, socializacion: 80, proposito: 90, miedo: 10 },
    inventory: makeFullInventory({ berry: 500 }),
  });
  const base = initialGameState(3, [npc], mkFlatWorld(), 'stone', { skipSpawning: true });
  return { ...base, phasedMode };
}

describe('Sprint 02 — máquina de fases', () => {
  it('initialGameState: phase=day y phasedMode=false por defecto (compat)', () => {
    const s = mkState(false);
    expect(s.phase).toBe('day');
    expect(s.phasedMode).toBe(false);
  });

  it('phasedMode: al llegar al anochecer la sim pausa en preparation sin avanzar tick', () => {
    let s = { ...mkState(true), tick: TICKS_PER_DAY - 1 }; // 479: último tick del día
    const out = tick(s);
    expect(out.phase).toBe('preparation');
    expect(out.tick).toBe(TICKS_PER_DAY - 1); // congelado en el anochecer
  });

  it('en preparation, tick() es no-op congelado y determinista', () => {
    let s = { ...mkState(true), tick: TICKS_PER_DAY - 1 };
    const paused = tick(s);
    const frozen1 = tick(paused);
    const frozen2 = tick(frozen1);
    expect(JSON.stringify(frozen1)).toBe(JSON.stringify(paused));
    expect(JSON.stringify(frozen2)).toBe(JSON.stringify(paused));
  });

  it('modo continuo (default): el anochecer NO pausa — el día cruza solo (compat tests viejos)', () => {
    let s = { ...mkState(false), tick: TICKS_PER_DAY - 1 };
    const out = tick(s);
    expect(out.phase).toBe('day');
    expect(out.tick).toBe(TICKS_PER_DAY);
  });

  it('los días intermedios no pausan en phasedMode (solo el anochecer)', () => {
    let s = { ...mkState(true), tick: 100 };
    const out = tick(s);
    expect(out.phase).toBe('day');
    expect(out.tick).toBe(101);
  });
});
