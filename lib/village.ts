/**
 * Estado de la aldea — village-level state.
 *
 * Aglutina contadores globales del clan que no caben en NPCs
 * individuales ni en el grafo de relaciones:
 *
 *   - consecutiveNightsAtFire: para el monumento (decisión #26).
 *   - gratitude: pool de gratitud (decisión #31, Sprint 5.3).
 *   - faith: moneda del cambio de susurro (§3.7b, Sprint Fase 5 #1).
 *   - silenceGraceDaysRemaining: contador de gracia del silencio
 *     por default antes del primer susurro (§3.7, Sprint Fase 5 #1).
 *   - activeMessage: intención del susurro persistente (§3.7).
 *   - messageHistory: histórico de susurros archivados al cambiar.
 *   - blessings: bendiciones de aldea compounding (Sprint 6.3).
 *
 * Todo entero/string estable, serializable §A4.
 *
 * `silence-por-default` vs `silencio-elegido` — distinción crítica
 * para el drain de gratitud del §3.7b:
 *   - activeMessage === null → silencio por default (pre-primer
 *     susurro; gracia aplica hasta que el contador llega a 0).
 *   - activeMessage === SILENCE → silencio elegido (pagó 40 Fe;
 *     el drain no dispara).
 */

import { FAITH_INITIAL } from './faith';
import type { MessageChoice } from './messages';

export const SILENCE_GRACE_DAYS = 7;

export interface VillageState {
  consecutiveNightsAtFire: number;
  gratitude: number;
  faith: number;
  silenceGraceDaysRemaining: number;
  activeMessage: MessageChoice | null;
  messageHistory: Array<{ day: number; intent: MessageChoice }>;
  blessings: string[];
}

export function initialVillageState(): VillageState {
  return {
    consecutiveNightsAtFire: 0,
    gratitude: 0,
    faith: FAITH_INITIAL,
    silenceGraceDaysRemaining: SILENCE_GRACE_DAYS,
    activeMessage: null,
    messageHistory: [],
    blessings: [],
  };
}
