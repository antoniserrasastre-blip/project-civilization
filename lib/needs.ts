/**
 * Necesidades del NPC por tick — Fase 2.0 (Memoria y Tradiciones).
 */

import type { NPC, NPCInventory, Vocation } from './npcs';
import { updateNpcStats, VOCATION } from './npcs';
import {
  RESOURCE,
  type ResourceId,
  type ResourceSpawn,
  type WorldMap,
  type ClimateState,
} from './world-state';
import { clanInventoryTotal, RECIPES, STORAGE_SPECIALTY, STOCKPILE_CAPACITY, type Recipe, CRAFTABLE } from './crafting';
import type { CraftableId } from './crafting';
import type { EquippableItem } from './items';
import { ITEM_DEFS } from './items';
import { computeRole, intentFilter, ROLE, type Role } from './roles';
import { INVENTORY_CAP_PER_TYPE, effectiveInventoryCap } from './harvest';
import type { Structure } from './structures';
import { nextInt, type PRNGState } from './prng';
import type { Synergy } from './synergies';
import { isDiscovered, type FogState } from './fog';
import { SEASON } from './climate';
import type { TechEffect } from './technologies';

const CLAIM_PENALTY = 8;
const CURSED_PENALTY = 100; 
const HYSTERESIS = 5;

export const NEED_TICK_RATES = {
  supervivenciaDecay: 0.15, // Mucho más lento (antes era 2.0, un error)
  supervivenciaRecover: 2,
  socializacionAlone: 0.1,
  socializacionNear: 0.2,
  feedForwardHunger: 1,
  socialRadius: 3,
} as const;

export const FOOD_NUTRITION: Record<'berry' | 'fish' | 'game', number> = {
  berry: 15,
  fish: 25,
  game: 40,
};

const COOKED_FOOD_MULTIPLIER = 1.5;
const COOKED_FOOD_SOCIAL_BONUS = 5;

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function carriedFood(npc: NPC): number {
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

function nearestResource(
  from: Position,
  resources: readonly ResourceSpawn[],
  acceptable: (id: ResourceId) => boolean,
  ctx: DestinationContext,
  intentWeight?: (id: ResourceId) => number,
  npcId?: string,
): Position | null {
  let best: { score: number; x: number; y: number } | null = null;
  const targetNpc = npcId ? ctx.npcs.find(n => n.id === npcId) : null;
  const equippedItem = (targetNpc && targetNpc.equippedItemId && ctx.items) 
    ? ctx.items.find(it => it.id === targetNpc.equippedItemId) || null 
    : null;
  const role = targetNpc ? computeRole(targetNpc, equippedItem) : null;
  const roleFilter = role ? intentFilter(role) : {};

  for (const r of resources) {
    if (r.quantity <= 0 || !acceptable(r.id)) continue;
    
    // MEMORIA COLECTIVA: Solo conocemos recursos en tiles descubiertos
    if (ctx.fog && !isDiscovered(ctx.fog, r.x, r.y, ctx.fogBuffer)) continue;

    const pos = { x: r.x, y: r.y };
    if (ctx.isReachable && !ctx.isReachable(from, pos)) continue;
    
    const weight = intentWeight ? intentWeight(r.id) : (roleFilter[r.id] || 0);
    let score = manhattan(from.x, from.y, r.x, r.y) - weight;
    
    // IA DE VITALIDAD: Penalizar nodos con poca cantidad
    if (r.quantity < r.initialQuantity * 0.2) {
      score += (npcId && ctx.npcs.find(n => n.id === npcId)?.vocation === VOCATION.SIMPLEZAS) ? 20 : 5;
    }

    const posKey = `${r.x},${r.y}`;
    
    // EXCLUSIÓN ABSOLUTA: Si el recurso ya ha sido reclamado por otro en este tick, saltar
    if (ctx.claimedTiles?.has(posKey)) continue;

    if (ctx.world.terrainTags?.[posKey]?.includes('maldita')) score += CURSED_PENALTY;
    
    if (!best || score < best.score) best = { score, x: r.x, y: r.y };
  }
  return best ? { x: best.x, y: best.y } : null;
}

export const NEED_THRESHOLDS = {
  supervivenciaCritical: 25,
  supervivenciaHungry: 45,
  supervivenciaEatFromInventory: 65,
  supervivenciaBuildReady: 60,
  socializacionLow: 30,
  miedoHigh: 65,
} as const;

const VOCATION_RESOURCES: Record<string, ResourceId[]> = {
  [VOCATION.SABIO]:      [RESOURCE.OBSIDIAN, RESOURCE.FLINT, RESOURCE.MUSHROOM, RESOURCE.WATER],
  [VOCATION.GUERRERO]:   [RESOURCE.GAME, RESOURCE.WOOD],
  [VOCATION.SIMPLEZAS]:  [RESOURCE.BERRY, RESOURCE.WOOD, RESOURCE.STONE, RESOURCE.CLAY, RESOURCE.FISH, RESOURCE.COCONUT, RESOURCE.SHELL],
  [VOCATION.AMBICIOSO]:  [RESOURCE.GOLD ?? RESOURCE.STONE, RESOURCE.OBSIDIAN],
  [VOCATION.CIUDADANO]:  [RESOURCE.BERRY, RESOURCE.FISH, RESOURCE.GAME, RESOURCE.WOOD],
};

export interface DestinationContext {
  world: WorldMap; npcs: readonly NPC[]; items?: readonly EquippableItem[];
  structures?: readonly Structure[]; currentTick: number; ticksPerDay: number;
  nextBuildPriority?: CraftableId; buildSitePosition?: { x: number; y: number };
  isBuilder?: boolean; firePosition?: { x: number; y: number };
  isReachable?: (from: Position, to: Position) => boolean; claimedTiles?: ReadonlySet<string>;
  moodModifier?: number; prng: PRNGState; synergies: Synergy[];
  fog?: FogState;
  fogBuffer?: Uint8Array;
  climate?: ClimateState;
  techBonuses?: NonNullable<TechEffect['bonus']>;
}

export interface Position { x: number; y: number; }
export interface DecisionResult { position: Position; next: PRNGState; }

export function decideDestination(npc: NPC, ctx: DestinationContext): DecisionResult {
  // SEGURIDAD: Fallback si el PRNG falta (típico en renderizado de UI)
  let currentPrng = ctx.prng || { seed: 1, cursor: (npc.id.length + ctx.currentTick) };
  const aliveCount = ctx.npcs.filter(n => n.alive).length;
  const traditions = ctx.world.traditions || {};
  const currentRole = computeRole(npc, null);
  const topTradition = Object.entries(traditions).sort((a,b) => b[1] - a[1])[0]?.[0];
  const traditionFriction = (topTradition && currentRole !== topTradition) ? 10 : 0;
  const bystanderChance = Math.min(15, (aliveCount * 0.1) + traditionFriction);
  const { value: roll, next: nextP } = nextInt(currentPrng, 0, 100);
  currentPrng = nextP;
  if (roll < bystanderChance) return { position: npc.position, next: currentPrng };

  const { supervivencia, socializacion, miedo } = npc.stats;
  const id = npc.id;

  // 0. URGENCIA SUPREMA: Miedo
  // El GUERRERO es más valiente (el umbral de huida es mayor para él)
  const fearThreshold = npc.vocation === VOCATION.GUERRERO ? NEED_THRESHOLDS.miedoHigh + 15 : NEED_THRESHOLDS.miedoHigh;
  if (miedo > fearThreshold && ctx.firePosition) {
    return { position: ctx.firePosition, next: currentPrng };
  }

  // 1. URGENCIA: Agua
  if (supervivencia < NEED_THRESHOLDS.supervivenciaCritical) {
    const water = nearestResource(npc.position, ctx.world.resources, rid => rid === RESOURCE.WATER, ctx, undefined, id);
    if (water) return { position: water, next: currentPrng };
  }

  // 2. CONSTRUCCIÓN (Prioridad para los asignados a obra)
  if (ctx.isBuilder && ctx.buildSitePosition) {
    return { position: ctx.buildSitePosition, next: currentPrng };
  }

  // 2.5 URGENCIA CLIMÁTICA: Calor en Invierno
  if (ctx.climate?.season === SEASON.WINTER && supervivencia < 50 && ctx.firePosition) {
    const nearShelter = (ctx.structures || []).some(s => 
      (s.kind === CRAFTABLE.REFUGIO || s.kind === CRAFTABLE.DESPENSA) && 
      manhattan(npc.position.x, npc.position.y, s.position.x, s.position.y) <= 5
    );
    if (!nearShelter && manhattan(npc.position.x, npc.position.y, ctx.firePosition.x, ctx.firePosition.y) > 5) {
      return { position: ctx.firePosition, next: currentPrng };
    }
  }

  // 3. URGENCIA: Comida (si no lleva encima)
  if (supervivencia < NEED_THRESHOLDS.supervivenciaHungry && carriedFood(npc) === 0) {
    // Inteligencia Logística: ¿Hay una Despensa con comida?
    const pantry = (ctx.structures || []).find(s => 
      s.kind === 'despensa' && s.inventory && 
      ((s.inventory.berry || 0) > 0 || (s.inventory.game || 0) > 0 || (s.inventory.fish || 0) > 0)
    );

    if (pantry) {
      return { position: pantry.position, next: currentPrng };
    }

    const food = nearestResource(npc.position, ctx.world.resources, rid => [RESOURCE.BERRY, RESOURCE.GAME, RESOURCE.FISH].includes(rid), ctx, undefined, id);
    if (food) return { position: food, next: currentPrng };
  }

  // 4. URGENCIA: Socialización (Si está muy bajo, busca compañía o la fogata)
  if (socializacion < NEED_THRESHOLDS.socializacionLow) {
    const fireDist = ctx.firePosition ? manhattan(npc.position.x, npc.position.y, ctx.firePosition.x, ctx.firePosition.y) : 999;
    
    // Si ya estamos en el fuego, quedarnos si hay alguien más o esperar un poco
    if (fireDist <= 2) {
       const othersAtFire = ctx.npcs.some(other => other.id !== npc.id && other.alive && manhattan(other.position.x, other.position.y, ctx.firePosition!.x, ctx.firePosition!.y) <= 3);
       if (othersAtFire || (roll % 10) < 3) return { position: npc.position, next: currentPrng };
    }

    // Buscar al NPC más cercano para hablar (dentro de un radio razonable)
    let nearestOther: NPC | null = null;
    let minDist = 100; 
    for (const other of ctx.npcs) {
      if (!other.alive || other.id === npc.id) continue;
      const d = manhattan(npc.position.x, npc.position.y, other.position.x, other.position.y);
      if (d < minDist) {
        minDist = d;
        nearestOther = other;
      }
    }

    if (nearestOther) return { position: nearestOther.position, next: currentPrng };
    if (ctx.firePosition) return { position: ctx.firePosition, next: currentPrng };
  }

  // TRADICIÓN ORAL (NOCHE): Si es noche y el miedo es bajo, escuchar sagas cerca del fuego
  // La supervivencia (agua, refugio, comida) es lo primero, por eso va después.
  const isNight = (ctx.currentTick % ctx.ticksPerDay) > (ctx.ticksPerDay / 2);
  if (isNight && miedo < NEED_THRESHOLDS.miedoHigh && ctx.firePosition) {
    const distToFire = manhattan(npc.position.x, npc.position.y, ctx.firePosition.x, ctx.firePosition.y);
    if (distToFire > 2) {
      return { position: ctx.firePosition, next: currentPrng };
    }
    // Si ya estamos cerca, nos quedamos a escuchar
    return { position: npc.position, next: currentPrng };
  }

  // 3. PRIORIDAD POR VOCACIÓN (Identidad de IA)
  const vocationResources = VOCATION_RESOURCES[npc.vocation] ?? [];
    
  // PESADO DE INTENCIONES: Si necesitamos madera/piedra para construir, 
  // aumentamos su prioridad aunque no sea nuestra vocación principal.
  const neededForBuild = new Set<ResourceId>();
  if (ctx.nextBuildPriority) {
    const recipe = RECIPES[ctx.nextBuildPriority];
    const inv = clanInventoryTotal(ctx.npcs, ctx.structures || []);
    for (const [res, amount] of Object.entries(recipe.inputs)) {
      if (inv[res as keyof NPCInventory] < (amount as number)) {
        neededForBuild.add(res as ResourceId);
      }
    }
  }

  if (supervivencia >= 50 || (carriedFood(npc) > 0 && neededForBuild.size > 0)) {
    // Los SABIOS y AMBICIOSOS priorizan monumentos aunque no sean el constructor principal
    if ((npc.vocation === VOCATION.SABIO || npc.vocation === VOCATION.AMBICIOSO) && ctx.buildSitePosition) {
       return { position: ctx.buildSitePosition, next: currentPrng };
    }

    if (vocationResources.length > 0 || neededForBuild.size > 0) {
      const vocationTarget = nearestResource(
        npc.position, 
        ctx.world.resources, 
        rid => vocationResources.includes(rid) || (neededForBuild.has(rid) && npc.vocation === VOCATION.SIMPLEZAS), 
        ctx,
        rid => neededForBuild.has(rid) ? 15 : 0, // Bonus de peso (15 casillas de distancia)
        id
      );
      if (vocationTarget) return { position: vocationTarget, next: currentPrng };
    }
  }

  // 5. EXPLORACIÓN Y LOGÍSTICA DE REPARTO
  if (supervivencia > 60) {
    // LOGÍSTICA ACTIVA: Si soy 'Simplezas' y llevo comida, busco a alguien que la necesite
    if (npc.vocation === VOCATION.SIMPLEZAS && carriedFood(npc) > 0) {
      const needySpecialist = ctx.npcs.find(other => 
        other.alive && other.id !== npc.id &&
        (other.vocation === VOCATION.SABIO || other.vocation === VOCATION.GUERRERO) &&
        other.stats.supervivencia < 60 &&
        manhattan(other.position.x, other.position.y, npc.position.x, npc.position.y) < 15
      );
      if (needySpecialist) {
        return { position: needySpecialist.position, next: currentPrng };
      }
    }

    // EXPLORACIÓN NATURAL: Si no tenemos nada urgente que hacer, exploramos el mundo
    const isSatisfied = socializacion > 50 && supervivencia > 70;
    const explorationChance = npc.vocation === VOCATION.GUERRERO ? 100 : (isSatisfied ? 60 : 25);

    if (roll < explorationChance) {
      const angle = ((roll * 7) % 100 / 100) * Math.PI * 2;
      const dist = npc.vocation === VOCATION.GUERRERO ? 15 : 10;
      const target = { 
        x: Math.max(0, Math.min(ctx.world.width - 1, Math.round(npc.position.x + Math.cos(angle) * dist))),
        y: Math.max(0, Math.min(ctx.world.height - 1, Math.round(npc.position.y + Math.sin(angle) * dist)))
      };
      if (!ctx.isReachable || ctx.isReachable(npc.position, target)) {
        return { position: target, next: currentPrng };
      }
    }
  }

  return { position: npc.position, next: currentPrng };
}

function consumeInventoryFood(npc: NPC, foodNutritionBonus?: number): { npc: NPC; nutrition: number; kind: 'berry' | 'fish' | 'game' | null } {
  const inv = { ...npc.inventory };
  let kind: 'berry' | 'fish' | 'game' | null = null;
  if (inv.berry > 0) { inv.berry--; kind = 'berry'; }
  else if (inv.fish > 0) { inv.fish--; kind = 'fish'; }
  else if (inv.game > 0) { inv.game--; kind = 'game'; }
  else return { npc, nutrition: 0, kind: null };
  const baseNutrition = FOOD_NUTRITION[kind];
  const nutrition = foodNutritionBonus ? Math.round(baseNutrition * (1 + foodNutritionBonus)) : baseNutrition;
  return { npc: { ...npc, inventory: inv }, nutrition, kind };
}

function findFoodDonorIndex(hungry: NPC, npcs: readonly NPC[], communal: boolean): number {
  let best = -1;
  for (let i = 0; i < npcs.length; i++) {
    const donor = npcs[i];
    if (!donor.alive || donor.id === hungry.id || carriedFood(donor) === 0) continue;
    if (!communal && (Math.abs(hungry.position.x - donor.position.x) + Math.abs(hungry.position.y - donor.position.y)) > NEED_TICK_RATES.socialRadius) continue;
    if (best === -1 || carriedFood(donor) > carriedFood(npcs[best])) best = i;
  }
  return best;
}

export function tickNeeds(npcs: readonly NPC[], ctx: DestinationContext): NPC[] {
  const out = npcs.map(n => ({ ...n, inventory: { ...n.inventory }, stats: { ...n.stats } }));
  const mood = ctx.moodModifier || 0;
  const foodNutritionBonus = ctx.techBonuses?.food_nutrition;
  const decayReductionBonus = ctx.techBonuses?.decay_reduction;

  for (let i = 0; i < out.length; i++) {
    const n = out[i]; if (!n.alive) continue;
    let npc = n;
    let { supervivencia: sv, socializacion: so, proposito: pr } = n.stats;

    // 1. Metabolismo y Alimentación
    let survivalDecay = NEED_TICK_RATES.supervivenciaDecay;

    // Aplicar reducción de decaimiento por rasgos culturales
    if (decayReductionBonus) {
      survivalDecay *= (1 - decayReductionBonus);
    }

    // VERANO: Aumento de sed (decaimiento de supervivencia)
    if (ctx.climate?.season === SEASON.SUMMER) {
      survivalDecay *= 2.0;
    }

    if (sv < NEED_THRESHOLDS.supervivenciaEatFromInventory && carriedFood(npc) > 0) {
      const meal = consumeInventoryFood(npc, foodNutritionBonus);
      npc = meal.npc;
      sv += ctx.firePosition ? Math.round(meal.nutrition * COOKED_FOOD_MULTIPLIER) : meal.nutrition;
      if (ctx.firePosition) so += COOKED_FOOD_SOCIAL_BONUS;
    } else if (sv < NEED_THRESHOLDS.supervivenciaHungry) {
      const donorIdx = findFoodDonorIndex(npc, out, !!ctx.firePosition);
      if (donorIdx !== -1) {
        const meal = consumeInventoryFood(out[donorIdx], foodNutritionBonus);
        out[donorIdx] = meal.npc;
        sv += ctx.firePosition ? Math.round(meal.nutrition * COOKED_FOOD_MULTIPLIER) : meal.nutrition;
      } else {
        sv -= survivalDecay;
      }
    } else {
      sv -= survivalDecay;
    }

    // INVIERNO: Daño por frío si no hay fuego o refugio cerca
    if (ctx.climate?.season === SEASON.WINTER) {
      const distToFire = ctx.firePosition ? manhattan(npc.position.x, npc.position.y, ctx.firePosition.x, ctx.firePosition.y) : 99;
      const nearShelter = (ctx.structures || []).some(s => 
        (s.kind === CRAFTABLE.REFUGIO || s.kind === CRAFTABLE.DESPENSA) && 
        manhattan(npc.position.x, npc.position.y, s.position.x, s.position.y) <= 2
      );
      
      if (distToFire > 5 && !nearShelter) {
        sv -= 0.15; // Daño constante por congelación (ajustado de 0.25)
      }
    }

    // 2. Agua (Recuperación pasiva)
    if (recoveryResourceAtPosition(npc.position, ctx.world) === RESOURCE.WATER) sv = Math.min(100, sv + 5);

    // 3. Socialización
    const companions = out.filter(other => other.id !== npc.id && other.alive && manhattan(npc.position.x, npc.position.y, other.position.x, other.position.y) <= NEED_TICK_RATES.socialRadius);
    const near = companions.length;
    so = so + (near > 0 ? NEED_TICK_RATES.socializacionNear : -NEED_TICK_RATES.socializacionAlone);
    
    // Feed-forward: NPCs hambrientos drenan socialización de los que están cerca
    const hungryNear = companions.filter(other => other.stats.supervivencia < 30).length;
    so -= hungryNear * NEED_TICK_RATES.feedForwardHunger;
    
    so = Math.max(0, Math.min(100, so));

    // 4. Miedo (Fear)
    let fear = n.stats.miedo;
    const distToFire = ctx.firePosition ? manhattan(npc.position.x, npc.position.y, ctx.firePosition.x, ctx.firePosition.y) : 50;
    
    if (distToFire > 12) {
      fear += 0.15; // Lejos del calor del hogar
    } else {
      fear -= 0.4;  // Cerca del fuego hay seguridad
    }
    
    if (near > 2) fear -= 0.1; // La multitud da valor
    
    // 5. Propósito y Ambición
    // El propósito sube con el buen humor del clan (Eurekas, Nacimientos, Milagros)
    // Pero decae por inactividad o aburrimiento.
    const activityBonus = (near > 0 ? 0.05 : -0.1); // Estar solo aburre
    pr = Math.max(0, Math.min(100, pr + (mood / 100) + activityBonus));

    out[i] = {
      ...npc,
      stats: {
        supervivencia: Math.max(0, Math.min(100, sv)),
        socializacion: Math.max(0, Math.min(100, so)),
        proposito: Math.max(0, Math.min(100, pr)),
        miedo: Math.max(0, Math.min(100, fear))
      }
    };
    if (out[i].stats.supervivencia <= 0) out[i].alive = false;
  }
  return out;
}
