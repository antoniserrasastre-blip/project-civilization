/**
 * Tests de tecnología y transición de era — Sprint 8 (v0.2).
 *
 * Verifica:
 *   - TECH_POOLS: tribal arranca con fuego + 2 tech pendientes; bronce
 *     tiene 3 tech.
 *   - pendingTechs devuelve el subconjunto no descubierto.
 *   - shouldAdvanceEra respeta la "completitud" del pool.
 *   - nextEra sigue el orden canónico.
 *   - El scheduler termina emitiendo `tech_discovered` y `era_transition`.
 *   - La transición incluye entrada de crónica.
 *   - Arquitectura escala: al añadir tech hipotéticas, la lógica no rompe.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { applyEvents, scheduleEvents } from '@/lib/scheduler';
import {
  nextEra,
  pendingTechs,
  shouldAdvanceEra,
  TECH_POOLS,
  techIdsOfEra,
} from '@/lib/tech';
import { runTicks } from '@/lib/simulation';

describe('TECH_POOLS', () => {
  it('tribal incluye fuego, herramientas y escritura', () => {
    const ids = TECH_POOLS.tribal.map((t) => t.id).sort();
    expect(ids).toEqual([
      'escritura_primitiva',
      'fuego',
      'herramientas_piedra',
    ]);
  });

  it('bronce expone 3 tech con era correcta', () => {
    const bronce = TECH_POOLS.bronce;
    expect(bronce).toHaveLength(3);
    for (const t of bronce) expect(t.era).toBe('bronce');
  });
});

describe('pendingTechs', () => {
  it('inicia con 2 tech pendientes en tribal (fuego ya descubierto)', () => {
    const s = initialState(42);
    const pending = pendingTechs(s);
    expect(pending).toHaveLength(2);
    expect(pending.map((t) => t.id).sort()).toEqual([
      'escritura_primitiva',
      'herramientas_piedra',
    ]);
  });

  it('con todo descubierto, el pendingTechs es vacío', () => {
    const s: WorldState = {
      ...initialState(42),
      technologies: techIdsOfEra('tribal'),
    };
    expect(pendingTechs(s)).toEqual([]);
  });
});

describe('nextEra — orden canónico', () => {
  it('tribal → bronce', () => {
    expect(nextEra('tribal')).toBe('bronce');
  });

  it('bronce → clasica', () => {
    expect(nextEra('bronce')).toBe('clasica');
  });

  it('atomica no tiene siguiente', () => {
    expect(nextEra('atomica')).toBeNull();
  });
});

describe('shouldAdvanceEra', () => {
  it('false cuando faltan tech en la era', () => {
    expect(shouldAdvanceEra(initialState(42))).toBe(false);
  });

  it('true con pool completo y era posterior definida', () => {
    const s: WorldState = {
      ...initialState(42),
      technologies: techIdsOfEra('tribal'),
    };
    expect(shouldAdvanceEra(s)).toBe(true);
  });
});

describe('scheduler — descubrimiento y transición', () => {
  it('con pool completo tribal y una tech pendiente de bronce, emite era_transition', () => {
    let s: WorldState = {
      ...initialState(42),
      technologies: techIdsOfEra('tribal'),
    };
    const { events, prng_cursor } = scheduleEvents(s);
    const transition = events.find((e) => e.type === 'era_transition');
    expect(transition).toBeDefined();
    if (transition?.type === 'era_transition') {
      expect(transition.from).toBe('tribal');
      expect(transition.to).toBe('bronce');
    }
    s = applyEvents({ ...s, prng_cursor }, events);
    expect(s.era).toBe('bronce');
  });

  it('tras 30k ticks la civilización ha descubierto alguna tech', () => {
    const s = runTicks(initialState(42), 30_000);
    expect(s.technologies.length).toBeGreaterThan(1);
  }, 60_000);

  it('tech_discovered añade la tecnología y emite crónica', () => {
    const s = initialState(42);
    const next = applyEvents(s, [
      { type: 'tech_discovered', tech_id: 'herramientas_piedra' },
    ]);
    expect(next.technologies).toContain('herramientas_piedra');
    expect(next.chronicle.some((e) => e.text.includes('Herramientas'))).toBe(
      true,
    );
  });

  it('era_transition cambia la era y emite crónica', () => {
    const s = initialState(42);
    const next = applyEvents(s, [
      { type: 'era_transition', from: 'tribal', to: 'bronce' },
    ]);
    expect(next.era).toBe('bronce');
    expect(next.chronicle.some((e) => e.text.includes('era bronce'))).toBe(true);
  });
});
