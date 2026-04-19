/**
 * Contador de noches durmiendo en fogata permanente — Sprint 4.6.
 *
 * Decisión #26: ≥ 10 noches consecutivas con ≥ 10 NPCs durmiendo en
 * radio ≤ 3 tiles de la fogata. Una noche que rompe la cadena
 * reinicia a 0. Desbloquea el monumento (Fase 6).
 */

import { CRAFTABLE } from './crafting';
import { firstStructureOfKind, type Structure } from './structures';
import { TICKS_PER_DAY } from './resources';
import type { NPC } from './npcs';

export const MIN_NPCS_AT_FIRE = 10;
export const SLEEP_RADIUS = 3;

/** Devuelve true si el tick corresponde al final de un día — el
 *  momento en que se evalúa si la noche "contó". */
export function isNightCheckTick(tick: number): boolean {
  return tick > 0 && tick % TICKS_PER_DAY === 0;
}

/** Cuenta NPCs vivos dentro de un radio Chebyshev de la posición
 *  de la fogata. */
function npcsInRadius(
  npcs: readonly NPC[],
  cx: number,
  cy: number,
  radius: number,
): number {
  let c = 0;
  for (const n of npcs) {
    if (!n.alive) continue;
    if (
      Math.abs(n.position.x - cx) <= radius &&
      Math.abs(n.position.y - cy) <= radius
    ) {
      c++;
    }
  }
  return c;
}

/**
 * Aplica la comprobación de noche al cierre del día. Si no hay
 * fogata permanente, el contador se mantiene en 0.
 *
 * Devuelve el nuevo valor del contador; el caller aplica al state.
 */
export function evaluateNight(
  structures: readonly Structure[],
  npcs: readonly NPC[],
  prevCount: number,
): number {
  const fire = firstStructureOfKind(structures, CRAFTABLE.FOGATA_PERMANENTE);
  if (!fire) return 0;
  const count = npcsInRadius(
    npcs,
    fire.position.x,
    fire.position.y,
    SLEEP_RADIUS,
  );
  if (count >= MIN_NPCS_AT_FIRE) return prevCount + 1;
  return 0;
}
