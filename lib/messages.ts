/**
 * Susurro persistente del dios — Sprint #1 REFACTOR-SUSURRO-FE
 * (vision-primigenia §3.7, §3.7b).
 *
 * El susurro activo **persiste** entre ticks hasta que el jugador
 * lo cambia. Archivado y cobro de Fe se resuelven dentro de
 * `selectIntent` — el tick() no toca `activeMessage` sin intención
 * explícita.
 *
 * Reglas §A4:
 *   - activeMessage: MessageChoice | null persiste. `null` = silencio
 *     por defecto / gracia inicial. `SILENCE` = silencio elegido
 *     deliberadamente (cuesta 40 Fe).
 *   - Al cambiar el jugador el susurro, el previous se archiva en
 *     messageHistory con `day = floor(currentTick / TICKS_PER_DAY)`.
 *   - La elección no consume PRNG.
 */

import { TICKS_PER_DAY } from './resources';
import type { VillageState } from './village';
import {
  FAITH_COST_CHANGE,
  FAITH_COST_SILENCE,
  isFirstWhisper,
  spendFaithForChange,
  spendFaithForSilence,
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

export const VALID_CHOICES: readonly MessageChoice[] = [
  MESSAGE_INTENTS.AUXILIO,
  MESSAGE_INTENTS.CORAJE,
  MESSAGE_INTENTS.PACIENCIA,
  MESSAGE_INTENTS.ENCUENTRO,
  MESSAGE_INTENTS.RENUNCIA,
  MESSAGE_INTENTS.ESPERANZA,
  SILENCE,
];

export function isDawn(tick: number): boolean {
  return tick % TICKS_PER_DAY === 0;
}

/** El UI debe ofrecer el selector: no hay susurro activo. El botón
 *  "Hablar al clan" siempre está disponible — esto solo indica si
 *  el estado actual es "sin voz". */
export function awaitsMessage(village: VillageState): boolean {
  return village.activeMessage === null;
}

/** Coste en Fe de cambiar el susurro activo a `choice`. Devuelve
 *  0 si es primer susurro, 0 si choice coincide con el activo,
 *  40 si se silencia deliberadamente tras intent, 80 en otro caso. */
export function changeCost(
  village: VillageState,
  choice: MessageChoice,
): number {
  if (village.activeMessage === choice) return 0;
  const firstFree =
    village.activeMessage === null && isFirstWhisper(village.messageHistory);
  if (firstFree) return 0;
  if (choice === SILENCE) return FAITH_COST_SILENCE;
  return FAITH_COST_CHANGE;
}

/** Archiva activeMessage (si lo hay) como entrada del historial con
 *  el día actual. Puro. Usado internamente por `selectIntent`; el
 *  caller externo no debería llamarlo sin haber detectado un cambio
 *  real. No-op si activeMessage es null. */
export function archiveOnChange(
  village: VillageState,
  currentTick: number,
): VillageState {
  if (village.activeMessage === null) return village;
  const day = Math.floor(currentTick / TICKS_PER_DAY);
  return {
    ...village,
    messageHistory: [
      ...village.messageHistory,
      { day, intent: village.activeMessage },
    ],
    activeMessage: null,
  };
}

/** Registra el nuevo susurro aplicando cobro de Fe y archivando el
 *  previous si cambia. Tira si el intent es inválido o la Fe no
 *  alcanza. No consume PRNG. */
export function selectIntent(
  village: VillageState,
  choice: MessageChoice,
  currentTick: number,
): VillageState {
  if (!VALID_CHOICES.includes(choice)) {
    throw new Error(`intent inválido: ${choice}`);
  }
  if (village.activeMessage === choice) {
    return village;
  }

  const cost = changeCost(village, choice);
  let next = village;
  if (cost === FAITH_COST_CHANGE) {
    next = spendFaithForChange(next);
  } else if (cost === FAITH_COST_SILENCE) {
    next = spendFaithForSilence(next);
  }

  if (next.activeMessage !== null) {
    next = archiveOnChange(next, currentTick);
  }

  return { ...next, activeMessage: choice };
}
