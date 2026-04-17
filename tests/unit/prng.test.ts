/**
 * Tests del PRNG determinista.
 *
 * Si esto falla, todo lo demás también. El PRNG es el cimiento del
 * contrato §A4: "same seed + same cursor ⇒ same value, always".
 */

import { describe, it, expect } from 'vitest';
import {
  next,
  nextRange,
  nextInt,
  nextChoice,
  seedState,
} from '@/lib/prng';

describe('next — contrato básico', () => {
  it('devuelve un valor en [0, 1)', () => {
    const { value } = next(seedState(42));
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('avanza el cursor en 1', () => {
    const { next: n } = next(seedState(42));
    expect(n.cursor).toBe(1);
  });

  it('preserva la seed', () => {
    const { next: n } = next(seedState(42));
    expect(n.seed).toBe(42);
  });

  it('NO muta el argumento', () => {
    const before = seedState(42);
    next(before);
    expect(before.cursor).toBe(0);
  });
});

describe('next — determinismo', () => {
  // Éste es EL test que valida el contrato §A4. Si falla, ningún otro
  // sistema puede confiar en reproducibilidad.

  it('mismo seed + mismo cursor ⇒ mismo valor', () => {
    const a = next({ seed: 42, cursor: 5 });
    const b = next({ seed: 42, cursor: 5 });
    expect(a.value).toBe(b.value);
  });

  it('seeds distintos producen flujos distintos', () => {
    const a = next(seedState(1));
    const b = next(seedState(2));
    expect(a.value).not.toBe(b.value);
  });

  it('cursors distintos producen valores distintos', () => {
    const a = next({ seed: 42, cursor: 0 });
    const b = next({ seed: 42, cursor: 1 });
    expect(a.value).not.toBe(b.value);
  });

  it('salto arbitrario ⇒ mismo valor que iterar hasta ese cursor', () => {
    // Crítico: nos permite "saltar" a una posición sin iterar desde 0.
    // Si esto se rompe, replay parcial y debug en punto arbitrario fallan.
    let s = seedState(42);
    for (let i = 0; i < 99; i++) s = next(s).next;
    const iterated = next(s).value;

    const jumped = next({ seed: 42, cursor: 99 }).value;
    expect(iterated).toBe(jumped);
  });
});

describe('nextRange', () => {
  it('valor dentro de [min, max)', () => {
    for (let cursor = 0; cursor < 200; cursor++) {
      const { value } = nextRange({ seed: 7, cursor }, 10, 20);
      expect(value).toBeGreaterThanOrEqual(10);
      expect(value).toBeLessThan(20);
    }
  });
});

describe('nextInt', () => {
  it('valor entero en [min, maxExclusive)', () => {
    for (let cursor = 0; cursor < 500; cursor++) {
      const { value } = nextInt({ seed: 3, cursor }, 0, 50);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(50);
    }
  });
});

describe('nextChoice', () => {
  const fruits = ['apple', 'banana', 'cherry'] as const;

  it('devuelve un elemento del array', () => {
    for (let cursor = 0; cursor < 100; cursor++) {
      const { value } = nextChoice({ seed: 11, cursor }, fruits);
      expect(fruits).toContain(value);
    }
  });

  it('lanza con array vacío', () => {
    expect(() => nextChoice(seedState(1), [])).toThrow();
  });
});
