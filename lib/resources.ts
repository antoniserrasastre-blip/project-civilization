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

/** Escalado tick → día del mundo.
 *  480 ticks × 250 ms/tick = 120 s reales = 2 minutos por día.
 *  Los NPCs tienen tiempo suficiente para desplazarse, recolectar y
 *  volver al hogar antes del anochecer. */
export const TICKS_PER_DAY = 480;

/** Días hasta regeneración total (spawn vuelve a initialQuantity).
 *  null = depletable (piedra). 0 = continuous (no aplica). */
export const REGEN_DAYS: Record<ResourceId, number | null> = {
  [RESOURCE.WOOD]: 60,
  [RESOURCE.BERRY]: 45,
  [RESOURCE.GAME]: 100,
  [RESOURCE.STONE]: null,
  [RESOURCE.WATER]: 0,
  [RESOURCE.FISH]: 0,
  [RESOURCE.OBSIDIAN]: null,   // depletable — como piedra
  [RESOURCE.SHELL]: 30,        // regenerable — la marea trae más
};

export function regenTicksFor(id: ResourceId): number | null {
  const days = REGEN_DAYS[id];
  if (days === null) return null;
  return days * TICKS_PER_DAY;
}

/** Multiplicador de tiempo de regeneración según la influencia en el tile.
 *  Sin influencia → 1.0 (normal). Saturado → 2.0 (doble tiempo).
 *  Tierra sobre-explotada se recupera más lento. */
function regenMultiplier(influence: number): number {
  // Interpolación lineal de 1.0 a 2.0 entre 0 e INFLUENCE_MAX (1000).
  return 1 + influence / 1000;
}

/**
 * Avanza timers de regeneración. Spawn regenerable con
 * `depletedAtTick !== null` y `currentTick - depletedAtTick >=
 * regenTicks(id) * multiplier` vuelve a `initialQuantity` y limpia timer.
 *
 * Acepta opcionalmente un `influenceGrid` (Sprint 12) para aplicar
 * fricción territorial: zonas con alta presencia tardan más en regenerar.
 *
 * Puro: devuelve array nuevo; no muta el input ni sus elementos.
 */
export function tickResources(
  spawns: readonly ResourceSpawn[],
  currentTick: number,
  influenceGrid?: readonly number[],
  worldWidth?: number,
): ResourceSpawn[] {
  return spawns.map((s) => {
    if (s.regime !== 'regenerable') return s;
    if (s.depletedAtTick === null) return s;
    const base = regenTicksFor(s.id);
    if (base === null) return s;
    // Fricción: si hay grid de influencia, consultar el tile del spawn.
    let required = base;
    if (influenceGrid && worldWidth) {
      const idx = s.y * worldWidth + s.x;
      const influence = influenceGrid[idx] ?? 0;
      required = Math.ceil(base * regenMultiplier(influence));
    }
    if (currentTick - s.depletedAtTick < required) return s;
    return { ...s, quantity: s.initialQuantity, depletedAtTick: null };
  });
}
