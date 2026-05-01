/**
 * Régimen de recursos primigenia (Nodos de Vitalidad).
 */

import { RESOURCE, type ResourceId, type ResourceSpawn } from './world-state';
import type { ClimateState } from './world-state';

export const TICKS_PER_DAY = 480;

export interface ResourceTickResult {
  resources: ResourceSpawn[];
  reserves: number[];
}

/**
 * Los Nodos de Vitalidad regeneran su cantidad disponible orgánicamente.
 * El clima afecta a la velocidad de crecimiento de lo vivo.
 */
export function tickResources(
  spawns: readonly ResourceSpawn[],
  currentTick: number,
  influenceGrid: readonly number[],
  worldWidth: number,
  reserves: readonly number[],
  climate?: ClimateState,
): ResourceTickResult {
  const nextReserves = [...reserves];

  // Determinar multiplicador estacional de crecimiento
  let seasonMult = 1.0;
  if (climate) {
    if (climate.season === 'spring') seasonMult = 2.0;
    if (climate.season === 'summer') seasonMult = 1.5;
    if (climate.season === 'winter') seasonMult = 0.0; // En invierno nada crece
  }

  const nextResources = spawns.map((s) => {
    let nextQty = s.quantity;

    // LÓGICA DE REGENERACIÓN ORGÁNICA
    // Solo si el nodo no está lleno y tiene capacidad de regenerar
    if (s.regenerationRate > 0 && s.quantity < s.initialQuantity) {
      // Regeneramos un poco en cada amanecer
      if (currentTick % TICKS_PER_DAY === 0) {
        const gain = Math.floor(s.regenerationRate * seasonMult);
        if (gain > 0) {
          nextQty = Math.min(s.initialQuantity, s.quantity + gain);
          
          // Sincronizar con el mapa de reservas
          const idx = s.y * worldWidth + s.x;
          nextReserves[idx] = Math.max(0, nextReserves[idx] + (nextQty - s.quantity));
        }
      }
    }

    return { ...s, quantity: nextQty };
  });

  return { resources: nextResources, reserves: nextReserves };
}
