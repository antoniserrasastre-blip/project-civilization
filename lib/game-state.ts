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
import type { BuildProject, Structure } from './structures';
import type { Edge } from './relations';
import { initialVillageState, type VillageState } from './village';
import type { WorldMap } from './world-state';
import type { EquippableItem } from './items';

import type { MonumentState } from './monument';
import { initialMonumentState } from './monument';

export type Era = 'primigenia' | 'tribal';

/** Entrada persistida de crónica — narrativa ya evaluada, lista
 *  para pintar. Se acumula en `GameState.chronicle` durante `tick()`.
 *  String entero + día simplifica el feed sin perder determinismo. */
export interface ChronicleEntry {
  day: number;
  tick: number;
  text: string;
}

/** Cap de entradas conservadas — descarte FIFO para que el estado
 *  no crezca sin límite durante partidas largas. Suficiente para
 *  unas 25 días in-game típicos con eventos moderados. */
export const CHRONICLE_MAX = 300;

export interface GameState {
  world: WorldMap;
  npcs: NPC[];
  fog: FogState;
  structures: Structure[];
  buildProject: BuildProject | null;
  /** Herramientas y reliquias equipables en circulación — Sprint 9. */
  items: EquippableItem[];
  /** Tipos de item cuya receta ha sido desbloqueada por Eureka. Las
   *  recetas con requiresUnlock=true no se craftean hasta aparecer aquí. */
  unlockedItemKinds: string[];
  relations: Edge[];
  village: VillageState;
  monument: MonumentState;
  chronicle: ChronicleEntry[];
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
  // Influence arranca siempre en ceros — es estado dinámico, no vive en el
  // fixture estático (evita bundle de 262K ceros en webpack).
  const rawWorld = worldOverride ?? DEFAULT_WORLD;
  const world: WorldMap = {
    ...rawWorld,
    influence: new Array<number>(rawWorld.width * rawWorld.height).fill(0),
  };
  // Por ahora todos parten en (0, 0); la colocación real en el
  // spawn costero entra en un sprint posterior (decide por mapa).
  // Los NPCs drafteados tienen position: { x: 0, y: 0 } por
  // convención; lo preservamos.
  return {
    world,
    npcs: npcs.map((n) => ({ ...n })),
    fog: createFog(world.width, world.height),
    structures: [],
    buildProject: null,
    items: [],
    unlockedItemKinds: [],
    relations: [],
    village: initialVillageState(),
    monument: initialMonumentState(),
    chronicle: [],
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
