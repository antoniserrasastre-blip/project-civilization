/**
 * Tests del dilema nuclear — v1.0.1 decisión #5.
 *
 * Contrato (DECISIONS-PENDING.md bloque 5, opción A — simple, sin
 * radiación previa; la microconsecuencia queda como extension v1.4):
 *   - `state.nuclear_decision: 'given' | 'withheld' | null` — default null.
 *   - `hasNuclearDilemma(state)` ⇒ true cuando `fision_nuclear` se ha
 *     descubierto y `nuclear_decision === null`.
 *   - `decideNuclear(state, choice)` registra la decisión (puro).
 *   - La decisión solo se puede tomar una vez. Segundos intentos son
 *     no-op silencioso.
 *   - Crónica partisana al decidir — SÍ: "La sombra cae sobre todos."
 *     NO: "Los nuestros guardan el secreto. Por ahora."
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import {
  hasNuclearDilemma,
  decideNuclear,
} from '@/lib/nuclear';

describe('estado nuclear inicial', () => {
  it('nuclear_decision es null en initialState', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    expect(s.nuclear_decision).toBeNull();
  });

  it('hasNuclearDilemma=false sin fision_nuclear descubierto', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    expect(hasNuclearDilemma(s)).toBe(false);
  });
});

describe('hasNuclearDilemma', () => {
  it('true cuando technologies incluye fision_nuclear y decision=null', () => {
    const s: WorldState = {
      ...initialState(42, { playerGroupId: 'tramuntana' }),
      technologies: ['fuego', 'fision_nuclear'],
    };
    expect(hasNuclearDilemma(s)).toBe(true);
  });

  it('false tras tomar decisión (given o withheld)', () => {
    const base: WorldState = {
      ...initialState(42, { playerGroupId: 'tramuntana' }),
      technologies: ['fuego', 'fision_nuclear'],
      nuclear_decision: 'given',
    };
    expect(hasNuclearDilemma(base)).toBe(false);
    const base2 = { ...base, nuclear_decision: 'withheld' as const };
    expect(hasNuclearDilemma(base2)).toBe(false);
  });
});

describe('decideNuclear', () => {
  it('SÍ (given) registra decisión y emite crónica sombra', () => {
    const base: WorldState = {
      ...initialState(42, { playerGroupId: 'tramuntana' }),
      technologies: ['fuego', 'fision_nuclear'],
    };
    const next = decideNuclear(base, 'given');
    expect(next.nuclear_decision).toBe('given');
    expect(
      next.chronicle.some((e) => /sombra cae|todos/i.test(e.text)),
    ).toBe(true);
  });

  it('NO (withheld) registra decisión y emite crónica secreto', () => {
    const base: WorldState = {
      ...initialState(42, { playerGroupId: 'tramuntana' }),
      technologies: ['fuego', 'fision_nuclear'],
    };
    const next = decideNuclear(base, 'withheld');
    expect(next.nuclear_decision).toBe('withheld');
    expect(
      next.chronicle.some((e) =>
        /secreto|guardan|no concedi/i.test(e.text),
      ),
    ).toBe(true);
  });

  it('segunda invocación es no-op (decisión ya tomada es irrevocable)', () => {
    const base: WorldState = {
      ...initialState(42, { playerGroupId: 'tramuntana' }),
      technologies: ['fuego', 'fision_nuclear'],
    };
    const first = decideNuclear(base, 'given');
    const second = decideNuclear(first, 'withheld');
    expect(second).toBe(first); // mismo objeto, no-op
    expect(second.nuclear_decision).toBe('given'); // intacto
  });

  it('decideNuclear SIN fision_nuclear descubierto es no-op', () => {
    const base = initialState(42, { playerGroupId: 'tramuntana' });
    const after = decideNuclear(base, 'given');
    expect(after).toBe(base); // mismo objeto
  });

  it('pureza: no muta el estado de entrada', () => {
    const s: WorldState = {
      ...initialState(42, { playerGroupId: 'tramuntana' }),
      technologies: ['fuego', 'fision_nuclear'],
    };
    const snap = JSON.stringify(s);
    decideNuclear(s, 'given');
    expect(JSON.stringify(s)).toBe(snap);
  });
});

describe('round-trip JSON tras decidir', () => {
  it('estado con nuclear_decision sobrevive stringify/parse', () => {
    const s: WorldState = {
      ...initialState(42, { playerGroupId: 'tramuntana' }),
      technologies: ['fuego', 'fision_nuclear'],
      nuclear_decision: 'withheld',
    };
    const rt = JSON.parse(JSON.stringify(s));
    expect(rt).toEqual(s);
  });
});
