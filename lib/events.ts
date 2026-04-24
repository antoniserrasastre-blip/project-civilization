/**
 * Motor de Eventos (Semillas de Caos) — Fase 4.0.
 */

import type { GameState } from './game-state';
import type { NPC } from './npcs';
import { CASTA } from './npcs';
import { nextInt, type PRNGState } from './prng';
import { TILE } from './world-state';
import { narrate } from './chronicle';

export interface EventResult {
  state: GameState;
  triggered: boolean;
}

/**
 * Procesa la posibilidad de eventos aleatorios en el mundo.
 */
export function tickEvents(state: GameState): EventResult {
  let currentPrng = state.prng;
  
  // 1. MIGRACIÓN FRONTERIZA (Probabilidad 0.05% por tick)
  const { value: roll, next: nextP } = nextInt(currentPrng, 0, 2000);
  currentPrng = nextP;

  if (roll === 0) {
    return { state: triggerMigration(state, currentPrng), triggered: true };
  }

  return { state: { ...state, prng: currentPrng }, triggered: false };
}

/**
 * Añade entre 2 y 4 NPCs en un borde aleatorio del mapa (siempre en tierra).
 */
function triggerMigration(state: GameState, prng: PRNGState): GameState {
  const { width, height, tiles } = state.world;
  let currentPrng = prng;
  
  const { value: count, next: nextP } = nextInt(currentPrng, 2, 5); // 2 a 4 personas
  currentPrng = nextP;

  const newNPCs: NPC[] = [];
  const borders = ['N', 'S', 'E', 'W'];
  const { value: side, next: nextP2 } = nextInt(currentPrng, 0, 4);
  currentPrng = nextP2;

  const sideChar = borders[side];
  let attempts = 0;
  
  while (newNPCs.length < count && attempts < 100) {
    attempts++;
    let x = 0, y = 0;
    if (sideChar === 'N') { x = Math.floor(Math.random() * width); y = 0; }
    else if (sideChar === 'S') { x = Math.floor(Math.random() * width); y = height - 1; }
    else if (sideChar === 'E') { x = width - 1; y = Math.floor(Math.random() * height); }
    else if (sideChar === 'W') { x = 0; y = Math.floor(Math.random() * height); }

    const tile = tiles[y * width + x];
    if (tile !== TILE.WATER && tile !== TILE.SHALLOW_WATER) {
      const id = `migrant-${state.tick}-${newNPCs.length}`;
      newNPCs.push({
        id, name: `Migrante ${id.split('-')[2]}`, alive: true,
        position: { x, y },
        stats: { supervivencia: 80, socializacion: 50, proposito: 70 },
        skills: { hunting: 15, gathering: 15, crafting: 10, fishing: 10, healing: 5 },
        casta: CASTA.CIUDADANO,
        inventory: { wood: 0, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0, clay: 0, coconut: 0, flint: 0, mushroom: 0, water: 0 },
        equippedItemId: null,
      });
    }
  }

  if (newNPCs.length > 0) {
    const chronicle = [...state.chronicle];
    const entry = {
      day: Math.floor(state.tick / 480), tick: state.tick,
      text: `Día ${Math.floor(state.tick / 480)}: Un grupo de ${newNPCs.length} migrantes ha llegado desde el ${sideChar === 'N' ? 'Norte' : sideChar === 'S' ? 'Sur' : sideChar === 'E' ? 'Este' : 'Oeste'}.`,
      type: 'system' as const, impact: 15, expiresAtTick: state.tick + 480 * 2
    };
    return { ...state, npcs: [...state.npcs, ...newNPCs], chronicle: [...chronicle, entry], prng: currentPrng };
  }

  return { ...state, prng: currentPrng };
}
