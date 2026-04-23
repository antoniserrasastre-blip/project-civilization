/**
 * Cultura material — herramientas y reliquias equipables.
 *
 * Separado de `Structure`: una estructura cambia el mapa; un item
 * cambia a una persona. Todo es JSON-roundtrip y determinista.
 */

import { CASTA, type NPC } from './npcs';

export const ITEM_KIND = {
  SPEAR: 'spear',
  HAND_AXE: 'hand_axe',
  BONE_NEEDLE: 'bone_needle',
  RELIC_CHARM: 'relic_charm',
  BASKET: 'basket',
} as const;

export type ItemKind = (typeof ITEM_KIND)[keyof typeof ITEM_KIND];
export type ItemSlot = 'hand' | 'relic';

export interface ItemDef {
  kind: ItemKind;
  label: string;
  slot: ItemSlot;
  complex: boolean;
  maxDurability: number;
  skillAffinity: 'hunting' | 'gathering' | 'crafting' | 'fishing' | 'healing';
}

export interface EquippableItem {
  id: string;
  kind: ItemKind;
  ownerNpcId: string | null;
  durability: number;
  maxDurability: number;
  prestige: number;
  createdAtTick: number;
}

export const ITEM_DEFS: Record<ItemKind, ItemDef> = {
  [ITEM_KIND.BASKET]: {
    kind: ITEM_KIND.BASKET,
    label: 'Cesta',
    slot: 'hand',
    complex: false,
    maxDurability: 40,
    skillAffinity: 'gathering',
  },
  [ITEM_KIND.SPEAR]: {
    kind: ITEM_KIND.SPEAR,
    label: 'Lanza',
    slot: 'hand',
    complex: true,
    maxDurability: 80,
    skillAffinity: 'hunting',
  },
  [ITEM_KIND.HAND_AXE]: {
    kind: ITEM_KIND.HAND_AXE,
    label: 'Hacha de sílex',
    slot: 'hand',
    complex: true,
    maxDurability: 70,
    skillAffinity: 'gathering',
  },
  [ITEM_KIND.BONE_NEEDLE]: {
    kind: ITEM_KIND.BONE_NEEDLE,
    label: 'Aguja de hueso',
    slot: 'hand',
    complex: true,
    maxDurability: 50,
    skillAffinity: 'crafting',
  },
  [ITEM_KIND.RELIC_CHARM]: {
    kind: ITEM_KIND.RELIC_CHARM,
    label: 'Reliquia votiva',
    slot: 'relic',
    complex: true,
    maxDurability: 100,
    skillAffinity: 'healing',
  },
};

export function createItem(
  kind: ItemKind,
  ownerNpcId: string | null,
  tick: number,
  suffix = 0,
): EquippableItem {
  const def = ITEM_DEFS[kind];
  return {
    id: `item-${kind}-${tick}-${suffix}`,
    kind,
    ownerNpcId,
    durability: def.maxDurability,
    maxDurability: def.maxDurability,
    prestige: 0,
    createdAtTick: tick,
  };
}

export function canEquipItem(npc: NPC, item: EquippableItem): boolean {
  const def = ITEM_DEFS[item.kind];
  if (!npc.alive) return false;
  if (def.slot === 'relic') return npc.casta === CASTA.ELEGIDO;
  if (npc.casta === CASTA.ESCLAVO && def.complex) return false;
  return true;
}

export function itemLabel(item: EquippableItem | null | undefined): string {
  if (!item) return 'sin herramienta';
  return ITEM_DEFS[item.kind].label;
}

export function itemForNpc(
  npc: NPC,
  items: readonly EquippableItem[],
): EquippableItem | null {
  if (!npc.equippedItemId) return null;
  return items.find((item) => item.id === npc.equippedItemId) ?? null;
}
