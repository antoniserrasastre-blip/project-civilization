/**
 * Pool de gratitud del clan — Sprint 5.3 (decisión #31).
 *
 * Moneda emergente que la gratitud de los NPCs acumula al clan
 * cuando el mensaje diario del jugador les beneficia. La usan los
 * milagros (Sprint 5.4). Sin PRNG. Enteros, clamp [0, CEILING].
 */

import type { NPC } from './npcs';
import type { MessageChoice } from './messages';
import { SILENCE } from './messages';
import type { VillageState } from './village';

export const GRATITUDE_CEILING = 200;

/** Constantes de balance (decisión #31, revalidado Sprint #1 tras
 *  flag 🚩 del VERSION-LOG Fase 5: rate 1 → 0.25 para evitar que el
 *  pool sature en < 1 día con 10 NPCs thriving). */
export const GRATITUDE_RATES = {
  /** Incremento por tick por cada NPC con supervivencia ≥ 50 y
   *  mensaje activo (no SILENCE). Fraccional por diseño: con 10
   *  NPCs thriving, 24 ticks/día × 0.25 = 60 gratitud/día →
   *  CEILING (200) en ~3.3 días de juego. Los milagros baratos
   *  (30) siguen alcanzables en <1 día. */
  perThrivingNpcWithMessage: 0.25,
  /** Penalty por Elegido muerto (aplicado una vez cuando muere). */
  elegidoDeathPenalty: 20,
  /** Drenaje por día de silencio acumulado — §3.8 nota "pérdida
   *  parcial al silenciar días seguidos". Sprint #1 aclaratoria
   *  (firma Director Creativo 2026-04-22): aplica SOLO a silencio
   *  elegido deliberadamente (activeMessage === SILENCE) tras
   *  agotar `silenceGraceDaysRemaining`. Silencio por default
   *  (activeMessage === null) NO drena — eso es observar, no
   *  desairar. Cableo pendiente — la constante existe como gancho
   *  hasta que un sprint posterior la conecte al tick. */
  silenceDailyDrain: 2,
  /** Umbral de supervivencia que califica a un NPC como "vivo
   *  bien" — contribuye a gratitud si hay mensaje. */
  thrivingThreshold: 50,
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Delta de gratitud para un tick dado.
 *
 * Regla determinista:
 *   - Si activeMessage es null o SILENCE → 0 (sin mensaje, no hay
 *     gratitud generada).
 *   - Si hay mensaje real, delta = +(NPCs vivos con sv ≥ threshold) *
 *     perThrivingNpcWithMessage.
 *
 * Suma entera, conmutativa sobre NPCs.
 */
export function computeGratitudeTickDelta(
  npcs: readonly NPC[],
  activeMessage: MessageChoice | null,
): number {
  if (activeMessage === null || activeMessage === SILENCE) return 0;
  let c = 0;
  for (const n of npcs) {
    if (!n.alive) continue;
    if (n.stats.supervivencia >= GRATITUDE_RATES.thrivingThreshold) c++;
  }
  return c * GRATITUDE_RATES.perThrivingNpcWithMessage;
}

/** Aplica un delta al pool con saturación y clamp [0, CEILING]. */
export function applyGratitudeDelta(
  village: VillageState,
  delta: number,
): VillageState {
  const next = clamp(village.gratitude + delta, 0, GRATITUDE_CEILING);
  return { ...village, gratitude: next };
}

/** Penalty por muerte de Elegido — restado cuando el tick detecta
 *  que un Elegido ha pasado de alive=true a alive=false. */
export function penalizeElegidoDeath(village: VillageState): VillageState {
  return applyGratitudeDelta(village, -GRATITUDE_RATES.elegidoDeathPenalty);
}

/**
 * Gasta `amount` del pool. Tira si no hay suficiente. Usado por
 * milagros (Sprint 5.4).
 */
export function spendGratitude(
  village: VillageState,
  amount: number,
): VillageState {
  if (amount <= 0) throw new Error(`amount debe ser > 0: ${amount}`);
  if (village.gratitude < amount) {
    throw new Error(
      `gratitud insuficiente: tienes ${village.gratitude}, necesitas ${amount}`,
    );
  }
  return applyGratitudeDelta(village, -amount);
}
