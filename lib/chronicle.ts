/**
 * Memoria Colectiva — Crónica con impacto mecánico.
 *
 * Los eventos no solo se narran, sino que definen el estado
 * anímico y social del clan.
 */

import type { Position } from './needs';
import type { ResourceId } from './world-state';
import { TICKS_PER_DAY } from './resources';
import type { NPCSkills } from './npcs';
import type { ChronicleEntry } from './game-state';

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
    }
  | {
      type: 'move_toward_food';
      npcName: string;
      resourceKind: ResourceId;
      position: Position;
      tick: number;
    }
  | {
      type: 'migration';
      direction: string;
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

/** Genera texto narrativo para un evento de crónica. Retorna string. */
export function narrate(ev: ChronicleEvent): string {
  const day = Math.floor(ev.tick / TICKS_PER_DAY);

  switch (ev.type) {
    case 'death':
      return `Día ${day}: Nuestro hermano ${ev.npcName} ha caído (${ev.cause}). Los nuestros lloran su ausencia.`;
    case 'birth':
      return `Día ${day}: Esperanza. Ha nació ${ev.childName}, hija de los nuestros.`;
    case 'discovered_resource':
      return `Día ${day}: ${ev.npcName} descubrió ${RESOURCE_ES[ev.resourceKind]} en (${ev.position.x}, ${ev.position.y}).`;
    case 'wisdom_gained':
      return `Día ${day}: El clan ha comprendido algo nuevo (+${ev.amount} sabiduría).`;
    case 'move_toward_food': {
      const res = RESOURCE_ES[ev.resourceKind] ?? ev.resourceKind;
      return `Día ${day}: Los nuestros buscan ${res} — ${ev.npcName} lidera la marcha.`;
    }
    case 'migration':
      return `Día ${day}: El clan migra hacia el ${ev.direction}. El viento mestral guía sus pasos.`;
    default:
      return `Día ${day}: Evento del sistema.`;
  }
}

/** Genera narrativa con metadatos de impacto para el sistema de Memoria Colectiva. */
export function narrateDetailed(ev: ChronicleEvent): ChronicleResult {
  const text = narrate(ev);
  const day = Math.floor(ev.tick / TICKS_PER_DAY);

  switch (ev.type) {
    case 'death':
      return { text, type: 'death', impact: -30, duration: TICKS_PER_DAY * 3 };
    case 'birth':
      return { text, type: 'birth', impact: 20, duration: TICKS_PER_DAY * 5 };
    case 'discovered_resource':
      return { text, type: 'discovery', impact: 5, duration: TICKS_PER_DAY * 1 };
    case 'wisdom_gained':
      return { text, type: 'wisdom', impact: 10, duration: TICKS_PER_DAY * 2 };
    default:
      return { text, type: 'system', impact: 0, duration: 0 };
  }

  // suppress 'day' unused warning
  void day;
}

/**
 * Calcula el modificador colectivo de memoria a partir de crónicas activas (no expiradas).
 * Puro, determinista, solo enteros. Reutilizado por Memoria Mecánica para skills.
 */
export function calculateCollectiveMemoryModifier(
  chronicle: readonly ChronicleEntry[],
  currentTick: number
): number {
  return chronicle
    .filter((entry) => entry.expiresAtTick > currentTick)
    .reduce((total, entry) => total + entry.impact, 0);
}

/**
 * Computa bonuses enteros pequeños a skills derivados del impacto activo de la crónica.
 * Puro (§A4), determinista (mismo chron+tick -> mismo), ints only, JSON-safe.
 * Minimal viable: global bonus (mismo valor para todas las skills).
 * Escala: floor(activeImpact / 5), clamp a [-3, +3].
 * Leverage existing modifier logic.
 */
export function computeMemorySkillBonuses(
  chronicle: readonly ChronicleEntry[],
  currentTick: number
): Partial<Record<keyof NPCSkills, number>> {
  const activeImpact = calculateCollectiveMemoryModifier(chronicle, currentTick);
  if (activeImpact === 0) return {};
  const scaled = Math.floor(activeImpact / 5);
  const bonus = Math.max(-3, Math.min(3, scaled));
  if (bonus === 0) return {};
  // Global: mismo para todas (starters; per-skill differentiation puede venir luego)
  return {
    hunting: bonus,
    gathering: bonus,
    crafting: bonus,
    fishing: bonus,
    healing: bonus,
  };
}

/**
 * Memoria Mecánica v2: skill EFECTIVA en el punto de uso.
 * El bonus de memoria es TRANSITORIO — jamás se escribe en `npc.skills`.
 * Puro (§A4), determinista, entero, clamp [0, 100]. Identidad si no hay
 * memoria activa (crónica vacía o expirada).
 */
export function effectiveSkill(
  base: number,
  skill: keyof NPCSkills,
  chronicle: readonly ChronicleEntry[],
  currentTick: number,
): number {
  const bonus = computeMemorySkillBonuses(chronicle, currentTick)[skill] ?? 0;
  return Math.max(0, Math.min(100, Math.round(base + bonus)));
}
