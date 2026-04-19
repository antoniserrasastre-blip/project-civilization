/**
 * Tests del drafting Bloque B (10 Ciudadanos, decisión #3).
 *
 * Contrato:
 *   - 10 picks pick-1-of-10 en 4 tiers descendentes (3+3+2+2).
 *   - Candidatos generados deterministicamente desde
 *     draft.seed + tier + pantallaIdx.
 *   - Todos los drafteados quedan Ciudadanos (nunca Esclavo —
 *     decisión #6: la esclavitud solo emerge por evento).
 *   - 2-4 linajes presentes, Tramuntana reservado para Elegidos
 *     (decisión #14).
 *   - Variedad de stats descendente por tier (playtest: evita élite
 *     uniforme).
 */

import { describe, it, expect } from 'vitest';
import {
  startFollowerDraft,
  generateCandidates,
  pickFollower,
  finalizeBlockB,
  FOLLOWER_TIERS,
  TIER_CANDIDATE_COUNT,
} from '@/lib/drafting';
import { CASTA, LINAJE } from '@/lib/npcs';

describe('Constantes Bloque B', () => {
  it('FOLLOWER_TIERS tiene 4 tiers con reparto 3+3+2+2', () => {
    expect(FOLLOWER_TIERS.map((t) => t.picks)).toEqual([3, 3, 2, 2]);
    expect(FOLLOWER_TIERS.reduce((a, t) => a + t.picks, 0)).toBe(10);
    expect(FOLLOWER_TIERS.map((t) => t.label)).toEqual([
      'excelente',
      'bueno',
      'regular',
      'malo',
    ]);
  });

  it('cada pantalla son 10 candidatos (pick-1-of-10)', () => {
    expect(TIER_CANDIDATE_COUNT).toBe(10);
  });
});

describe('generateCandidates — determinismo', () => {
  it('mismo seed + tier + pantalla → mismos candidatos byte-idéntico', () => {
    const a = generateCandidates(42, 'excelente', 0);
    const b = generateCandidates(42, 'excelente', 0);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('distintos tier → candidatos distintos', () => {
    const ex = generateCandidates(42, 'excelente', 0);
    const ma = generateCandidates(42, 'malo', 0);
    expect(JSON.stringify(ex)).not.toBe(JSON.stringify(ma));
  });

  it('genera exactamente 10 candidatos', () => {
    expect(generateCandidates(42, 'excelente', 0)).toHaveLength(10);
  });

  it('ningún candidato en linaje Tramuntana (reservado Elegidos)', () => {
    for (const tier of ['excelente', 'bueno', 'regular', 'malo'] as const) {
      for (let p = 0; p < 3; p++) {
        const cs = generateCandidates(42, tier, p);
        for (const c of cs) {
          expect(c.linaje).not.toBe(LINAJE.TRAMUNTANA);
        }
      }
    }
  });
});

describe('Descenso de stats por tier', () => {
  it('excelente > bueno > regular > malo en stats medianos', () => {
    const medStats = (tier: 'excelente' | 'bueno' | 'regular' | 'malo') => {
      const cs = generateCandidates(42, tier, 0);
      return (
        cs.reduce((acc, c) => acc + c.stats.supervivencia, 0) / cs.length
      );
    };
    const ex = medStats('excelente');
    const bu = medStats('bueno');
    const re = medStats('regular');
    const ma = medStats('malo');
    expect(ex).toBeGreaterThan(bu);
    expect(bu).toBeGreaterThan(re);
    expect(re).toBeGreaterThan(ma);
  });
});

describe('pickFollower / finalizeBlockB', () => {
  function runFullBlockB(seed: number) {
    let st = startFollowerDraft(seed);
    for (const tier of FOLLOWER_TIERS) {
      for (let p = 0; p < tier.picks; p++) {
        const cands = generateCandidates(seed, tier.label, p);
        // Elige siempre el primer candidato (test determinista).
        st = pickFollower(st, cands[0]);
      }
    }
    return finalizeBlockB(st);
  }

  it('happy path → 10 NPCs Ciudadanos', () => {
    const npcs = runFullBlockB(42);
    expect(npcs).toHaveLength(10);
    expect(npcs.every((n) => n.casta === CASTA.CIUDADANO)).toBe(true);
  });

  it('nadie es Esclavo (decisión #6)', () => {
    const npcs = runFullBlockB(42);
    expect(npcs.every((n) => n.casta !== CASTA.ESCLAVO)).toBe(true);
  });

  it('linajes presentes ∈ [2, 4] y nunca Tramuntana', () => {
    const npcs = runFullBlockB(42);
    const linajes = new Set(npcs.map((n) => n.linaje));
    expect(linajes.size).toBeGreaterThanOrEqual(2);
    expect(linajes.size).toBeLessThanOrEqual(4);
    expect(linajes.has(LINAJE.TRAMUNTANA)).toBe(false);
  });

  it('finalizeBlockB falla si picks < 10', () => {
    const st = startFollowerDraft(42);
    expect(() => finalizeBlockB(st)).toThrow(/10 picks/i);
  });

  it('determinismo end-to-end: mismo seed → mismos 10 NPCs', () => {
    const a = runFullBlockB(1);
    const b = runFullBlockB(1);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
