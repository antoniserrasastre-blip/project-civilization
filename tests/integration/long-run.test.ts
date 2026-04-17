/**
 * Integración: simulación larga (stress-light).
 *
 * En v0.1 no hay nacimientos ni muertes, así que 10k ticks solo ejercen
 * el PRNG + movimiento. El test valida:
 *   - El estado permanece JSON-puro tras 10k ticks.
 *   - No crece la crónica sin control (v0.1 no emite entradas automáticas).
 *   - Determinismo a larga escala: dos corridas de 10k ticks desde la
 *     misma semilla producen el mismo estado byte a byte.
 *
 * Este test es barato (~50ms) pero cubre regresiones sutiles que un tick
 * aislado no vería: drift numérico, crecimiento de memoria, acumulación
 * de logs inesperados.
 */

import { describe, it, expect } from 'vitest';
import { initialState } from '@/lib/world-state';
import { runTicks } from '@/lib/simulation';

describe('integración: corrida larga de 10k ticks', () => {
  it('el estado sigue siendo round-trip-JSON tras 10k ticks', () => {
    const s = runTicks(initialState(42), 10_000);
    const json = JSON.stringify(s);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json)).toEqual(s);
  });

  it('la crónica no crece en v0.1 (no hay eventos automáticos)', () => {
    const s = runTicks(initialState(42), 10_000);
    expect(s.chronicle).toEqual([]);
  });

  it('determinismo a gran escala: dos corridas de 10k ticks son idénticas', () => {
    const a = runTicks(initialState(42), 10_000);
    const b = runTicks(initialState(42), 10_000);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('el día avanza exactamente 10k', () => {
    const s = runTicks(initialState(42), 10_000);
    expect(s.day).toBe(10_000);
  });

  it('los NPCs envejecen exactamente 10k días', () => {
    const s0 = initialState(42);
    const agesBefore = s0.npcs.map((n) => n.age_days);
    const s = runTicks(s0, 10_000);
    s.npcs.forEach((n, i) => {
      expect(n.age_days).toBe(agesBefore[i] + 10_000);
    });
  });
});
