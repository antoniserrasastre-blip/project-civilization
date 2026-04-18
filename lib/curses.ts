/**
 * Maldiciones — Sprint 11 (v0.3).
 *
 * Complemento dramático de los dones: el dios puede maldecir a un
 * mortal del grupo rival. Tres niveles con coste creciente en Fe:
 *
 *   - curse_simple: -30 fuerza. 20 Fe.
 *   - curse_strong: -50 fuerza + -50 carisma. 50 Fe.
 *   - curse_fatal: muerte instantánea. 150 Fe.
 *
 * Contrato (§A4):
 *   - Función pura. `canCurse` valida cost + reglas; `curseNpc`
 *     aplica sin reverificar. El caller siempre consulta primero.
 *   - No consume PRNG: es una acción del dios, no parte del sim.
 *   - Solo se pueden lanzar sobre NPCs NO-propios — la simetría con
 *     `anoint` ("solo tu grupo") es deliberada.
 */

import type { NPC, WorldState } from './world-state';

export type CurseId = 'curse_simple' | 'curse_strong' | 'curse_fatal';

export interface CurseDef {
  id: CurseId;
  name: string;
  description: string;
  cost: number;
  apply(npc: NPC): NPC;
}

function clampStat(n: number): number {
  return Math.max(1, Math.min(200, n));
}

export const CURSES: Record<CurseId, CurseDef> = {
  curse_simple: {
    id: 'curse_simple',
    name: 'Maldición simple',
    description: 'Debilita el brazo — 30 puntos de fuerza perdidos.',
    cost: 20,
    apply(npc) {
      return {
        ...npc,
        stats: { ...npc.stats, fuerza: clampStat(npc.stats.fuerza - 30) },
      };
    },
  },
  curse_strong: {
    id: 'curse_strong',
    name: 'Maldición ruinosa',
    description:
      'Cuerpo y voz se marchitan — 50 puntos de fuerza y carisma.',
    cost: 50,
    apply(npc) {
      return {
        ...npc,
        stats: { ...npc.stats, fuerza: clampStat(npc.stats.fuerza - 50) },
        traits: { ...npc.traits, carisma: clampStat(npc.traits.carisma - 50) },
      };
    },
  },
  curse_fatal: {
    id: 'curse_fatal',
    name: 'Maldición fatal',
    description: 'Muerte instantánea. El aliento se para.',
    cost: 150,
    apply(npc) {
      return { ...npc, alive: false, partner_id: null, follower_of: null };
    },
  },
};

export type CurseResult =
  | { ok: true; cost: number }
  | {
      ok: false;
      reason:
        | 'unknown_npc'
        | 'unknown_curse'
        | 'dead_npc'
        | 'own_group'
        | 'not_enough_faith';
    };

export function canCurse(
  state: WorldState,
  npc_id: string,
  curse_id: CurseId,
): CurseResult {
  if (!(curse_id in CURSES)) return { ok: false, reason: 'unknown_curse' };
  const npc = state.npcs.find((n) => n.id === npc_id);
  if (!npc) return { ok: false, reason: 'unknown_npc' };
  if (!npc.alive) return { ok: false, reason: 'dead_npc' };
  if (npc.group_id === state.player_god.group_id) {
    return { ok: false, reason: 'own_group' };
  }
  const cost = CURSES[curse_id].cost;
  if (state.player_god.faith_points < cost) {
    return { ok: false, reason: 'not_enough_faith' };
  }
  return { ok: true, cost };
}

export function curseNpc(
  state: WorldState,
  npc_id: string,
  curse_id: CurseId,
): WorldState {
  const def = CURSES[curse_id];
  return {
    ...state,
    npcs: state.npcs.map((n) => (n.id === npc_id ? def.apply(n) : n)),
    player_god: {
      ...state.player_god,
      faith_points: state.player_god.faith_points - def.cost,
    },
  };
}
