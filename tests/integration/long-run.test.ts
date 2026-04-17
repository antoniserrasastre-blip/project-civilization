/**
 * Integración: simulación larga (stress-light).
 *
 * A partir de Sprint 2 el tick dispara eventos de lifecycle: NPCs mueren
 * de viejos, de conflictos, se emparejan y nacen. El test valida:
 *   - El estado permanece JSON-puro tras 10k ticks.
 *   - Determinismo a larga escala: dos corridas de 10k ticks desde la
 *     misma semilla producen el mismo estado byte a byte.
 *   - Pillar 2: el mundo cambia aunque el jugador no toque nada.
 *
 * Este test es barato pero cubre regresiones sutiles que un tick aislado
 * no vería: drift numérico, crecimiento de memoria, acumulación de logs
 * inesperados, y violaciones de invariantes que tardan en aflorar.
 */

import { describe, it, expect } from 'vitest';
import { initialState } from '@/lib/world-state';
import { runTicks, tick } from '@/lib/simulation';

describe('integración: corrida larga de 10k ticks', () => {
  it('el estado sigue siendo round-trip-JSON tras 10k ticks', () => {
    const s = runTicks(initialState(42), 10_000);
    const json = JSON.stringify(s);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(JSON.parse(json)).toEqual(s);
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

  it('los NPCs iniciales vivos envejecen 10k días; los muertos conservan su edad de muerte', () => {
    const s0 = initialState(42);
    const agesBefore = new Map(s0.npcs.map((n) => [n.id, n.age_days]));
    const s = runTicks(s0, 10_000);
    for (const n of s.npcs) {
      const before = agesBefore.get(n.id);
      if (before == null) continue; // nacido en medio del run
      if (n.alive) {
        expect(n.age_days).toBe(before + 10_000);
      } else {
        expect(n.age_days).toBeGreaterThanOrEqual(before);
        expect(n.age_days).toBeLessThanOrEqual(before + 10_000);
      }
    }
  });

  it(
    'Pillar 2: sin intervención del jugador, el mundo cambia (chronicle y población)',
    () => {
      const s = runTicks(initialState(42), 10_000);
      expect(s.chronicle.length).toBeGreaterThan(0);
      const alive = s.npcs.filter((n) => n.alive).length;
      expect(alive).not.toBe(50);
    },
    30_000,
  );

  it('no hay orfandad en el round-trip tras persistencia simulada + tick', () => {
    const s = runTicks(initialState(42), 1_000);
    const loaded = JSON.parse(JSON.stringify(s));
    const direct = tick(s);
    const viaJson = tick(loaded);
    expect(JSON.stringify(direct)).toBe(JSON.stringify(viaJson));
  });
});
