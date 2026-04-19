/**
 * GameState — estado completo de una partida primigenia.
 *
 * Ensambla WorldMap (Fase 1), NPCs (Fase 2), pool de gratitud
 * (Fase 5), fog (Fase 2), PRNG cursor y tick global. §A4 —
 * todo serializable vía JSON.
 *
 * `initialGameState(seed, npcs, worldOverride?)` es el único
 * constructor recomendado. Recibe los NPCs drafteados y los
 * coloca en el spawn inicial del clan.
 */

import fixtureJson from './fixtures/world-map.v1.json';
import { createFog, type FogState } from './fog';
import type { NPC } from './npcs';
import type { PRNGState } from './prng';
import { seedState } from './prng';
import type { Structure } from './structures';
import type { Edge } from './relations';
import { initialVillageState, type VillageState } from './village';
import type { WorldMap } from './world-state';

import type { MonumentState } from './monument';
import { initialMonumentState } from './monument';

export type Era = 'primigenia' | 'tribal';

export interface GameState {
  world: WorldMap;
  npcs: NPC[];
  fog: FogState;
  structures: Structure[];
  relations: Edge[];
  village: VillageState;
  monument: MonumentState;
  era: Era;
  tick: number;
  prng: PRNGState;
}

const DEFAULT_WORLD = fixtureJson as unknown as WorldMap;

/** Construye una partida nueva. Los NPCs llegan drafteados (Sprint
 *  2.2/2.3) y se posicionan en el spawn costero declarado. */
export function initialGameState(
  seed: number,
  npcs: readonly NPC[],
  worldOverride?: WorldMap,
): GameState {
  const world = worldOverride ?? DEFAULT_WORLD;
  // Por ahora todos parten en (0, 0); la colocación real en el
  // spawn costero entra en un sprint posterior (decide por mapa).
  // Los NPCs drafteados tienen position: { x: 0, y: 0 } por
  // convención; lo preservamos.
  return {
    world,
    npcs: npcs.map((n) => ({ ...n })),
    fog: createFog(world.width, world.height),
    structures: [],
    relations: [],
    village: initialVillageState(),
    monument: initialMonumentState(),
    era: 'primigenia',
    tick: 0,
    prng: seedState(seed),
  };
}

/** Transición a la era tribal — requiere monumento 'built' y
 *  al menos 1 village-blessing elegida. Cambia era sin limpiar
 *  state (tribal v1 reconstruye sobre primigenia). */
export function canTransitionToTribal(state: GameState): boolean {
  return (
    state.era === 'primigenia' &&
    state.monument.phase === 'built' &&
    state.village.blessings.length >= 1
  );
}

export function transitionToTribal(state: GameState): GameState {
  if (!canTransitionToTribal(state)) {
    throw new Error(
      `no se puede transicionar: era=${state.era} monument=${state.monument.phase} blessings=${state.village.blessings.length}`,
    );
  }
  return { ...state, era: 'tribal' };
}
