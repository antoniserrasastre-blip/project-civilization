/**
 * Tests — Sprint 14 v1.1 Era Clásica.
 *
 * TDD: declara el contrato (pool de 3 techs clásicas + transición
 * bronce → clásica) antes de implementarlo.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { applyEvents, scheduleEvents } from '@/lib/scheduler';
import { TECH_POOLS, techIdsOfEra, shouldAdvanceEra, nextEra } from '@/lib/tech';

describe('TECH_POOLS.clasica (Sprint 14)', () => {
  it('contiene exactamente 3 techs con era="clasica"', () => {
    expect(TECH_POOLS.clasica).toHaveLength(3);
    for (const t of TECH_POOLS.clasica) {
      expect(t.era).toBe('clasica');
    }
  });

  it('incluye escritura_cursiva, rueda, ejercito_regular', () => {
    const ids = TECH_POOLS.clasica.map((t) => t.id).sort();
    expect(ids).toEqual(['ejercito_regular', 'escritura_cursiva', 'rueda']);
  });
});

describe('transición bronce → clásica', () => {
  function stateInBronce(): WorldState {
    return {
      ...initialState(42, { playerGroupId: 'tramuntana' }),
      era: 'bronce',
      technologies: [...techIdsOfEra('tribal'), ...techIdsOfEra('bronce')],
    };
  }

  it('shouldAdvanceEra=true con pool bronce completo', () => {
    expect(shouldAdvanceEra(stateInBronce())).toBe(true);
    expect(nextEra('bronce')).toBe('clasica');
  });

  it('scheduler emite era_transition a clasica', () => {
    const s = stateInBronce();
    const { events } = scheduleEvents(s);
    const tx = events.find((e) => e.type === 'era_transition');
    expect(tx).toBeDefined();
    if (tx?.type === 'era_transition') {
      expect(tx.from).toBe('bronce');
      expect(tx.to).toBe('clasica');
    }
  });

  it('applyEvents materializa la era clasica', () => {
    const s = stateInBronce();
    const { events, prng_cursor } = scheduleEvents(s);
    const next = applyEvents({ ...s, prng_cursor }, events);
    expect(next.era).toBe('clasica');
  });
});

describe('una vez en clásica, el sistema de descubrimiento sigue activo', () => {
  function stateInClasica(): WorldState {
    return {
      ...initialState(42, { playerGroupId: 'tramuntana' }),
      era: 'clasica',
      technologies: [...techIdsOfEra('tribal'), ...techIdsOfEra('bronce')],
    };
  }

  it('hay pool pendiente con 3 techs de clásica', () => {
    const s = stateInClasica();
    const unknown = TECH_POOLS.clasica.filter(
      (t) => !s.technologies.includes(t.id),
    );
    expect(unknown).toHaveLength(3);
  });
});
