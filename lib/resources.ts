/**
 * Régimen de recursos primigenia (decisión #21, §3.5 vision).
 *
 * Tres regímenes según tipo:
 *   - regenerable: leña 60d, baya 45d, caza 100d.
 *   - depletable: piedra (cantera se vacía; no regenera).
 *   - continuous: agua, pescado (nunca dropean — modelo v1).
 *
 * La función `tickResources(spawns, currentTick)` avanza los timers
 * sin mutar el input. Se invocará desde `tick()` en Sprints 3+.
 */

import { RESOURCE, type ResourceId, type ResourceSpawn } from './world-state';

/** Escalado tick → día del mundo. Parametrizable si la simulación
 *  pide más granularidad temporal. */
export const TICKS_PER_DAY = 24;

/** Días hasta regeneración total (spawn vuelve a initialQuantity).
 *  null = depletable (piedra). 0 = continuous (no aplica). */
export const REGEN_DAYS: Record<ResourceId, number | null> = {
  [RESOURCE.WOOD]: 60,
  [RESOURCE.BERRY]: 45,
  [RESOURCE.GAME]: 100,
  [RESOURCE.STONE]: null,
  [RESOURCE.WATER]: 0,
  [RESOURCE.FISH]: 0,
};

export function regenTicksFor(id: ResourceId): number | null {
  const days = REGEN_DAYS[id];
  if (days === null) return null;
  return days * TICKS_PER_DAY;
}

/**
 * Avanza timers de regeneración. Spawn regenerable con
 * `depletedAtTick !== null` y `currentTick - depletedAtTick >=
 * regenTicks(id)` vuelve a `initialQuantity` y limpia timer.
 *
 * Puro: devuelve array nuevo; no muta el input ni sus elementos.
 */
export function tickResources(
  spawns: readonly ResourceSpawn[],
  currentTick: number,
): ResourceSpawn[] {
  return spawns.map((s) => {
    if (s.regime !== 'regenerable') return s;
    if (s.depletedAtTick === null) return s;
    const required = regenTicksFor(s.id);
    if (required === null) return s; // por completud; regenerable ≠ null
    if (currentTick - s.depletedAtTick < required) return s;
    return { ...s, quantity: s.initialQuantity, depletedAtTick: null };
  });
}
