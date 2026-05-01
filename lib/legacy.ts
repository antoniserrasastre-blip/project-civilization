/**
 * Sistema de Legado y Herencia de Artefactos.
 */

import type { NPC } from './npcs';
import type { EquippableItem } from './items';

export interface LegacyResult {
  npcs: NPC[];
  items: EquippableItem[];
}

/**
 * Transfiere un item legendario o de prestigio a un heredero cuando el dueño muere.
 * Solo transfiere si `item.prestige` > 0.
 * Prioridad: 1. Hijos vivos (por parents[]), 2. Familiar de mismo linaje, 3. Sin heredero → ownerNpcId=null.
 * No transfiere si el heredero ya lleva un item equipado.
 * Puro: no muta los arrays de entrada.
 */
export function transferLegacyItem(
  deadNpc: NPC,
  item: EquippableItem,
  allItems: readonly EquippableItem[],
  allNpcs: readonly NPC[],
): LegacyResult {
  const items = allItems.map(i => ({ ...i }));
  const npcs = allNpcs.map(n => ({ ...n }));

  // Solo transferir items con prestige > 0
  const prestige = (item as any).prestige ?? 0;
  if (prestige <= 0) {
    return { npcs, items };
  }

  // Candidatos: vivos, sin item equipado, y no el muerto
  const candidates = npcs.filter(n => n.alive && !n.equippedItemId && n.id !== deadNpc.id);

  if (candidates.length === 0) {
    // Sin heredero: el item queda sin dueño
    const itemIdx = items.findIndex(i => i.id === item.id);
    if (itemIdx >= 0) items[itemIdx].ownerNpcId = null;
    return { npcs, items };
  }

  // 1. Prioridad: hijos directos (parents contiene el id del muerto)
  const children = candidates.filter(n => n.parents?.includes(deadNpc.id));

  // 2. Fallback: mismo linaje
  const kin = candidates.filter(n => n.linaje === deadNpc.linaje);

  let heir = children[0] ?? kin[0] ?? null;

  const itemIdx = items.findIndex(i => i.id === item.id);

  if (heir) {
    const heirIdx = npcs.findIndex(n => n.id === heir!.id);
    if (itemIdx >= 0 && heirIdx >= 0) {
      items[itemIdx].ownerNpcId = heir.id;
      npcs[heirIdx].equippedItemId = item.id;
      console.log(`LEGACY: ${heir.name} ha heredado ${item.name} de ${deadNpc.name}`);
    }
  } else {
    // Sin heredero válido: item queda sin dueño
    if (itemIdx >= 0) items[itemIdx].ownerNpcId = null;
  }

  return { npcs, items };
}
