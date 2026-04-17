/**
 * Tests de followers — Sprint 3.
 *
 * Verifica la mecánica básica del bono por aura_de_carisma:
 *   - Los NPCs pueden ser nombrados como followers via follower_formed event.
 *   - applyEvents establece correctamente follower_of.
 *   - Al morir el líder, todos sus followers vuelven a null.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { applyEvents } from '@/lib/scheduler';

describe('applyEvents — follower_formed', () => {
  it('establece follower_of en el follower, no en el leader', () => {
    const s = initialState(42);
    const next = applyEvents(s, [
      { type: 'follower_formed', follower_id: 'npc_0001', leader_id: 'npc_0000' },
    ]);
    expect(next.npcs.find((n) => n.id === 'npc_0001')?.follower_of).toBe('npc_0000');
    expect(next.npcs.find((n) => n.id === 'npc_0000')?.follower_of).toBeNull();
  });

  it('la muerte del líder rompe follower_of de sus seguidores', () => {
    const s = initialState(42);
    let next: WorldState = applyEvents(s, [
      { type: 'follower_formed', follower_id: 'npc_0001', leader_id: 'npc_0000' },
      { type: 'follower_formed', follower_id: 'npc_0002', leader_id: 'npc_0000' },
    ]);
    expect(next.npcs.find((n) => n.id === 'npc_0001')?.follower_of).toBe('npc_0000');
    expect(next.npcs.find((n) => n.id === 'npc_0002')?.follower_of).toBe('npc_0000');
    next = applyEvents(next, [{ type: 'death_by_age', npc_id: 'npc_0000' }]);
    expect(next.npcs.find((n) => n.id === 'npc_0001')?.follower_of).toBeNull();
    expect(next.npcs.find((n) => n.id === 'npc_0002')?.follower_of).toBeNull();
  });
});

describe('initialState — follower_of inicial', () => {
  it('todos los NPCs iniciales tienen follower_of=null', () => {
    const s = initialState(42);
    expect(s.npcs.every((n) => n.follower_of === null)).toBe(true);
  });
});
