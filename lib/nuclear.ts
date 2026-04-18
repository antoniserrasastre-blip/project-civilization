/**
 * Dilema nuclear — v1.0.1 decisión #5 (opción A: decisión del Elegido).
 *
 * Cuando el player descubre `fision_nuclear` (tech atómica), se
 * presenta un modal: ¿concede la tecnología de destrucción?
 *   - SÍ (`given`): "La sombra cae sobre todos." Victoria narrativa-
 *     mente derrotada: el linaje reina pero el mundo queda marcado.
 *   - NO (`withheld`): "Los nuestros guardan el secreto. Por ahora."
 *     El rival puede seguir buscándola; drama abierto.
 *
 * La decisión es irrevocable — un segundo intento es no-op silencioso.
 *
 * FLAG v1.4: la microconsecuencia previa (tech de radiación que
 * debilita al pueblo antes de la elección) queda pendiente. Un sí-o-no
 * sin costes previos puede sentirse como clic vacío. Ver REPORT.md.
 */

import { appendChronicle } from './chronicle';
import type { WorldState } from './world-state';

export type NuclearChoice = 'given' | 'withheld';

/**
 * ¿Está abierto el dilema? True solo cuando fision_nuclear se ha
 * descubierto Y aún no se ha decidido. La UI lo usa para mostrar el
 * modal bloqueante.
 */
export function hasNuclearDilemma(state: WorldState): boolean {
  return (
    state.technologies.includes('fision_nuclear') &&
    state.nuclear_decision === null
  );
}

/**
 * Registra la decisión (puro). Si ya está decidida o la tech no se ha
 * descubierto, devuelve el mismo estado (no-op).
 */
export function decideNuclear(
  state: WorldState,
  choice: NuclearChoice,
): WorldState {
  if (state.nuclear_decision !== null) return state;
  if (!state.technologies.includes('fision_nuclear')) return state;

  const dayLabel = `Año ${Math.floor(state.day / 365)}, día ${(state.day % 365) + 1}`;
  const text =
    choice === 'given'
      ? `${dayLabel}. Concediste el fuego que parte la piedra. La sombra cae sobre todos. Los nuestros reinan en un mundo que ya no se recupera.`
      : `${dayLabel}. Guardaste el secreto. Los nuestros guardan el secreto. Por ahora — el cielo sigue limpio, pero no dormimos bien.`;

  const withChronicle = appendChronicle(
    { ...state, nuclear_decision: choice },
    { day: state.day, text },
  );
  return withChronicle;
}
