/**
 * Decisión de destino del NPC por tick — Sprint 3.2.
 *
 * Sin PRNG: empates por (x, y) lex. `decideDestination` devuelve el
 * objetivo de movimiento del NPC para este tick; el pathfinding
 * (Sprint 3.1) resuelve después cómo llegar.
 *
 * Prioridades:
 *   1. Supervivencia crítica (<20) → agua visible más cercana.
 *   2. Supervivencia baja (<40) → comida visible más cercana
 *      (berry/game/fish).
 *   3. Socialización baja (<30) → centroide de NPCs vivos.
 *   4. Default → quedarse en posición actual.
 */

import type { NPC } from './npcs';
import {
  RESOURCE,
  type ResourceId,
  type ResourceSpawn,
  type WorldMap,
} from './world-state';

export const NEED_THRESHOLDS = {
  supervivenciaCritical: 20,
  supervivenciaHungry: 40,
  socializacionLow: 30,
} as const;

export interface DestinationContext {
  world: WorldMap;
  npcs: readonly NPC[];
}

export interface Position {
  x: number;
  y: number;
}

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function nearestResource(
  from: Position,
  resources: readonly ResourceSpawn[],
  acceptable: (id: ResourceId) => boolean,
): Position | null {
  let best: { d: number; x: number; y: number } | null = null;
  for (const r of resources) {
    if (r.quantity <= 0) continue;
    if (!acceptable(r.id)) continue;
    const d = manhattan(from.x, from.y, r.x, r.y);
    if (
      !best ||
      d < best.d ||
      (d === best.d && (r.x < best.x || (r.x === best.x && r.y < best.y)))
    ) {
      best = { d, x: r.x, y: r.y };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

function centroidOfAlive(npcs: readonly NPC[]): Position | null {
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (const n of npcs) {
    if (!n.alive) continue;
    sx += n.position.x;
    sy += n.position.y;
    count++;
  }
  if (count === 0) return null;
  return { x: Math.round(sx / count), y: Math.round(sy / count) };
}

const FOOD_IDS: ResourceId[] = [RESOURCE.BERRY, RESOURCE.GAME, RESOURCE.FISH];

export function decideDestination(
  npc: NPC,
  ctx: DestinationContext,
): Position {
  const { supervivencia, socializacion } = npc.stats;

  if (supervivencia < NEED_THRESHOLDS.supervivenciaCritical) {
    const water = nearestResource(
      npc.position,
      ctx.world.resources,
      (id) => id === RESOURCE.WATER,
    );
    if (water) return water;
  }

  if (supervivencia < NEED_THRESHOLDS.supervivenciaHungry) {
    const food = nearestResource(
      npc.position,
      ctx.world.resources,
      (id) => FOOD_IDS.includes(id),
    );
    if (food) return food;
  }

  if (socializacion < NEED_THRESHOLDS.socializacionLow) {
    const c = centroidOfAlive(ctx.npcs);
    if (c) return c;
  }

  return npc.position;
}
