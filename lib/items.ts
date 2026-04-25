/**
 * Cultura material — herramientas y reliquias (Sistema de Artefactos Estilo DF).
 */

import { CASTA, type NPC } from './npcs';

export const ITEM_KIND = {
  SPEAR: 'spear', HAND_AXE: 'hand_axe', BONE_NEEDLE: 'bone_needle', RELIC_CHARM: 'relic_charm', BASKET: 'basket',
} as const;

export type ItemKind = (typeof ITEM_KIND)[keyof typeof ITEM_KIND];
export type ItemRank = 'common' | 'fine' | 'masterwork' | 'artifact';
export type ItemMaterial = 'stone' | 'obsidian' | 'bone' | 'wood';

export interface ItemHistoryEntry {
  tick: number;
  event: string; 
}

export interface EquippableItem {
  id: string;
  kind: ItemKind;
  material: ItemMaterial;
  name: string;        
  ownerNpcId: string | null;
  makerId: string | null;
  durability: number;
  maxDurability: number;
  createdAtTick: number;
  xp: number;
  level: number;
  rank: ItemRank;
  trait?: 'lightweight' | 'serrated' | 'blessed' | 'sturdy';
  deeds: string[];
  history: ItemHistoryEntry[]; 
}

export type ItemSlot = 'hand' | 'relic';

export interface ItemDef {
  kind: ItemKind;
  label: string;
  slot: ItemSlot;
  complex: boolean;
  maxDurability: number;
  skillAffinity: 'hunting' | 'gathering' | 'crafting' | 'fishing' | 'healing';
}

export const ITEM_DEFS: Record<ItemKind, ItemDef> = {
  [ITEM_KIND.BASKET]: { kind: ITEM_KIND.BASKET, label: 'Cesta', slot: 'hand', complex: false, maxDurability: 40, skillAffinity: 'gathering' },
  [ITEM_KIND.SPEAR]: { kind: ITEM_KIND.SPEAR, label: 'Lanza', slot: 'hand', complex: true, maxDurability: 80, skillAffinity: 'hunting' },
  [ITEM_KIND.HAND_AXE]: { kind: ITEM_KIND.HAND_AXE, label: 'Hacha de sílex', slot: 'hand', complex: true, maxDurability: 70, skillAffinity: 'gathering' },
  [ITEM_KIND.BONE_NEEDLE]: { kind: ITEM_KIND.BONE_NEEDLE, label: 'Aguja de hueso', slot: 'hand', complex: true, maxDurability: 50, skillAffinity: 'crafting' },
  [ITEM_KIND.RELIC_CHARM]: { kind: ITEM_KIND.RELIC_CHARM, label: 'Reliquia votiva', slot: 'relic', complex: true, maxDurability: 100, skillAffinity: 'healing' },
};

const MATERIAL_STATS: Record<ItemMaterial, { durMult: number, levelCap: number }> = {
  wood: { durMult: 0.5, levelCap: 5 },
  stone: { durMult: 1.0, levelCap: 10 },
  bone: { durMult: 1.2, levelCap: 15 },
  obsidian: { durMult: 0.8, levelCap: 25 }, 
};

function generateEpicName(kind: string, material: string, ownerName: string): string {
  const prefixes = ['El Susurro', 'La Garra', 'El Colmillo', 'La Senda', 'El Juicio', 'La Promesa'];
  const suffixes = ['del Glaciar', 'de la Selva', 'de Tramuntana', 'del Olvido', 'de los Ancestros', 'del Viento'];
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const s = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${p} ${s} (${ownerName})`;
}

export function calculateItemEfficiency(item: EquippableItem): number {
  const rankMult = { common: 1, fine: 1.5, masterwork: 2.2, artifact: 4.0 }[item.rank];
  const traitMult = item.trait === 'serrated' ? 1.2 : 1.0;
  return rankMult * traitMult + (item.level * 0.05);
}

export function createItem(kind: ItemKind, material: ItemMaterial, owner: NPC | null, tick: number): EquippableItem {
  const id = `art-${kind}-${tick}-${Math.floor(Math.random() * 1000)}`;
  const mStats = MATERIAL_STATS[material];
  return {
    id, kind, material,
    name: ITEM_DEFS[kind].label,
    ownerNpcId: owner?.id || null,
    makerId: owner?.id || null,
    durability: 100 * mStats.durMult,
    maxDurability: 100 * mStats.durMult,
    createdAtTick: tick,
    xp: 0, level: 1, rank: 'common',
    deeds: [],
    history: [{ tick, event: `Forjado en ${material}${owner ? ` por ${owner.name}` : ''}` }],
  };
}

export function evolveItem(item: EquippableItem, npc: NPC, tick: number): EquippableItem {
  const next = { ...item };
  const mStats = MATERIAL_STATS[item.material];
  next.xp += 1;
  if (next.xp >= 20 && next.level < mStats.levelCap) {
    next.level++;
    next.xp = 0;
    next.durability = next.maxDurability;
    if (next.level === 5 && next.rank === 'common') {
      next.rank = 'fine';
      next.history.push({ tick, event: `Alcanzó calidad Superior en manos de ${npc.name}` });
    } else if (next.level === 10 && next.rank === 'fine') {
      next.rank = 'masterwork';
      next.name = generateEpicName(item.kind, item.material, npc.name);
      next.trait = 'serrated';
      next.history.push({ tick, event: `Convertido en Obra Maestra: ${next.name}` });
      next.deeds.push(`Se convirtió en la leyenda "${next.name}"`);
    } else if (next.level === 20) {
      next.rank = 'artifact';
      next.history.push({ tick, event: `Ascendido a Artefacto Legendario` });
      next.deeds.push(`Ascendió al plano de los Artefactos Eternos`);
    }
  }
  return next;
}

/** Registra una hazaña específica en el historial y lista de logros del objeto. */
export function recordItemDeed(item: EquippableItem, deed: string, tick: number): EquippableItem {
  return {
    ...item,
    deeds: [...item.deeds, deed],
    history: [...item.history, { tick, event: `HAZAÑA: ${deed}` }]
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
  if (!item) return 'Manos desnudas';
  const rankIcons = { common: '🛠️', fine: '✨', masterwork: '⭐', artifact: '🔥' };
  return `${rankIcons[item.rank]} ${item.name} [Lvl ${item.level}]`;
}

export function itemForNpc(npc: NPC, items: readonly EquippableItem[]): EquippableItem | null {
  if (!npc.equippedItemId) return null;
  return items.find((item) => item.id === npc.equippedItemId) ?? null;
}
