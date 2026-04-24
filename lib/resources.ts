/**
 * Régimen de recursos primigenia (decisión #21, §3.5 vision).
 */

import { RESOURCE, type ResourceId, type ResourceSpawn } from './world-state';

export const TICKS_PER_DAY = 480;

export const REGEN_DAYS: Record<ResourceId, number | null> = {
  [RESOURCE.WOOD]: 60,
  [RESOURCE.BERRY]: 45,
  [RESOURCE.GAME]: 100,
  [RESOURCE.STONE]: null,
  [RESOURCE.WATER]: 0,
  [RESOURCE.FISH]: 0,
  [RESOURCE.OBSIDIAN]: null,
  [RESOURCE.SHELL]: 30,
  [RESOURCE.CLAY]: null,
  [RESOURCE.COCONUT]: 90,
  [RESOURCE.FLINT]: null,
  [RESOURCE.MUSHROOM]: 20,
};

export function regenTicksFor(id: ResourceId): number | null {
  const days = REGEN_DAYS[id];
  if (days === null) return null;
  return days * TICKS_PER_DAY;
}

/** Multiplicador de regeneración parabólico: las zonas vírgenes se recuperan
 *  rápido, las zonas con mucha influencia se estancan. */
function regenMultiplier(influence: number): number {
  const normalized = influence / 1000;
  return 1 + (normalized * normalized * 4); // Hasta 5x de tiempo extra
}

export interface ResourceTickResult {
  resources: ResourceSpawn[];
  reserves: number[];
}

/**
 * Avanza timers de regeneración y recupera 'reserves' (capacidad total).
 */
export function tickResources(
  spawns: readonly ResourceSpawn[],
  currentTick: number,
  influenceGrid: readonly number[],
  worldWidth: number,
  reserves: readonly number[],
): ResourceTickResult {
  // 1. Regenerar Spawns (cantidad actual)
  const nextResources = spawns.map((s) => {
    if (s.regime !== 'regenerable' || s.depletedAtTick === null) return s;
    const base = regenTicksFor(s.id);
    if (base === null) return s;
    
    const idx = s.y * worldWidth + s.x;
    const influence = influenceGrid[idx] ?? 0;
    const required = Math.ceil(base * regenMultiplier(influence));
    
    if (currentTick - s.depletedAtTick < required) return s;
    return { ...s, quantity: s.initialQuantity, depletedAtTick: null };
  });

  // 2. Regenerar Reservas (capacidad máxima del tile)
  // La naturaleza reclama el terreno si la influencia es baja (< 100)
  const nextReserves = reserves.map((val, idx) => {
    const influence = influenceGrid[idx] ?? 0;
    if (influence < 100) {
      // Recuperación lenta: +1 de reserva cada día (480 ticks)
      if (currentTick % TICKS_PER_DAY === 0) return val + 1;
    }
    return val;
  });

  return { resources: nextResources, reserves: nextReserves };
}
