/**
 * Fe como moneda de cambio — Sprint #1 REFACTOR-SUSURRO-FE
 * (vision-primigenia §3.7b).
 *
 * Segunda moneda del verbo divino, separada funcionalmente de la
 * gratitud (§3.8). La Fe **no desbloquea milagros** — paga
 * **cambios de susurro**.
 *
 * Generación: sublineal por seguidores vivos, `Fe/día = sqrt(vivos)`.
 * Cap 160 (2× coste cambio), init 30 (colchón sin alcanzar cambio).
 * Primer susurro gratis (§3.7). Gracia inicial de 7 días sin
 * penalización por Silencio por omisión.
 *
 * §A4: puro, determinista, sin PRNG, round-trip JSON OK.
 */

import type { VillageState } from './village';
import type { MessageChoice } from './messages';

export const FAITH_COST_CHANGE = 80;
export const FAITH_COST_SILENCE = 40;
export const FAITH_CAP = 160;
export const FAITH_INITIAL = 30;
export const SILENCE_GRACE_DAYS = 7;

export function faithPerDay(aliveCount: number): number {
  if (aliveCount <= 0) return 0;
  return Math.sqrt(aliveCount);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function accumulateFaithDaily(
  village: VillageState,
  aliveCount: number,
): VillageState {
  if (aliveCount <= 0) return village;
  const next = clamp(village.faith + faithPerDay(aliveCount), 0, FAITH_CAP);
  return { ...village, faith: next };
}

export function canAffordChange(village: VillageState): boolean {
  return village.faith >= FAITH_COST_CHANGE;
}

export function canAffordSilence(village: VillageState): boolean {
  return village.faith >= FAITH_COST_SILENCE;
}

export function spendFaithForChange(village: VillageState): VillageState {
  if (!canAffordChange(village)) {
    throw new Error(
      `Fe insuficiente: tienes ${village.faith}, necesitas ${FAITH_COST_CHANGE}`,
    );
  }
  return { ...village, faith: village.faith - FAITH_COST_CHANGE };
}

export function spendFaithForSilence(village: VillageState): VillageState {
  if (!canAffordSilence(village)) {
    throw new Error(
      `Fe insuficiente: tienes ${village.faith}, necesitas ${FAITH_COST_SILENCE}`,
    );
  }
  return { ...village, faith: village.faith - FAITH_COST_SILENCE };
}

export function tickSilenceGraceDay(village: VillageState): VillageState {
  if (village.silenceGraceDaysRemaining <= 0) return village;
  return {
    ...village,
    silenceGraceDaysRemaining: village.silenceGraceDaysRemaining - 1,
  };
}

export function isFirstWhisper(
  messageHistory: ReadonlyArray<{ day: number; intent: MessageChoice }>,
): boolean {
  return messageHistory.length === 0;
}
