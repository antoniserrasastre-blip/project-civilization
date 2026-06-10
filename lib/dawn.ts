/**
 * Pipeline del amanecer — Sprint 02 (línea C, "El Loop primero").
 *
 * El amanecer es la columna vertebral del loop: aquí se cierra el día que
 * termina y arranca el siguiente. Su orden fue fuente de bugs (gratitud
 * post-reset), así que queda blindado como DATO exportado (`DAWN_PIPELINE`):
 * nunca más orden implícito repartido por el tick.
 *
 * §A4: todo puro, determinista, enteros, round-trip JSON.
 *
 * Orden (acordado en la spec 02 + enmienda Memoria Mecánica v2):
 *   1. gratitud-amanecer — pulso del día que cierra + drain de silencio + gracia
 *   2. noches-fogata     — ¿contó la noche para el monumento?
 *   3. friccion-divina   — tickFractures lee contadores PRE-reset; sus grants
 *                          de gratitud cuentan contra el cap del día que cierra
 *   4. consolidar-xp     — stub (Sprint 03: XP por actividad → skills)
 *   5. informe-amanecer  — stub (Sprint 04: plan vs resultado para la UI)
 *   6. reset-diario      — contadores diarios a cero (SIEMPRE tras fricción)
 *   7. clima             — transición climática del nuevo día (consume PRNG)
 */

import type { GameState } from './game-state';
import type { NPC, AssignmentDomain } from './npcs';
import { ASSIGNMENT_DOMAINS } from './npcs';
import { TICKS_PER_DAY } from './resources';
import {
  applyGratitudeDelta,
  computeSilenceDrainPerDay,
  evaluateDawnGratitude,
  resetGratitudeDailyTracking,
} from './gratitude';
import { evaluateNight } from './nights';
import { tickFractures } from './events';
import { tickClimate } from './climate';
import { firstStructureOfKind } from './structures';
import { CRAFTABLE } from './crafting';

/** Designios de un anochecer: npcId → dominio. */
export type Assignments = Readonly<Record<string, AssignmentDomain>>;

export interface DawnStep {
  name: string;
  run(state: GameState): GameState;
}

export const DAWN_PIPELINE: readonly DawnStep[] = [
  {
    name: 'gratitud-amanecer',
    run(state) {
      let v = evaluateDawnGratitude(state.village, state.village.activeMessage);
      const drain = computeSilenceDrainPerDay(v);
      if (drain > 0) v = applyGratitudeDelta(v, -drain);
      if (v.silenceGraceDaysRemaining > 0 && v.activeMessage === null) {
        v = { ...v, silenceGraceDaysRemaining: v.silenceGraceDaysRemaining - 1 };
      }
      return { ...state, village: v };
    },
  },
  {
    name: 'noches-fogata',
    run(state) {
      const nights = evaluateNight(state.structures, state.npcs, state.village.consecutiveNightsAtFire);
      return { ...state, village: { ...state.village, consecutiveNightsAtFire: nights } };
    },
  },
  {
    name: 'friccion-divina',
    run(state) {
      return tickFractures(state).state;
    },
  },
  {
    name: 'consolidar-xp',
    // Stub — Sprint 03: la XP ganada durante el día se consolida en skills
    // (skill_efectiva = base + xp ± memoria; la memoria ya es transitoria, v2).
    run(state) {
      return state;
    },
  },
  {
    name: 'informe-amanecer',
    // Stub — Sprint 04: genera el informe plan-vs-resultado que la UI de
    // preparación muestra al jugador (el espejo del hook "ver que se cumple").
    run(state) {
      return state;
    },
  },
  {
    name: 'reset-diario',
    run(state) {
      return { ...state, village: resetGratitudeDailyTracking(state.village) };
    },
  },
  {
    name: 'clima',
    run(state) {
      const { state: climate, next: prng } = tickClimate(state.climate, state.prng);
      return { ...state, climate, prng };
    },
  },
];

/** Aplica el pipeline completo del amanecer y deja la fase en 'day'.
 *  Puro: state -> new_state. El caller decide cuándo (boundary de día). */
export function dawn(state: GameState): GameState {
  let s = state;
  for (const step of DAWN_PIPELINE) {
    s = step.run(s);
  }
  return { ...s, phase: 'day' };
}

/**
 * Arranca el día siguiente desde la fase de preparación (línea C).
 * Registra los designios válidos (NPC vivo + dominio del PoC; lo demás se
 * descarta en silencio — no-op explícito, jamás throw), guarda el historial,
 * corre el amanecer y cruza el anochecer (tick+1).
 * Fuera de 'preparation' es un no-op que devuelve el estado tal cual.
 */
export function applyAssignments(state: GameState, assignments: Assignments): GameState {
  if (state.phase !== 'preparation') return state;

  const aliveIds = new Set(state.npcs.filter((n) => n.alive).map((n) => n.id));
  const valid: Record<string, AssignmentDomain> = {};
  // Orden estable por id (nunca por orden de inserción del objeto).
  for (const npcId of Object.keys(assignments).sort()) {
    const domain = assignments[npcId];
    if (!aliveIds.has(npcId)) continue;
    if (!(ASSIGNMENT_DOMAINS as readonly string[]).includes(domain)) continue;
    valid[npcId] = domain;
  }

  const npcs: NPC[] = state.npcs.map((n) =>
    valid[n.id] !== undefined ? { ...n, designio: valid[n.id] } : n,
  );

  const day = Math.floor((state.tick + 1) / TICKS_PER_DAY);
  const withAssignments: GameState = {
    ...state,
    npcs,
    // `?? []`: saves anteriores al Sprint 02 no traen historial (compat).
    assignmentsHistory: [...(state.assignmentsHistory ?? []), { day, assignments: valid }],
  };

  // El amanecer consume el tick del anochecer: el nuevo día arranca limpio.
  const dawned = dawn(withAssignments);
  return { ...dawned, tick: state.tick + 1 };
}

/**
 * Punto de reunión del clan al anochecer. Hoy es la fogata permanente;
 * mañana será el centro de la ciudad (decisión modelo-espacial 10-06-2026:
 * no hardcodear "fogata" en el loop). null si aún no existe.
 */
export function gatherPoint(state: GameState): { x: number; y: number } | null {
  const fire = firstStructureOfKind(state.structures, CRAFTABLE.FOGATA_PERMANENTE);
  return fire ? { x: fire.position.x, y: fire.position.y } : null;
}
