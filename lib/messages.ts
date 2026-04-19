/**
 * Mensaje diario del dios — Sprint 5.1.
 *
 * Decisiones #30, #30.a/b (CLAUDE-primigenia §3). Plantilla fija
 * de 6 intenciones + "silence". El verbo del jugador primario.
 *
 * Reglas §A4:
 *   - activeMessage: MessageIntent | 'silence' | null persiste.
 *   - Al cruzar un amanecer, el tick archiva activeMessage en
 *     messageHistory (orden canónico ascendente por day).
 *   - La elección no consume PRNG; la hace el jugador.
 */

import { TICKS_PER_DAY } from './resources';
import type { VillageState } from './village';

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

/** Una elección válida del jugador para el modal diario. */
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

/** El jugador debería pronunciarse: estamos en amanecer y no hay
 *  intención activa. El UI llama aquí para decidir si mostrar el
 *  modal. */
export function awaitsMessage(village: VillageState, tick: number): boolean {
  return isDawn(tick) && village.activeMessage === null;
}

/** Registra la elección del jugador. Puro. No consume PRNG. */
export function selectIntent(
  village: VillageState,
  choice: MessageChoice,
): VillageState {
  if (!VALID_CHOICES.includes(choice)) {
    throw new Error(`intent inválido: ${choice}`);
  }
  return { ...village, activeMessage: choice };
}

/** Archiva activeMessage cuando el día termina (al cruzar el
 *  amanecer del siguiente). Puro. Si no hay mensaje activo, no-op. */
export function archiveAtDawn(
  village: VillageState,
  newTick: number,
): VillageState {
  if (!isDawn(newTick) || newTick === 0) return village;
  if (village.activeMessage === null) return village;
  const day = newTick / TICKS_PER_DAY - 1;
  return {
    ...village,
    messageHistory: [
      ...village.messageHistory,
      { day, intent: village.activeMessage },
    ],
    activeMessage: null,
  };
}
