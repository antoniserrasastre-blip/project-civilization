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
import { type PRNGState, seedState } from './prng';

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

import type { Structure } from './structures';

/** Suma del inventario del clan — reutiliza la de crafting.ts. */
export { clanInventoryTotal };

/** Comprueba si el clan tiene recursos para craftear el item. */
export function canCraftItem(
  kind: ItemKind,
  npcs: readonly NPC[],
  structures: readonly Structure[] = [],
): boolean {
  const recipe = ITEM_RECIPES[kind];
  const inv = clanInventoryTotal(npcs, structures);
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
 * `maker` es el NPC que forja el objeto (influirá en la calidad).
 */
export function craftItem(
  kind: ItemKind,
  npcs: readonly NPC[],
  tick: number,
  maker: NPC | null,
  structures: readonly Structure[] = [],
  prng?: PRNGState,
): { item: EquippableItem; npcs: NPC[]; structures: Structure[]; next: PRNGState } {
  const recipe = ITEM_RECIPES[kind];

  // Determinar material principal basado en los inputs
  let material: any = 'stone';
  if (recipe.inputs.obsidian) material = 'obsidian';
  else if (recipe.inputs.shell) material = 'wood'; // Concha se asocia a madera/cesta
  else if (kind === ITEM_KIND.BONE_NEEDLE) material = 'bone';
  else if (recipe.inputs.wood && !recipe.inputs.stone) material = 'wood';

  // Reutilizamos consumeForRecipe de crafting pero con la firma
  // adaptada para ItemRecipe.
  const buildRecipeLike = {
    id: kind as string,
    inputs: recipe.inputs,
    daysWork: recipe.daysWork,
    minSkill: 0,
  };
  const { npcs: updatedNpcs, structures: updatedStructures } = consumeForBuildRecipe(
    npcs,
    buildRecipeLike as Parameters<typeof consumeForBuildRecipe>[1],
    structures,
  );

  const currentPrng = prng ?? seedState(tick);
  const { item, next } = createItem(kind, material, maker, tick, currentPrng);
  return { item, npcs: updatedNpcs, structures: updatedStructures, next };
}
