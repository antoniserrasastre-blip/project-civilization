/**
 * Necesidades del NPC por tick — Sprint 3.2 (decideDestination) +
 * Sprint 4.1 (tickNeeds: decay/recovery + socialización +
 * feed-forward de hambre).
 */

import type { NPC, NPCInventory } from './npcs';
import { updateNpcStats } from './npcs';
import {
  RESOURCE,
  type ResourceId,
  type ResourceSpawn,
  type WorldMap,
} from './world-state';
import { clanInventoryTotal, RECIPES, STORAGE_SPECIALTY, STOCKPILE_CAPACITY, type Recipe } from './crafting';
import type { CraftableId } from './crafting';
import type { EquippableItem } from './items';
import { ITEM_DEFS } from './items';
import { computeRole, intentFilter, ROLE, type Role } from './roles';
import { INVENTORY_CAP_PER_TYPE, effectiveInventoryCap } from './harvest';
import type { Structure } from './structures';

/** Penalty en tiles efectivos para recursos ya reclamados por otros NPCs. */
const CLAIM_PENALTY = 8;
const HYSTERESIS = 5;

/** Deterministic pseudo-random number based on id and tick. */
function nextInt(seed: string | number, max: number): [number] {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return [h % max];
}

function npcTileJitter(npcId: string, rx: number, ry: number): number {
  let h = 0;
  for (let i = 0; i < npcId.length; i++) h = (h * 31 + npcId.charCodeAt(i)) | 0;
  h = (h ^ (rx * 1664525 + ry * 22695477)) >>> 0;
  return (h % 3) - 1; 
}

export const NEED_THRESHOLDS = {
  supervivenciaCritical: 20,
  supervivenciaHungry: 40,
  supervivenciaEatFromInventory: 55,
  supervivenciaBuildReady: 55,
  socializacionLow: 30,
} as const;

export const FOOD_NUTRITION: Record<'berry' | 'fish' | 'game', number> = {
  berry: 8,
  fish: 12,
  game: 18,
};

const COOKED_FOOD_MULTIPLIER = 1.5;
const COOKED_FOOD_SOCIAL_BONUS = 3;

const ROLE_RESOURCES: Record<Role, ResourceId[]> = {
  [ROLE.CAZADOR]:       [RESOURCE.GAME],
  [ROLE.PESCADOR]:      [RESOURCE.FISH],
  [ROLE.RECOLECTOR]:    [RESOURCE.BERRY, RESOURCE.WOOD],
  [ROLE.TALLADOR]:      [RESOURCE.STONE, RESOURCE.WOOD],
  [ROLE.TEJEDOR]:       [RESOURCE.GAME, RESOURCE.SHELL],
  [ROLE.CURANDERO]:     [RESOURCE.BERRY, RESOURCE.WATER],
  [ROLE.RASTREADOR]:    [RESOURCE.WOOD, RESOURCE.BERRY],
  [ROLE.TRANSPORTISTA]: [RESOURCE.WOOD, RESOURCE.STONE],
};

export interface DestinationContext {
  world: WorldMap;
  npcs: readonly NPC[];
  items?: readonly EquippableItem[];
  structures?: readonly Structure[];
  currentTick: number;
  ticksPerDay: number;
  nextBuildPriority?: CraftableId;
  buildSitePosition?: { x: number; y: number };
  isBuilder?: boolean;
  firePosition?: { x: number; y: number };
  isReachable?: (from: Position, to: Position) => boolean;
  claimedTiles?: ReadonlySet<string>;
  moodModifier?: number; // Viene de la Memoria Colectiva
}

export interface Position {
  x: number;
  y: number;
}

function findNearestStockpile(
  from: Position,
  structures: readonly Structure[],
  resourceKey: keyof NPCInventory,
  isReachable?: (from: Position, to: Position) => boolean,
): Position | null {
  let bestDist = Infinity;
  let bestPos: Position | null = null;
  for (const s of structures) {
    const specialty = STORAGE_SPECIALTY[s.kind] ?? [];
    if (!specialty.includes(resourceKey)) continue;
    const current = s.inventory?.[resourceKey] || 0;
    if (current >= STOCKPILE_CAPACITY) continue;
    if (isReachable && !isReachable(from, s.position)) continue;
    const d = manhattan(from.x, from.y, s.position.x, s.position.y);
    if (d < bestDist) {
      bestDist = d;
      bestPos = s.position;
    }
  }
  return bestPos;
}

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function nearestResource(
  from: Position,
  resources: readonly ResourceSpawn[],
  acceptable: (id: ResourceId) => boolean,
  ctx: DestinationContext,
  intentWeight?: (id: ResourceId) => number,
  npcId?: string,
): Position | null {
  let best: { score: number; x: number; y: number } | null = null;
  const role = npcId ? computeRole(ctx.npcs.find(n => n.id === npcId)!, undefined) : null;

  for (const r of resources) {
    if (r.quantity <= 0) continue;
    if (!acceptable(r.id)) continue;
    const pos = { x: r.x, y: r.y };
    if (ctx.isReachable && !ctx.isReachable(from, pos)) continue;
    
    const d = manhattan(from.x, from.y, r.x, r.y);
    const w = intentWeight ? intentWeight(r.id) : 0;
    
    // SABIDURÍA COLECTIVA: Si hay otros del mismo rol cerca, el reclamo duele menos.
    let claimedPenalty = ctx.claimedTiles?.has(`${r.x},${r.y}`) ? CLAIM_PENALTY : 0;
    if (claimedPenalty > 0 && role) {
      const peersNear = ctx.npcs.filter(n => 
        n.id !== npcId && 
        n.alive && 
        computeRole(n, undefined) === role &&
        manhattan(n.position.x, n.position.y, r.x, r.y) < 5
      ).length;
      claimedPenalty = Math.max(0, claimedPenalty - peersNear * 2);
    }

    const jitter = npcId ? npcTileJitter(npcId, r.x, r.y) : 0;
    const score = d - w + claimedPenalty + jitter;
    if (!best || score < best.score) {
      best = { score, x: r.x, y: r.y };
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

function centroidOfAlive(npcs: readonly NPC[]): Position | null {
  let sx = 0, sy = 0, count = 0;
  for (const n of npcs) {
    if (!n.alive) continue;
    sx += n.position.x; sy += n.position.y;
    count++;
  }
  if (count === 0) return null;
  return { x: Math.round(sx / count), y: Math.round(sy / count) };
}

const FOOD_IDS: ResourceId[] = [RESOURCE.BERRY, RESOURCE.GAME, RESOURCE.FISH];

function carriedFood(npc: NPC): number {
  return npc.inventory.berry + npc.inventory.game + npc.inventory.fish;
}

function recoveryResourceAtPosition(position: Position, world: WorldMap): ResourceId | null {
  for (const r of world.resources) {
    if (r.x !== position.x || r.y !== position.y) continue;
    if (r.quantity <= 0) continue;
    if ([RESOURCE.BERRY, RESOURCE.GAME, RESOURCE.FISH, RESOURCE.WATER].includes(r.id)) return r.id;
  }
  return null;
}

function buildIntentWeight(npc: NPC, items: readonly EquippableItem[] | undefined): (id: ResourceId) => number {
  const item = npc.equippedItemId && items ? items.find(i => i.id === npc.equippedItemId) : null;
  const weights = intentFilter(computeRole(npc, item || null));
  return (id: ResourceId) => weights[id] ?? 0;
}

export function decideDestination(npc: NPC, ctx: DestinationContext): Position {
  // EFECTO ESPECTADOR: Probabilidad de indecisión basada en la población viva.
  const aliveCount = ctx.npcs.filter(n => n.alive).length;
  const bystanderChance = Math.min(60, aliveCount * 0.5);
  const [roll] = nextInt(npc.id + ctx.currentTick, 100);
  if (roll < bystanderChance) return npc.position;

  const { supervivencia, socializacion } = npc.stats;
  const id = npc.id;

  function withHysteresis(candidate: Position | null): Position | null {
    if (!candidate) return null;
    const prev = npc.destination;
    if (!prev || manhattan(npc.position.x, npc.position.y, prev.x, prev.y) === 0) return candidate;
    const prevHasResource = ctx.world.resources.some(r => r.x === prev.x && r.y === prev.y && r.quantity > 0);
    if (!prevHasResource || ctx.claimedTiles?.has(`${prev.x},${prev.y}`)) return candidate;
    const dNew = manhattan(npc.position.x, npc.position.y, candidate.x, candidate.y);
    const dPrev = manhattan(npc.position.x, npc.position.y, prev.x, prev.y);
    return dNew + HYSTERESIS < dPrev ? candidate : prev;
  }

  const currentRecovery = recoveryResourceAtPosition(npc.position, ctx.world);
  if (currentRecovery) {
    const leaveThreshold = currentRecovery === RESOURCE.WATER ? NEED_THRESHOLDS.supervivenciaHungry : NEED_THRESHOLDS.supervivenciaBuildReady;
    if (supervivencia < leaveThreshold) return npc.position;
  }

  if (ctx.firePosition) {
    const posInDay = ctx.currentTick % ctx.ticksPerDay;
    if (posInDay >= Math.floor(ctx.ticksPerDay * 0.85) && (supervivencia >= 55 || carriedFood(npc) > 0)) return ctx.firePosition;
  }

  if (supervivencia < NEED_THRESHOLDS.supervivenciaCritical) {
    const water = nearestResource(npc.position, ctx.world.resources, rid => rid === RESOURCE.WATER, ctx, undefined, id);
    if (water) return water;
  }

  if (supervivencia < NEED_THRESHOLDS.supervivenciaBuildReady && carriedFood(npc) === 0) {
    const food = nearestResource(npc.position, ctx.world.resources, rid => FOOD_IDS.includes(rid), ctx, buildIntentWeight(npc, ctx.items), id);
    if (food) return withHysteresis(food) ?? food;
  }

  const isHealthy = supervivencia >= 55 || carriedFood(npc) > 0;

  // DEBER LOGÍSTICO
  const cap = effectiveInventoryCap(npc, ctx.structures ?? [], ctx.items ?? []);
  const keysToDrop = (Object.keys(npc.inventory) as Array<keyof NPCInventory>).filter(k => (npc.inventory[k] ?? 0) >= cap);
  if (isHealthy && keysToDrop.length > 0 && ctx.structures) {
    for (const k of keysToDrop) {
      const hub = findNearestStockpile(npc.position, ctx.structures, k, ctx.isReachable);
      if (hub) return hub;
    }
  }

  // DEBER ROL
  const roleTarget = nearestResource(npc.position, ctx.world.resources, rid => ROLE_RESOURCES[computeRole(npc, null)]?.includes(rid), ctx, undefined, id);
  if (isHealthy && roleTarget) return withHysteresis(roleTarget) ?? roleTarget;

  if (socializacion < NEED_THRESHOLDS.socializacionLow) {
    const c = centroidOfAlive(ctx.npcs);
    if (c) return c;
  }

  if (ctx.isBuilder && ctx.buildSitePosition) return ctx.buildSitePosition;

  return npc.position;
}

export function tickNeeds(npcs: readonly NPC[], ctx: DestinationContext): NPC[] {
  const out = npcs.map(n => ({ ...n, inventory: { ...n.inventory } }));
  const mood = ctx.moodModifier || 0;

  for (let i = 0; i < out.length; i++) {
    const n = out[i];
    if (!n.alive) continue;
    let sv = n.stats.supervivencia;
    let so = n.stats.socializacion;
    let pr = (n.stats.proposito ?? 100);

    const rec = recoveryResourceAtPosition(n.position, ctx.world);
    if (rec === RESOURCE.WATER && sv < 40) sv += 2;
    else sv -= 2;

    // EL PROPOSITO ahora se ve afectado por el humor global del clan
    pr = Math.max(0, Math.min(100, pr + (mood / 100)));

    out[i] = updateNpcStats(n, { supervivencia: sv, socializacion: so, proposito: pr });
    if (out[i].stats.supervivencia <= 0) out[i].alive = false;
  }
  return out;
}
