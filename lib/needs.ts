/**
 * Necesidades del NPC por tick — Fase 2.0 (Memoria y Tradiciones).
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
import type { PRNGState } from './prng';
import { nextInt } from './prng';
import type { Synergy } from './synergies';

const CLAIM_PENALTY = 8;
const CURSED_PENALTY = 100; 
const HYSTERESIS = 5;

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
    if (r.quantity <= 0 || !acceptable(r.id)) continue;
    const pos = { x: r.x, y: r.y };
    if (ctx.isReachable && !ctx.isReachable(from, pos)) continue;
    
    let score = manhattan(from.x, from.y, r.x, r.y) - (intentWeight ? intentWeight(r.id) : 0);
    
    const posKey = `${r.x},${r.y}`;
    if (ctx.world.terrainTags?.[posKey]?.includes('maldita')) score += CURSED_PENALTY;

    let claimedPenalty = ctx.claimedTiles?.has(posKey) ? CLAIM_PENALTY : 0;
    if (claimedPenalty > 0 && role) {
      const peersNear = ctx.npcs.filter(n => n.id !== npcId && n.alive && computeRole(n, undefined) === role && manhattan(n.position.x, n.position.y, r.x, r.y) < 5).length;
      claimedPenalty = Math.max(0, claimedPenalty - peersNear * 2);
    }
    score += claimedPenalty;

    if (!best || score < best.score) best = { score, x: r.x, y: r.y };
  }
  return best ? { x: best.x, y: best.y } : null;
}

export const NEED_THRESHOLDS = {
  supervivenciaCritical: 20, supervivenciaHungry: 40, supervivenciaEatFromInventory: 55, supervivenciaBuildReady: 55, socializacionLow: 30,
} as const;

const ROLE_RESOURCES: Record<Role, ResourceId[]> = {
  [ROLE.CAZADOR]: [RESOURCE.GAME], [ROLE.PESCADOR]: [RESOURCE.FISH], [ROLE.RECOLECTOR]: [RESOURCE.BERRY, RESOURCE.WOOD],
  [ROLE.TALLADOR]: [RESOURCE.STONE, RESOURCE.WOOD], [ROLE.TEJEDOR]: [RESOURCE.GAME, RESOURCE.SHELL], [ROLE.CURANDERO]: [RESOURCE.BERRY, RESOURCE.WATER],
  [ROLE.RASTREADOR]: [RESOURCE.WOOD, RESOURCE.BERRY], [ROLE.TRANSPORTISTA]: [RESOURCE.WOOD, RESOURCE.STONE],
};

export interface DestinationContext {
  world: WorldMap; npcs: readonly NPC[]; items?: readonly EquippableItem[];
  structures?: readonly Structure[]; currentTick: number; ticksPerDay: number;
  nextBuildPriority?: CraftableId; buildSitePosition?: { x: number; y: number };
  isBuilder?: boolean; firePosition?: { x: number; y: number };
  isReachable?: (from: Position, to: Position) => boolean; claimedTiles?: ReadonlySet<string>;
  moodModifier?: number; prng: PRNGState; synergies: Synergy[];
}

export interface Position { x: number; y: number; }

export interface DecisionResult {
  position: Position;
  next: PRNGState;
}

export function decideDestination(npc: NPC, ctx: DestinationContext): DecisionResult {
  let currentPrng = ctx.prng;
  const aliveCount = ctx.npcs.filter(n => n.alive).length;
  
  const traditions = ctx.world.traditions || {};
  const currentRole = computeRole(npc, null);
  const topTradition = Object.entries(traditions).sort((a,b) => b[1] - a[1])[0]?.[0];
  const traditionFriction = (topTradition && currentRole !== topTradition) ? 10 : 0;

  const bystanderChance = Math.min(70, (aliveCount * 0.5) + traditionFriction);
  const { value: roll, next: nextP } = nextInt(currentPrng, 0, 100);
  currentPrng = nextP;

  if (roll < bystanderChance) return { position: npc.position, next: currentPrng };

  const { supervivencia, socializacion } = npc.stats;
  const id = npc.id;

  // Supervivencia Crítica
  if (supervivencia < NEED_THRESHOLDS.supervivenciaCritical) {
    const water = nearestResource(npc.position, ctx.world.resources, rid => rid === RESOURCE.WATER, ctx, undefined, id);
    if (water) return { position: water, next: currentPrng };
  }

  // Hambre
  if (supervivencia < NEED_THRESHOLDS.supervivenciaBuildReady && (npc.inventory.berry + npc.inventory.fish + npc.inventory.game) === 0) {
    const food = nearestResource(npc.position, ctx.world.resources, rid => [RESOURCE.BERRY, RESOURCE.GAME, RESOURCE.FISH].includes(rid), ctx, undefined, id);
    if (food) return { position: food, next: currentPrng };
  }

  // Deber Rol
  const roleResources = ROLE_RESOURCES[currentRole] ?? [];
  if (supervivencia >= 55 && roleResources.length > 0) {
    const roleTarget = nearestResource(npc.position, ctx.world.resources, rid => roleResources.includes(rid), ctx, undefined, id);
    if (roleTarget) return { position: roleTarget, next: currentPrng };
  }

  // Social
  if (socializacion < NEED_THRESHOLDS.socializacionLow) {
    let sx = 0, sy = 0, c = 0;
    for (const n of ctx.npcs) { if (n.alive) { sx += n.position.x; sy += n.position.y; c++; } }
    if (c > 0) return { position: { x: Math.round(sx/c), y: Math.round(sy/c) }, next: currentPrng };
  }

  if (ctx.isBuilder && ctx.buildSitePosition) return { position: ctx.buildSitePosition, next: currentPrng };

  return { position: npc.position, next: currentPrng };
}

export function tickNeeds(npcs: readonly NPC[], ctx: DestinationContext): NPC[] {
  const out = npcs.map(n => ({ ...n, inventory: { ...n.inventory } }));
  const mood = ctx.moodModifier || 0;
  for (let i = 0; i < out.length; i++) {
    const n = out[i]; if (!n.alive) continue;
    let { supervivencia: sv, socializacion: so, proposito: pr } = n.stats;
    sv -= 2;
    pr = Math.max(0, Math.min(100, pr + (mood / 100)));
    out[i] = updateNpcStats(n, { supervivencia: sv, socializacion: so, proposito: pr });
    if (out[i].stats.supervivencia <= 0) out[i].alive = false;
  }
  return out;
}
