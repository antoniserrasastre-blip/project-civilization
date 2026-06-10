/**
 * Suite de diseño TDD — Sprint 02: ciclo completo determinista.
 *
 * Contrato (spec 02_maquina-de-fases):
 *  - Partida = seed + historial de assignments. Mismo seed + mismos designios
 *    × 5 días → estado final BYTE-IDÉNTICO en dos ejecuciones independientes.
 *  - El ciclo día→preparación→amanecer→día se repite sin intervención manual
 *    del tick (solo applyAssignments en cada anochecer).
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { applyAssignments, type Assignments } from '@/lib/dawn';
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

function runCampaign(seed: number, plan: Assignments[], days: number) {
  const npcs = [
    makeTestNPC({ id: 'ana', position: { x: 5, y: 5 }, stats: { supervivencia: 90, socializacion: 80, proposito: 90, miedo: 10 }, inventory: makeFullInventory({ berry: 2000 }) }),
    makeTestNPC({ id: 'bru', position: { x: 6, y: 6 }, stats: { supervivencia: 90, socializacion: 80, proposito: 90, miedo: 10 }, inventory: makeFullInventory({ berry: 2000 }) }),
  ];
  let s = {
    ...initialGameState(seed, npcs, mkFlatWorld(), 'stone', { skipSpawning: true }),
    phasedMode: true,
  };
  for (let day = 0; day < days; day++) {
    let guard = 0;
    while (s.phase !== 'preparation') {
      s = tick(s);
      if (++guard > TICKS_PER_DAY + 5) throw new Error(`día ${day}: nunca llegó a preparation`);
    }
    s = applyAssignments(s, plan[day % plan.length]);
  }
  return s;
}

describe('Sprint 02 — ciclo completo: seed + designios = partida', () => {
  it('5 días con el mismo plan → estado final byte-idéntico en dos ejecuciones', () => {
    const plan: Assignments[] = [
      { ana: 'exploracion', bru: 'recoleccion' },
      { ana: 'recoleccion', bru: 'construccion' },
    ];
    const a = runCampaign(42, plan, 5);
    const b = runCampaign(42, plan, 5);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.tick).toBe(5 * TICKS_PER_DAY);
    expect(a.phase).toBe('day');
    expect(a.assignmentsHistory).toHaveLength(5);
  });

  it('planes distintos → historiales distintos (el historial ES la partida)', () => {
    const a = runCampaign(42, [{ ana: 'exploracion' }], 3);
    const b = runCampaign(42, [{ ana: 'construccion' }], 3);
    expect(a.assignmentsHistory).not.toEqual(b.assignmentsHistory);
  });
});
