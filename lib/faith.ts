/**
 * Fe — Sprint #1 Fase 5 (§3.7b vision-primigenia).
 *
 * Moneda pasiva separada de la gratitud. Se acumula según
 * `sqrt(seguidores vivos)` por día y sirve para **cambiar el
 * susurro activo** (80 Fe) o **silenciar deliberadamente** (40 Fe).
 * No desbloquea milagros — ese dominio es exclusivo de la gratitud.
 *
 * Reglas §A4 — módulo puro: sin side effects, sin PRNG (la fórmula
 * es determinista en función de `aliveCount`), sin Date.now().
 */

import { TICKS_PER_DAY } from './resources';
import type { VillageState } from './village';

/** Coste en Fe para cambiar de intención activa (§3.7b). */
export const FAITH_COST_CHANGE = 80;

/** Coste en Fe para silenciar deliberadamente (§3.7b). */
export const FAITH_COST_SILENCE = 40;

/** Cap de acumulación: 2× coste de cambio, anti-banking (§3.7b). */
export const FAITH_CAP = 160;

/** Fe inicial del clan — colchón que no alcanza para un cambio
 *  pero evita el "HUD seco" al arranque (§3.7b). */
export const FAITH_INITIAL = 30;

/** Fe generada en un día con `aliveCount` seguidores vivos.
 *  Sublineal: doblar vivos acelera suavemente sin trivializar. */
export function faithPerDay(aliveCount: number): number {
  if (aliveCount <= 0) return 0;
  return Math.sqrt(aliveCount);
}

/** Fe generada por tick (rate consistente con `faithPerDay`). */
export function faithPerTick(aliveCount: number): number {
  return faithPerDay(aliveCount) / TICKS_PER_DAY;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Suma un delta al pool de Fe con clamp [0, FAITH_CAP]. Puro. */
export function applyFaithDelta(
  village: VillageState,
  delta: number,
): VillageState {
  return { ...village, faith: clamp(village.faith + delta, 0, FAITH_CAP) };
}

/** True si el pool actual cubre `amount`. */
export function canAfford(village: VillageState, amount: number): boolean {
  return village.faith >= amount;
}

/** Gasta `amount` del pool. Tira si insuficiente o inválido. */
export function spendFaith(
  village: VillageState,
  amount: number,
): VillageState {
  if (amount <= 0) throw new Error(`amount debe ser > 0: ${amount}`);
  if (village.faith < amount) {
    throw new Error(
      `fe insuficiente: tienes ${village.faith}, necesitas ${amount}`,
    );
  }
  return applyFaithDelta(village, -amount);
}
