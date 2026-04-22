/**
 * Tests de Fe — Sprint #1 Fase 5 (§3.7b vision-primigenia).
 *
 * Fe es la moneda pasiva que permite **cambiar de susurro**
 * (coste 80) o **silenciar deliberadamente** (coste 40). Se genera
 * como `sqrt(vivos)` por día. Constantes (cap 160, inicial 30)
 * pinchadas por el Director en §3.7b.
 *
 * Módulo puro §A4 — sin side effects, sin PRNG, sin Date.now().
 */

import { describe, it, expect } from 'vitest';
import {
  FAITH_COST_CHANGE,
  FAITH_COST_SILENCE,
  FAITH_CAP,
  FAITH_INITIAL,
  faithPerDay,
  faithPerTick,
  applyFaithDelta,
  spendFaith,
  canAfford,
} from '@/lib/faith';
import { TICKS_PER_DAY } from '@/lib/resources';
import { initialVillageState } from '@/lib/village';

describe('Constantes §3.7b', () => {
  it('costes fijos: 80 cambio, 40 silencio', () => {
    expect(FAITH_COST_CHANGE).toBe(80);
    expect(FAITH_COST_SILENCE).toBe(40);
  });

  it('cap 160 (2× coste cambio) y Fe inicial 30', () => {
    expect(FAITH_CAP).toBe(160);
    expect(FAITH_INITIAL).toBe(30);
  });

  it('inicial < coste silencio (colchón no alcanza)', () => {
    expect(FAITH_INITIAL).toBeLessThan(FAITH_COST_SILENCE);
  });
});

describe('faithPerDay — fórmula sqrt(vivos)', () => {
  it('0 vivos → 0 Fe/día', () => {
    expect(faithPerDay(0)).toBe(0);
  });

  it('1 vivo → 1 Fe/día', () => {
    expect(faithPerDay(1)).toBeCloseTo(1, 5);
  });

  it('14 vivos (arranque) → ~3.74 Fe/día', () => {
    expect(faithPerDay(14)).toBeCloseTo(Math.sqrt(14), 5);
  });

  it('100 vivos → 10 Fe/día exacto', () => {
    expect(faithPerDay(100)).toBeCloseTo(10, 5);
  });

  it('monotonicidad: más vivos nunca genera menos Fe', () => {
    for (let n = 1; n < 100; n++) {
      expect(faithPerDay(n + 1)).toBeGreaterThanOrEqual(faithPerDay(n));
    }
  });

  it('sublineal: doblar vivos no dobla Fe (50 vivos < 2× de 25)', () => {
    expect(faithPerDay(50)).toBeLessThan(faithPerDay(25) * 2);
  });
});

describe('faithPerTick — rate por tick consistente con día', () => {
  it('faithPerTick(n) * TICKS_PER_DAY = faithPerDay(n)', () => {
    for (const n of [0, 1, 5, 14, 50, 100]) {
      const byTick = faithPerTick(n) * TICKS_PER_DAY;
      expect(byTick).toBeCloseTo(faithPerDay(n), 5);
    }
  });
});

describe('applyFaithDelta — clamp [0, FAITH_CAP]', () => {
  it('suma normal', () => {
    const v = { ...initialVillageState(), faith: 50 };
    expect(applyFaithDelta(v, 20).faith).toBe(70);
  });

  it('clamp superior en FAITH_CAP', () => {
    const v = { ...initialVillageState(), faith: FAITH_CAP - 5 };
    expect(applyFaithDelta(v, 100).faith).toBe(FAITH_CAP);
  });

  it('clamp inferior en 0', () => {
    const v = { ...initialVillageState(), faith: 5 };
    expect(applyFaithDelta(v, -100).faith).toBe(0);
  });

  it('no muta el input', () => {
    const v = { ...initialVillageState(), faith: 50 };
    const snap = JSON.stringify(v);
    applyFaithDelta(v, 20);
    expect(JSON.stringify(v)).toBe(snap);
  });
});

describe('canAfford', () => {
  it('true cuando faith >= amount', () => {
    const v = { ...initialVillageState(), faith: 80 };
    expect(canAfford(v, FAITH_COST_CHANGE)).toBe(true);
  });

  it('false cuando faith < amount', () => {
    const v = { ...initialVillageState(), faith: 79 };
    expect(canAfford(v, FAITH_COST_CHANGE)).toBe(false);
  });
});

describe('spendFaith', () => {
  it('descuenta la cantidad exacta', () => {
    const v = { ...initialVillageState(), faith: 100 };
    expect(spendFaith(v, FAITH_COST_CHANGE).faith).toBe(20);
  });

  it('tira si insuficiente', () => {
    const v = { ...initialVillageState(), faith: 10 };
    expect(() => spendFaith(v, FAITH_COST_CHANGE)).toThrow(/insuficiente/i);
  });

  it('tira si amount <= 0', () => {
    const v = { ...initialVillageState(), faith: 50 };
    expect(() => spendFaith(v, 0)).toThrow(/debe ser > 0/i);
    expect(() => spendFaith(v, -5)).toThrow(/debe ser > 0/i);
  });
});

describe('§A4 — round-trip JSON sobre Fe', () => {
  it('village con faith sobrevive JSON.parse(JSON.stringify())', () => {
    const v = { ...initialVillageState(), faith: 123 };
    const round = JSON.parse(JSON.stringify(v));
    expect(round.faith).toBe(123);
  });
});
