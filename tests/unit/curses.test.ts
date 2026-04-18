/**
 * Tests de maldiciones — Sprint 11.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { CURSES, canCurse, curseNpc } from '@/lib/curses';

function base(): WorldState {
  let s = initialState(42, { playerGroupId: 'tramuntana' });
  s = {
    ...s,
    player_god: { ...s.player_god, faith_points: 1000 },
  };
  return s;
}

function firstRivalNpc(s: WorldState) {
  return s.npcs.find((n) => n.group_id !== s.player_god.group_id && n.alive)!;
}

describe('CURSES catálogo', () => {
  it('tres niveles con coste creciente', () => {
    expect(CURSES.curse_simple.cost).toBe(20);
    expect(CURSES.curse_strong.cost).toBe(50);
    expect(CURSES.curse_fatal.cost).toBe(150);
  });
});

describe('canCurse reglas', () => {
  it('ok sobre un NPC vivo de grupo rival con Fe suficiente', () => {
    const s = base();
    const target = firstRivalNpc(s);
    const r = canCurse(s, target.id, 'curse_simple');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cost).toBe(20);
  });

  it('rechaza maldecir a un NPC de tu propio grupo', () => {
    const s = base();
    const own = s.npcs.find((n) => n.group_id === s.player_god.group_id)!;
    const r = canCurse(s, own.id, 'curse_simple');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('own_group');
  });

  it('rechaza si no hay Fe suficiente', () => {
    let s = base();
    s = { ...s, player_god: { ...s.player_god, faith_points: 10 } };
    const target = firstRivalNpc(s);
    const r = canCurse(s, target.id, 'curse_strong');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_enough_faith');
  });

  it('rechaza si el NPC está muerto', () => {
    const s = base();
    const target = firstRivalNpc(s);
    const dead: WorldState = {
      ...s,
      npcs: s.npcs.map((n) => (n.id === target.id ? { ...n, alive: false } : n)),
    };
    const r = canCurse(dead, target.id, 'curse_simple');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('dead_npc');
  });
});

describe('curseNpc efectos', () => {
  it('simple: reduce fuerza 30 y deduce Fe', () => {
    const s = base();
    const target = firstRivalNpc(s);
    const before = target.stats.fuerza;
    const next = curseNpc(s, target.id, 'curse_simple');
    const after = next.npcs.find((n) => n.id === target.id)!;
    expect(after.stats.fuerza).toBe(Math.max(1, before - 30));
    expect(next.player_god.faith_points).toBe(s.player_god.faith_points - 20);
  });

  it('fatal: mata al NPC + rompe vínculos', () => {
    const s = base();
    const target = firstRivalNpc(s);
    const next = curseNpc(s, target.id, 'curse_fatal');
    const after = next.npcs.find((n) => n.id === target.id)!;
    expect(after.alive).toBe(false);
    expect(after.partner_id).toBeNull();
    expect(after.follower_of).toBeNull();
    expect(next.player_god.faith_points).toBe(s.player_god.faith_points - 150);
  });

  it('no muta el estado de entrada', () => {
    const s = base();
    const target = firstRivalNpc(s);
    const snap = JSON.stringify(s);
    curseNpc(s, target.id, 'curse_strong');
    expect(JSON.stringify(s)).toBe(snap);
  });
});

describe('cross-group pairing — scheduler', () => {
  it('tras muchos ticks aparece al menos un matrimonio cross-grupo', async () => {
    const { runTicks } = await import('@/lib/simulation');
    const s = runTicks(initialState(7, { playerGroupId: 'tramuntana' }), 15_000);
    let mixed = 0;
    for (const n of s.npcs) {
      if (!n.partner_id) continue;
      const p = s.npcs.find((o) => o.id === n.partner_id);
      if (p && p.group_id !== n.group_id) mixed++;
    }
    expect(mixed).toBeGreaterThan(0);
  }, 30_000);
});
