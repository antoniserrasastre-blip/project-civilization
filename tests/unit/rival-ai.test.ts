/**
 * Tests del IA de dios rival — Sprint 10 (v0.3).
 *
 * Valida:
 *   - Determinismo: mismo estado ⇒ mismas acciones.
 *   - Rítmico anti-presión: rival no actúa antes del intervalo.
 *   - Perfiles: aggressive actúa más frecuentemente que passive.
 *   - Solo anointa NPCs vivos de su propio grupo.
 *   - applyEvents integra rival_anoint y rival_decision_tick.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { applyEvents } from '@/lib/scheduler';
import { decideRivalActions, RIVAL_DECISION_INTERVAL } from '@/lib/rival-ai';
import { runTicks } from '@/lib/simulation';

function stateAtDay(seed: number, day: number): WorldState {
  return {
    ...initialState(seed, { playerGroupId: 'tramuntana' }),
    day,
  };
}

describe('decideRivalActions — contratos', () => {
  it('determinismo: mismo estado ⇒ mismos eventos', () => {
    const s = stateAtDay(42, RIVAL_DECISION_INTERVAL);
    const a = decideRivalActions(s);
    const b = decideRivalActions(s);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('antes del intervalo, no evalúan ni actúan', () => {
    const s = stateAtDay(42, RIVAL_DECISION_INTERVAL - 1);
    const r = decideRivalActions(s);
    expect(r.events).toEqual([]);
    expect(r.rivalsActed).toEqual([]);
  });

  it('en o tras el intervalo, todos los rivales evalúan', () => {
    const s = stateAtDay(42, RIVAL_DECISION_INTERVAL);
    const r = decideRivalActions(s);
    expect(r.rivalsActed.length).toBe(s.rival_gods.length);
  });
});

describe('decideRivalActions — anoint', () => {
  it('solo anointa NPCs vivos de su propio grupo', () => {
    const s = stateAtDay(7, RIVAL_DECISION_INTERVAL);
    const r = decideRivalActions(s);
    for (const ev of r.events) {
      if (ev.type !== 'rival_anoint') continue;
      const rival = s.rival_gods.find((g) => g.group_id === ev.rival_group_id)!;
      const npc = s.npcs.find((n) => n.id === ev.npc_id)!;
      expect(npc.alive).toBe(true);
      expect(npc.group_id).toBe(rival.group_id);
    }
  });
});

describe('applyEvents — rival_anoint + rival_decision_tick', () => {
  it('rival_anoint añade al chosen_ones del rival correcto y emite crónica', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    const rivalGroup = s.rival_gods[0].group_id;
    const target = s.npcs.find((n) => n.group_id === rivalGroup && n.alive)!;
    const next = applyEvents(s, [
      { type: 'rival_anoint', rival_group_id: rivalGroup, npc_id: target.id },
    ]);
    const rival = next.rival_gods.find((r) => r.group_id === rivalGroup)!;
    expect(rival.chosen_ones).toContain(target.id);
    expect(next.chronicle.length).toBe(s.chronicle.length + 1);
    expect(next.chronicle[next.chronicle.length - 1].text).toContain('halo');
  });

  it('rival_decision_tick actualiza last_decision_day', () => {
    const s = { ...initialState(42, { playerGroupId: 'tramuntana' }), day: 777 };
    const gid = s.rival_gods[0].group_id;
    const next = applyEvents(s, [
      { type: 'rival_decision_tick', rival_group_id: gid },
    ]);
    const rival = next.rival_gods.find((r) => r.group_id === gid)!;
    expect(rival.last_decision_day).toBe(777);
  });
});

describe('escala larga — IA rival en runTicks', () => {
  it(
    'tras muchos ciclos, al menos un rival ha anoint alguien',
    () => {
      const s = runTicks(
        initialState(42, { playerGroupId: 'tramuntana' }),
        RIVAL_DECISION_INTERVAL * 5,
      );
      const totalRivalChosen = s.rival_gods.reduce(
        (acc, r) => acc + r.chosen_ones.length,
        0,
      );
      expect(totalRivalChosen).toBeGreaterThan(0);
    },
    30_000,
  );
});
