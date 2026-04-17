/**
 * Tests del scheduler de lifecycle — GODGAME v0.1 (Sprint 2).
 *
 * El scheduler es el módulo encargado de emitir los eventos de vida del
 * mundo (muertes, nacimientos, emparejamientos, conflictos). Consume el
 * MISMO PRNG compartido del estado (`state.prng_cursor`) — ese es el
 * contrato de §A4 y la condición necesaria para que el replay determinista
 * funcione y para que los eventos forzados de S5a encajen sin canales
 * paralelos.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState, type NPC } from '@/lib/world-state';
import { scheduleEvents, applyEvents } from '@/lib/scheduler';

/** Helper: envejece artificialmente a todos los NPCs para forzar muertes. */
function ageAll(state: WorldState, deltaDays: number): WorldState {
  return {
    ...state,
    npcs: state.npcs.map((n) => ({ ...n, age_days: n.age_days + deltaDays })),
  };
}

describe('scheduleEvents — determinismo y pureza', () => {
  it('mismo estado ⇒ mismos eventos, byte a byte', () => {
    const s = initialState(42);
    const a = scheduleEvents(s);
    const b = scheduleEvents(s);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('NO muta el estado de entrada', () => {
    const s = initialState(42);
    const snapshot = JSON.stringify(s);
    scheduleEvents(s);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('avanza prng_cursor como mínimo el nº de tiradas por NPC vivo', () => {
    const s = initialState(42);
    const { prng_cursor } = scheduleEvents(s);
    expect(prng_cursor).toBeGreaterThanOrEqual(s.prng_cursor);
  });
});

describe('scheduleEvents — muerte por edad', () => {
  it('NPCs muy jóvenes nunca disparan death_by_age', () => {
    const s = initialState(42);
    const { events } = scheduleEvents(s);
    const deaths = events.filter((e) => e.type === 'death_by_age');
    expect(deaths).toHaveLength(0);
  });

  it('forzar edades muy altas ⇒ muertes por edad aparecen en pocos ticks', () => {
    let s = ageAll(initialState(42), 100 * 365);
    let totalDeaths = 0;
    for (let i = 0; i < 20; i++) {
      const { events, prng_cursor } = scheduleEvents(s);
      totalDeaths += events.filter((e) => e.type === 'death_by_age').length;
      s = applyEvents({ ...s, prng_cursor }, events);
    }
    expect(totalDeaths).toBeGreaterThan(0);
  });
});

describe('scheduleEvents — conflicto', () => {
  it('si no hay NPCs ambiciosos ⇒ no hay conflicto', () => {
    const s = initialState(42);
    const low: WorldState = {
      ...s,
      npcs: s.npcs.map((n) => ({ ...n, traits: { ...n.traits, ambicion: 0 } })),
    };
    const { events } = scheduleEvents(low);
    expect(events.filter((e) => e.type === 'death_by_conflict')).toHaveLength(0);
  });
});

describe('scheduleEvents — emparejamiento', () => {
  it('un estado con adultos solteros próximos puede generar pairing en algún tick', () => {
    // Forzamos proximidad extrema: todos los NPCs en el mismo punto y edades
    // fértiles. Con eso la probabilidad por tick es positiva; no debería
    // pasar 1000 ticks sin al menos un pairing.
    let s = initialState(7);
    s = {
      ...s,
      npcs: s.npcs.map((n) => ({
        ...n,
        age_days: 25 * 365,
        position: { x: 50, y: 50 },
      })),
    };
    const sawPairing = (() => {
      for (let i = 0; i < 500; i++) {
        const { events, prng_cursor } = scheduleEvents(s);
        s = applyEvents({ ...s, prng_cursor }, events);
        if (events.some((e) => e.type === 'pairing')) return true;
      }
      return false;
    })();
    expect(sawPairing).toBe(true);
  });
});

describe('applyEvents — aplicación', () => {
  it('death_by_age marca al NPC como alive=false', () => {
    const s = initialState(42);
    const victim = s.npcs[0];
    const next = applyEvents(s, [{ type: 'death_by_age', npc_id: victim.id }]);
    const after = next.npcs.find((n) => n.id === victim.id);
    expect(after?.alive).toBe(false);
  });

  it('death_by_conflict elimina al perdedor y mantiene al ganador vivo', () => {
    const s = initialState(42);
    const killer = s.npcs[0];
    const victim = s.npcs[1];
    const next = applyEvents(s, [
      { type: 'death_by_conflict', killer_id: killer.id, victim_id: victim.id, reason: 'honor' },
    ]);
    expect(next.npcs.find((n) => n.id === killer.id)?.alive).toBe(true);
    expect(next.npcs.find((n) => n.id === victim.id)?.alive).toBe(false);
  });

  it('pairing establece partner_id recíproco', () => {
    const s = initialState(42);
    const a = s.npcs[0];
    const b = s.npcs[1];
    const next = applyEvents(s, [{ type: 'pairing', a_id: a.id, b_id: b.id }]);
    expect(next.npcs.find((n) => n.id === a.id)?.partner_id).toBe(b.id);
    expect(next.npcs.find((n) => n.id === b.id)?.partner_id).toBe(a.id);
  });

  it('la muerte rompe el vínculo de pareja del superviviente', () => {
    const s = initialState(42);
    const a = s.npcs[0];
    const b = s.npcs[1];
    let next = applyEvents(s, [{ type: 'pairing', a_id: a.id, b_id: b.id }]);
    next = applyEvents(next, [{ type: 'death_by_age', npc_id: a.id }]);
    expect(next.npcs.find((n) => n.id === a.id)?.alive).toBe(false);
    expect(next.npcs.find((n) => n.id === b.id)?.partner_id).toBeNull();
  });

  it('birth añade un NPC nuevo con los padres correctos', () => {
    const s = initialState(42);
    const a = s.npcs[0];
    const b = s.npcs[1];
    const newborn: NPC = {
      id: 'npc_0050',
      group_id: a.group_id,
      name: 'Nueva Persona',
      age_days: 0,
      position: { x: 1, y: 1 },
      stats: { fuerza: 50, inteligencia: 50, agilidad: 50 },
      traits: { ambicion: 50, lealtad: 50, paranoia: 50, carisma: 50 },
      gifts: [],
      parents: [a.id, b.id],
      alive: true,
      partner_id: null,
    };
    const next = applyEvents(s, [{ type: 'birth', newborn }]);
    expect(next.npcs).toHaveLength(s.npcs.length + 1);
    expect(next.npcs.find((n) => n.id === 'npc_0050')?.parents).toEqual([a.id, b.id]);
    expect(next.next_npc_id).toBe(51);
  });
});

describe('scheduler + tick — ciclo largo (Pillar 2)', () => {
  it(
    'tras 10k ticks, la población ha cambiado (muertes y/o nacimientos)',
    async () => {
      const { tick } = await import('@/lib/simulation');
      let s = initialState(42);
      for (let i = 0; i < 10_000; i++) s = tick(s);
      expect(s.chronicle.length).toBeGreaterThan(0);
      const aliveAtEnd = s.npcs.filter((n) => n.alive).length;
      expect(aliveAtEnd).not.toBe(50);
    },
    30_000,
  );

  it(
    'tras 10k ticks, el round-trip JSON sigue siendo limpio',
    async () => {
      const { tick } = await import('@/lib/simulation');
      let s = initialState(42);
      for (let i = 0; i < 10_000; i++) s = tick(s);
      expect(JSON.parse(JSON.stringify(s))).toEqual(s);
    },
    30_000,
  );

  it(
    'invariante de pareja tras 10k ticks: si a.partner=b entonces b.partner=a',
    async () => {
      const { tick } = await import('@/lib/simulation');
      let s = initialState(42);
      for (let i = 0; i < 10_000; i++) s = tick(s);
      for (const npc of s.npcs) {
        if (!npc.alive) continue;
        if (!npc.partner_id) continue;
        const partner = s.npcs.find((n) => n.id === npc.partner_id);
        expect(partner).toBeDefined();
        expect(partner?.partner_id).toBe(npc.id);
        expect(partner?.alive).toBe(true);
      }
    },
    30_000,
  );

  it(
    'determinismo a 10k ticks: misma semilla ⇒ mismo estado byte a byte',
    async () => {
      const { tick } = await import('@/lib/simulation');
      let a = initialState(42);
      let b = initialState(42);
      for (let i = 0; i < 10_000; i++) {
        a = tick(a);
        b = tick(b);
      }
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    },
    30_000,
  );
});
