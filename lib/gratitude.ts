/**
 * Pool de gratitud del clan — v2 (diseño Gratitud v2).
 *
 * Moneda emergente que se acumula cuando el susurro activo se alinea
 * con eventos significativos del clan. La usan los milagros
 * (`lib/miracles.ts`). Determinista, entero, §A4.
 *
 * Modelo (diseño v2):
 *   - Fuente A: eventos (hunger_escape, birth, rescue, etc.) emitidos
 *     desde `simulation.ts` cuando el motor los detecta.
 *   - Fuente B: pulsos al amanecer evaluados sobre el día que cierra
 *     (day_without_deaths, day_saciated, day_social).
 *   - Cada evento tiene un dominio. El susurro activo lista los
 *     dominios "afines" — coincidencia multiplica ×1.5, ausencia ×0.5.
 *   - ESPERANZA es ×1.0 universal (susurro cauto, ni premia ni castiga).
 *   - SILENCE / null → ×0 (el dios no nombró el momento).
 *   - Cap diario 40 impide farm; dedupe evita doble crédito.
 *   - Pérdidas (Elegido muerto −20, drain de silencio) no cuentan
 *     contra el cap — se aplican al pool directamente.
 *
 * Drain del silencio (§3.7b, Sprint Fase 5 #1):
 *   - Silencio por default (pre-primer-susurro) tras 7 días de
 *     gracia → drena `silenceDailyDrain` al día.
 *   - Silencio elegido (pagó 40 Fe) → NO drena (doble castigo).
 *   - Susurro activo real → NO drena.
 *
 * Legacy (Sprint 5.3): se conserva `computeGratitudeTickDelta` con
 * el rate sub-ajustado a 0.1 para que tests y callers pre-existentes
 * compilen sin romperse. El v2 lo reemplaza en `simulation.ts` — no
 * lo llama desde el tick.
 */

import type { MessageChoice } from './messages';
import { MESSAGE_INTENTS, SILENCE } from './messages';
import type { NPC } from './npcs';
import type { VillageState } from './village';

export const GRATITUDE_CEILING = 200;
export const GRATITUDE_DAILY_CAP = 40;

/** Penalty por muerte de Elegido (una vez por muerte). */
export const GRATITUDE_ELEGIDO_DEATH_PENALTY = 20;

/** Constantes de balance legacy (decisión #31, sub-ajuste Sprint
 *  Fase 5 #1). Usadas por `computeGratitudeTickDelta` (legacy) y por
 *  `computeSilenceDrainPerDay` (activa). */
export const GRATITUDE_RATES = {
  /** Incremento por tick por cada NPC con supervivencia ≥ 50 y
   *  mensaje activo. No cableado en `simulation.ts` v2 — el v2
   *  genera gratitud por eventos. Conservado para compat + tests
   *  de balance. */
  perThrivingNpcWithMessage: 0.1,
  /** Penalty por Elegido muerto (espejo de GRATITUDE_ELEGIDO_DEATH_PENALTY). */
  elegidoDeathPenalty: GRATITUDE_ELEGIDO_DEATH_PENALTY,
  /** Drenaje por día de silencio-por-default tras la gracia. */
  silenceDailyDrain: 2,
  /** Umbral de supervivencia que califica a un NPC como "vivo bien"
   *  en el legacy trickle. */
  thrivingThreshold: 50,
};

/** Dominios del evento — usados para calcular alineación con susurro. */
export type GratitudeDomain =
  | 'supervivencia'
  | 'exploration'
  | 'social_linaje'
  | 'social_moral'
  | 'cultura_tecnica'
  | 'resiliencia';

/** Tipos de evento que pueden producir gratitud. */
export type GratitudeEventType =
  | 'hunger_escape'
  | 'resource_discovered'
  | 'pair_bonded'
  | 'birth'
  | 'rescue'
  | 'debt_settled'
  | 'first_craft'
  | 'day_without_deaths'
  | 'day_saciated'
  | 'day_social'
  | 'storytelling';

export interface GratitudeEvent {
  type: GratitudeEventType;
  /** Id del NPC protagonista si aplica. Los eventos de "fuente B"
   *  (dawn pulse) son globales y no llevan npcId. */
  npcId?: string;
  /** Posición opcional para feedback visual — no afecta la lógica. */
  position?: { x: number; y: number };
}

export interface GratitudeEventDef {
  /** Magnitud base: S=2, M=5, L=10. */
  base: number;
  domain: GratitudeDomain;
}

/** Catálogo de eventos y su valor base + dominio. Números
 *  provisionales, revalidar en playtest. */
export const GRATITUDE_EVENT_VALUES: Record<
  GratitudeEventType,
  GratitudeEventDef
> = {
  hunger_escape: { base: 10, domain: 'supervivencia' },
  resource_discovered: { base: 2, domain: 'exploration' },
  pair_bonded: { base: 5, domain: 'social_linaje' },
  birth: { base: 10, domain: 'social_linaje' },
  rescue: { base: 10, domain: 'supervivencia' },
  debt_settled: { base: 2, domain: 'social_moral' },
  first_craft: { base: 5, domain: 'cultura_tecnica' },
  day_without_deaths: { base: 5, domain: 'resiliencia' },
  day_saciated: { base: 5, domain: 'supervivencia' },
  day_social: { base: 2, domain: 'social_linaje' },
  storytelling: { base: 2, domain: 'resiliencia' },
};

/** Dominios afines a cada susurro. ESPERANZA se trata aparte
 *  (multiplicador ×1.0 universal). Los dominios listados reciben
 *  ×1.5; los no listados, ×0.5. */
export const SUSURRO_DOMAINS: Record<
  (typeof MESSAGE_INTENTS)[keyof typeof MESSAGE_INTENTS],
  GratitudeDomain[]
> = {
  [MESSAGE_INTENTS.AUXILIO]: ['supervivencia'],
  [MESSAGE_INTENTS.CORAJE]: ['supervivencia', 'exploration'],
  [MESSAGE_INTENTS.PACIENCIA]: ['resiliencia'],
  [MESSAGE_INTENTS.ENCUENTRO]: ['social_linaje', 'social_moral'],
  [MESSAGE_INTENTS.RENUNCIA]: ['exploration', 'cultura_tecnica'],
  [MESSAGE_INTENTS.ESPERANZA]: [],
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function alignmentMultiplier(
  susurro: MessageChoice | null,
  domain: GratitudeDomain,
): number {
  if (susurro === null || susurro === SILENCE) return 0;
  if (susurro === MESSAGE_INTENTS.ESPERANZA) return 1.0;
  const affine = SUSURRO_DOMAINS[susurro];
  return affine.includes(domain) ? 1.5 : 0.5;
}

/**
 * Devuelve el delta entero de gratitud para un evento dado el
 * susurro activo. No modifica estado. Puro y determinista.
 * Redondeo half-up (`Math.round` sobre positivos).
 */
export function computeGratitudeFromEvent(
  event: GratitudeEvent,
  susurro: MessageChoice | null,
): number {
  const def = GRATITUDE_EVENT_VALUES[event.type];
  if (!def) return 0;
  const mult = alignmentMultiplier(susurro, def.domain);
  if (mult === 0) return 0;
  return Math.round(def.base * mult);
}

function eventKey(event: GratitudeEvent): string {
  return `${event.type}:${event.npcId ?? 'global'}`;
}

/**
 * Aplica un evento al pool con dedupe por (tipo, npcId, día) y
 * cap diario. Si el evento ya se acreditó hoy o el cap está
 * saturado, devuelve el estado sin cambios (no-op silencioso).
 *
 * No confundir con `applyGratitudeDelta` — esa es la API cruda
 * usada por pérdidas y milagros, que no cuenta contra el cap.
 */
export function applyGratitudeFromEvent(
  village: VillageState,
  event: GratitudeEvent,
  susurro: MessageChoice | null,
): VillageState {
  const raw = computeGratitudeFromEvent(event, susurro);
  if (raw <= 0) return village;
  const key = eventKey(event);
  if (village.gratitudeEventKeys.includes(key)) return village;
  const capacity = GRATITUDE_DAILY_CAP - village.gratitudeEarnedToday;
  if (capacity <= 0) return village;
  const delta = Math.min(raw, capacity);
  return {
    ...village,
    gratitude: clamp(village.gratitude + delta, 0, GRATITUDE_CEILING),
    gratitudeEarnedToday: village.gratitudeEarnedToday + delta,
    gratitudeEventKeys: [...village.gratitudeEventKeys, key],
  };
}

/**
 * Reset diario al amanecer. Vacía el tracking del día; el pool
 * acumulado queda intacto. Lo llama `simulation.ts` al cruzar
 * el dawn.
 */
export function resetGratitudeDailyTracking(
  village: VillageState,
): VillageState {
  if (
    village.gratitudeEarnedToday === 0 &&
    village.gratitudeEventKeys.length === 0 &&
    village.dailyDeaths === 0 &&
    village.dailyHungerEscapes === 0
  ) {
    return village;
  }
  return {
    ...village,
    gratitudeEarnedToday: 0,
    gratitudeEventKeys: [],
    dailyDeaths: 0,
    dailyHungerEscapes: 0,
  };
}

/** Umbral de escapes de hambre en un día que dispara `day_saciated`. */
export const DAY_SACIATED_MIN_ESCAPES = 3;

/**
 * Evalúa los pulsos del amanecer (fuente B) sobre el día que acaba.
 * Usa el susurro activo actual (persistente, §3.7). Emite, en orden
 * canónico:
 *   - `day_without_deaths:global` si no hubo muertes hoy.
 *   - `day_saciated:global` si ≥3 NPCs escaparon de hambre hoy.
 *
 * El pulso `day_social` está definido en el catálogo pero su
 * detección requiere el mecanismo de pairing; se emitirá cuando
 * ese sprint se integre. Puro — sin PRNG, sin side effects.
 */
export function evaluateDawnGratitude(
  village: VillageState,
  activeMessage: MessageChoice | null,
): VillageState {
  let next = village;
  if (village.dailyDeaths === 0) {
    next = applyGratitudeFromEvent(
      next,
      { type: 'day_without_deaths' },
      activeMessage,
    );
  }
  if (village.dailyHungerEscapes >= DAY_SACIATED_MIN_ESCAPES) {
    next = applyGratitudeFromEvent(
      next,
      { type: 'day_saciated' },
      activeMessage,
    );
  }
  return next;
}

/** Aplica un delta arbitrario al pool con clamp [0, CEILING]. Ruta
 *  cruda para pérdidas (Elegido muerto, drain silencio) y gasto
 *  por milagros — NO cuenta contra el cap diario. */
export function applyGratitudeDelta(
  village: VillageState,
  delta: number,
): VillageState {
  const next = clamp(village.gratitude + delta, 0, GRATITUDE_CEILING);
  if (next === village.gratitude) return village;
  return { ...village, gratitude: next };
}

/** Penalty por muerte de Elegido. Restado una vez cuando el tick
 *  detecta transición alive=true→false. */
export function penalizeElegidoDeath(village: VillageState): VillageState {
  return applyGratitudeDelta(village, -GRATITUDE_RATES.elegidoDeathPenalty);
}

/**
 * Drain de gratitud por día según el estado del susurro (§3.7b).
 *   - activeMessage === null + gracia agotada → drain activa.
 *   - activeMessage === null + gracia restante → 0.
 *   - activeMessage === SILENCE (elegido) → 0 (ya pagó 40 Fe).
 *   - activeMessage !== null + !== SILENCE → 0.
 * Puro — lo llama `simulation.ts` al cruzar dawn.
 */
export function computeSilenceDrainPerDay(village: VillageState): number {
  if (village.activeMessage !== null) return 0;
  if (village.silenceGraceDaysRemaining > 0) return 0;
  return GRATITUDE_RATES.silenceDailyDrain;
}

/**
 * Legacy — delta de gratitud per-tick proporcional a NPCs thriving
 * (Sprint 5.3). El v2 la sustituye con `applyGratitudeFromEvent`.
 * Se conserva exportada a rate 0.1 para tests de balance. No
 * cableada en `simulation.ts`.
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

/**
 * Gasta `amount` del pool (milagros). Tira si no hay suficiente.
 * No cuenta contra el cap diario.
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

/** Conveniencia: número de NPCs vivos que "prosperan" con
 *  supervivencia ≥ `threshold`. Usado por la fuente B. */
export function countThriving(
  npcs: readonly NPC[],
  threshold = 60,
): number {
  let c = 0;
  for (const n of npcs) {
    if (!n.alive) continue;
    if (n.stats.supervivencia >= threshold) c++;
  }
  return c;
}
