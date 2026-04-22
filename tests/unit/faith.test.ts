/**
 * Tests del módulo de Fe — Sprint #1 REFACTOR-SUSURRO-FE
 * (vision-primigenia §3.7b — Fe como moneda de cambio).
 *
 * Red primero: lib/faith.ts no existe aún. Estos tests describen el
 * contrato que la implementación debe cumplir.
 */

import { describe, it, expect } from 'vitest';
import {
  faithPerDay,
  FAITH_CAP,
  FAITH_COST_CHANGE,
  FAITH_COST_SILENCE,
  FAITH_INITIAL,
  SILENCE_GRACE_DAYS,
  accumulateFaithDaily,
  canAffordChange,
  canAffordSilence,
  spendFaithForChange,
  spendFaithForSilence,
  tickSilenceGraceDay,
  isFirstWhisper,
} from '@/lib/faith';
import { initialVillageState } from '@/lib/village';
import { MESSAGE_INTENTS, SILENCE } from '@/lib/messages';

describe('Constantes §3.7b', () => {
  it('FAITH_COST_CHANGE = 80', () => {
    expect(FAITH_COST_CHANGE).toBe(80);
  });
  it('FAITH_COST_SILENCE = 40', () => {
    expect(FAITH_COST_SILENCE).toBe(40);
  });
  it('FAITH_CAP = 160 (2× coste de cambio, anti-banking)', () => {
    expect(FAITH_CAP).toBe(160);
    expect(FAITH_CAP).toBe(2 * FAITH_COST_CHANGE);
  });
  it('FAITH_INITIAL = 30 (colchón de arranque sin alcanzar cambio)', () => {
    expect(FAITH_INITIAL).toBe(30);
    expect(FAITH_INITIAL).toBeLessThan(FAITH_COST_CHANGE);
    expect(FAITH_INITIAL).toBeLessThan(FAITH_COST_SILENCE);
  });
  it('SILENCE_GRACE_DAYS = 7 (gracia inicial §3.7)', () => {
    expect(SILENCE_GRACE_DAYS).toBe(7);
  });
  it('asimetría silencio+hablar sigue siendo más cara que cambio directo', () => {
    // 40 (silencio) + 80 (hablar) = 120 > 80 (cambio). No explotable.
    expect(FAITH_COST_SILENCE + FAITH_COST_CHANGE).toBeGreaterThan(
      FAITH_COST_CHANGE,
    );
  });
});

describe('faithPerDay(vivos) — fórmula sqrt(alive)', () => {
  it('0 vivos → 0 Fe (clan extinto no reza)', () => {
    expect(faithPerDay(0)).toBe(0);
  });
  it('negativo → 0 (defensivo)', () => {
    expect(faithPerDay(-5)).toBe(0);
  });
  it('sqrt de count natural', () => {
    expect(faithPerDay(1)).toBe(1);
    expect(faithPerDay(4)).toBe(2);
    expect(faithPerDay(9)).toBe(3);
  });
  it('arranque 14 NPCs ≈ 3.74 (tabla §3.7b)', () => {
    expect(faithPerDay(14)).toBeCloseTo(3.7416, 3);
  });
  it('50 NPCs ≈ 7.07', () => {
    expect(faithPerDay(50)).toBeCloseTo(7.0711, 3);
  });
  it('monotonía no-decreciente', () => {
    for (let n = 0; n < 100; n++) {
      expect(faithPerDay(n + 1)).toBeGreaterThanOrEqual(faithPerDay(n));
    }
  });
  it('determinismo — misma entrada, mismo output', () => {
    for (let n = 0; n < 100; n++) {
      expect(faithPerDay(n)).toBe(faithPerDay(n));
    }
  });
});

describe('accumulateFaithDaily — acumulación con cap', () => {
  it('añade faithPerDay(vivos) al pool', () => {
    const v = { ...initialVillageState(), faith: 10 };
    const after = accumulateFaithDaily(v, 14);
    expect(after.faith).toBeCloseTo(10 + faithPerDay(14), 3);
  });
  it('clamp al FAITH_CAP', () => {
    const v = { ...initialVillageState(), faith: FAITH_CAP - 1 };
    const after = accumulateFaithDaily(v, 50);
    expect(after.faith).toBe(FAITH_CAP);
  });
  it('ya en cap → no cambia', () => {
    const v = { ...initialVillageState(), faith: FAITH_CAP };
    expect(accumulateFaithDaily(v, 100).faith).toBe(FAITH_CAP);
  });
  it('0 vivos → no acumula', () => {
    const v = { ...initialVillageState(), faith: 42 };
    expect(accumulateFaithDaily(v, 0).faith).toBe(42);
  });
  it('pureza — no muta el original', () => {
    const v = { ...initialVillageState(), faith: 10 };
    accumulateFaithDaily(v, 14);
    expect(v.faith).toBe(10);
  });
});

describe('canAfford / spend — coste de susurro', () => {
  it('canAffordChange true si pool >= 80', () => {
    const v = { ...initialVillageState(), faith: 80 };
    expect(canAffordChange(v)).toBe(true);
  });
  it('canAffordChange false si pool < 80', () => {
    const v = { ...initialVillageState(), faith: 79 };
    expect(canAffordChange(v)).toBe(false);
  });
  it('canAffordSilence true si pool >= 40', () => {
    const v = { ...initialVillageState(), faith: 40 };
    expect(canAffordSilence(v)).toBe(true);
  });
  it('canAffordSilence false si pool < 40', () => {
    const v = { ...initialVillageState(), faith: 39 };
    expect(canAffordSilence(v)).toBe(false);
  });
  it('spendFaithForChange resta 80', () => {
    const v = { ...initialVillageState(), faith: 100 };
    expect(spendFaithForChange(v).faith).toBe(20);
  });
  it('spendFaithForSilence resta 40', () => {
    const v = { ...initialVillageState(), faith: 100 };
    expect(spendFaithForSilence(v).faith).toBe(60);
  });
  it('spendFaithForChange tira si insuficiente', () => {
    const v = { ...initialVillageState(), faith: 50 };
    expect(() => spendFaithForChange(v)).toThrow(/fe insuficiente/i);
  });
  it('spendFaithForSilence tira si insuficiente', () => {
    const v = { ...initialVillageState(), faith: 10 };
    expect(() => spendFaithForSilence(v)).toThrow(/fe insuficiente/i);
  });
});

describe('tickSilenceGraceDay — gracia inicial decrece', () => {
  it('decrementa 1 por llamada, clamp en 0', () => {
    const v0 = { ...initialVillageState(), silenceGraceDaysRemaining: 7 };
    const v1 = tickSilenceGraceDay(v0);
    expect(v1.silenceGraceDaysRemaining).toBe(6);
    const v2 = tickSilenceGraceDay(v1);
    expect(v2.silenceGraceDaysRemaining).toBe(5);
  });
  it('no baja de 0', () => {
    const v = { ...initialVillageState(), silenceGraceDaysRemaining: 0 };
    expect(tickSilenceGraceDay(v).silenceGraceDaysRemaining).toBe(0);
  });
  it('pureza — no muta input', () => {
    const v = { ...initialVillageState(), silenceGraceDaysRemaining: 3 };
    tickSilenceGraceDay(v);
    expect(v.silenceGraceDaysRemaining).toBe(3);
  });
});

describe('isFirstWhisper — primer susurro gratis §3.7', () => {
  it('historial vacío → true', () => {
    expect(isFirstWhisper([])).toBe(true);
  });
  it('historial con ≥1 entrada → false', () => {
    expect(
      isFirstWhisper([{ day: 0, intent: MESSAGE_INTENTS.CORAJE }]),
    ).toBe(false);
  });
  it('historial con silencio archivado también cuenta (no es gratis)', () => {
    expect(isFirstWhisper([{ day: 0, intent: SILENCE }])).toBe(false);
  });
});

describe('Determinismo §A4 — round-trip', () => {
  it('village con faith+grace round-trippea', () => {
    const v = { ...initialVillageState(), faith: 42.5, silenceGraceDaysRemaining: 3 };
    const reparsed = JSON.parse(JSON.stringify(v));
    expect(reparsed).toEqual(v);
  });
});
