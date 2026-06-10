/**
 * Suite de diseño TDD — Sprint 02: pipeline del amanecer explícito.
 *
 * Contrato (spec 02_maquina-de-fases + enmienda v2):
 *  - El orden del amanecer es DATO exportado (`DAWN_PIPELINE`), nunca implícito.
 *  - Orden fijo: gratitud-amanecer → noches-fogata → friccion-divina →
 *    consolidar-xp (stub s03) → informe-amanecer (stub s04) → reset-diario → clima.
 *  - `dawn(state)` aplica el pipeline, deja `phase: 'day'` y es pura (§A4).
 *  - Invariante blindado: `gratitudeEarnedToday === 0` SIEMPRE tras dawn.
 */

import { describe, it, expect } from 'vitest';
import { dawn, DAWN_PIPELINE } from '@/lib/dawn';
import { initialGameState } from '@/lib/game-state';
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

function mkDuskState() {
  const npc = makeTestNPC({
    id: 'a',
    position: { x: 5, y: 5 },
    stats: { supervivencia: 90, socializacion: 80, proposito: 90, miedo: 10 },
    inventory: makeFullInventory({ berry: 200 }),
  });
  const base = initialGameState(7, [npc], mkFlatWorld(), 'stone', { skipSpawning: true });
  return { ...base, tick: 479, phase: 'preparation' as const, phasedMode: true };
}

describe('Sprint 02 — pipeline del amanecer (orden como dato, §A4)', () => {
  it('DAWN_PIPELINE documenta el orden exacto acordado', () => {
    expect(DAWN_PIPELINE.map((s) => s.name)).toEqual([
      'gratitud-amanecer',
      'noches-fogata',
      'friccion-divina',
      'consolidar-xp',
      'informe-amanecer',
      'reset-diario',
      'clima',
    ]);
  });

  it('invariante: gratitudeEarnedToday === 0 SIEMPRE tras dawn, aunque el día cerrara con acumulado', () => {
    const s = mkDuskState();
    const dirty = {
      ...s,
      village: { ...s.village, gratitudeEarnedToday: 37 },
    };
    const out = dawn(dirty);
    expect(out.village.gratitudeEarnedToday).toBe(0);
  });

  it('dawn es pura y determinista: no muta el input; mismo input → mismo output', () => {
    const s = mkDuskState();
    const pre = JSON.stringify(s);
    const o1 = dawn(s);
    const o2 = dawn(s);
    expect(JSON.stringify(s)).toBe(pre); // pureza
    expect(JSON.stringify(o1)).toBe(JSON.stringify(o2)); // determinismo
  });

  it('dawn deja phase = day y el estado round-trippea por JSON sin pérdida', () => {
    const out = dawn(mkDuskState());
    expect(out.phase).toBe('day');
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });
});
