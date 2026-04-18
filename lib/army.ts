/**
 * Ejércitos abstractos — Sprint 15 (v1.1 era clásica).
 *
 * No hay "unidades" individuales: el ejército de un grupo es un
 * número, `floor(Σ fuerza_adultos_sanos / 10)`. Las batallas se
 * resuelven con un cálculo determinista que compara fuerzas,
 * aplicando boost del Estratega si procede.
 *
 * Todo puro — el caller puede llamarlo desde el scheduler o desde
 * una decisión del jugador sin ensuciar el PRNG global (la dispersión
 * se aplica a partir del `state.prng_cursor` pero NO lo avanza: el
 * caller es responsable si quiere encadenar).
 */

import type { WorldState } from './world-state';

const ADULT_MIN_AGE_YEARS = 16;

export function armyStrength(state: WorldState, group_id: string): number {
  let sum = 0;
  for (const n of state.npcs) {
    if (!n.alive) continue;
    if (n.group_id !== group_id) continue;
    if (n.age_days / 365 < ADULT_MIN_AGE_YEARS) continue;
    sum += n.stats.fuerza;
  }
  return Math.floor(sum / 10);
}

export interface BattleOptions {
  /** Boost multiplicativo al ejército atacante (ej. 0.2 = +20% por estratega). */
  strategistBoost?: number;
}

export interface BattleResult {
  winner: string;
  loser: string;
  attackerPower: number;
  defenderPower: number;
  /** Bajas estimadas del perdedor — un 30% de su fuerza efectiva. */
  casualties: number;
}

export function resolveGroupBattle(
  state: WorldState,
  attackerGroupId: string,
  defenderGroupId: string,
  options: BattleOptions = {},
): BattleResult {
  const boost = options.strategistBoost ?? 0;
  const attackerBase = armyStrength(state, attackerGroupId);
  const defenderBase = armyStrength(state, defenderGroupId);

  const attackerPower = Math.floor(attackerBase * (1 + boost));
  const defenderPower = defenderBase;

  const attackerWins = attackerPower >= defenderPower;
  const winner = attackerWins ? attackerGroupId : defenderGroupId;
  const loser = attackerWins ? defenderGroupId : attackerGroupId;
  const loserPower = attackerWins ? defenderPower : attackerPower;
  const casualties = Math.floor(loserPower * 0.3);

  return { winner, loser, attackerPower, defenderPower, casualties };
}
