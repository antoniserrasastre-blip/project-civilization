/**
 * Memoria Colectiva — Crónica con impacto mecánico.
 *
 * Los eventos no solo se narran, sino que definen el estado
 * anímico y social del clan.
 */

import type { Position } from './needs';
import type { ResourceId } from './world-state';
import { TICKS_PER_DAY } from './resources';

export type ChronicleEvent =
  | {
      type: 'death';
      npcName: string;
      cause: string;
      tick: number;
    }
  | {
      type: 'birth';
      childName: string;
      parents: [string, string];
      tick: number;
    }
  | {
      type: 'discovered_resource';
      npcName: string;
      resourceKind: ResourceId;
      position: Position;
      tick: number;
    }
  | {
      type: 'wisdom_gained';
      amount: number;
      tick: number;
    };

const RESOURCE_ES: Record<ResourceId, string> = {
  wood: 'leña', stone: 'piedra', berry: 'baya', game: 'caza',
  water: 'agua', fish: 'pescado', obsidian: 'obsidiana',
  shell: 'concha', clay: 'arcilla', coconut: 'coco',
  flint: 'sílex', mushroom: 'seta',
};

export interface ChronicleResult {
  text: string;
  type: 'death' | 'birth' | 'wisdom' | 'discovery' | 'system';
  impact: number;
  duration: number; // Ticks que dura el efecto en la memoria
}

export function narrate(ev: ChronicleEvent): ChronicleResult {
  const day = Math.floor(ev.tick / TICKS_PER_DAY);
  
  switch (ev.type) {
    case 'death':
      return {
        text: `Día ${day}: Luto por ${ev.npcName} (${ev.cause}).`,
        type: 'death',
        impact: -30,
        duration: TICKS_PER_DAY * 3, // 3 días de luto
      };
    case 'birth':
      return {
        text: `Día ${day}: Esperanza. Ha nacido ${ev.childName}.`,
        type: 'birth',
        impact: 20,
        duration: TICKS_PER_DAY * 5, // 5 días de alegría
      };
    case 'discovered_resource':
      return {
        text: `Día ${day}: Hallazgo de ${RESOURCE_ES[ev.resourceKind]}.`,
        type: 'discovery',
        impact: 5,
        duration: TICKS_PER_DAY * 1,
      };
    case 'wisdom_gained':
      return {
        text: `Día ${day}: El clan ha comprendido algo nuevo (+${ev.amount} sabiduría).`,
        type: 'wisdom',
        impact: 10,
        duration: TICKS_PER_DAY * 2,
      };
    default:
      return {
        text: `Día ${day}: Evento del sistema.`,
        type: 'system',
        impact: 0,
        duration: 0,
      };
  }
}
