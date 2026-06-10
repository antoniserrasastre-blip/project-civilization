/**
 * Construcciones del clan — Sprint 4.6+.
 *
 * Structure = crafteable materializado en el mundo (fogata,
 * refugio, despensa, herramienta, piel). Entero serializable,
 * round-trip JSON.
 *
 * Shape: uses builtAtTick (not startedAtTick); distinguishes from BuildProject
 * (which has startedAtTick + progress for in-flight). Ensures consistency for
 * CraftableId incl. new shaman_hut/muelle/huerto (Cluster 4 fixes).
 * inventory?: Partial<NPCInventory> (resilient, no 7-field hardcodes here).
 */

import type { CraftableId } from './crafting';
import type { NPCInventory } from './npcs';
import type { Position } from './needs';

export interface Structure {
  id: string;
  kind: CraftableId;
  position: Position;
  builtAtTick: number;
  /** Inventario de recursos almacenados en esta estructura (Sprint 15). */
  inventory?: Partial<NPCInventory>;
}

export interface BuildProject {
  id: string;
  kind: CraftableId;
  position: Position;
  startedAtTick: number;
  progress: number;
  required: number;
  /** Si está presente, el proyecto es de mantenimiento/reparación de esta estructura. */
  targetStructureId?: string;
  // Note: distinct from Structure (which requires builtAtTick once completed via addStructure).
}

export function hasStructure(
  structures: readonly Structure[],
  kind: CraftableId,
): boolean {
  return structures.some((s) => s.kind === kind);
}

export function firstStructureOfKind(
  structures: readonly Structure[],
  kind: CraftableId,
): Structure | null {
  return structures.find((s) => s.kind === kind) ?? null;
}

export function addStructure(
  structures: readonly Structure[],
  kind: CraftableId,
  position: Position,
  tick: number,
  idSuffix: number = 0,
): Structure[] {
  const id = `s-${kind}-${tick}-${idSuffix}`;
  // Always provides builtAtTick (required in Structure); omits optional inventory (defaults undefined).
  // Pure: array spread + new obj (no mutation). Covers all CraftableId incl. new ones.
  return [
    ...structures,
    {
      id,
      kind,
      position: { ...position },
      builtAtTick: tick,
    },
  ];
}
