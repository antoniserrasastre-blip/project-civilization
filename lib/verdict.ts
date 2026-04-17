/**
 * Veredicto de era — Sprint 5b (§A4 métrica de influencia).
 *
 *   influence = Fuerza + Carisma + 10 × seguidores + 5 × descendientes_vivos
 *
 * La métrica resuelve "¿quién dominó esta era?" sin castigar al jugador
 * por no micro-gestionar: un Elegido con muchos descendientes vivos pesa
 * igual que uno con mucha fuerza y seguidores. Pillars 4 & 5: el jugador
 * NO siente presión por mantener el top-1; basta con estar en top-3
 * (propio o descendiente directo) para que "reine el linaje".
 *
 * Pura — opera sobre WorldState sin tocar PRNG. El veredicto es una
 * consulta, no un evento del tick.
 */

import type { NPC, WorldState } from './world-state';

export interface InfluenceRow {
  npc: NPC;
  influence: number;
  followers: number;
  descendants: number;
}

export function influenceOf(npc: NPC, state: WorldState): InfluenceRow {
  if (!npc.alive) {
    return { npc, influence: 0, followers: 0, descendants: 0 };
  }
  let followers = 0;
  let descendants = 0;
  for (const o of state.npcs) {
    if (!o.alive) continue;
    if (o.follower_of === npc.id) followers++;
    if (o.parents.includes(npc.id)) descendants++;
  }
  const base = npc.stats.fuerza + npc.traits.carisma;
  const influence = base + 10 * followers + 5 * descendants;
  return { npc, influence, followers, descendants };
}

/**
 * Top-N NPCs por influencia. Ordenación descendente; desempates por id
 * ascendente para garantizar determinismo byte a byte en tests y replays.
 */
export function topByInfluence(state: WorldState, n = 3): InfluenceRow[] {
  const rows = state.npcs
    .filter((npc) => npc.alive)
    .map((npc) => influenceOf(npc, state));
  rows.sort((a, b) => {
    if (b.influence !== a.influence) return b.influence - a.influence;
    return a.npc.id < b.npc.id ? -1 : 1;
  });
  return rows.slice(0, n);
}

/**
 * Veredicto: ¿reina el linaje del jugador? True si cualquier miembro del
 * top-3 por influencia es Elegido o descendiente de Elegido.
 */
export function lineageInTop3(state: WorldState): boolean {
  const top = topByInfluence(state, 3);
  const chosenSet = new Set(state.player_god.chosen_ones);
  for (const row of top) {
    if (chosenSet.has(row.npc.id)) return true;
    if (row.npc.descends_from_chosen) return true;
  }
  return false;
}
