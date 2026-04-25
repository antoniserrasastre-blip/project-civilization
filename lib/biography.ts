/**
 * Biografía resumida de un NPC — deriva datos del estado de partida
 * sin mutar nada. Se extrajo del `GameShell` (Sprint 11) a `lib/`
 * para poder testearla y reutilizarla.
 *
 * §A4: puro, determinista, retorna objeto JSON-roundtrippable.
 */

import type { NPC, Linaje } from './npcs';
import { LINAJE } from './npcs';
import { TICKS_PER_DAY } from './resources';

export interface NpcBiography {
  /** Día 1-indexado en que nació el NPC. */
  bornDay: number;
  /** Días vividos hasta el tick actual (edad ≥ 0). */
  ageDays: number;
  /** Nombres resueltos de los padres. null si el NPC es fundador
   *  (parents === null en el shape). */
  parentNames: [string, string] | null;
  /** Nº de NPCs cuyo campo `parents` incluye al NPC referido. */
  childrenCount: number;
  /** Descripción de la herencia genética. */
  geneticTrait: string;
}

const LINAJE_DESCRIPTORS: Record<Linaje, string> = {
  [LINAJE.TRAMUNTANA]: 'la montaña',
  [LINAJE.LLEVANT]: 'el mar',
  [LINAJE.MIGJORN]: 'el sol',
  [LINAJE.PONENT]: 'el poniente',
  [LINAJE.XALOC]: 'el fuego',
  [LINAJE.MESTRAL]: 'el bosque',
  [LINAJE.GREGAL]: 'la tormenta',
  [LINAJE.GARBI]: 'los valles',
};

function describeGenetics(npc: NPC): string {
  const { a, b } = npc.genes.linaje;
  const descA = LINAJE_DESCRIPTORS[a.value];
  const descB = LINAJE_DESCRIPTORS[b.value];

  if (a.value === b.value) {
    return `Sangre pura de ${descA}`;
  }

  if (a.dominant && !b.dominant) {
    return `Linaje dominante de ${descA} con trazas de ${descB}`;
  }
  if (!a.dominant && b.dominant) {
    return `Linaje dominante de ${descB} con trazas de ${descA}`;
  }

  return `Híbrido de ${descA} y ${descB}`;
}

export function buildNpcBiography(
  npc: NPC,
  npcs: readonly NPC[],
  currentTick: number,
): NpcBiography {
  const bornDay = Math.floor(npc.birthTick / TICKS_PER_DAY) + 1;
  const ageTick = Math.max(0, currentTick - npc.birthTick);
  const ageDays = Math.floor(ageTick / TICKS_PER_DAY);

  let parentNames: [string, string] | null = null;
  if (npc.parents) {
    const [pa, pb] = npc.parents;
    const a = npcs.find((n) => n.id === pa);
    const b = npcs.find((n) => n.id === pb);
    parentNames = [a?.name ?? pa, b?.name ?? pb];
  }

  let childrenCount = 0;
  for (const other of npcs) {
    if (other.parents && other.parents.includes(npc.id)) childrenCount++;
  }

  const geneticTrait = describeGenetics(npc);

  return { bornDay, ageDays, parentNames, childrenCount, geneticTrait };
}
