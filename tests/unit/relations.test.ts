/**
 * Tests del grafo de relaciones NPC×NPC — Sprint 4.4.
 * CLAUDE-primigenia §1.
 *
 * Shape: Array<Edge> ordenada canónicamente (type, from, to lex).
 * Ops puras: addDebt, settleFavor, recordSaved.
 * Round-trip JSON obligatorio.
 */

import { describe, it, expect } from 'vitest';
import {
  addDebt,
  settleFavor,
  recordSaved,
  debtBetween,
  type Edge,
} from '@/lib/relations';

describe('addDebt — crea o incrementa edge', () => {
  it('crea nueva edge si no existe', () => {
    const r = addDebt([], 'a', 'b', 5, 10);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      from: 'a',
      to: 'b',
      type: 'debt',
      weight: 5,
      createdAtTick: 10,
    });
  });

  it('incrementa weight si ya existe', () => {
    const step1 = addDebt([], 'a', 'b', 5, 10);
    const step2 = addDebt(step1, 'a', 'b', 3, 20);
    expect(step2).toHaveLength(1);
    expect(step2[0].weight).toBe(8);
    // createdAtTick del original, no el nuevo.
    expect(step2[0].createdAtTick).toBe(10);
  });

  it('debt dirigido: (a→b) ≠ (b→a)', () => {
    const r = addDebt(addDebt([], 'a', 'b', 5, 10), 'b', 'a', 3, 15);
    expect(r).toHaveLength(2);
  });
});

describe('settleFavor — reduce deuda', () => {
  it('reduce weight; si llega a 0 se elimina', () => {
    const edges = addDebt([], 'a', 'b', 10, 1);
    const after = settleFavor(edges, 'a', 'b', 4);
    expect(after[0].weight).toBe(6);

    const settled = settleFavor(after, 'a', 'b', 6);
    expect(settled).toHaveLength(0);
  });

  it('settle over-pago no crea deuda inversa (clamp)', () => {
    const edges = addDebt([], 'a', 'b', 10, 1);
    const after = settleFavor(edges, 'a', 'b', 20);
    // Queda 0 → se elimina. No pasa a negativo.
    expect(after).toHaveLength(0);
  });

  it('settle sobre no-existente es no-op', () => {
    const r = settleFavor([], 'a', 'b', 5);
    expect(r).toEqual([]);
  });
});

describe('recordSaved — edge permanente de salvamento', () => {
  it('registra savior→saved como "saved" permanente', () => {
    const r = recordSaved([], 'savior', 'saved', 42);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      from: 'savior',
      to: 'saved',
      type: 'saved',
      createdAtTick: 42,
    });
    expect(r[0].expiresAtTick).toBeNull();
  });

  it('múltiples salvamentos incrementan weight', () => {
    const r = recordSaved(recordSaved([], 's', 't', 1), 's', 't', 50);
    expect(r).toHaveLength(1);
    expect(r[0].weight).toBe(2);
  });
});

describe('Orden canónico (type, from, to)', () => {
  it('se mantiene tras inserciones desordenadas', () => {
    let e: Edge[] = [];
    e = addDebt(e, 'z', 'a', 1, 0);
    e = addDebt(e, 'b', 'c', 1, 0);
    e = recordSaved(e, 'a', 'b', 0);
    e = addDebt(e, 'a', 'z', 1, 0);
    // Orden esperado: debt (a,z), debt (b,c), debt (z,a), saved (a,b).
    const keys = e.map((x) => `${x.type}:${x.from}→${x.to}`);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
  });
});

describe('debtBetween — consulta derivada', () => {
  it('devuelve weight si existe, 0 si no', () => {
    const e = addDebt([], 'a', 'b', 7, 0);
    expect(debtBetween(e, 'a', 'b')).toBe(7);
    expect(debtBetween(e, 'b', 'a')).toBe(0);
    expect(debtBetween([], 'a', 'b')).toBe(0);
  });
});

describe('Round-trip JSON (§A4)', () => {
  it('edges sobreviven JSON.parse(JSON.stringify)', () => {
    let e: Edge[] = [];
    e = addDebt(e, 'a', 'b', 5, 10);
    e = recordSaved(e, 'b', 'c', 20);
    const after = JSON.parse(JSON.stringify(e));
    expect(after).toEqual(e);
  });
});

describe('Pureza', () => {
  it('ops no mutan input', () => {
    const e: Edge[] = [];
    const snap = JSON.stringify(e);
    addDebt(e, 'a', 'b', 1, 0);
    expect(JSON.stringify(e)).toBe(snap);
  });
});
