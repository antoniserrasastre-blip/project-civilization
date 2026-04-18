/**
 * Tests del tercer estado "victoria pírrica" — v1.0.1 decisión #3.
 *
 * Contrato (DECISIONS-PENDING.md bloque 3, opción C):
 *   - `computeVerdict(state)` devuelve uno de tres estados:
 *       · 'reign': Elegido o descendiente vivo en top-3.
 *       · 'pyrrhic': Elegido en top-3 pero SIN descendientes vivos
 *         (linaje se extingue con él).
 *       · 'defeat': ni Elegido ni descendiente en top-3.
 *   - `lineageInTop3` SE MANTIENE (backwards compat) y sigue
 *     devolviendo true para reign OR pyrrhic (el jugador "reina" en
 *     ambos casos — solo el matiz narrativo cambia).
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState, type NPC } from '@/lib/world-state';
import { anoint } from '@/lib/anoint';
import { computeVerdict, lineageInTop3 } from '@/lib/verdict';

function boostNpc(
  s: WorldState,
  id: string,
  stats: { fuerza?: number; carisma?: number } = {},
): WorldState {
  return {
    ...s,
    npcs: s.npcs.map((n) =>
      n.id === id
        ? {
            ...n,
            stats: { ...n.stats, fuerza: stats.fuerza ?? n.stats.fuerza },
            traits: { ...n.traits, carisma: stats.carisma ?? n.traits.carisma },
          }
        : n,
    ),
  };
}

describe('computeVerdict — 3 estados (v1.0.1 decisión C)', () => {
  it('sin Elegido ⇒ defeat', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    expect(computeVerdict(s)).toBe('defeat');
  });

  it('Elegido dominante en top-3 + descendientes vivos ⇒ reign', () => {
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = anoint(s, 'npc_0000');
    s = boostNpc(s, 'npc_0000', { fuerza: 200, carisma: 200 });
    // Añadimos un hijo vivo.
    const heir: NPC = {
      id: 'npc_9000',
      group_id: s.player_god.group_id,
      name: 'Heredera',
      age_days: 20 * 365,
      sex: 'F',
      position: { x: 10, y: 10 },
      stats: { fuerza: 60, inteligencia: 60, agilidad: 60 },
      traits: { ambicion: 50, lealtad: 50, paranoia: 20, carisma: 60 },
      gifts: [],
      parents: ['npc_0000'],
      alive: true,
      partner_id: null,
      follower_of: null,
      descends_from_chosen: true,
    };
    s = { ...s, npcs: [...s.npcs, heir] };
    expect(computeVerdict(s)).toBe('reign');
  });

  it('Elegido dominante en top-3 pero SIN descendientes vivos ⇒ pyrrhic', () => {
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = anoint(s, 'npc_0000');
    s = boostNpc(s, 'npc_0000', { fuerza: 200, carisma: 200 });
    // Matamos a todos los demás (ningún descendiente vivo).
    s = {
      ...s,
      npcs: s.npcs.map((n) =>
        n.id === 'npc_0000' ? n : { ...n, alive: false },
      ),
    };
    expect(computeVerdict(s)).toBe('pyrrhic');
  });

  it('Elegido fuera de top-3 y sin descendientes en top-3 ⇒ defeat', () => {
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = anoint(s, 'npc_0000');
    s = boostNpc(s, 'npc_0000', { fuerza: 1, carisma: 1 });
    s = {
      ...s,
      npcs: s.npcs.map((n) =>
        n.id === 'npc_0000'
          ? n
          : { ...n, stats: { ...n.stats, fuerza: 150 }, traits: { ...n.traits, carisma: 150 } },
      ),
    };
    expect(computeVerdict(s)).toBe('defeat');
  });

  it('solo descendiente (sin Elegido vivo) en top-3 ⇒ reign', () => {
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = anoint(s, 'npc_0000');
    const heir: NPC = {
      id: 'npc_9001',
      group_id: s.player_god.group_id,
      name: 'Heredero Colosal',
      age_days: 25 * 365,
      sex: 'F',
      position: { x: 10, y: 10 },
      stats: { fuerza: 250, inteligencia: 80, agilidad: 80 },
      traits: { ambicion: 80, lealtad: 80, paranoia: 20, carisma: 250 },
      gifts: [],
      parents: ['npc_0000'],
      alive: true,
      partner_id: null,
      follower_of: null,
      descends_from_chosen: true,
    };
    s = {
      ...s,
      npcs: [
        ...s.npcs.map((n) =>
          n.id === 'npc_0000' ? { ...n, alive: false } : n,
        ),
        heir,
      ],
    };
    expect(computeVerdict(s)).toBe('reign');
  });
});

describe('lineageInTop3 backwards compat — sigue true para reign y pyrrhic', () => {
  it('reign ⇒ lineageInTop3=true', () => {
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = anoint(s, 'npc_0000');
    s = boostNpc(s, 'npc_0000', { fuerza: 200, carisma: 200 });
    expect(lineageInTop3(s)).toBe(true);
  });

  it('pyrrhic ⇒ lineageInTop3=true (el jugador sigue en top-3, solo sin linaje)', () => {
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = anoint(s, 'npc_0000');
    s = boostNpc(s, 'npc_0000', { fuerza: 200, carisma: 200 });
    s = {
      ...s,
      npcs: s.npcs.map((n) =>
        n.id === 'npc_0000' ? n : { ...n, alive: false },
      ),
    };
    expect(lineageInTop3(s)).toBe(true);
    expect(computeVerdict(s)).toBe('pyrrhic');
  });

  it('defeat ⇒ lineageInTop3=false', () => {
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = anoint(s, 'npc_0000');
    s = boostNpc(s, 'npc_0000', { fuerza: 1, carisma: 1 });
    s = {
      ...s,
      npcs: s.npcs.map((n) =>
        n.id === 'npc_0000'
          ? n
          : { ...n, stats: { ...n.stats, fuerza: 150 }, traits: { ...n.traits, carisma: 150 } },
      ),
    };
    expect(lineageInTop3(s)).toBe(false);
  });
});
