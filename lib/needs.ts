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
import { ITEM_DEFS } from './items';
import { computeRole, intentFilter, ROLE, type Role } from './roles';
import { INVENTORY_CAP_PER_TYPE } from './harvest';

/** Penalty en tiles efectivos para recursos ya reclamados por otros NPCs.
 *  Un NPC a distancia 12 prefiere un recurso libre a distancia 18 antes
 *  que uno reclamado a distancia 5 (5 + 8 = 13 > 12). */
const CLAIM_PENALTY = 8;

/** Un NPC no abandona su destino actual a menos que el nuevo sea al
 *  menos HYSTERESIS tiles más cercano. Evita oscilaciones por cambios
 *  mínimos de stats o de cantidad de recurso. */
const HYSTERESIS = 5;

/** Pequeño jitter basado en el id del NPC. Desempata lexicográfico:
 *  ante la misma distancia, NPC A preferirá el recurso X y NPC B el Y. */
function npcTileJitter(npcId: string, rx: number, ry: number): number {
  // Hash determinista: combina id con coordenadas del recurso.
  let h = 0;
  for (let i = 0; i < npcId.length; i++) h = (h * 31 + npcId.charCodeAt(i)) | 0;
  h = (h ^ (rx * 1664525 + ry * 22695477)) >>> 0;
  return (h % 3) - 1; // -1, 0 o +1 tile virtual
}

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

// Calibrado para TICKS_PER_DAY=480 con decay=2:
// berry=8 aguanta ~4 ticks, fish=12 ~6 ticks, game=18 ~9 ticks.
// Resultado: ~12-15 comidas/día, ciclo hambre/comer visible.
export const FOOD_NUTRITION: Record<'berry' | 'fish' | 'game', number> = {
  berry: 8,
  fish: 12,
  game: 18,
};

const COOKED_FOOD_MULTIPLIER = 1.5;
const COOKED_FOOD_SOCIAL_BONUS = 3;

/** Recursos que cada rol busca proactivamente cuando está sano.
 *  Define el "deber de rol" — el NPC siempre tiene algo que hacer
 *  mientras sv > umbral, aunque no tenga hambre ni urgencia. */
const ROLE_RESOURCES: Record<Role, ResourceId[]> = {
  [ROLE.CAZADOR]:    [RESOURCE.GAME],
  [ROLE.PESCADOR]:   [RESOURCE.FISH],
  [ROLE.RECOLECTOR]: [RESOURCE.BERRY, RESOURCE.WOOD],
  [ROLE.TALLADOR]:   [RESOURCE.STONE, RESOURCE.WOOD],
  [ROLE.TEJEDOR]:    [RESOURCE.GAME, RESOURCE.SHELL],
  [ROLE.CURANDERO]:  [RESOURCE.BERRY, RESOURCE.WATER],
  [ROLE.RASTREADOR]: [RESOURCE.WOOD, RESOURCE.BERRY],
};

export interface DestinationContext {
  world: WorldMap;
  npcs: readonly NPC[];
  nextBuildPriority?: CraftableId;
  firePosition?: { x: number; y: number };
  currentTick?: number;
  ticksPerDay?: number;
  isReachable?: (from: Position, to: Position) => boolean;
  items?: readonly EquippableItem[];
  /** Tiles ya reclamados por otros NPCs en este tick (anti-apilamiento). */
  claimedTiles?: ReadonlySet<string>;
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
  intentWeight?: (id: ResourceId) => number,
  /** Tiles ya reclamados por otros NPCs en este tick — aplica CLAIM_PENALTY. */
  claimedTiles?: ReadonlySet<string>,
  /** Id del NPC — introduce jitter determinista para romper empates. */
  npcId?: string,
): Position | null {
  let best: { score: number; x: number; y: number } | null = null;
  for (const r of resources) {
    if (r.quantity <= 0) continue;
    if (!acceptable(r.id)) continue;
    const pos = { x: r.x, y: r.y };
    if (isReachable && !isReachable(from, pos)) continue;
    const d = manhattan(from.x, from.y, r.x, r.y);
    const w = intentWeight ? intentWeight(r.id) : 0;
    const claimed = claimedTiles?.has(`${r.x},${r.y}`) ? CLAIM_PENALTY : 0;
    const jitter = npcId ? npcTileJitter(npcId, r.x, r.y) : 0;
    const score = d - w + claimed + jitter;
    if (!best || score < best.score) {
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

/** Recursos hacia los que la herramienta "tira" cuando el NPC está
 *  saciado y no hay build priority. Es un destino **adicional**, no
 *  un sesgo de desempate — complementa el filtro de intención por
 *  rol (que afecta a la búsqueda de comida por hambre, Sprint 10).
 *  Sprint 9b: herramienta en mano da propósito cuando no hay hambre. */
const TOOL_PREFERRED_RESOURCES: Record<string, ResourceId[]> = {
  hunting: [RESOURCE.GAME],
  gathering: [RESOURCE.BERRY, RESOURCE.WOOD, RESOURCE.SHELL],
  crafting: [RESOURCE.STONE, RESOURCE.WOOD, RESOURCE.OBSIDIAN],
  fishing: [RESOURCE.FISH],
  healing: [RESOURCE.BERRY, RESOURCE.WATER],
};

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
  const claimed = ctx.claimedTiles;
  const id = npc.id;

  // Helper: aplica histéresis al destino candidato solo para comida.
  // Solo tiene sentido cuando el NPC está en ruta (distPrev > 0).
  // Si el NPC ya llegó a su destino anterior (distPrev === 0), no
  // hay que mantenerlo: el ciclo se cerró y hay que buscar el siguiente.
  function withHysteresis(candidate: Position | null): Position | null {
    if (!candidate) return null;
    const prev = npc.destination;
    if (!prev) return candidate;
    const distPrev = manhattan(npc.position.x, npc.position.y, prev.x, prev.y);
    // Bug crítico: si NPC ya está en el destino anterior (dist=0), nunca
    // se cumpliría distNew+H < 0 → quedaría bloqueado. Avanzar siempre.
    if (distPrev === 0) return candidate;
    // Solo mantener si el destino anterior aún tiene recursos Y no está
    // en claimedTiles (otro NPC ya lo reclamó este tick).
    const prevClaimed = claimed?.has(`${prev.x},${prev.y}`);
    if (prevClaimed) return candidate;
    const prevHasResource = ctx.world.resources.some(
      (r) => r.x === prev.x && r.y === prev.y && r.quantity > 0,
    );
    if (!prevHasResource) return candidate;
    const distNew = manhattan(npc.position.x, npc.position.y, candidate.x, candidate.y);
    return distNew + HYSTERESIS < distPrev ? candidate : prev;
  }

  // Si está sobre un recurso de recuperación y aún lo necesita, quedarse.
  const currentRecovery = recoveryResourceAtPosition(npc.position, ctx.world);
  if (currentRecovery) {
    const leaveThreshold =
      currentRecovery === RESOURCE.WATER
        ? NEED_THRESHOLDS.supervivenciaHungry
        : NEED_THRESHOLDS.supervivenciaBuildReady;
    if (supervivencia < leaveThreshold) return npc.position;
  }

  // Dusk → fuerza gravitatoria gradual hacia la fogata.
  // No es un switch binario: la fuerza crece a lo largo del crepúsculo.
  // En dusk temprano (70-85%) solo atrae si el NPC está saciado.
  // En dusk profundo (>85%) atrae a cualquier NPC con comida o saciado.
  if (
    ctx.firePosition &&
    ctx.currentTick !== undefined &&
    ctx.ticksPerDay !== undefined
  ) {
    const posInDay = ctx.currentTick % ctx.ticksPerDay;
    const duskEarly = Math.floor(ctx.ticksPerDay * 0.70);
    const duskDeep  = Math.floor(ctx.ticksPerDay * 0.85);
    const isEarlyDusk = posInDay >= duskEarly && posInDay < duskDeep;
    const isDeepDusk  = posInDay >= duskDeep;

    if (isDeepDusk && (supervivencia >= NEED_THRESHOLDS.supervivenciaBuildReady || carriedFood(npc) > 0)) {
      return ctx.firePosition;
    }
    if (isEarlyDusk && supervivencia >= NEED_THRESHOLDS.supervivenciaBuildReady) {
      return ctx.firePosition;
    }
  }

  // Supervivencia crítica → agua inmediata (sin histéresis — es urgente).
  if (supervivencia < NEED_THRESHOLDS.supervivenciaCritical) {
    const water = nearestResource(
      npc.position, ctx.world.resources,
      (rid) => rid === RESOURCE.WATER,
      ctx.isReachable, undefined, claimed, id,
    );
    if (water) return water;
  }

  // Hambre → buscar comida con histéresis para evitar oscilación.
  if (supervivencia < NEED_THRESHOLDS.supervivenciaBuildReady && carriedFood(npc) === 0) {
    const food = nearestResource(
      npc.position, ctx.world.resources,
      (rid) => FOOD_IDS.includes(rid),
      ctx.isReachable, buildIntentWeight(npc, ctx.items), claimed, id,
    );
    if (food) return withHysteresis(food) ?? food;
  }

  if (socializacion < NEED_THRESHOLDS.socializacionLow) {
    const c = centroidOfAlive(ctx.npcs);
    if (c) return c;
  }

  // ── Tres deberes activos cuando no hay urgencias vitales ──

  // DEBER 1: Materiales para la construcción activa.
  //   Todos los NPCs contribuyen, no solo los builders designados.
  if (ctx.nextBuildPriority) {
    const recipe = RECIPES[ctx.nextBuildPriority];
    const missing = missingResourceFor(recipe, ctx.npcs);
    if (missing) {
      const spawn = nearestResource(
        npc.position, ctx.world.resources,
        (rid) => matchesMissing(rid, missing),
        ctx.isReachable, buildIntentWeight(npc, ctx.items), claimed, id,
      );
      if (spawn) return spawn;
    }
  }

  // DEBER 2: Herramienta equipada toma el mando — recurso afín al oficio.
  if (ctx.items && npc.equippedItemId) {
    const equipped = ctx.items.find((i) => i.id === npc.equippedItemId);
    if (equipped) {
      const affinity = ITEM_DEFS[equipped.kind].skillAffinity;
      const preferred = TOOL_PREFERRED_RESOURCES[affinity] ?? [];
      if (preferred.length > 0) {
        const intentTarget = nearestResource(
          npc.position, ctx.world.resources,
          (rid) => preferred.includes(rid),
          ctx.isReachable, undefined, claimed, id,
        );
        if (intentTarget) return intentTarget;
      }
    }
  }

  // DEBER 3: Rol activo — siempre hay algo que hacer mientras sv > umbral.
  //   Cada NPC actúa según su rol aunque no tenga hambre ni urgencia.
  //   Solo si el inventario del recurso preferido no está al tope.
  const item = ctx.items?.find((i) => i.id === npc.equippedItemId) ?? null;
  const role = computeRole(npc, item);
  const roleResources = ROLE_RESOURCES[role] ?? [];
  if (roleResources.length > 0) {
    // Comprobamos si puede llevar más de alguno de sus recursos preferidos
    const canCarryMore = roleResources.some((rid) => {
      const key = rid as keyof typeof npc.inventory;
      return (npc.inventory[key] ?? 0) < INVENTORY_CAP_PER_TYPE;
    });
    if (canCarryMore) {
      const roleTarget = nearestResource(
        npc.position, ctx.world.resources,
        (rid) => roleResources.includes(rid),
        ctx.isReachable, undefined, claimed, id,
      );
      if (roleTarget) return withHysteresis(roleTarget) ?? roleTarget;
    }
  }

  // Buffer mínimo de comida cuando el rol no tiene preferencia clara.
  if (carriedFood(npc) < 2) {
    const proactiveFood = nearestResource(
      npc.position, ctx.world.resources,
      (rid) => FOOD_IDS.includes(rid),
      ctx.isReachable, undefined, claimed, id,
    );
    if (proactiveFood) return withHysteresis(proactiveFood) ?? proactiveFood;
  }

  // Fallback: ir hacia el centroide si estamos dispersos.
  const centroid = centroidOfAlive(ctx.npcs);
  if (centroid) {
    const dist = manhattan(npc.position.x, npc.position.y, centroid.x, centroid.y);
    if (dist > 5) return centroid;
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
  // Mapeo directo entre ResourceId y campo de inventario.
  if (missing === 'wood') return id === RESOURCE.WOOD;
  if (missing === 'stone') return id === RESOURCE.STONE;
  if (missing === 'berry') return id === RESOURCE.BERRY;
  if (missing === 'game') return id === RESOURCE.GAME;
  if (missing === 'fish') return id === RESOURCE.FISH;
  if (missing === 'obsidian') return id === RESOURCE.OBSIDIAN;
  if (missing === 'shell') return id === RESOURCE.SHELL;
  return false;
}

// --- Sprint 4.1: feed-forward de necesidades por tick ---

export const NEED_TICK_RATES = {
  /** Decay pasivo de supervivencia por tick (entropía).
   *  Valor 2 calibrado para TICKS_PER_DAY=480: sv 100→55 en ~22 ticks. */
  supervivenciaDecay: 2,
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

    // Solo el AGUA cura al estar encima (beber es pasivo y tiene sentido).
    // La COMIDA no cura on-tile — se cosecha al inventario y se come
    // cuando hay urgencia. Esto elimina el bucle recovery-parálisis.
    const recoveryResource = recoveryResourceAtPosition(npc.position, ctx.world);
    if (recoveryResource === RESOURCE.WATER) {
      sv += NEED_TICK_RATES.supervivenciaRecover;
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
