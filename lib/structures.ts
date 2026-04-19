/**
 * Construcciones del clan — Sprint 4.6+.
 *
 * Structure = crafteable materializado en el mundo (fogata,
 * refugio, despensa, herramienta, piel). Entero serializable,
 * round-trip JSON.
 */

import type { CraftableId } from './crafting';
import type { Position } from './needs';

export interface Structure {
  id: string;
  kind: CraftableId;
  position: Position;
  builtAtTick: number;
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
