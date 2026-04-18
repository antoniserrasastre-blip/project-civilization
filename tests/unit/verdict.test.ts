/**
 * Tests del veredicto de era — Sprint 5b.
 *
 * Contrato §A4:
 *   influence = Fuerza + Carisma + 10 × seguidores + 5 × descendientes_vivos
 * Pillars 4 & 5: el veredicto es "reina tu linaje" — top-3 incluye
 *   Elegido o descendiente.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState, type NPC } from '@/lib/world-state';
import { anoint } from '@/lib/anoint';
import {
  influenceOf,
  topByInfluence,
  lineageInTop3,
} from '@/lib/verdict';

describe('influenceOf', () => {
  it('NPC muerto ⇒ influencia 0', () => {
    const s = initialState(42);
    const n = { ...s.npcs[0], alive: false };
    expect(influenceOf(n, s).influence).toBe(0);
  });

  it('NPC solo ⇒ influencia = fuerza + carisma', () => {
    const s = initialState(42);
    const n = s.npcs[0];
    const r = influenceOf(n, s);
    expect(r.influence).toBe(n.stats.fuerza + n.traits.carisma);
    expect(r.followers).toBe(0);
    expect(r.descendants).toBe(0);
  });

  it('cada seguidor añade +10 influencia', () => {
    const s = initialState(42);
    const base = s.npcs[0];
    const patched: WorldState = {
      ...s,
      npcs: s.npcs.map((o, i) => {
        if (i >= 1 && i <= 3) return { ...o, follower_of: base.id };
        return o;
      }),
    };
    const r = influenceOf(base, patched);
    expect(r.followers).toBe(3);
    expect(r.influence).toBe(base.stats.fuerza + base.traits.carisma + 30);
  });

  it('cada descendiente vivo añade +5 influencia', () => {
    const s = initialState(42);
    const parent = s.npcs[0];
    const extraChild: NPC = {
      id: 'npc_0050',
      group_id: parent.group_id,
      name: 'Hija',
      age_days: 300,
      position: { x: 0, y: 0 },
      stats: { fuerza: 50, inteligencia: 50, agilidad: 50 },
      traits: { ambicion: 10, lealtad: 10, paranoia: 10, carisma: 10 },
      gifts: [],
      parents: [parent.id, s.npcs[1].id],
      alive: true,
      partner_id: null,
      follower_of: null,
      descends_from_chosen: true,
    };
    const patched: WorldState = { ...s, npcs: [...s.npcs, extraChild] };
    const r = influenceOf(parent, patched);
    expect(r.descendants).toBe(1);
    expect(r.influence).toBe(parent.stats.fuerza + parent.traits.carisma + 5);
  });
});

describe('topByInfluence', () => {
  it('devuelve hasta N NPCs ordenados por influencia descendente', () => {
    const s = initialState(42);
    const top = topByInfluence(s, 3);
    expect(top).toHaveLength(3);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].influence).toBeGreaterThanOrEqual(top[i].influence);
    }
  });

  it('excluye muertos', () => {
    const s = initialState(42);
    const killed = s.npcs[0];
    const patched: WorldState = {
      ...s,
      npcs: s.npcs.map((o) =>
        o.id === killed.id ? { ...o, alive: false } : o,
      ),
    };
    const top = topByInfluence(patched, 50);
    expect(top.find((r) => r.npc.id === killed.id)).toBeUndefined();
  });

  it('determinismo: mismo estado ⇒ mismo orden', () => {
    const s = initialState(42);
    const a = topByInfluence(s, 5);
    const b = topByInfluence(s, 5);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('desempate por id ascendente', () => {
    // Construimos estado sintético donde dos NPCs tienen misma influencia.
    const s = initialState(42);
    const patched: WorldState = {
      ...s,
      npcs: s.npcs.map((n, i) => {
        if (i === 0 || i === 1) {
          return {
            ...n,
            stats: { ...n.stats, fuerza: 100 },
            traits: { ...n.traits, carisma: 100 },
          };
        }
        return {
          ...n,
          stats: { ...n.stats, fuerza: 1 },
          traits: { ...n.traits, carisma: 1 },
        };
      }),
    };
    const top = topByInfluence(patched, 2);
    expect(top[0].npc.id < top[1].npc.id).toBe(true);
  });
});

describe('lineageInTop3 — veredicto', () => {
  it('sin Elegidos, el veredicto es false', () => {
    const s = initialState(42);
    expect(lineageInTop3(s)).toBe(false);
  });

  it('true si el Elegido está en top-3 por influencia alta', () => {
    let s = initialState(42);
    const id = 'npc_0000';
    s = anoint(s, id);
    s = {
      ...s,
      npcs: s.npcs.map((n) =>
        n.id === id
          ? {
              ...n,
              stats: { ...n.stats, fuerza: 200 },
              traits: { ...n.traits, carisma: 200 },
            }
          : n,
      ),
    };
    expect(lineageInTop3(s)).toBe(true);
  });

  it('true si un descendiente del Elegido está en top-3', () => {
    let s = initialState(42);
    s = anoint(s, 'npc_0000');
    const heir: NPC = {
      id: 'npc_9000',
      group_id: s.player_god.group_id,
      name: 'Heredero',
      age_days: 20 * 365,
      position: { x: 0, y: 0 },
      stats: { fuerza: 200, inteligencia: 50, agilidad: 50 },
      traits: { ambicion: 50, lealtad: 50, paranoia: 50, carisma: 200 },
      gifts: [],
      parents: ['npc_0000'],
      alive: true,
      partner_id: null,
      follower_of: null,
      descends_from_chosen: true,
    };
    s = { ...s, npcs: [...s.npcs, heir] };
    expect(lineageInTop3(s)).toBe(true);
  });

  it('false si el Elegido queda fuera del top-3 y no hay descendientes', () => {
    let s = initialState(42);
    s = anoint(s, 'npc_0000');
    // Patchamos al Elegido para que sea inferior al resto.
    s = {
      ...s,
      npcs: s.npcs.map((n) =>
        n.id === 'npc_0000'
          ? {
              ...n,
              stats: { ...n.stats, fuerza: 0 },
              traits: { ...n.traits, carisma: 0 },
            }
          : {
              ...n,
              stats: { ...n.stats, fuerza: 200 },
              traits: { ...n.traits, carisma: 200 },
            },
      ),
    };
    expect(lineageInTop3(s)).toBe(false);
  });
});
