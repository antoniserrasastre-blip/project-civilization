/**
 * Estado de la aldea — village-level state.
 *
 * Aglutina contadores globales del clan que no caben en NPCs
 * individuales ni en el grafo de relaciones:
 *
 *   - consecutiveNightsAtFire: para el monumento (decisión #26).
 *   - gratitude: pool de gratitud (decisión #31, Sprint 5.3).
 *   - activeMessage: intención del día (decisión #30.b, Sprint 5.1).
 *   - messageHistory: histórico del pulso diario.
 *   - blessings: bendiciones de aldea compounding (Sprint 6.3).
 *
 * Todo entero/string estable, serializable §A4.
 */

export interface VillageState {
  consecutiveNightsAtFire: number;
  gratitude: number;
  activeMessage: string | null;
  messageHistory: Array<{ day: number; intent: string }>;
  blessings: string[];
}

export function initialVillageState(): VillageState {
  return {
    consecutiveNightsAtFire: 0,
    gratitude: 0,
    activeMessage: null,
    messageHistory: [],
    blessings: [],
  };
}
