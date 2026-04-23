/**
 * Legado Divino — Sprint 9 CULTURA-MATERIAL.
 *
 * Cuando un NPC muere con un item equipado de prestige > 0, la
 * herramienta pasa al heredero más cercano (hijo primero, luego mismo
 * linaje). Si el heredero ya lleva item, se busca el siguiente. Si no
 * hay heredero disponible, el item queda sin dueño (ownerNpcId = null).
 *
 * Puro: no muta los inputs. §A4.
 */

import type { NPC } from './npcs';
import type { EquippableItem } from './items';

/**
 * Transfiere un item de prestige del NPC muerto al mejor heredero
 * disponible. Devuelve arrays nuevos; no muta los de entrada.
 */
export function transferLegacyItem(
  dead: NPC,
  item: EquippableItem,
  items: readonly EquippableItem[],
  npcs: readonly NPC[],
): { items: EquippableItem[]; npcs: NPC[] } {
  // Sin prestige: no hay legado
  if (item.prestige <= 0) {
    return { items: [...items], npcs: [...npcs] };
  }

  // Candidatos por prioridad:
  // 1. Hijos vivos sin item equipado.
  // 2. Familiares de mismo linaje vivos sin item equipado.
  const alive = npcs.filter((n) => n.alive && n.id !== dead.id);

  const heir =
    alive.find(
      (n) =>
        n.equippedItemId === null &&
        n.parents !== null &&
        n.parents.includes(dead.id),
    ) ??
    alive.find(
      (n) => n.equippedItemId === null && n.linaje === dead.linaje,
    ) ??
    null;

  if (!heir) {
    const updatedItems = items.map((i) =>
      i.id === item.id ? { ...i, ownerNpcId: null } : i,
    );
    return { items: updatedItems, npcs: [...npcs] };
  }

  const updatedItems = items.map((i) =>
    i.id === item.id ? { ...i, ownerNpcId: heir.id } : i,
  );
  const updatedNpcs = npcs.map((n) =>
    n.id === heir.id ? { ...n, equippedItemId: item.id } : n,
  );

  return { items: updatedItems, npcs: updatedNpcs };
}
