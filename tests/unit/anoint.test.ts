/**
 * Tests del filtro de ungimiento.
 *
 * En MVP todos los NPCs vivos del roster deben poder ungirse. El valor
 * del test es que deja escrito el contrato de v0.3 ("no puedes ungir de
 * otro grupo") aunque el MVP nunca lo dispare en producción.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { canAnoint, anoint } from '@/lib/anoint';

const freshState = (): WorldState => initialState(42);

describe('canAnoint — happy path', () => {
  it('permite ungir a un NPC vivo del grupo del jugador', () => {
    const s = freshState();
    const victim = s.npcs[0];
    expect(canAnoint(s, victim.id)).toEqual({ ok: true });
  });
});

describe('canAnoint — sad paths', () => {
  it('rechaza con unknown_npc si el id no existe', () => {
    const s = freshState();
    const result = canAnoint(s, 'npc_nonexistent');
    expect(result).toEqual({ ok: false, reason: 'unknown_npc' });
  });

  it('rechaza con dead_npc si el NPC está muerto', () => {
    const s = freshState();
    // Matamos al primer NPC manualmente para forzar el caso.
    const dead = { ...s.npcs[0], alive: false };
    const state: WorldState = {
      ...s,
      npcs: [dead, ...s.npcs.slice(1)],
    };
    expect(canAnoint(state, dead.id)).toEqual({ ok: false, reason: 'dead_npc' });
  });

  it('rechaza con wrong_group si el NPC no es del grupo del jugador (v0.3 prep)', () => {
    // Este test es el que empezará a disparar en v0.3 cuando existan
    // rival groups. Aquí lo forzamos injectando un NPC con group_id
    // distinto, y validamos que el filtro ya sabe rechazarlo.
    const s = freshState();
    const foreigner = {
      ...s.npcs[0],
      id: 'npc_foreign',
      group_id: 'rival_clan',
    };
    const state: WorldState = {
      ...s,
      npcs: [...s.npcs, foreigner],
    };
    expect(canAnoint(state, 'npc_foreign')).toEqual({
      ok: false,
      reason: 'wrong_group',
    });
  });

  it('rechaza con already_chosen si el NPC ya es Elegido', () => {
    const s = freshState();
    const target = s.npcs[0];
    const state: WorldState = {
      ...s,
      player_god: {
        ...s.player_god,
        chosen_ones: [target.id],
      },
    };
    expect(canAnoint(state, target.id)).toEqual({
      ok: false,
      reason: 'already_chosen',
    });
  });
});

describe('anoint — efecto', () => {
  it('añade el id del NPC a chosen_ones', () => {
    const s = freshState();
    const target = s.npcs[0];
    const next = anoint(s, target.id);
    expect(next.player_god.chosen_ones).toContain(target.id);
  });

  it('es puro (no muta el input)', () => {
    const s = freshState();
    const snapshot = JSON.stringify(s);
    anoint(s, s.npcs[0].id);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('permite ungir a varios NPCs consecutivamente', () => {
    let s = freshState();
    s = anoint(s, s.npcs[0].id);
    s = anoint(s, s.npcs[1].id);
    expect(s.player_god.chosen_ones).toEqual([s.npcs[0].id, s.npcs[1].id]);
  });
});
