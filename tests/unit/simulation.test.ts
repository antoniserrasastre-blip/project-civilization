/**
 * Tests del primer tick puro.
 *
 * Valida el contrato §A4 en acción:
 *   - Determinismo (mismo input ⇒ mismo output).
 *   - Pureza (no muta el input).
 *   - Round-trip JSON tras un tick.
 *   - Coherencia semántica mínima (día avanza, NPCs envejecen).
 */

import { describe, it, expect } from 'vitest';
import { initialState } from '@/lib/world-state';
import { tick, runTicks } from '@/lib/simulation';

describe('tick — semántica básica', () => {
  it('incrementa day en 1', () => {
    const s = initialState(42);
    const next = tick(s);
    expect(next.day).toBe(1);
  });

  it('envejece a los NPCs vivos en 1 día', () => {
    const s = initialState(42);
    const agesBefore = s.npcs.map((n) => n.age_days);
    const next = tick(s);
    next.npcs.forEach((n, i) => {
      if (n.alive) expect(n.age_days).toBe(agesBefore[i] + 1);
    });
  });

  it('avanza el prng_cursor (se consumieron números aleatorios)', () => {
    const s = initialState(42);
    const next = tick(s);
    expect(next.prng_cursor).toBeGreaterThan(s.prng_cursor);
    // Piso: cada NPC vivo consume al menos 2 tiradas (dx, dy). El scheduler
    // consume más, así que es cota inferior.
    const floor = next.npcs.filter((n) => n.alive).length * 2;
    expect(next.prng_cursor - s.prng_cursor).toBeGreaterThanOrEqual(floor);
  });

  it('no nacen ni mueren NPCs en un único tick desde el estado inicial joven', () => {
    // Con edades 15-40 y probabilidades bajas, un solo tick NO dispara
    // nacimientos ni muertes con seed=42. Esto asegura que el scheduler
    // no está produciendo eventos espurios en el caso base.
    const s = initialState(42);
    const next = tick(s);
    expect(next.npcs.length).toBe(s.npcs.length);
    expect(next.npcs.filter((n) => n.alive).length).toBe(
      s.npcs.filter((n) => n.alive).length,
    );
  });
});

describe('tick — pureza', () => {
  it('NO muta el estado de entrada', () => {
    const s = initialState(42);
    const snapshot = JSON.stringify(s);
    tick(s);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe('tick — determinismo (contrato §A4)', () => {
  it('mismo estado ⇒ mismo estado de salida, byte a byte', () => {
    const s = initialState(42);
    const a = tick(s);
    const b = tick(s);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('1000 ticks deterministas: misma secuencia desde la misma seed', () => {
    const a = runTicks(initialState(42), 1000);
    const b = runTicks(initialState(42), 1000);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('seeds distintas divergen tras algunos ticks', () => {
    const a = runTicks(initialState(1), 100);
    const b = runTicks(initialState(2), 100);
    // El día es el mismo (avanza igual) pero las posiciones NPCs deben
    // ser distintas.
    expect(a.day).toBe(b.day);
    const posA = JSON.stringify(a.npcs.map((n) => n.position));
    const posB = JSON.stringify(b.npcs.map((n) => n.position));
    expect(posA).not.toBe(posB);
  });
});

describe('tick — round-trip JSON', () => {
  it('el estado tras un tick es JSON-serializable sin pérdida', () => {
    const s = tick(initialState(42));
    const roundtrip = JSON.parse(JSON.stringify(s));
    expect(roundtrip).toEqual(s);
  });

  it('serializar → deserializar → tick produce el mismo resultado que tick directo', () => {
    // Esto es lo que pasará cuando el jugador recargue la página:
    // load(localStorage) → tick() debe producir lo mismo que un tick
    // sobre el estado en memoria. Si no, la persistencia corrompe.
    const s = initialState(42);
    const direct = tick(s);
    const viaJson = tick(JSON.parse(JSON.stringify(s)));
    expect(direct).toEqual(viaJson);
  });
});

describe('tick — performance', () => {
  // Pre-requisito para 100× speed con 50 NPCs. Si un tick tarda más
  // de 2ms, a 100× (100 ticks/segundo) gastas >200ms del frame → drop.
  it('un tick de 50 NPCs tarda menos de 2ms', () => {
    const s = initialState(42);
    const start = performance.now();
    tick(s);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2);
  });

  it('1000 ticks de 50 NPCs tardan menos de 500ms', () => {
    const s = initialState(42);
    const start = performance.now();
    runTicks(s, 1000);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
