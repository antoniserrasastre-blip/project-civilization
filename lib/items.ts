/**
 * Cultura material — herramientas y reliquias equipables (Artefactos).
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
export type ItemRank = 'communal' | 'proven' | 'heroic' | 'legendary';

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
  name: string;        // Nombre único (ej: "Colmillo de Tramuntana")
  ownerNpcId: string | null;
  durability: number;
  maxDurability: number;
  prestige: number;
  createdAtTick: number;
  // Evolución (Fase 3.5)
  xp: number;
  level: number;
  rank: ItemRank;
  trait?: string;      // Rasgo único (ej: "sangrienta", "ligera")
}

export const ITEM_DEFS: Record<ItemKind, ItemDef> = {
  [ITEM_KIND.BASKET]: { kind: ITEM_KIND.BASKET, label: 'Cesta', slot: 'hand', complex: false, maxDurability: 40, skillAffinity: 'gathering' },
  [ITEM_KIND.SPEAR]: { kind: ITEM_KIND.SPEAR, label: 'Lanza', slot: 'hand', complex: true, maxDurability: 80, skillAffinity: 'hunting' },
  [ITEM_KIND.HAND_AXE]: { kind: ITEM_KIND.HAND_AXE, label: 'Hacha de sílex', slot: 'hand', complex: true, maxDurability: 70, skillAffinity: 'gathering' },
  [ITEM_KIND.BONE_NEEDLE]: { kind: ITEM_KIND.BONE_NEEDLE, label: 'Aguja de hueso', slot: 'hand', complex: true, maxDurability: 50, skillAffinity: 'crafting' },
  [ITEM_KIND.RELIC_CHARM]: { kind: ITEM_KIND.RELIC_CHARM, label: 'Reliquia votiva', slot: 'relic', complex: true, maxDurability: 100, skillAffinity: 'healing' },
};

/** Calcula el multiplicador de eficiencia de un artefacto basado en su rango y nivel. */
export function calculateItemEfficiency(item: EquippableItem): number {
  const rankMult = { communal: 1, proven: 1.2, heroic: 1.5, legendary: 2.5 }[item.rank];
  return rankMult + (item.level * 0.1); // +10% por nivel
}

export function createItem(kind: ItemKind, ownerNpcId: string | null, tick: number, suffix = 0): EquippableItem {
  const def = ITEM_DEFS[kind];
  return {
    id: `item-${kind}-${tick}-${suffix}`,
    kind,
    name: def.label, // Por defecto el label, el sistema de nombres legendarios vendrá después
    ownerNpcId,
    durability: def.maxDurability,
    maxDurability: def.maxDurability,
    prestige: ownerNpcId ? 10 : 0,
    createdAtTick: tick,
    xp: 0,
    level: 1,
    rank: 'communal',
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
  const rankEmoji = { communal: '', proven: '★', heroic: '💎', legendary: '⚔️' }[item.rank];
  return `${rankEmoji} ${item.name} (Lvl ${item.level})`;
}

export function itemForNpc(npc: NPC, items: readonly EquippableItem[]): EquippableItem | null {
  if (!npc.equippedItemId) return null;
  return items.find((item) => item.id === npc.equippedItemId) ?? null;
}
