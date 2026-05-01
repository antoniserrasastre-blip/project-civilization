/**
 * Cultura material — herramientas y reliquias (Sistema de Artefactos Estilo DF).
 */

import { CASTA, type NPC } from './npcs';
import { nextInt, type PRNGState } from './prng';

export const ITEM_KIND = {
  SPEAR: 'spear',
  HAND_AXE: 'hand_axe',
  BONE_NEEDLE: 'bone_needle',
  RELIC_CHARM: 'relic_charm',
  BASKET: 'basket',
  CANOE: 'canoe',
  BOW: 'bow',      // Nuevo: Arco para caza a distancia
  SLING: 'sling',    // Nuevo: Honda (piedra)
  CLUB: 'club',     // Nuevo: Garrote (madera pesada)
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
  [ITEM_KIND.CANOE]: { kind: ITEM_KIND.CANOE, label: 'Piragua', slot: 'hand', complex: true, maxDurability: 120, skillAffinity: 'fishing' },
  [ITEM_KIND.BOW]: { kind: ITEM_KIND.BOW, label: 'Arco', slot: 'hand', complex: true, maxDurability: 100, skillAffinity: 'hunting' },
  [ITEM_KIND.SLING]: { kind: ITEM_KIND.SLING, label: 'Honda', slot: 'hand', complex: false, maxDurability: 60, skillAffinity: 'hunting' },
  [ITEM_KIND.CLUB]: { kind: ITEM_KIND.CLUB, label: 'Garrote', slot: 'hand', complex: false, maxDurability: 90, skillAffinity: 'hunting' },
};

const MATERIAL_STATS: Record<ItemMaterial, { durMult: number, levelCap: number }> = {
  wood: { durMult: 0.5, levelCap: 5 },
  stone: { durMult: 1.0, levelCap: 10 },
  bone: { durMult: 1.2, levelCap: 15 },
  obsidian: { durMult: 0.8, levelCap: 25 }, 
};

function generateEpicName(kind: string, material: string, ownerName: string, prng: PRNGState): { name: string; next: PRNGState } {
  const prefixes = ['El Susurro', 'La Garra', 'El Colmillo', 'La Senda', 'El Juicio', 'La Promesa'];
  const suffixes = ['del Glaciar', 'de la Selva', 'de Tramuntana', 'del Olvido', 'de los Ancestros', 'del Viento'];
  const { value: pi, next: prng2 } = nextInt(prng, 0, prefixes.length);
  const { value: si, next: prng3 } = nextInt(prng2, 0, suffixes.length);
  return { name: `${prefixes[pi]} ${suffixes[si]} (${ownerName})`, next: prng3 };
}

export function calculateItemEfficiency(item: EquippableItem): number {
  const rankMult = { common: 1, fine: 1.5, masterwork: 2.2, artifact: 4.0 }[item.rank];
  const traitMult = item.trait === 'serrated' ? 1.2 : 1.0;
  return rankMult * traitMult + (item.level * 0.05);
}

export function createItem(kind: ItemKind, material: ItemMaterial, owner: NPC | null, tick: number, prng: PRNGState): { item: EquippableItem; next: PRNGState } {
  const { value: rand, next: prng2 } = nextInt(prng, 0, 1000);
  const id = `art-${kind}-${tick}-${rand}`;
  const mStats = MATERIAL_STATS[material];
  const item: EquippableItem = {
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
  return { item, next: prng2 };
}

export function evolveItem(item: EquippableItem, npc: NPC, tick: number, prng: PRNGState): { item: EquippableItem; next: PRNGState } {
  const next = { ...item };
  const mStats = MATERIAL_STATS[item.material];
  next.xp += 1;
  let currentPrng = prng;
  if (next.xp >= 20 && next.level < mStats.levelCap) {
    next.level++;
    next.xp = 0;
    next.durability = next.maxDurability;
    if (next.level === 5 && next.rank === 'common') {
      next.rank = 'fine';
      next.history.push({ tick, event: `Alcanzó calidad Superior en manos de ${npc.name}` });
    } else if (next.level === 10 && next.rank === 'fine') {
      next.rank = 'masterwork';
      const { name: epicName, next: prng2 } = generateEpicName(item.kind, item.material, npc.name, currentPrng);
      currentPrng = prng2;
      next.name = epicName;
      next.trait = 'serrated';
      next.history.push({ tick, event: `Convertido en Obra Maestra: ${next.name}` });
      next.deeds.push(`Se convirtió en la leyenda "${next.name}"`);
    } else if (next.level === 20) {
      next.rank = 'artifact';
      next.history.push({ tick, event: `Ascendido a Artefacto Legendario` });
      next.deeds.push(`Ascendió al plano de los Artefactos Eternos`);
    }
  }
  return { item: next, next: currentPrng };
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
