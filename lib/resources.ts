/**
 * Régimen de recursos primigenia (Nodos de Vitalidad).
 */

import { RESOURCE, type ResourceId, type ResourceSpawn } from './world-state';
import type { ClimateState } from './world-state';

export const TICKS_PER_DAY = 480;

/**
 * Días de regeneración por tipo de recurso — decisión #21.
 * null = nunca regenera (depletable). 0 = continuo (siempre disponible).
 */
export const REGEN_DAYS: Record<ResourceId, number | null> = {
  [RESOURCE.WOOD]:     60,
  [RESOURCE.BERRY]:    45,
  [RESOURCE.GAME]:     100,
  [RESOURCE.STONE]:    null,
  [RESOURCE.WATER]:    0,
  [RESOURCE.FISH]:     0,
  [RESOURCE.OBSIDIAN]: null,
  [RESOURCE.SHELL]:    30,
  [RESOURCE.CLAY]:     null,
  [RESOURCE.COCONUT]:  90,
  [RESOURCE.FLINT]:    null,
  [RESOURCE.MUSHROOM]: 20,
};

/**
 * Ticks necesarios para que un recurso regenere.
 * Devuelve null si el recurso no regenera nunca.
 */
export function regenTicksFor(id: ResourceId): number | null {
  const days = REGEN_DAYS[id];
  if (days === null) return null;
  return days * TICKS_PER_DAY;
}

export interface ResourceTickResult {
  resources: ResourceSpawn[];
  reserves: number[];
}

/**
 * Aplica regeneración a los spawns de recurso.
 *
 * Soporta dos sistemas:
 * - Sistema antiguo (legacy): usa `depletedAtTick` + `regime` + `regenTicksFor`
 *   con influencia territorial opcional. Retorna `ResourceSpawn[]` directamente.
 * - Sistema nuevo: usa `regenerationRate` con lógica de amanecer y reservas.
 *
 * Cuando se incluyen todos los parámetros (6 args), retorna `ResourceTickResult`.
 * En cualquier otro caso (2-4 args), retorna `ResourceSpawn[]`.
 */
export function tickResources(
  spawns: readonly ResourceSpawn[],
  currentTick: number,
  influenceGrid?: readonly number[],
  worldWidth?: number,
  reserves?: readonly number[],
  climate?: ClimateState,
): ResourceSpawn[] | ResourceTickResult {
  const useFullMode = reserves !== undefined;

  const nextReserves = reserves ? [...reserves] : [];

  // Determinar multiplicador estacional de crecimiento
  let seasonMult = 1.0;
  if (climate) {
    if (climate.season === 'spring') seasonMult = 2.0;
    if (climate.season === 'summer') seasonMult = 1.5;
    if (climate.season === 'winter') seasonMult = 0.0;
  }

  const INFLUENCE_MAX_VALUE = 1000; // Imported value from influence.ts contract

  const nextResources = spawns.map((s) => {
    // SISTEMA ANTIGUO (legacy): basado en depletedAtTick + regime
    if (s.depletedAtTick !== undefined) {
      const regime = s.regime ?? 'regenerable';

      // Continuous: no cambia nunca
      if (regime === 'continuous') return { ...s };

      // Depletable: nunca regenera
      if (regime === 'depletable') return { ...s };

      // Regenerable: si está agotado y ha pasado el timer → restaurar
      if (regime === 'regenerable' && s.quantity === 0 && s.depletedAtTick !== null) {
        const ticks = regenTicksFor(s.id);
        if (ticks !== null) {
          // Aplicar fricción de influencia si hay grid
          let effectiveTicks = ticks;
          if (influenceGrid && influenceGrid.length > 0 && worldWidth) {
            const idx = s.y * worldWidth + s.x;
            const influence = influenceGrid[idx] ?? 0;
            // Alta influencia → ticks más largos (máximo x2 con influencia máxima)
            const frictionMult = 1 + (influence / INFLUENCE_MAX_VALUE);
            effectiveTicks = Math.ceil(ticks * frictionMult);
          }
          if (currentTick >= s.depletedAtTick + effectiveTicks) {
            return { ...s, quantity: s.initialQuantity, depletedAtTick: null };
          }
        }
      }
      return { ...s };
    }

    // SISTEMA NUEVO: basado en regenerationRate
    let nextQty = s.quantity;
    const regenRate = s.regenerationRate ?? 0;

    if (regenRate > 0 && s.quantity < s.initialQuantity) {
      if (currentTick % TICKS_PER_DAY === 0) {
        const gain = Math.floor(regenRate * seasonMult);
        if (gain > 0) {
          nextQty = Math.min(s.initialQuantity, s.quantity + gain);

          // Sincronizar con el mapa de reservas
          if (worldWidth && worldWidth > 0 && nextReserves.length > 0) {
            const idx = s.y * worldWidth + s.x;
            if (idx < nextReserves.length) {
              nextReserves[idx] = Math.max(0, nextReserves[idx] + (nextQty - s.quantity));
            }
          }
        }
      }
    }

    return { ...s, quantity: nextQty };
  });

  if (useFullMode) {
    return { resources: nextResources, reserves: nextReserves };
  }
  return nextResources;
}
