/**
 * Recolección activa — Sprint 4.2.
 *
 * NPC sobre tile con spawn activo recoge 1 unidad por tick hasta
 * su cap de inventario (INVENTORY_CAP_PER_TYPE). Agua NO se
 * recolecta — se consume vía tickNeeds on-the-spot.
 *
 * Puro: devuelve npcs + resources nuevos sin mutar los inputs.
 * Si dos NPCs comparten tile, el de id-lex-menor recolecta primero.
 */

import type { NPC, NPCInventory } from './npcs';
import {
  RESOURCE,
  type ResourceId,
  type ResourceSpawn,
} from './world-state';

/** Cap por tipo en el inventario del NPC (decisión operativa v1;
 *  revalidar en playtest Fase 4). */
export const INVENTORY_CAP_PER_TYPE = 5;

/** IDs que se acumulan en inventario. Agua queda fuera. */
const INVENTORY_KEYS: Record<string, keyof NPCInventory | null> = {
  [RESOURCE.WOOD]: 'wood',
  [RESOURCE.STONE]: 'stone',
  [RESOURCE.BERRY]: 'berry',
  [RESOURCE.GAME]: 'game',
  [RESOURCE.FISH]: 'fish',
  [RESOURCE.WATER]: null,
  [RESOURCE.OBSIDIAN]: 'obsidian',
  [RESOURCE.SHELL]: 'shell',
};

function inventoryKeyFor(id: ResourceId): keyof NPCInventory | null {
  return INVENTORY_KEYS[id] ?? null;
}

export interface HarvestTickResult {
  npcs: NPC[];
  resources: ResourceSpawn[];
}

/** Recolecta 1 unidad por NPC que esté sobre un spawn válido. Un
 *  spawn con múltiples visitantes reparte 1 al primero según orden
 *  lex de id (estable y determinista). */
export function tickHarvests(
  npcsIn: readonly NPC[],
  resourcesIn: readonly ResourceSpawn[],
  currentTick: number,
): HarvestTickResult {
  // Clonamos arrays / elementos que mutaremos.
  const npcs = npcsIn.map((n) => ({
    ...n,
    inventory: { ...n.inventory },
  }));
  const resources = resourcesIn.map((r) => ({ ...r }));

  // Orden estable por id para resolver simultaneidad.
  const npcOrder = [...npcs].sort((a, b) => (a.id < b.id ? -1 : 1));

  for (const npc of npcOrder) {
    if (!npc.alive) continue;
    const invKey = null; // placeholder — real check en loop.
    void invKey;
    for (const r of resources) {
      if (r.x !== npc.position.x || r.y !== npc.position.y) continue;
      if (r.quantity <= 0) continue;
      const key = inventoryKeyFor(r.id);
      if (!key) continue; // agua
      if (npc.inventory[key] >= INVENTORY_CAP_PER_TYPE) continue;
      // Transferir 1 unidad.
      npc.inventory[key] += 1;
      r.quantity -= 1;
      if (r.quantity === 0 && r.regime === 'regenerable') {
        r.depletedAtTick = currentTick;
      } else if (r.quantity === 0 && r.regime === 'depletable') {
        r.depletedAtTick = currentTick;
      }
      // Un solo recurso por NPC por tick — realista y evita bursty.
      break;
    }
  }

  // Los NPCs se devuelven en el orden original del input; npcs[i]
  // ha sido mutado in-place (es copia) durante la iteración sorted.
  return { npcs, resources };
}
