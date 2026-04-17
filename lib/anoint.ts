/**
 * Filtro "solo puedes ungir de tu grupo".
 *
 * En MVP todos los NPCs pertenecen al grupo del jugador, así que este
 * filtro siempre devuelve `true` para NPCs vivos del roster. Pero lo
 * implementamos YA porque:
 *
 *   - Es la preparación arquitectónica que evita el refactor de v0.3.
 *   - Documenta el contrato: ningún otro sitio del código debe hacer
 *     decisiones de "puede/no puede ungir" con lógica distinta.
 *
 * En v0.3, cuando haya NPCs con `group_id` de grupos rivales, este
 * filtro empezará a devolver `false` para ellos sin cambiar ningún otro
 * sitio del código que ya lo llame.
 */

import type { WorldState } from './world-state';

export type AnointResult =
  | { ok: true }
  | { ok: false; reason: 'unknown_npc' | 'dead_npc' | 'wrong_group' | 'already_chosen' };

/**
 * Evalúa si el jugador puede ungir a `npc_id` como Elegido.
 *
 * Devuelve un discriminated union para que la UI pueda mostrar un
 * mensaje específico ("este mortal ha muerto", "no es de tu pueblo")
 * en vez de un simple booleano silencioso.
 */
export function canAnoint(state: WorldState, npc_id: string): AnointResult {
  const npc = state.npcs.find((n) => n.id === npc_id);
  if (!npc) return { ok: false, reason: 'unknown_npc' };
  if (!npc.alive) return { ok: false, reason: 'dead_npc' };
  if (npc.group_id !== state.player_god.group_id) {
    return { ok: false, reason: 'wrong_group' };
  }
  if (state.player_god.chosen_ones.includes(npc_id)) {
    return { ok: false, reason: 'already_chosen' };
  }
  return { ok: true };
}

/**
 * Unge al NPC como Elegido. No verifica elegibilidad — el caller debe
 * haber consultado `canAnoint` primero. Esto mantiene la función pura
 * y determinista (sin condicionales que dependan de detalles).
 *
 * El PRIMER Elegido del jugador es gratis; los siguientes aún no tienen
 * coste definido (queda para v0.2 cuando se introduzcan umbrales de Fe).
 */
export function anoint(state: WorldState, npc_id: string): WorldState {
  return {
    ...state,
    player_god: {
      ...state.player_god,
      chosen_ones: [...state.player_god.chosen_ones, npc_id],
    },
  };
}
