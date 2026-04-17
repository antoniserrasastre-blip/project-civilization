/**
 * Primera función de tick — v0.1 minimalista.
 *
 * Contrato (§A4 del Vision Document):
 *   - Pura: recibe estado, devuelve estado nuevo. Sin side effects.
 *   - Determinista: mismo estado de entrada ⇒ mismo estado de salida,
 *     byte a byte. Todo lo random pasa por `state.prng_cursor`.
 *   - JSON-serializable: el estado de salida es round-trip perfecto.
 *
 * Qué hace este tick en v0.1:
 *   1. Avanza el día en 1.
 *   2. Envejece a cada NPC vivo en 1 día.
 *   3. Mueve a cada NPC vivo una fracción pequeña en dirección aleatoria
 *      (prueba que el PRNG está integrado y es determinista).
 *
 * Qué NO hace todavía (scope de v0.2+):
 *   - Muertes por edad / accidente.
 *   - Reproducción.
 *   - Combate.
 *   - Generación de Fe.
 *   - Descubrimientos tecnológicos.
 *
 * Este tick mínimo es suficiente para probar el contrato arquitectónico
 * de §A4 y construir encima el resto de sistemas sin refactor.
 */

import { nextRange, type PRNGState } from './prng';
import type { NPC, WorldState } from './world-state';

/** Magnitud máxima del desplazamiento de un NPC por tick. Arbitrario para v0.1. */
const MAX_STEP = 0.5;

export function tick(state: WorldState): WorldState {
  let prng: PRNGState = { seed: state.seed, cursor: state.prng_cursor };

  const newNpcs: NPC[] = state.npcs.map((npc) => {
    if (!npc.alive) return npc;

    const dx = nextRange(prng, -MAX_STEP, MAX_STEP);
    prng = dx.next;
    const dy = nextRange(prng, -MAX_STEP, MAX_STEP);
    prng = dy.next;

    return {
      ...npc,
      age_days: npc.age_days + 1,
      position: {
        x: npc.position.x + dx.value,
        y: npc.position.y + dy.value,
      },
    };
  });

  return {
    ...state,
    day: state.day + 1,
    prng_cursor: prng.cursor,
    npcs: newNpcs,
  };
}

/**
 * Atajo: avanza N ticks. Útil para tests de "tras 1000 días el mundo
 * debe tener X propiedad" y para playtests que empiezan con tiempo ya
 * transcurrido.
 */
export function runTicks(state: WorldState, count: number): WorldState {
  let s = state;
  for (let i = 0; i < count; i++) s = tick(s);
  return s;
}
