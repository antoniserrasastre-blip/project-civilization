/**
 * Recetas de herramientas equipables — Sprint 9 CULTURA-MATERIAL.
 *
 * Separado de `lib/crafting.ts` (edificios/estructuras). Una receta
 * de item produce un `EquippableItem` que se asigna a un NPC; no una
 * `Structure` en el mapa. §A4: puro, determinista.
 */

import type { NPC, NPCInventory } from './npcs';
import { ITEM_KIND, type ItemKind, createItem, type EquippableItem } from './items';
import { clanInventoryTotal, consumeForRecipe as consumeForBuildRecipe } from './crafting';

export interface ItemRecipe {
  kind: ItemKind;
  inputs: Partial<Record<keyof NPCInventory, number>>;
  /** Días-hombre para construir la herramienta. */
  daysWork: number;
  /** Si es true, la receta está bloqueada hasta un evento Eureka
   *  (primera herida → Lanza; exceso de inventario → Cesta). */
  requiresUnlock: boolean;
}

/** Recetas de herramientas. Costes calibrados para primigenia.
 *  Lanza requiere obsidiana (montaña); Cesta requiere concha (costa).
 *  Ambas necesitan evento Eureka previo para desbloquearse. */
export const ITEM_RECIPES: Record<ItemKind, ItemRecipe> = {
  [ITEM_KIND.BASKET]: {
    kind: ITEM_KIND.BASKET,
    inputs: { wood: 2, shell: 1 },
    daysWork: 1,
    requiresUnlock: true,
  },
  [ITEM_KIND.SPEAR]: {
    kind: ITEM_KIND.SPEAR,
    inputs: { wood: 2, obsidian: 1 },
    daysWork: 2,
    requiresUnlock: true,
  },
  [ITEM_KIND.HAND_AXE]: {
    kind: ITEM_KIND.HAND_AXE,
    inputs: { stone: 3 },
    daysWork: 1,
    requiresUnlock: false,
  },
  [ITEM_KIND.BONE_NEEDLE]: {
    kind: ITEM_KIND.BONE_NEEDLE,
    inputs: { game: 1, stone: 1 },
    daysWork: 1,
    requiresUnlock: false,
  },
  [ITEM_KIND.RELIC_CHARM]: {
    kind: ITEM_KIND.RELIC_CHARM,
    inputs: { stone: 5, game: 3, wood: 2 },
    daysWork: 4,
    requiresUnlock: false,
  },
};

/** Suma del inventario del clan — reutiliza la de crafting.ts. */
export { clanInventoryTotal };

/** Comprueba si el clan tiene recursos para craftear el item. */
export function canCraftItem(kind: ItemKind, npcs: readonly NPC[]): boolean {
  const recipe = ITEM_RECIPES[kind];
  const inv = clanInventoryTotal(npcs);
  for (const [k, needed] of Object.entries(recipe.inputs) as Array<
    [keyof NPCInventory, number]
  >) {
    if (inv[k] < needed) return false;
  }
  return true;
}

/**
 * Craftea una herramienta: consume recursos del clan y devuelve el
 * nuevo item + NPCs actualizados. Determinista: id del item = tipo + tick.
 * `ownerNpcId` es el NPC al que se asignará (null = sin asignar aún).
 */
export function craftItem(
  kind: ItemKind,
  npcs: readonly NPC[],
  tick: number,
  ownerNpcId: string | null,
  suffix = 0,
): { item: EquippableItem; npcs: NPC[] } {
  const recipe = ITEM_RECIPES[kind];
  // Reutilizamos consumeForRecipe de crafting pero con la firma
  // adaptada para ItemRecipe.
  const buildRecipeLike = {
    id: kind as string,
    inputs: recipe.inputs,
    daysWork: recipe.daysWork,
    minSkill: 0,
  };
  const updatedNpcs = consumeForBuildRecipe(npcs, buildRecipeLike as Parameters<typeof consumeForBuildRecipe>[1]);
  const item = createItem(kind, ownerNpcId, tick, suffix);
  return { item, npcs: updatedNpcs };
}
