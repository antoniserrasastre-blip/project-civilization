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
  event: string; // ej: "Creado por Agni", "Heredado por Elara"
}

export interface EquippableItem {
  id: string;
  kind: ItemKind;
  material: ItemMaterial;
  name: string;        
  ownerNpcId: string | null;
  durability: number;
  maxDurability: number;
  createdAtTick: number;
  xp: number;
  level: number;
  rank: ItemRank;
  trait?: 'lightweight' | 'serrated' | 'blessed' | 'sturdy';
  history: ItemHistoryEntry[]; // La memoria del objeto
}

const MATERIAL_STATS: Record<ItemMaterial, { durMult: number, levelCap: number }> = {
  wood: { durMult: 0.5, levelCap: 5 },
  stone: { durMult: 1.0, levelCap: 10 },
  bone: { durMult: 1.2, levelCap: 15 },
  obsidian: { durMult: 0.8, levelCap: 25 }, // Filo letal pero frágil
};

/** Generador de nombres épicos para objetos que destacan. */
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
    name: `${kind} de ${material}`,
    ownerNpcId: owner?.id || null,
    durability: 100 * mStats.durMult,
    maxDurability: 100 * mStats.durMult,
    createdAtTick: tick,
    xp: 0, level: 1, rank: 'common',
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

    // Evolución de Rango
    if (next.level === 5 && next.rank === 'common') {
      next.rank = 'fine';
      next.history.push({ tick, event: `Alcanzó calidad Superior en manos de ${npc.name}` });
    } else if (next.level === 10 && next.rank === 'fine') {
      next.rank = 'masterwork';
      next.name = generateEpicName(item.kind, item.material, npc.name);
      next.trait = 'serrated';
      next.history.push({ tick, event: `Convertido en Obra Maestra: ${next.name}` });
    } else if (next.level === 20) {
      next.rank = 'artifact';
      next.history.push({ tick, event: `Ascendido a Artefacto Legendario` });
    }
  }
  return next;
}

export function itemLabel(item: EquippableItem | null | undefined): string {
  if (!item) return 'Manos desnudas';
  const rankIcons = { common: '🛠️', fine: '✨', masterwork: '⭐', artifact: '🔥' };
  return `${rankIcons[item.rank]} ${item.name} [Lvl ${item.level}]`;
}
