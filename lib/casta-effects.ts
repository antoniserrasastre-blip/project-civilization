/**
 * Efectos de casta — Sprint 8 MODULO-SOCIAL.
 *
 * Puro: recibe NPCs/NPC, devuelve deltas numéricos. Sin side effects.
 * El caller (simulation.ts) aplica los deltas al estado.
 *
 * Elegido vivo: aporta bonus de Fe por tick (§3.7b / Pilar 3).
 * Esclavo vivo: drena supervivencia pasiva por tick (deuda de casta §3.2).
 */

import { CASTA, type NPC } from './npcs';
import { TICKS_PER_DAY } from './resources';

/** Fe extra aportada por cada Elegido vivo por tick. Distribuida sobre
 *  TICKS_PER_DAY para que el impacto diario sea ELEGIDO_FAITH_PER_DAY. */
export const ELEGIDO_FAITH_PER_DAY = 2;
export const ELEGIDO_FAITH_PER_TICK = ELEGIDO_FAITH_PER_DAY / TICKS_PER_DAY;

/** Drain de supervivencia del Esclavo por tick. Representa la deuda
 *  sistémica: sin herramientas y bajo presión constante. Equivale a
 *  ESCLAVO_DRAIN_PER_DAY puntos de supervivencia diarios. */
export const ESCLAVO_DRAIN_PER_DAY = 3;
export const ESCLAVO_DRAIN_PER_TICK = ESCLAVO_DRAIN_PER_DAY / TICKS_PER_DAY;

/**
 * Bonus de Fe total de todos los Elegidos vivos para este tick.
 * Suma fraccional — el caller acumula y aplica entero cuando supera 1.
 */
export function elegidoFaithBonusPerTick(npcs: readonly NPC[]): number {
  const count = npcs.filter((n) => n.alive && n.casta === CASTA.ELEGIDO).length;
  return count * ELEGIDO_FAITH_PER_TICK;
}

/**
 * Drain de supervivencia del Esclavo por tick.
 * Devuelve 0 si el NPC no es Esclavo o está muerto.
 */
export function esclavoSurvivDrainPerTick(npc: NPC): number {
  if (!npc.alive || npc.casta !== CASTA.ESCLAVO) return 0;
  return ESCLAVO_DRAIN_PER_TICK;
}

/**
 * Aplica el drain de Esclavo al array de NPCs. Puro: devuelve array
 * nuevo sin mutar el input. El clip en 0 evita stats negativas.
 */
export function applyEsclavoDrain(npcs: readonly NPC[]): NPC[] {
  return npcs.map((npc) => {
    const drain = esclavoSurvivDrainPerTick(npc);
    if (drain === 0) return npc;
    const next = Math.max(0, npc.stats.supervivencia - drain);
    return { ...npc, stats: { ...npc.stats, supervivencia: next } };
  });
}
