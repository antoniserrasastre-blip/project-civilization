/**
 * PRNG determinista puro para GODGAME.
 *
 * Variante "funcional" de mulberry32: en vez de guardar estado en una
 * clausura mutable, cada llamada recibe `{seed, cursor}` y devuelve el
 * valor + el siguiente estado. Esto es lo que permite que:
 *
 *   - `JSON.stringify(worldState)` sea round-trip perfecto (no hay
 *     clases, no hay funciones ocultas).
 *   - Un mismo `{seed, cursor}` SIEMPRE produzca el mismo valor —
 *     requisito duro del Apéndice §A4 para replay y tests reproducibles.
 *   - Los "eventos forzados" del onboarding consuman del mismo pool
 *     que el resto de la simulación, sin canales paralelos.
 *
 * Rango de valor: [0, 1) como Math.random, pero determinista.
 */

export interface PRNGState {
  /** Semilla fija, inmutable durante la partida. */
  seed: number;
  /** Posición actual del flujo. Se incrementa en cada consumo. */
  cursor: number;
}

/**
 * Devuelve el siguiente valor pseudo-aleatorio en [0, 1) y el cursor
 * avanzado en 1. Nunca muta el argumento.
 *
 * Implementación: mulberry32 aplicado a `seed ⊕ cursor` para que cada
 * posición del flujo dé un valor distinto e independiente del cursor
 * anterior. Esto permite "saltar" a una posición arbitraria sin tener
 * que iterar desde 0, lo cual es útil para tests y para replay parcial.
 */
export function next(state: PRNGState): { value: number; next: PRNGState } {
  // Mezcla de seed y cursor. El XOR previene que dos pares (seed, cursor)
  // distintos pero cuya suma coincide den el mismo resultado inicial.
  let a = ((state.seed ^ (state.cursor * 0x9e3779b1)) + 0x6d2b79f5) | 0;
  a = Math.imul(a ^ (a >>> 15), 1 | a);
  a = (a + Math.imul(a ^ (a >>> 7), 61 | a)) ^ a;
  const value = ((a ^ (a >>> 14)) >>> 0) / 4294967296;
  return {
    value,
    next: { seed: state.seed, cursor: state.cursor + 1 },
  };
}

/** Devuelve un flotante uniforme en [min, max) y el siguiente estado. */
export function nextRange(
  state: PRNGState,
  min: number,
  max: number,
): { value: number; next: PRNGState } {
  const { value, next: n } = next(state);
  return { value: min + value * (max - min), next: n };
}

/** Devuelve un entero uniforme en [min, maxExclusive) y el siguiente estado. */
export function nextInt(
  state: PRNGState,
  min: number,
  maxExclusive: number,
): { value: number; next: PRNGState } {
  const { value, next: n } = nextRange(state, min, maxExclusive);
  return { value: Math.floor(value), next: n };
}

/** Elige un elemento uniformemente de un array no-vacío. */
export function nextChoice<T>(
  state: PRNGState,
  arr: readonly T[],
): { value: T; next: PRNGState } {
  if (arr.length === 0) {
    throw new Error('nextChoice: array vacío');
  }
  const { value: idx, next: n } = nextInt(state, 0, arr.length);
  return { value: arr[idx], next: n };
}

/** Atajo para crear un estado nuevo desde una semilla. Cursor empieza en 0. */
export function seedState(seed: number): PRNGState {
  return { seed: seed | 0, cursor: 0 };
}
