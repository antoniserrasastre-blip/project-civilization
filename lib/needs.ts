/**
 * Necesidades del NPC por tick — Sprint 3.2 (decideDestination) +
 * Sprint 4.1 (tickNeeds: decay/recovery + socialización +
 * feed-forward de hambre).
 *
 * Sin PRNG: empates por (x, y) lex. `decideDestination` devuelve el
 * objetivo de movimiento del NPC para este tick; el pathfinding
 * (Sprint 3.1) resuelve después cómo llegar.
 *
 * Prioridades de decideDestination:
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

// --- Sprint 4.1: feed-forward de necesidades por tick ---

export const NEED_TICK_RATES = {
  /** Decay pasivo de supervivencia por tick (entropía). */
  supervivenciaDecay: 1,
  /** Recovery cuando el NPC está sobre un recurso activo. */
  supervivenciaRecover: 2,
  /** Socialización al estar en soledad (sin NPCs en radio). */
  socializacionAlone: 1,
  /** Socialización al estar con compañeros en radio. */
  socializacionNear: 1,
  /** Drenaje adicional a vecinos cuando uno está hambriento. */
  feedForwardHunger: 2,
  /** Radio para "estar con el clan". */
  socialRadius: 3,
} as const;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function isOnRecoverySpawn(
  npc: NPC,
  world: WorldMap,
): boolean {
  for (const r of world.resources) {
    if (r.x !== npc.position.x || r.y !== npc.position.y) continue;
    if (r.quantity <= 0) continue;
    if (
      r.id === RESOURCE.BERRY ||
      r.id === RESOURCE.GAME ||
      r.id === RESOURCE.FISH ||
      r.id === RESOURCE.WATER
    ) {
      return true;
    }
  }
  return false;
}

function companionsInRadius(npc: NPC, npcs: readonly NPC[]): number {
  let c = 0;
  const r = NEED_TICK_RATES.socialRadius;
  for (const other of npcs) {
    if (other === npc || other.id === npc.id) continue;
    if (!other.alive) continue;
    if (
      Math.abs(other.position.x - npc.position.x) <= r &&
      Math.abs(other.position.y - npc.position.y) <= r
    ) {
      c++;
    }
  }
  return c;
}

/** Avanza supervivencia y socialización de cada NPC para un tick.
 *  Puro — devuelve array nuevo. Aplica clamps y marca muerto si
 *  supervivencia cae a 0. */
export function tickNeeds(
  npcs: readonly NPC[],
  ctx: DestinationContext,
): NPC[] {
  return npcs.map((n) => {
    if (!n.alive) return n;
    let sv = n.stats.supervivencia;
    let so = n.stats.socializacion;

    if (isOnRecoverySpawn(n, ctx.world)) {
      sv += NEED_TICK_RATES.supervivenciaRecover;
    } else {
      sv -= NEED_TICK_RATES.supervivenciaDecay;
    }

    const companions = companionsInRadius(n, ctx.npcs);
    if (companions > 0) {
      so += NEED_TICK_RATES.socializacionNear;
    } else {
      so -= NEED_TICK_RATES.socializacionAlone;
    }

    // Feed-forward: otros NPCs hambrientos en radio drenan mi
    // socialización por cada uno.
    for (const other of ctx.npcs) {
      if (other.id === n.id) continue;
      if (!other.alive) continue;
      if (other.stats.supervivencia >= 30) continue;
      const d =
        Math.abs(other.position.x - n.position.x) +
        Math.abs(other.position.y - n.position.y);
      if (d <= NEED_TICK_RATES.socialRadius) {
        so -= NEED_TICK_RATES.feedForwardHunger;
      }
    }

    sv = clamp(sv, 0, 100);
    so = clamp(so, 0, 100);
    const alive = sv > 0;

    return {
      ...n,
      stats: { supervivencia: sv, socializacion: so },
      alive,
    };
  });
}
