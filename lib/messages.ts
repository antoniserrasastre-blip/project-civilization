/**
 * Susurro persistente — Sprint #1 Fase 5 (§3.7 / §3.7b).
 *
 * El jugador tiene **un único verbo continuo**: un susurro global al
 * clan que permanece activo hasta que decide cambiarlo (§3.7). Pocas
 * decisiones con mucho peso; cada cambio cuesta Fe (§3.7b).
 *
 * Reglas §A4:
 *   - `activeMessage` PERSISTE entre ticks (no se resetea al amanecer).
 *   - Se archiva en `messageHistory` **al cambiar** (archiveOnChange),
 *     no por rotación diaria.
 *   - La elección no consume PRNG; la hace el jugador.
 *   - Los costes de Fe se aplican en `applyPlayerIntent` — la API
 *     transaccional que combina archive + coste + transición.
 */

import { TICKS_PER_DAY } from './resources';
import type { VillageState } from './village';
import {
  FAITH_COST_CHANGE,
  FAITH_COST_SILENCE,
  canAfford,
  spendFaith,
} from './faith';

export const MESSAGE_INTENTS = {
  AUXILIO: 'auxilio',
  CORAJE: 'coraje',
  PACIENCIA: 'paciencia',
  ENCUENTRO: 'encuentro',
  RENUNCIA: 'renuncia',
  ESPERANZA: 'esperanza',
} as const;

export type MessageIntent = (typeof MESSAGE_INTENTS)[keyof typeof MESSAGE_INTENTS];

export const SILENCE = 'silence' as const;
export type MessageChoice = MessageIntent | typeof SILENCE;

export const WHISPER_ES: Record<MessageChoice, string> = {
  [MESSAGE_INTENTS.AUXILIO]: 'Auxilio',
  [MESSAGE_INTENTS.CORAJE]: 'Coraje',
  [MESSAGE_INTENTS.PACIENCIA]: 'Paciencia',
  [MESSAGE_INTENTS.ENCUENTRO]: 'Encuentro',
  [MESSAGE_INTENTS.RENUNCIA]: 'Renuncia',
  [MESSAGE_INTENTS.ESPERANZA]: 'Esperanza',
  [SILENCE]: 'Silencio',
};

/** Una elección válida del jugador para el selector de susurro. */
export const VALID_CHOICES: readonly MessageChoice[] = [
  MESSAGE_INTENTS.AUXILIO,
  MESSAGE_INTENTS.CORAJE,
  MESSAGE_INTENTS.PACIENCIA,
  MESSAGE_INTENTS.ENCUENTRO,
  MESSAGE_INTENTS.RENUNCIA,
  MESSAGE_INTENTS.ESPERANZA,
  SILENCE,
];

/** tick es dawn (amanecer de un día): múltiplo de TICKS_PER_DAY. */
export function isDawn(tick: number): boolean {
  return tick % TICKS_PER_DAY === 0;
}

/** Deprecado tras §3.7 (susurro persistente). Ya no se fuerza modal
 *  al amanecer; el jugador decide cuándo hablar. Se mantiene como
 *  helper residual — su retorno no rige el UI. */
export function awaitsMessage(village: VillageState, tick: number): boolean {
  return isDawn(tick) && village.activeMessage === null;
}

/** Registra la elección del jugador sin tocar Fe ni history.
 *  Usado por código de bajo nivel (tests, edición). Para el flujo
 *  del jugador usar `applyPlayerIntent`. Puro. */
export function selectIntent(
  village: VillageState,
  choice: MessageChoice,
): VillageState {
  if (!VALID_CHOICES.includes(choice)) {
    throw new Error(`intent inválido: ${choice}`);
  }
  return { ...village, activeMessage: choice };
}

/** Archiva el susurro activo previo en history y setea el nuevo.
 *  No-op si `choice` coincide con `activeMessage`. No descuenta Fe —
 *  eso es responsabilidad de `applyPlayerIntent`. Puro. */
export function archiveOnChange(
  village: VillageState,
  choice: MessageChoice,
  tick: number,
): VillageState {
  if (!VALID_CHOICES.includes(choice)) {
    throw new Error(`intent inválido: ${choice}`);
  }
  if (village.activeMessage === choice) return village;
  const day = Math.floor(tick / TICKS_PER_DAY);
  const history =
    village.activeMessage === null
      ? village.messageHistory
      : [
          ...village.messageHistory,
          { day, intent: village.activeMessage },
        ];
  return {
    ...village,
    messageHistory: history,
    activeMessage: choice,
  };
}

/** Aplica la elección del jugador con su coste en Fe.
 *
 *   - Primer susurro (activeMessage === null): gratis, sin archivo.
 *   - Mismo intent que el activo: no-op (sin coste ni archivo).
 *   - Silencio elegido (activeMessage != null → SILENCE):
 *     descuenta FAITH_COST_SILENCE y archiva el previo.
 *   - Cambio a intent distinto: descuenta FAITH_COST_CHANGE y archiva.
 *
 *  Tira si la Fe es insuficiente. Nunca muta el input. */
export function applyPlayerIntent(
  village: VillageState,
  choice: MessageChoice,
  tick: number,
): VillageState {
  if (!VALID_CHOICES.includes(choice)) {
    throw new Error(`intent inválido: ${choice}`);
  }
  // Primer susurro gratis (nunca ha habido intención activa).
  if (village.activeMessage === null) {
    return { ...village, activeMessage: choice };
  }
  // Mismo intent → no-op.
  if (village.activeMessage === choice) return village;

  const cost = choice === SILENCE ? FAITH_COST_SILENCE : FAITH_COST_CHANGE;
  if (!canAfford(village, cost)) {
    throw new Error(
      `fe insuficiente: tienes ${village.faith}, necesitas ${cost}`,
    );
  }
  const paid = spendFaith(village, cost);
  return archiveOnChange(paid, choice, tick);
}
