import { createFog, type FogState } from './fog';
import type { NPC } from './npcs';
import type { PRNGState } from './prng';
import { seedState } from './prng';
import type { BuildProject, Structure } from './structures';
import type { Edge } from './relations';
import { initialVillageState, type VillageState } from './village';
import { generateWorld } from './world-gen';
import type { WorldMap, Animal, ClimateState } from './world-state';
import type { EquippableItem } from './items';
import { initialClimateState } from './climate';
import { findIslands, pickClanSpawn, pickLandCells } from './spawn';

import type { MonumentState } from './monument';
import { initialMonumentState } from './monument';
import type { TechId } from './technologies';
import { initialTechState } from './technologies';
import { initialLegendState, type LegendState } from './legends';

export interface TechState {
  /** Puntos de Sabiduría acumulados. */
  wisdom: number;
  /** IDs de las tecnologías ya investigadas. */
  unlocked: TechId[];
  /** Tecnología actualmente en investigación (o null). */
  researching: TechId | null;
  /** Progreso de la investigación actual. */
  researchProgress: number;
}

export type Era = 'primigenia' | 'tribal';

/** Entrada persistida de crónica — Memoria Colectiva del clan.
 *  No solo narra, sino que afecta mecánicamente al clan. */
export interface ChronicleEntry {
  day: number;
  tick: number;
  text: string;
  type: 'death' | 'birth' | 'wisdom' | 'discovery' | 'system';
  impact: number;      // Valor del impacto (positivo o negativo)
  expiresAtTick: number; // Cuándo deja de afectar a la memoria colectiva
}

/** Cap de entradas conservadas — descarte FIFO para que el estado
 *  no crezca sin límite durante partidas largas. Suficiente para
 *  unas 25 días in-game típicos con eventos moderados. */
export const CHRONICLE_MAX = 300;

export interface GameState {
  world: WorldMap;
  npcs: NPC[];
  animals: Animal[];
  godType: 'sea' | 'stone' | 'wind';
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
  legends: LegendState; // Sistema de Leyendas y Tradición Oral
  era: Era;
  tick: number;
  prng: PRNGState;
  tech: TechState; // Nuevo estado para tecnologías
  climate: ClimateState; // Sistema de Clima y Estaciones
}

/** Construye una partida nueva. Los NPCs llegan drafteados (Sprint
 *  2.2/2.3) y se posicionan en el spawn costero declarado. */
export function initialGameState(
  seed: number,
  npcs: readonly NPC[],
  worldOverride?: WorldMap,
  godType: 'sea' | 'stone' | 'wind' = 'stone',
  options: { skipSpawning?: boolean } = {},
): GameState {
  // Generación procedimental por defecto — Sprint 14.5 GEOLOGÍA-SAGRADA.
  // Mata el fixture estático world-map.v1.json.
  const rawWorld = worldOverride ?? generateWorld(seed);

  // Influence arranca siempre en ceros — es estado dinámico, no vive en el
  // fixture estático (evita bundle de 262K ceros en webpack).
  // Reserves: suma de initialQuantity de cada spawn en su tile.
  const reserves = new Array<number>(rawWorld.width * rawWorld.height).fill(0);
  for (const spawn of rawWorld.resources) {
    reserves[spawn.y * rawWorld.width + spawn.x] += spawn.initialQuantity;
  }
  const world: WorldMap = {
    ...rawWorld,
    influence: new Array<number>(rawWorld.width * rawWorld.height).fill(0),
    reserves,
    traffic: new Array<number>(rawWorld.width * rawWorld.height).fill(0),
    terrainTags: {},
    traditions: {},
  };

  let nextNpcs = [...npcs];

  // Por defecto se salta el spawn si hay un worldOverride (caso típico de tests),
  // a menos que se fuerce vía options.
  const skip = options.skipSpawning ?? (worldOverride !== undefined);

  if (!skip) {
    // Posicionamiento dinámico del clan — Sprint 14.5
    // Encuentra la isla y el spawn costero sobre el mapa GENERADO (no el fixture).
    const islands = findIslands(world);
    const spawn = pickClanSpawn(seed, islands, world);
    const cells = pickLandCells(world, spawn.center, npcs.length);
    nextNpcs = npcs.map((n, i) => ({
      ...n,
      position: { x: cells[i].x, y: cells[i].y },
    }));
  }

  return {
    world,
    npcs: nextNpcs.map((n) => ({
      ...n,
      stats: { 
        ...n.stats, 
        proposito: n.stats.proposito ?? 100,
        miedo: n.stats.miedo ?? 0 
      },
      vocation: n.vocation ?? 'ciudadano',
      attributes: n.attributes ?? { strength: 50, dexterity: 50, wisdom: 50 },
    })),
    godType,
    animals: [],
    fog: createFog(world.width, world.height),
    structures: [],
    buildProject: null,
    items: [],
    unlockedItemKinds: [],
    relations: [],
    village: initialVillageState(),
    monument: initialMonumentState(),
    chronicle: [],
    legends: initialLegendState(),
    era: 'primigenia',
    tick: 0,
    prng: seedState(seed),
    tech: initialTechState(), // Inicializar el estado de tecnología
    climate: initialClimateState(),
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
