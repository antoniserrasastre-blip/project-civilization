/**
 * Utilidades para el playtest programático.
 *
 * La idea: simular distintos tipos de jugador de forma determinista y
 * extraer métricas observables del estado resultante. Salida en forma
 * de un `PlaytestReport` que el harness escribe a disco como Markdown.
 */

import type { WorldState } from '@/lib/world-state';
import { tick } from '@/lib/simulation';
import { computeVerdict, topByInfluence } from '@/lib/verdict';

export interface Checkpoint {
  day: number;
  alive: number;
  playerFaith: number;
  chronicleLen: number;
  verdict: string;
  era: string;
  chosenCount: number;
  techCount: number;
  rivalFaiths: number[];
  rivalChosenCounts: number[];
}

export function snapshot(s: WorldState): Checkpoint {
  return {
    day: s.day,
    alive: s.npcs.filter((n) => n.alive).length,
    playerFaith: Math.round(s.player_god.faith_points * 100) / 100,
    chronicleLen: s.chronicle.length,
    verdict: computeVerdict(s),
    era: s.era,
    chosenCount: s.player_god.chosen_ones.length,
    techCount: s.technologies.length,
    rivalFaiths: s.rival_gods.map((r) => Math.round(r.faith_points)),
    rivalChosenCounts: s.rival_gods.map((r) => r.chosen_ones.length),
  };
}

export interface ActionHook {
  /** Día exacto en que actuar (se revisa en cada tick). */
  onDay: number;
  /** Transformación pura sobre el estado — devuelve el nuevo estado. */
  apply: (s: WorldState) => WorldState;
  /** Descripción corta para el log. */
  label: string;
}

export interface PersonaRun {
  name: string;
  seed: number;
  group: 'tramuntana' | 'llevant' | 'migjorn';
  ticks: number;
  /** Ticks en los que tomar checkpoints. */
  checkpointDays: number[];
  /** Acciones del jugador, ejecutadas al llegar al día correspondiente. */
  actions: ActionHook[];
}

export interface PersonaResult {
  name: string;
  seed: number;
  checkpoints: Checkpoint[];
  actionsExecuted: string[];
  finalTop3: Array<{ name: string; influence: number; isPlayer: boolean }>;
  reachedNuclearDilemma: boolean;
  finalNuclearDecision: 'given' | 'withheld' | null;
}

export function runPersona(
  run: PersonaRun,
  initial: WorldState,
): PersonaResult {
  let s = initial;
  const actionsExecuted: string[] = [];
  const checkpoints: Checkpoint[] = [];
  const pendingActions = [...run.actions].sort((a, b) => a.onDay - b.onDay);
  const checkpointSet = new Set(run.checkpointDays);
  let reachedNuclearDilemma = false;

  for (let i = 0; i < run.ticks; i++) {
    s = tick(s);

    // Ejecutar acciones programadas que correspondan al día actual.
    while (pendingActions.length > 0 && pendingActions[0].onDay <= s.day) {
      const act = pendingActions.shift()!;
      s = act.apply(s);
      actionsExecuted.push(`día ${s.day}: ${act.label}`);
    }

    if (s.technologies.includes('fision_nuclear')) {
      reachedNuclearDilemma = true;
    }

    if (checkpointSet.has(s.day)) {
      checkpoints.push(snapshot(s));
    }
  }

  // Último snapshot siempre.
  checkpoints.push(snapshot(s));

  const top = topByInfluence(s, 3).map((row) => ({
    name: row.npc.name,
    influence: row.influence,
    isPlayer:
      s.player_god.chosen_ones.includes(row.npc.id) ||
      row.npc.descends_from_chosen,
  }));

  return {
    name: run.name,
    seed: run.seed,
    checkpoints,
    actionsExecuted,
    finalTop3: top,
    reachedNuclearDilemma,
    finalNuclearDecision: s.nuclear_decision,
  };
}
