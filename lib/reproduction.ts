/**
 * Sistema de reproducción — Sprint 2.3 + Fase 2.0 (Linajes).
 */

import type { NPC } from './npcs';
import { CASTA, createNPC } from './npcs';
import type { PRNGState } from './prng';
import { nextInt } from './prng';
import { TICKS_PER_DAY } from './resources';

const REPRO_AGE_MIN = 18 * TICKS_PER_DAY;
const REPRO_AGE_MAX = 45 * TICKS_PER_DAY;
const GESTATION_TICKS = 3 * TICKS_PER_DAY;

export interface ReproResult {
  npcs: NPC[];
  newBorns: NPC[];
  prng: PRNGState;
}

/**
 * Los niños nacen con un bonus en la habilidad predominante de la tribu.
 */
export function tickReproduction(
  npcs: readonly NPC[],
  currentTick: number,
  prng: PRNGState,
  usedNames: Set<string>,
  traditions?: Record<string, number>, // Añadido para Linajes
): ReproResult {
  const nextNpcs = [...npcs];
  const newBorns: NPC[] = [];
  let currentPrng = prng;

  // Lógica de emparejamiento y nacimiento simplificada para este hito
  // (Asumiendo que el clan tiene un 1% de probabilidad de nacimiento por día)
  if (currentTick % TICKS_PER_DAY === 0) {
    const [roll, nextP] = nextInt(currentPrng, 100);
    currentPrng = nextP;

    if (roll < 5) { // 5% de probabilidad de un nuevo miembro cada amanecer
      const id = `npc-born-${currentTick}`;
      const name = `Hijo de ${currentTick}`;
      
      // LINAJES DE OFICIO: Heredar bonus de la tradición más fuerte
      const topTradition = traditions ? Object.entries(traditions).sort((a,b) => b[1] - a[1])[0]?.[0] : null;
      
      const skills = {
        hunting: 10 + (topTradition === 'cazador' ? 10 : 0),
        gathering: 10 + (topTradition === 'recolector' ? 10 : 0),
        crafting: 10 + (topTradition === 'tallador' ? 10 : 0),
        fishing: 10 + (topTradition === 'pescador' ? 10 : 0),
        healing: 10 + (topTradition === 'curandero' ? 10 : 0),
      };

      const baby: NPC = {
        id, name, alive: true, position: { ...npcs[0].position },
        stats: { supervivencia: 100, socializacion: 100, proposito: 100 },
        skills, casta: CASTA.CIUDADANO, inventory: { wood: 0, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0, clay: 0, coconut: 0, flint: 0, mushroom: 0, water: 0 },
        equippedItemId: null,
      };

      newBorns.push(baby);
      nextNpcs.push(baby);
    }
  }

  return { npcs: nextNpcs, newBorns, prng: currentPrng };
}
