/**
 * Pool de gratitud del clan — Sprint 5.3 (decisión #31).
 *
 * Moneda emergente que la gratitud de los NPCs acumula al clan
 * cuando el mensaje diario del jugador les beneficia. La usan los
 * milagros (Sprint 5.4). Sin PRNG. Clamp [0, CEILING].
 *
 * Sub-ajuste Sprint Fase 5 #1: el rate previo (1 por tick por
 * NPC thriving) saturaba el cap 200 en < 1 día con 10 NPCs. Bajado
 * a 0.25 para que el primer milagro barato (~30) esté en 2-3 días
 * de susurro alineado con 14 NPCs. Valor final lo calibra el
 * playtest Fase 5 #1.5.
 *
 * Drain del silencio (§3.7b):
 *   - Silencio por default (pre-primer-susurro) tras 7 días de
 *     gracia → drena `silenceDailyDrain` al día.
 *   - Silencio elegido (pagó 40 Fe) → NO drena (doble castigo).
 *   - Susurro activo real → NO drena.
 */

import type { NPC } from './npcs';
import type { MessageChoice } from './messages';
import { SILENCE } from './messages';
import type { VillageState } from './village';

export const GRATITUDE_CEILING = 200;

/** Constantes de balance (decisión #31, revalidar en playtest
 *  Fase 5 #1.5). */
export const GRATITUDE_RATES = {
  /** Incremento por tick por cada NPC con supervivencia ≥ 50 y
   *  mensaje activo (no SILENCE). Modela "mi mensaje encaja".
   *  Calibrado para que, con 14 NPCs thriving al 100%, el primer
   *  milagro barato (~30) se alcance en ≥ 0.5 días y el cap (200)
   *  requiera ≥ 3 días de susurro alineado continuo. Playtest #1.5
   *  ajusta el número final. */
  perThrivingNpcWithMessage: 0.1,
  /** Penalty por Elegido muerto (aplicado una vez cuando muere). */
  elegidoDeathPenalty: 20,
  /** Drenaje por día de silencio por default tras gracia. */
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
 *   - Si hay mensaje real, delta = (NPCs vivos con sv ≥ threshold) *
 *     perThrivingNpcWithMessage.
 *
 * No redondea — la suma entera la hace `applyGratitudeDelta` al
 * final del clamp. Float en el delta permite rate fraccionarios.
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

/** Drain de gratitud por día según el estado del susurro. Puro.
 *  Sólo el silencio-por-default fuera de gracia drena. */
export function computeSilenceDrainPerDay(village: VillageState): number {
  if (village.activeMessage !== null) return 0;
  if (village.silenceGraceDaysRemaining > 0) return 0;
  return GRATITUDE_RATES.silenceDailyDrain;
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
