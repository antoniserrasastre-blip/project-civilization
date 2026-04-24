/**
 * Sistema de Legado y Herencia de Artefactos.
 */

import type { NPC } from './npcs';
import type { EquippableItem } from './items';
import { calculateItemEfficiency } from './items';

export interface LegacyResult {
  npcs: NPC[];
  items: EquippableItem[];
}

/**
 * Transfiere un item legendario o de prestigio a un heredero.
 * Prioridad: 1. Hijos vivos, 2. El NPC más habilidoso de la tribu en ese rol.
 */
export function transferLegacyItem(
  deadNpc: NPC,
  item: EquippableItem,
  allItems: EquippableItem[],
  allNpcs: NPC[],
): LegacyResult {
  const items = allItems.map(i => ({ ...i }));
  const npcs = allNpcs.map(n => ({ ...n }));

  // 1. Identificar posibles herederos (vivos y sin herramienta equipada)
  const candidates = npcs.filter(n => n.alive && !n.equippedItemId && n.id !== deadNpc.id);
  
  if (candidates.length === 0) return { npcs, items };

  // 2. Buscar entre hijos directos primero (simulado por coincidencia de id o proximidad)
  const familyHeirs = candidates.filter(n => n.name.includes(deadNpc.name)); // Placeholder de linaje
  
  let heir = familyHeirs[0];
  if (!heir) {
    // 3. Si no hay familia, el mejor en la habilidad del item
    const skillKey = item.kind === 'spear' ? 'hunting' : 'gathering'; // Simplificado
    heir = candidates.sort((a,b) => (b.skills as any)[skillKey] - (a.skills as any)[skillKey])[0];
  }

  if (heir) {
    const itemIdx = items.findIndex(i => i.id === item.id);
    const heirIdx = npcs.findIndex(n => n.id === heir.id);
    
    if (itemIdx >= 0 && heirIdx >= 0) {
      items[itemIdx].ownerNpcId = heir.id;
      npcs[heirIdx].equippedItemId = item.id;
      
      // LOG: La reliquia ha sido heredada
      console.log(`LEGACY: ${heir.name} ha heredado ${item.name} de ${deadNpc.name}`);
    }
  }

  return { npcs, items };
}
