/**
 * Crónica partisana primigenia — Sprint 3.4.
 *
 * Voz: "los nuestros" / "los hijos de Tramuntana" — nunca narrador
 * neutro (§9 vision-godgame). Plantillas string con interpolación;
 * LLM real llega post-primigenia.
 *
 * Pura: mismo evento → mismo texto. Sin PRNG (los eventos llegan
 * ya determinados desde tick).
 */

import type { Position } from './needs';
import type { ResourceId } from './world-state';

export type ChronicleEvent =
  | {
      type: 'move_toward_food';
      npcName: string;
      resourceKind: ResourceId;
      position: Position;
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
      type: 'migration';
      direction: string;
      tick: number;
    };

const RESOURCE_ES: Record<ResourceId, string> = {
  wood: 'leña',
  stone: 'piedra',
  berry: 'baya',
  game: 'caza',
  water: 'agua',
  fish: 'pescado',
  obsidian: 'obsidiana',
  shell: 'concha',
  clay: 'arcilla',
  coconut: 'coco',
  flint: 'sílex',
  mushroom: 'seta',
};

export function narrate(ev: ChronicleEvent): string {
  switch (ev.type) {
    case 'move_toward_food':
      return `Día ${ev.tick}: los nuestros se mueven. ${ev.npcName} se acerca a la ${RESOURCE_ES[ev.resourceKind]} en (${ev.position.x}, ${ev.position.y}).`;
    case 'discovered_resource':
      return `Día ${ev.tick}: ${ev.npcName} de los nuestros ha descubierto ${RESOURCE_ES[ev.resourceKind]} al borde de (${ev.position.x}, ${ev.position.y}).`;
    case 'death':
      return `Día ${ev.tick}: hemos perdido a ${ev.npcName}, nuestro hermano caído por ${ev.cause}.`;
    case 'birth':
      return `Día ${ev.tick}: una nueva hija de Tramuntana — ${ev.childName}, de ${ev.parents[0]} y ${ev.parents[1]}.`;
    case 'migration':
      return `Día ${ev.tick}: los hijos de Tramuntana siguen al viento ${ev.direction}; el grupo migra.`;
  }
}
