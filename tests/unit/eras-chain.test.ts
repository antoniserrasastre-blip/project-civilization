/**
 * Tests — Sprints 16-17 cadena completa de eras hasta industrial.
 *
 * Contrato: partiendo de una era, cuando se completan todas las tech
 * de esa era, la siguiente se activa automáticamente. La cadena
 * tribal → bronce → clasica → medieval → industrial → atomica debe
 * ser navegable.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { applyEvents, scheduleEvents } from '@/lib/scheduler';
import {
  TECH_POOLS,
  techIdsOfEra,
  nextEra,
  ERA_ORDER,
} from '@/lib/tech';
import type { Era } from '@/lib/world-state';

describe('TECH_POOLS — todas las eras tienen pool no vacío hasta industrial', () => {
  it('tribal, bronce, clasica, medieval, industrial tienen 3 techs cada una', () => {
    expect(TECH_POOLS.tribal).toHaveLength(3);
    expect(TECH_POOLS.bronce).toHaveLength(3);
    expect(TECH_POOLS.clasica).toHaveLength(3);
    expect(TECH_POOLS.medieval).toHaveLength(3);
    expect(TECH_POOLS.industrial).toHaveLength(3);
  });

  it('atomica aún sin tech (dilema pendiente — ver ROADMAP-v2)', () => {
    expect(TECH_POOLS.atomica.length).toBeLessThanOrEqual(3);
  });
});

describe('cadena completa de eras', () => {
  it('ERA_ORDER sigue tribal → bronce → clasica → medieval → industrial → atomica', () => {
    expect(ERA_ORDER).toEqual([
      'tribal',
      'bronce',
      'clasica',
      'medieval',
      'industrial',
      'atomica',
    ]);
  });

  it('nextEra respeta el orden para cada era intermedia', () => {
    expect(nextEra('tribal')).toBe('bronce');
    expect(nextEra('bronce')).toBe('clasica');
    expect(nextEra('clasica')).toBe('medieval');
    expect(nextEra('medieval')).toBe('industrial');
    expect(nextEra('industrial')).toBe('atomica');
    expect(nextEra('atomica')).toBeNull();
  });

  function stateCompleteEra(era: Era): WorldState {
    // Simula completar TODAS las eras hasta `era` inclusive.
    const idx = ERA_ORDER.indexOf(era);
    const techs: string[] = [];
    for (let i = 0; i <= idx; i++) techs.push(...techIdsOfEra(ERA_ORDER[i]));
    return {
      ...initialState(42, { playerGroupId: 'tramuntana' }),
      era,
      technologies: techs,
    };
  }

  for (const era of ['bronce', 'clasica', 'medieval', 'industrial'] as const) {
    it(`${era} → ${nextEra(era)}: scheduler emite era_transition`, () => {
      const s = stateCompleteEra(era);
      const { events, prng_cursor } = scheduleEvents(s);
      const next = applyEvents({ ...s, prng_cursor }, events);
      expect(next.era).toBe(nextEra(era));
    });
  }
});

describe('pools temáticos', () => {
  it('medieval incluye feudalismo, caballeria, castillo', () => {
    const ids = TECH_POOLS.medieval.map((t) => t.id).sort();
    expect(ids).toEqual(['caballeria', 'castillo', 'feudalismo']);
  });

  it('industrial incluye maquina_vapor, imprenta, nacionalismo', () => {
    const ids = TECH_POOLS.industrial.map((t) => t.id).sort();
    expect(ids).toEqual(['imprenta', 'maquina_vapor', 'nacionalismo']);
  });
});
