/**
 * Estado de la aldea — village-level state.
 *
 * Aglutina contadores globales del clan que no caben en NPCs
 * individuales ni en el grafo de relaciones:
 *
 *   - consecutiveNightsAtFire: para el monumento (decisión #26).
 *   - gratitude: pool de gratitud (decisión #31, Sprint 5.3).
 *   - activeMessage: intención activa del dios — persiste entre
 *     ticks hasta que el jugador la cambia (§3.7, Sprint #1
 *     REFACTOR-SUSURRO-FE). `null` = silencio por defecto / gracia
 *     inicial; `SILENCE` = silencio elegido deliberadamente
 *     (cuesta Fe).
 *   - messageHistory: histórico de susurros ya archivados.
 *   - blessings: bendiciones de aldea compounding (Sprint 6.3).
 *   - faith: moneda de cambio de susurro (§3.7b, Sprint #1).
 *     Acumula `sqrt(vivos)` al día, cap FAITH_CAP.
 *   - silenceGraceDaysRemaining: días de gracia inicial antes de
 *     que el silencio por omisión penalice (§3.7, Sprint #1).
 *
 * `faith` vive como `number` con decimales (sqrt no da entero);
 * sigue siendo round-trippable JSON.
 */

import type { MessageChoice } from './messages';

export interface VillageState {
  consecutiveNightsAtFire: number;
  gratitude: number;
  activeMessage: MessageChoice | null;
  messageHistory: Array<{ day: number; intent: MessageChoice }>;
  blessings: string[];
  faith: number;
  silenceGraceDaysRemaining: number;
}

export function initialVillageState(): VillageState {
  return {
    consecutiveNightsAtFire: 0,
    gratitude: 0,
    activeMessage: null,
    messageHistory: [],
    blessings: [],
    faith: 30,
    silenceGraceDaysRemaining: 7,
  };
}
