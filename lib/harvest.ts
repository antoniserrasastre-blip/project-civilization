/**
 * Lógica de recolección y bonos de crafteo.
 */

import type { NPC } from './npcs';
import {
  RESOURCE,
  type ResourceId,
  type ResourceSpawn,
  type ClimateState,
} from './world-state';
import type { Structure } from './structures';
import type { EquippableItem } from './items';
import { ITEM_DEFS, calculateItemEfficiency, evolveItem, recordItemDeed } from './items';
import { SEASON } from './climate';
import { nextInt, type PRNGState } from './prng';
import type { TechEffect } from './technologies';

export const INVENTORY_CAP_PER_TYPE = 20;
const DESPENSA_BONUS_RADIUS = 3;
const DESPENSA_INVENTORY_BONUS = 30;

export interface HarvestTickResult {
  npcs: NPC[];
  resources: ResourceSpawn[];
  reserves: number[];
  items: EquippableItem[]; // Añadido para evolución
  prng: PRNGState;
}

function inventoryKeyFor(id: ResourceId): keyof NPC['inventory'] | null {
  if (id === RESOURCE.WOOD) return 'wood';
  if (id === RESOURCE.STONE) return 'stone';
  if (id === RESOURCE.BERRY) return 'berry';
  if (id === RESOURCE.GAME) return 'game';
  if (id === RESOURCE.FISH) return 'fish';
  if (id === RESOURCE.OBSIDIAN) return 'obsidian';
  if (id === RESOURCE.SHELL) return 'shell';
  if (id === RESOURCE.CLAY) return 'clay';
  if (id === RESOURCE.COCONUT) return 'coconut';
  if (id === RESOURCE.FLINT) return 'flint';
  if (id === RESOURCE.MUSHROOM) return 'mushroom';
  return null;
}

export function effectiveInventoryCap(npc: NPC, structures: readonly Structure[], items: readonly EquippableItem[]): number {
  let cap = INVENTORY_CAP_PER_TYPE;
  const equipped = npc.equippedItemId ? items.find(i => i.id === npc.equippedItemId) : null;
  if (equipped && equipped.kind === 'basket') cap += 20 * calculateItemEfficiency(equipped);
  
  const hasDespensaNear = structures.some(s => s.kind === 'despensa' && Math.abs(s.position.x - npc.position.x) <= 3 && Math.abs(s.position.y - npc.position.y) <= 3);
  return hasDespensaNear ? cap + DESPENSA_INVENTORY_BONUS : cap;
}

export function tickHarvests(
  npcsIn: readonly NPC[],
  resourcesIn: readonly ResourceSpawn[],
  currentTick: number,
  reservesIn: readonly number[],
  worldWidth: number,
  structures: readonly Structure[] = [],
  itemsIn: readonly EquippableItem[] = [],
  climate?: ClimateState,
  prngIn?: PRNGState,
  techBonuses?: NonNullable<TechEffect['bonus']>,
): HarvestTickResult {
  const npcs = npcsIn.map(n => ({ ...n, inventory: { ...n.inventory } }));
  const resources = resourcesIn.map(r => ({ ...r }));
  const reserves = [...reservesIn];
  const items = itemsIn.map(i => ({ ...i }));
  let currentPrng: PRNGState = prngIn ?? { seed: 1, cursor: currentTick };

  const npcOrder = [...npcs].sort((a, b) => (a.id < b.id ? -1 : 1));

  for (const npc of npcOrder) {
    if (!npc.alive) continue;
    const invCap = effectiveInventoryCap(npc, structures, items);

    for (const r of resources) {
      if (r.x !== npc.position.x || r.y !== npc.position.y || r.quantity <= 0) continue;

      const key = inventoryKeyFor(r.id);
      if (!key || npc.inventory[key] >= invCap) continue;

      // RECOLECCIÓN
      const idx = r.y * worldWidth + r.x;
      let harvestBase = 2;

      // Impacto de las Estaciones en las Bayas
      if (r.id === RESOURCE.BERRY && climate) {
        if (climate.season === SEASON.SUMMER) harvestBase = 4;
        else if (climate.season === SEASON.WINTER) harvestBase = 0;
      }

      let amountToHarvest = Math.min(r.quantity, harvestBase, reserves[idx]);
      if (amountToHarvest <= 0) continue;

      // Aplicar bonos culturales de tecnología
      if (techBonuses) {
        let mult = 1;
        if (techBonuses.gathering_speed) mult *= (1 + techBonuses.gathering_speed);
        if (r.id === RESOURCE.FISH && techBonuses.fish_yield) mult *= (1 + techBonuses.fish_yield);
        if (r.id === RESOURCE.GAME && techBonuses.hunt_yield) mult *= (1 + techBonuses.hunt_yield);
        // Round to integer, minimum 1 if base was > 0
        amountToHarvest = Math.max(1, Math.round(amountToHarvest * mult));
        // Cannot exceed what's available
        amountToHarvest = Math.min(amountToHarvest, r.quantity, reserves[idx]);
      }

      npc.inventory[key] += amountToHarvest;
      r.quantity -= amountToHarvest;
      reserves[idx] -= amountToHarvest;

      // APRENDIZAJE DEL NPC (MAESTRÍA)
      const skillToGain = r.id === RESOURCE.GAME ? 'hunting' :
                         r.id === RESOURCE.FISH ? 'fishing' : 'gathering';

      // La Destreza (ADN) potencia el aprendizaje
      let learningMult = 1 + (npc.attributes.dexterity / 100) * 0.5;

      // Bonus por Vocación de Alma
      if (npc.vocation === 'guerrero' && skillToGain === 'hunting') learningMult += 0.5;
      if (npc.vocation === 'simplezas' && (skillToGain === 'gathering' || skillToGain === 'fishing')) learningMult += 0.5;

      const xpGain = 0.05 * learningMult;
      npc.skills[skillToGain] = Math.min(100, npc.skills[skillToGain] + xpGain);

      // EVOLUCIÓN DE ARTEFACTO (XP por uso)
      if (npc.equippedItemId) {
        const itemIdx = items.findIndex(i => i.id === npc.equippedItemId);
        if (itemIdx !== -1) {
          let item = items[itemIdx];
          const def = ITEM_DEFS[item.kind];
          // Solo evoluciona si la herramienta es afín a la tarea
          if (def.skillAffinity === skillToGain) {
            const { item: evolvedItem, next: prng2 } = evolveItem(item, npc, currentTick, currentPrng);
            currentPrng = prng2;
            item = evolvedItem;

            // REGISTRO DE HAZAÑAS: Probabilidad de evento épico al cazar (5% determinista)
            if (skillToGain === 'hunting') {
              const { value: deedRoll, next: prng3 } = nextInt(currentPrng, 0, 100);
              currentPrng = prng3;
              if (deedRoll < 5) {
                item = recordItemDeed(item, `Abatió a una gran presa en solitario`, currentTick);
              }
            }
            items[itemIdx] = item;
          }
        }
      }
    }
  }

  return { npcs, resources, reserves, items, prng: currentPrng };
}
