/**
 * Tests del onboarding — Sprint 5a.
 *
 * Cubre:
 *   - initialState señala al NPC más ambicioso (determinismo).
 *   - tutorialPhase evoluciona con los días.
 *   - El scheduler inyecta un conflicto forzado el día 6 y solo ese día.
 *   - Tutorial termina automáticamente en día 30.
 *   - endTutorial apaga el flag manualmente y es idempotente.
 *   - Mismo evento forzado bajo misma seed ⇒ misma víctima (§A1 +§A4).
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { scheduleEvents, applyEvents } from '@/lib/scheduler';
import {
  tutorialPhase,
  endTutorial,
  TUTORIAL_FORCED_EVENT_DAY,
  TUTORIAL_END_DAY,
} from '@/lib/tutorial';
import { runTicks } from '@/lib/simulation';

describe('initialState — señalamiento del señalado', () => {
  it('selecciona al NPC con mayor ambicion al arrancar', () => {
    const s = initialState(42);
    const expected = s.npcs.reduce((a, b) =>
      b.traits.ambicion > a.traits.ambicion ? b : a,
    );
    expect(s.tutorial_highlight_id).toBe(expected.id);
  });

  it('es determinista: misma seed ⇒ mismo highlight', () => {
    expect(initialState(42).tutorial_highlight_id).toBe(
      initialState(42).tutorial_highlight_id,
    );
  });

  it('tutorial desactivado ⇒ highlight null', () => {
    expect(initialState(42, { tutorial: false }).tutorial_highlight_id).toBeNull();
  });
});

describe('tutorialPhase — transición por días', () => {
  function at(day: number, active = true): WorldState {
    return { ...initialState(42), day, tutorial_active: active };
  }

  it('día 0 ⇒ intro', () => {
    expect(tutorialPhase(at(0))).toBe('intro');
  });

  it('día 3 ⇒ halo', () => {
    expect(tutorialPhase(at(3))).toBe('halo');
  });

  it('día 7 ⇒ forced_event', () => {
    expect(tutorialPhase(at(7))).toBe('forced_event');
  });

  it('día 12 ⇒ notable_act', () => {
    expect(tutorialPhase(at(12))).toBe('notable_act');
  });

  it('día 30+ ⇒ done', () => {
    expect(tutorialPhase(at(30))).toBe('done');
    expect(tutorialPhase(at(50))).toBe('done');
  });

  it('tutorial desactivado ⇒ done en cualquier día', () => {
    expect(tutorialPhase(at(5, false))).toBe('done');
  });
});

describe('scheduler — evento forzado del tutorial', () => {
  it('inyecta death_by_conflict el día exacto TUTORIAL_FORCED_EVENT_DAY', () => {
    let s = initialState(42);
    // Colocamos víctima cerca del señalado para garantizar candidato.
    s = {
      ...s,
      npcs: s.npcs.map((n) => {
        if (n.id === s.tutorial_highlight_id) {
          return { ...n, position: { x: 50, y: 50 } };
        }
        if (n.id === 'npc_0049') {
          return { ...n, position: { x: 51, y: 50 }, age_days: 25 * 365 };
        }
        return { ...n, position: { x: 500, y: 500 } };
      }),
      day: TUTORIAL_FORCED_EVENT_DAY,
    };
    const { events } = scheduleEvents(s);
    const conflicts = events.filter((e) => e.type === 'death_by_conflict');
    expect(conflicts.length).toBeGreaterThan(0);
    // El señalado es el killer.
    if (conflicts[0].type === 'death_by_conflict') {
      expect(conflicts[0].killer_id).toBe(s.tutorial_highlight_id);
    }
  });

  it('no inyecta el evento dramático en otros días', () => {
    const s = initialState(42);
    for (let d = 0; d < 30; d++) {
      if (d === TUTORIAL_FORCED_EVENT_DAY) continue;
      const framed = { ...s, day: d };
      const { events } = scheduleEvents(framed);
      const tutorialConflicts = events.filter(
        (e) => e.type === 'death_by_conflict' && e.reason === 'un desafío del tutorial',
      );
      expect(tutorialConflicts).toHaveLength(0);
    }
  });

  it('determinismo: mismo estado ⇒ misma víctima forzada', () => {
    const base: WorldState = {
      ...initialState(777),
      day: TUTORIAL_FORCED_EVENT_DAY,
    };
    const a = scheduleEvents(base);
    const b = scheduleEvents(base);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('scheduler — fin automático del tutorial', () => {
  it('en día TUTORIAL_END_DAY emite tutorial_end', () => {
    const s = { ...initialState(42), day: TUTORIAL_END_DAY };
    const { events } = scheduleEvents(s);
    expect(events.some((e) => e.type === 'tutorial_end')).toBe(true);
  });

  it('tras aplicar tutorial_end, tutorial_active=false', () => {
    const s = { ...initialState(42), day: TUTORIAL_END_DAY };
    const { events, prng_cursor } = scheduleEvents(s);
    const next = applyEvents({ ...s, prng_cursor }, events);
    expect(next.tutorial_active).toBe(false);
  });

  it('tras TUTORIAL_END_DAY días de simulación, el tutorial está cerrado', () => {
    const s = runTicks(initialState(42), TUTORIAL_END_DAY + 1);
    expect(s.tutorial_active).toBe(false);
  });
});

describe('endTutorial — manual e idempotente', () => {
  it('cierra el tutorial', () => {
    const s = initialState(42);
    const closed = endTutorial(s);
    expect(closed.tutorial_active).toBe(false);
  });

  it('no toca el estado si ya estaba cerrado', () => {
    const s = { ...initialState(42), tutorial_active: false };
    const closed = endTutorial(s);
    expect(closed).toBe(s);
  });
});
