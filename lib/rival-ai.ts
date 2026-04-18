/**
 * IA del dios rival — Sprint 10 (v0.3).
 *
 * Contrato (§A4 + Pillar 4 anti-presión):
 *   - Pura: opera sobre estado, devuelve eventos y cursor de PRNG.
 *   - Determinista: mismo estado ⇒ mismas decisiones byte a byte.
 *   - Rítmica: un rival no decide más de una vez cada
 *     `RIVAL_DECISION_INTERVAL` días de simulación. A 1× (5 días/s)
 *     eso son ~100s entre acciones; a 100×, ~1s. El jugador siempre
 *     tiene ventana para responder.
 *
 * Perfiles (§13):
 *   - 'passive': actúa con baja probabilidad; prefiere no molestar.
 *   - 'aggressive': actúa casi cada ciclo; prioriza NPCs ambiciosos.
 *   - 'opportunistic': actúa si hay oportunidad (p.ej. tiene Fe y no
 *     tiene Elegidos, o su bando está en minoría).
 *
 * Acciones disponibles:
 *   - anoint: marca a un NPC vivo del grupo del rival como Elegido suyo.
 *     (Los dones y conflictos inter-divinos llegan en S11 / v0.4+).
 */

import { next, nextChoice, type PRNGState } from './prng';
import type { LifecycleEvent } from './scheduler';
import type { WorldState, RivalGod } from './world-state';

export const RIVAL_DECISION_INTERVAL = 500;

interface ProfileWeights {
  /** Probabilidad de actuar cuando el ciclo vence. */
  actProb: number;
  /** Peso extra por ambicion del candidato. */
  ambicionWeight: number;
}

const PROFILES: Record<RivalGod['profile'], ProfileWeights> = {
  passive: { actProb: 0.25, ambicionWeight: 0.2 },
  aggressive: { actProb: 0.8, ambicionWeight: 1.0 },
  opportunistic: { actProb: 0.55, ambicionWeight: 0.6 },
};

export interface RivalDecisionResult {
  events: LifecycleEvent[];
  prng_cursor: number;
  /** Ids de rivales a los que hay que actualizar last_decision_day. */
  rivalsActed: string[];
}

/**
 * Evalúa cada rival; si toca decidir y el perfil lo permite, emite
 * un evento `rival_anoint` (si hay candidato). Siempre actualiza el
 * `last_decision_day` — incluso si decidió no actuar — para respetar
 * el rítmico anti-presión.
 */
export function decideRivalActions(state: WorldState): RivalDecisionResult {
  let prng: PRNGState = { seed: state.seed, cursor: state.prng_cursor };
  const events: LifecycleEvent[] = [];
  const rivalsActed: string[] = [];

  for (const rival of state.rival_gods) {
    // Ciclo de decisión cerrado: aún no toca.
    if (state.day - rival.last_decision_day < RIVAL_DECISION_INTERVAL) continue;

    const profile = PROFILES[rival.profile];
    const roll = next(prng);
    prng = roll.next;
    rivalsActed.push(rival.group_id);

    if (roll.value >= profile.actProb) continue; // decidió no actuar este ciclo

    // Candidatos: NPCs vivos de su grupo que no sean ya sus Elegidos.
    const alreadyChosen = new Set(rival.chosen_ones);
    const candidates = state.npcs.filter(
      (n) =>
        n.alive &&
        n.group_id === rival.group_id &&
        !alreadyChosen.has(n.id) &&
        n.age_days / 365 >= 16,
    );
    if (candidates.length === 0) continue;

    // Ponderación: los ambiciosos brillan más para perfiles agresivos.
    // Implementada como torneo ponderado con nextChoice sobre pool expandido.
    const pool: typeof candidates = [];
    for (const c of candidates) {
      const weight = 1 + Math.floor((c.traits.ambicion / 100) * profile.ambicionWeight * 5);
      for (let i = 0; i < weight; i++) pool.push(c);
    }
    const pick = nextChoice(prng, pool);
    prng = pick.next;
    events.push({
      type: 'rival_anoint',
      rival_group_id: rival.group_id,
      npc_id: pick.value.id,
    });
  }

  return { events, prng_cursor: prng.cursor, rivalsActed };
}
