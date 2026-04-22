/**
 * ClanContext — resumen legible del estado del clan (Sprint #2
 * Fase 5 LEGIBILIDAD-MVP).
 *
 * Helper puro que compila las tres métricas que el selector de
 * susurro muestra al jugador para que pueda responder *"¿por qué
 * elijo Coraje?"* sin abrir la visión:
 *
 *   - hambre media: inversa de supervivencia media (0-100).
 *   - en apuros: count de NPCs vivos con supervivencia < 30
 *     (proxy del "hambriento / herido / cansado" de §3.7 Auxilio).
 *   - días desde último nacimiento: distancia entre currentTick
 *     y el nacimiento más reciente.
 *
 * §A4 intacto — sólo lectura del shape existente, sin PRNG, sin
 * side effects.
 */

import type { NPC } from './npcs';
import { TICKS_PER_DAY } from './resources';

/** Umbral de supervivencia bajo el que un NPC cuenta como "en apuros"
 *  (hambriento / herido / cansado — §3.7 Auxilio). */
export const DISTRESS_THRESHOLD = 30;

export interface ClanSummary {
  aliveCount: number;
  /** 0-100. Inversa de la supervivencia media. Entero redondeado. */
  hungerMeanPct: number;
  /** Count de NPCs vivos con supervivencia < DISTRESS_THRESHOLD. */
  inDistressCount: number;
  /** Días enteros desde el birthTick más reciente (≥ 0). */
  daysSinceLastBirth: number;
}

export function summarizeClanState(
  npcs: readonly NPC[],
  currentTick: number,
): ClanSummary {
  let alive = 0;
  let svSum = 0;
  let distress = 0;
  let maxBirth = 0;
  for (const n of npcs) {
    if (n.birthTick > maxBirth) maxBirth = n.birthTick;
    if (!n.alive) continue;
    alive++;
    svSum += n.stats.supervivencia;
    if (n.stats.supervivencia < DISTRESS_THRESHOLD) distress++;
  }
  const hungerMeanPct =
    alive === 0 ? 0 : Math.round(100 - svSum / alive);
  const daysSinceLastBirth = Math.max(
    0,
    Math.floor((currentTick - maxBirth) / TICKS_PER_DAY),
  );
  return {
    aliveCount: alive,
    hungerMeanPct,
    inDistressCount: distress,
    daysSinceLastBirth,
  };
}
