/**
 * Función de tick — GODGAME v0.2 (Sprint 2).
 *
 * Contrato (§A4 del Vision Document):
 *   - Pura: recibe estado, devuelve estado nuevo. Sin side effects.
 *   - Determinista: mismo estado de entrada ⇒ mismo estado de salida,
 *     byte a byte. Todo lo random pasa por `state.prng_cursor`.
 *   - JSON-serializable: el estado de salida es round-trip perfecto.
 *
 * Qué hace este tick (Sprint 2):
 *   1. Avanza el día en 1.
 *   2. Envejece a cada NPC vivo en 1 día y lo desplaza un paso aleatorio
 *      corto (prueba que el PRNG sigue enchufado).
 *   3. Llama al scheduler para producir eventos de ciclo vital (muerte,
 *      conflicto, pairing, nacimiento).
 *   4. Aplica esos eventos al estado (npcs + crónica).
 *
 * Qué NO hace todavía (scope de v0.3+):
 *   - Decisiones del dios rival.
 *   - Dones con efectos mecánicos (Sprint 3).
 *   - Economía de Fe (Sprint 4).
 *
 * El tick es reproducible offline 1000 veces consecutivas: sin fetch, sin
 * logging, sin localStorage, sin Math.random.
 */

import { nextRange, type PRNGState } from './prng';
import type { NPC, WorldState } from './world-state';
import { applyEvents, scheduleEvents } from './scheduler';

/** Magnitud máxima del desplazamiento de un NPC por tick. Arbitrario para v0.1. */
const MAX_STEP = 0.5;

export function tick(state: WorldState): WorldState {
  let prng: PRNGState = { seed: state.seed, cursor: state.prng_cursor };

  const aged: NPC[] = state.npcs.map((npc) => {
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

  const intermediate: WorldState = {
    ...state,
    day: state.day + 1,
    prng_cursor: prng.cursor,
    npcs: aged,
  };

  const { events, prng_cursor } = scheduleEvents(intermediate);
  const applied = applyEvents(intermediate, events);
  return { ...applied, prng_cursor };
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
