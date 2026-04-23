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

import type { NPC, NPCInventory } from './npcs';
import {
  RESOURCE,
  type ResourceId,
  type ResourceSpawn,
  type WorldMap,
} from './world-state';
import { clanInventoryTotal, RECIPES, type Recipe } from './crafting';
import type { CraftableId } from './crafting';
import type { EquippableItem } from './items';
import { computeRole, intentFilter } from './roles';

export const NEED_THRESHOLDS = {
  supervivenciaCritical: 20,
  supervivenciaHungry: 40,
  /** Por debajo de este valor comen si llevan comida. 55 con
   *  decay=1/tick produce ~2-3 comidas/día con bayas. */
  supervivenciaEatFromInventory: 55,
  /** Sin comida cargada, no aceptan trabajos largos si están bajos. */
  supervivenciaBuildReady: 55,
  socializacionLow: 30,
} as const;

const FOOD_NUTRITION: Record<'berry' | 'fish' | 'game', number> = {
  berry: 10,
  fish: 14,
  game: 22,
};

const COOKED_FOOD_MULTIPLIER = 1.5;
const COOKED_FOOD_SOCIAL_BONUS = 3;

export interface DestinationContext {
  world: WorldMap;
  npcs: readonly NPC[];
  /** Prioridad actual de construcción (si existe). Cuando está
   *  presente, NPCs con stats OK van a recolectar los recursos
   *  que falten para esa receta. */
  nextBuildPriority?: CraftableId;
  /** Posición de la fogata permanente si existe — los NPCs vuelven
   *  a ella durante la última cuarta parte del día (dusk). */
  firePosition?: { x: number; y: number };
  /** Tick actual — para detectar dusk. */
  currentTick?: number;
  /** Ticks por día del mundo. */
  ticksPerDay?: number;
  /** Filtro opcional de alcanzabilidad. Si existe, los recursos
   *  inalcanzables no se eligen como destino. */
  isReachable?: (from: Position, to: Position) => boolean;
  /** Items del clan. Si está presente, `decideDestination` usa el
   *  item equipado del NPC para computar su rol activo y sesgar
   *  la elección de recursos (Sprint 10 — Pilar 1). */
  items?: readonly EquippableItem[];
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
  isReachable?: (from: Position, to: Position) => boolean,
  /** Peso aditivo por recurso (filtro de intención del rol). El peso
   *  se resta de la distancia efectiva: `score = d - weight`. Con
   *  weight=0 el comportamiento es idéntico al anterior. */
  intentWeight?: (id: ResourceId) => number,
): Position | null {
  let best: { score: number; x: number; y: number } | null = null;
  for (const r of resources) {
    if (r.quantity <= 0) continue;
    if (!acceptable(r.id)) continue;
    const pos = { x: r.x, y: r.y };
    if (isReachable && !isReachable(from, pos)) continue;
    const d = manhattan(from.x, from.y, r.x, r.y);
    const w = intentWeight ? intentWeight(r.id) : 0;
    const score = d - w;
    if (
      !best ||
      score < best.score ||
      (score === best.score && (r.x < best.x || (r.x === best.x && r.y < best.y)))
    ) {
      best = { score, x: r.x, y: r.y };
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

function carriedFood(npc: NPC): number {
  return npc.inventory.berry + npc.inventory.game + npc.inventory.fish;
}

function recoveryResourceAtPosition(
  position: Position,
  world: WorldMap,
): ResourceId | null {
  for (const r of world.resources) {
    if (r.x !== position.x || r.y !== position.y) continue;
    if (r.quantity <= 0) continue;
    if (
      r.id === RESOURCE.BERRY ||
      r.id === RESOURCE.GAME ||
      r.id === RESOURCE.FISH ||
      r.id === RESOURCE.WATER
    ) {
      return r.id;
    }
  }
  return null;
}

function equippedItem(
  npc: NPC,
  items: readonly EquippableItem[] | undefined,
): EquippableItem | null {
  if (!npc.equippedItemId || !items) return null;
  return items.find((i) => i.id === npc.equippedItemId) ?? null;
}

function buildIntentWeight(
  npc: NPC,
  items: readonly EquippableItem[] | undefined,
): (id: ResourceId) => number {
  const item = equippedItem(npc, items);
  const role = computeRole(npc, item);
  const weights = intentFilter(role);
  return (id: ResourceId) => weights[id] ?? 0;
}

export function decideDestination(
  npc: NPC,
  ctx: DestinationContext,
): Position {
  const { supervivencia, socializacion } = npc.stats;
  const currentRecovery = recoveryResourceAtPosition(npc.position, ctx.world);
  if (currentRecovery) {
    const leaveThreshold =
      currentRecovery === RESOURCE.WATER
        ? NEED_THRESHOLDS.supervivenciaHungry
        : NEED_THRESHOLDS.supervivenciaBuildReady;
    if (supervivencia < leaveThreshold) return npc.position;
  }

  // Dusk → vuelve a la fogata si existe y el NPC no está crítico.
  // Garantiza que el contador de noches consecutivas (Sprint 4.6)
  // pueda arrancar: NPCs vuelven a casa al caer la noche.
  if (
    ctx.firePosition &&
    ctx.currentTick !== undefined &&
    ctx.ticksPerDay !== undefined &&
    (supervivencia >= NEED_THRESHOLDS.supervivenciaBuildReady ||
      carriedFood(npc) > 0)
  ) {
    const duskStart = Math.floor(ctx.ticksPerDay * 0.75);
    const posInDay = ctx.currentTick % ctx.ticksPerDay;
    if (posInDay >= duskStart) {
      return ctx.firePosition;
    }
  }

  if (supervivencia < NEED_THRESHOLDS.supervivenciaCritical) {
    const water = nearestResource(
      npc.position,
      ctx.world.resources,
      (id) => id === RESOURCE.WATER,
      ctx.isReachable,
    );
    if (water) return water;
  }

  if (
    supervivencia < NEED_THRESHOLDS.supervivenciaBuildReady &&
    carriedFood(npc) === 0
  ) {
    const food = nearestResource(
      npc.position,
      ctx.world.resources,
      (id) => FOOD_IDS.includes(id),
      ctx.isReachable,
      buildIntentWeight(npc, ctx.items),
    );
    if (food) return food;
  }

  if (socializacion < NEED_THRESHOLDS.socializacionLow) {
    const c = centroidOfAlive(ctx.npcs);
    if (c) return c;
  }

  // Recolección proactiva para el próximo crafteable (Pilar 2 —
  // el mundo cambia sin tocarlo). Solo si el NPC está bien de
  // stats o lleva comida; sino forrajear tiene prioridad para no
  // convertir trayectos largos de piedra/leña en muertes evitables.
  if (ctx.nextBuildPriority) {
    const recipe = RECIPES[ctx.nextBuildPriority];
    const missing = missingResourceFor(recipe, ctx.npcs);
    if (missing) {
      const spawn = nearestResource(
        npc.position,
        ctx.world.resources,
        (id) => matchesMissing(id, missing),
        ctx.isReachable,
        buildIntentWeight(npc, ctx.items),
      );
      if (spawn) return spawn;
    }
  }

  return npc.position;
}

function missingResourceFor(
  recipe: Recipe,
  npcs: readonly NPC[],
): keyof NPCInventory | null {
  const clan = clanInventoryTotal(npcs);
  for (const [key, needed] of Object.entries(recipe.inputs) as Array<
    [keyof NPCInventory, number]
  >) {
    if (clan[key] < needed) return key;
  }
  return null;
}

function matchesMissing(
  id: ResourceId,
  missing: keyof NPCInventory,
): boolean {
  // Mapeo directo entre ResourceId y campo de inventario. Agua y
  // fish no aparecen en recetas primigenia; cobertura simbólica.
  if (missing === 'wood') return id === RESOURCE.WOOD;
  if (missing === 'stone') return id === RESOURCE.STONE;
  if (missing === 'berry') return id === RESOURCE.BERRY;
  if (missing === 'game') return id === RESOURCE.GAME;
  if (missing === 'fish') return id === RESOURCE.FISH;
  return false;
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

function consumeInventoryFood(npc: NPC): {
  npc: NPC;
  nutrition: number;
  kind: 'berry' | 'fish' | 'game' | null;
} {
  const inventory = { ...npc.inventory };
  let kind: 'berry' | 'fish' | 'game' | null = null;
  if (inventory.berry > 0) {
    inventory.berry -= 1;
    kind = 'berry';
  } else if (inventory.fish > 0) {
    inventory.fish -= 1;
    kind = 'fish';
  } else if (inventory.game > 0) {
    inventory.game -= 1;
    kind = 'game';
  } else {
    return { npc, nutrition: 0, kind: null };
  }
  return {
    npc: { ...npc, inventory },
    nutrition: FOOD_NUTRITION[kind],
    kind,
  };
}

function donorDistance(a: NPC, b: NPC): number {
  return (
    Math.abs(a.position.x - b.position.x) +
    Math.abs(a.position.y - b.position.y)
  );
}

function findFoodDonorIndex(
  hungry: NPC,
  npcs: readonly NPC[],
  communal: boolean,
): number {
  let best = -1;
  for (let i = 0; i < npcs.length; i++) {
    const donor = npcs[i];
    if (!donor.alive || donor.id === hungry.id || carriedFood(donor) === 0) {
      continue;
    }
    if (
      !communal &&
      donorDistance(hungry, donor) > NEED_TICK_RATES.socialRadius
    ) {
      continue;
    }
    if (best === -1) {
      best = i;
      continue;
    }
    const currentBest = npcs[best];
    const d = donorDistance(hungry, donor);
    const bestD = donorDistance(hungry, currentBest);
    if (d < bestD || (d === bestD && donor.id < currentBest.id)) {
      best = i;
    }
  }
  return best;
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
  const out = npcs.map((n) => ({ ...n, inventory: { ...n.inventory } }));
  for (let i = 0; i < out.length; i++) {
    const n = out[i];
    if (!n.alive) continue;
    let npc = n;
    let sv = npc.stats.supervivencia;
    let so = n.stats.socializacion;

    const recoveryResource = recoveryResourceAtPosition(npc.position, ctx.world);
    if (recoveryResource === RESOURCE.WATER) {
      sv += NEED_TICK_RATES.supervivenciaRecover;
    } else if (recoveryResource === RESOURCE.BERRY) {
      sv += FOOD_NUTRITION.berry;
    } else if (recoveryResource === RESOURCE.FISH) {
      sv += FOOD_NUTRITION.fish;
    } else if (recoveryResource === RESOURCE.GAME) {
      sv += FOOD_NUTRITION.game;
    } else if (
      sv < NEED_THRESHOLDS.supervivenciaEatFromInventory &&
      carriedFood(npc) > 0
    ) {
      const meal = consumeInventoryFood(npc);
      npc = meal.npc;
      const cooked = ctx.firePosition !== undefined;
      sv += cooked
        ? Math.round(meal.nutrition * COOKED_FOOD_MULTIPLIER)
        : meal.nutrition;
      if (cooked && meal.kind) so += COOKED_FOOD_SOCIAL_BONUS;
    } else if (sv < NEED_THRESHOLDS.supervivenciaEatFromInventory) {
      const donorIndex = findFoodDonorIndex(
        npc,
        out,
        ctx.firePosition !== undefined,
      );
      if (donorIndex !== -1) {
        const meal = consumeInventoryFood(out[donorIndex]);
        out[donorIndex] = meal.npc;
        const cooked = ctx.firePosition !== undefined;
        sv += cooked
          ? Math.round(meal.nutrition * COOKED_FOOD_MULTIPLIER)
          : meal.nutrition;
        so += cooked ? COOKED_FOOD_SOCIAL_BONUS : 1;
      } else {
        sv -= NEED_TICK_RATES.supervivenciaDecay;
      }
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

    out[i] = {
      ...npc,
      stats: { supervivencia: sv, socializacion: so },
      alive,
    };
  }
  return out;
}
