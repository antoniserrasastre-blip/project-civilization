/**
 * Tutorial coreografiado — Sprint 5a (§A1 de la visión).
 *
 * El onboarding arranca en día 0 y debe llevar al jugador a ver en ~90s
 * reales: (1) intro cinemática, (2) señalamiento del NPC más ambicioso,
 * (3) evento dramático forzado, (4) acto notable del señalado, (5) fin.
 *
 * Aquí empaquetamos solo la lógica *temporal* del tutorial: qué fase
 * corresponde a qué día, y cuándo debe terminar. Los eventos forzados
 * los emite el scheduler — este módulo solo decide CUÁNDO. De esa forma
 * el tutorial es pura función del estado (reproducible, determinista)
 * y la UI puede consultar `tutorialPhase(state)` sin tocar scheduler.
 *
 * Mapping días → fase (1 tick = 1 día). A 1× velocidad (5 ticks/s) el
 * ciclo 0→30 encaja aproximadamente en los 90s de la visión; el jugador
 * puede acelerar sin romperlo.
 */

import type { WorldState } from './world-state';

export type TutorialPhase =
  | 'intro'
  | 'halo'
  | 'forced_event'
  | 'notable_act'
  | 'done';

/** Umbrales de día para cada fase del tutorial. */
export const TUTORIAL_PHASES: Array<{ from: number; phase: TutorialPhase }> = [
  { from: 0, phase: 'intro' },
  { from: 2, phase: 'halo' },
  { from: 6, phase: 'forced_event' },
  { from: 10, phase: 'notable_act' },
  { from: 30, phase: 'done' },
];

/** Día exacto en el que el scheduler debe inyectar el evento forzado. */
export const TUTORIAL_FORCED_EVENT_DAY = 6;
/** Día tras el cual el tutorial termina automáticamente. */
export const TUTORIAL_END_DAY = 30;

/**
 * Devuelve la fase actual del tutorial dado el estado. Si
 * `tutorial_active` es false o ya pasó `TUTORIAL_END_DAY`, devuelve
 * 'done'.
 */
export function tutorialPhase(state: WorldState): TutorialPhase {
  if (!state.tutorial_active) return 'done';
  let current: TutorialPhase = 'intro';
  for (const bracket of TUTORIAL_PHASES) {
    if (state.day >= bracket.from) current = bracket.phase;
  }
  return current;
}

/**
 * Marca el tutorial como cerrado. Acción idempotente — si ya estaba
 * cerrado devuelve el mismo estado.
 */
export function endTutorial(state: WorldState): WorldState {
  if (!state.tutorial_active) return state;
  return { ...state, tutorial_active: false };
}
