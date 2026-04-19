/**
 * Tests del drafting — Bloque A (4 Elegidos, decisión #2).
 *
 * Contrato:
 *   - 4 slots, 2M + 2F (restricción dura).
 *   - 10 puntos total a repartir.
 *   - 8 arquetipos con coste 2-4 cada uno.
 *   - Género libre por arquetipo (sin arquetipos generizados).
 *   - Todas las funciones puras: no mutan el state recibido.
 */

import { describe, it, expect } from 'vitest';
import {
  startDraft,
  pickArchetype,
  setSex,
  finalizeBlockA,
  ARCHETYPE_COST,
  CHOSEN_BUDGET,
  CHOSEN_SLOTS,
} from '@/lib/drafting';
import { ARCHETYPE, SEX } from '@/lib/npcs';

describe('Constantes de drafting (decisión #2)', () => {
  it('CHOSEN_SLOTS = 4', () => {
    expect(CHOSEN_SLOTS).toBe(4);
  });

  it('CHOSEN_BUDGET = 10 puntos', () => {
    expect(CHOSEN_BUDGET).toBe(10);
  });

  it('cada arquetipo tiene coste entre 2 y 4', () => {
    for (const arch of Object.values(ARCHETYPE)) {
      const c = ARCHETYPE_COST[arch];
      expect(c).toBeGreaterThanOrEqual(2);
      expect(c).toBeLessThanOrEqual(4);
    }
  });

  it('el presupuesto fuerza al menos una mezcla (10 = no todos lo mismo)', () => {
    // Si todos fueran coste 3 → 12 > 10 → obligas mezclar con ≤2.
    // Si todos fueran 2 → 8 < 10 → queda presupuesto para upgrade.
    const costs = Object.values(ARCHETYPE_COST);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    expect(maxCost * CHOSEN_SLOTS).toBeGreaterThan(CHOSEN_BUDGET);
    expect(minCost * CHOSEN_SLOTS).toBeLessThan(CHOSEN_BUDGET);
  });
});

describe('startDraft', () => {
  it('arranca con 4 slots vacíos y 10 puntos', () => {
    const d = startDraft(42);
    expect(d.slots).toHaveLength(4);
    expect(d.slots.every((s) => s.archetype === null && s.sex === null)).toBe(
      true,
    );
    expect(d.budgetRemaining).toBe(10);
    expect(d.seed).toBe(42);
  });
});

describe('pickArchetype — pureza + presupuesto', () => {
  it('asigna arquetipo y descuenta coste sin mutar el original', () => {
    const a = startDraft(1);
    const b = pickArchetype(a, 0, ARCHETYPE.LIDER);
    expect(a.slots[0].archetype).toBeNull(); // original intacto
    expect(b.slots[0].archetype).toBe(ARCHETYPE.LIDER);
    expect(b.budgetRemaining).toBe(10 - ARCHETYPE_COST[ARCHETYPE.LIDER]);
  });

  it('reemplazar un arquetipo devuelve coste anterior', () => {
    const a = startDraft(1);
    const b = pickArchetype(a, 0, ARCHETYPE.LIDER);
    const c = pickArchetype(b, 0, ARCHETYPE.SCOUT);
    expect(c.slots[0].archetype).toBe(ARCHETYPE.SCOUT);
    expect(c.budgetRemaining).toBe(10 - ARCHETYPE_COST[ARCHETYPE.SCOUT]);
  });

  it('falla si no hay presupuesto suficiente', () => {
    let d = startDraft(1);
    d = pickArchetype(d, 0, ARCHETYPE.LIDER); // 4
    d = pickArchetype(d, 1, ARCHETYPE.CAZADOR); // 3
    d = pickArchetype(d, 2, ARCHETYPE.CURANDERO); // 3
    // Quedan 0 puntos. Slot 3 con coste ≥2 debe fallar.
    expect(() => pickArchetype(d, 3, ARCHETYPE.SCOUT)).toThrow(/presupuesto/i);
  });

  it('slotIdx fuera de rango → error', () => {
    const d = startDraft(1);
    expect(() => pickArchetype(d, 4, ARCHETYPE.LIDER)).toThrow(/slot/i);
    expect(() => pickArchetype(d, -1, ARCHETYPE.LIDER)).toThrow(/slot/i);
  });
});

describe('setSex — 2M+2F', () => {
  it('asigna sexo sin tocar arquetipo ni presupuesto', () => {
    const a = startDraft(1);
    const b = pickArchetype(a, 0, ARCHETYPE.LIDER);
    const c = setSex(b, 0, SEX.F);
    expect(c.slots[0].archetype).toBe(ARCHETYPE.LIDER);
    expect(c.slots[0].sex).toBe(SEX.F);
    expect(c.budgetRemaining).toBe(b.budgetRemaining);
  });
});

describe('finalizeBlockA — invariantes duras', () => {
  function fullValidDraft() {
    let d = startDraft(1);
    d = pickArchetype(d, 0, ARCHETYPE.LIDER); // 4
    d = pickArchetype(d, 1, ARCHETYPE.SCOUT); // 2
    d = pickArchetype(d, 2, ARCHETYPE.RECOLECTOR); // 2
    d = pickArchetype(d, 3, ARCHETYPE.TEJEDOR); // 2
    d = setSex(d, 0, SEX.M);
    d = setSex(d, 1, SEX.M);
    d = setSex(d, 2, SEX.F);
    d = setSex(d, 3, SEX.F);
    return d;
  }

  it('happy path → devuelve 4 NPCs Elegidos tramuntana', () => {
    const d = fullValidDraft();
    const npcs = finalizeBlockA(d);
    expect(npcs).toHaveLength(4);
    expect(npcs.every((n) => n.casta === 'elegido')).toBe(true);
    expect(npcs.every((n) => n.linaje === 'tramuntana')).toBe(true);
    expect(npcs.filter((n) => n.sex === SEX.M)).toHaveLength(2);
    expect(npcs.filter((n) => n.sex === SEX.F)).toHaveLength(2);
  });

  it('falla si algún slot sin arquetipo', () => {
    let d = fullValidDraft();
    d = { ...d, slots: [{ ...d.slots[0], archetype: null }, ...d.slots.slice(1)] };
    expect(() => finalizeBlockA(d)).toThrow(/arquetipo/i);
  });

  it('falla si algún slot sin sexo', () => {
    let d = fullValidDraft();
    d = { ...d, slots: [{ ...d.slots[0], sex: null }, ...d.slots.slice(1)] };
    expect(() => finalizeBlockA(d)).toThrow(/sexo/i);
  });

  it('falla con 3M+1F', () => {
    let d = startDraft(1);
    d = pickArchetype(d, 0, ARCHETYPE.LIDER);
    d = pickArchetype(d, 1, ARCHETYPE.SCOUT);
    d = pickArchetype(d, 2, ARCHETYPE.RECOLECTOR);
    d = pickArchetype(d, 3, ARCHETYPE.TEJEDOR);
    d = setSex(d, 0, SEX.M);
    d = setSex(d, 1, SEX.M);
    d = setSex(d, 2, SEX.M);
    d = setSex(d, 3, SEX.F);
    expect(() => finalizeBlockA(d)).toThrow(/2M\+2F|género/i);
  });

  it('falla con budget excedido (no debería ocurrir vía pickArchetype pero validamos)', () => {
    const d = {
      seed: 1,
      slots: [
        { archetype: ARCHETYPE.LIDER, sex: SEX.M }, // 4
        { archetype: ARCHETYPE.LIDER, sex: SEX.M }, // 4
        { archetype: ARCHETYPE.LIDER, sex: SEX.F }, // 4
        { archetype: ARCHETYPE.LIDER, sex: SEX.F }, // 4 → total 16 > 10
      ],
      budgetRemaining: -6,
    };
    expect(() => finalizeBlockA(d)).toThrow(/presupuesto/i);
  });
});

describe('Determinismo del drafting', () => {
  it('mismo seed + mismas operaciones → mismos NPCs (ids incluidos)', () => {
    function run(seed: number) {
      let d = startDraft(seed);
      d = pickArchetype(d, 0, ARCHETYPE.LIDER);
      d = pickArchetype(d, 1, ARCHETYPE.SCOUT);
      d = pickArchetype(d, 2, ARCHETYPE.RECOLECTOR);
      d = pickArchetype(d, 3, ARCHETYPE.TEJEDOR);
      d = setSex(d, 0, SEX.M);
      d = setSex(d, 1, SEX.M);
      d = setSex(d, 2, SEX.F);
      d = setSex(d, 3, SEX.F);
      return finalizeBlockA(d);
    }
    const a = run(42);
    const b = run(42);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('seeds distintos → ids distintos', () => {
    function idsFor(seed: number) {
      let d = startDraft(seed);
      d = pickArchetype(d, 0, ARCHETYPE.LIDER);
      d = pickArchetype(d, 1, ARCHETYPE.SCOUT);
      d = pickArchetype(d, 2, ARCHETYPE.RECOLECTOR);
      d = pickArchetype(d, 3, ARCHETYPE.TEJEDOR);
      d = setSex(d, 0, SEX.M);
      d = setSex(d, 1, SEX.M);
      d = setSex(d, 2, SEX.F);
      d = setSex(d, 3, SEX.F);
      return finalizeBlockA(d).map((n) => n.id);
    }
    expect(idsFor(1)).not.toEqual(idsFor(2));
  });
});
