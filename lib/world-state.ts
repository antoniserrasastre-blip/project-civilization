/**
 * Tipos globales del mundo primigenia.
 *
 * Este módulo declara el shape del estado del mundo — no contiene
 * lógica de generación (eso vive en `world-gen.ts`). Cualquier
 * campo nuevo que se persista pasa por aquí y cumple §A4 (round-trip
 * JSON: sin clases, sin funciones, sin Map/Set, sin undefined).
 */

/** Tipos de tile del terreno. Entero estable serializable. */
export const TILE = {
  WATER: 0,
  SHORE: 1,
  GRASS: 2,
  FOREST: 3,
  MOUNTAIN: 4,
  SAND: 5,
  SHALLOW_WATER: 6,
  // Sprint 14.5 — biomas y geografía
  GRASS_LUSH:       7,   // Pradera húmeda / selva baja
  GRASS_SABANA:     8,   // Sabana seca / estepa
  SAND_TROPICAL:    9,   // Playa tropical
  JUNGLE_SOIL:      10,  // Suelo de jungla profunda
  MOUNTAIN_SNOW:    11,  // Cima nevada
  MOUNTAIN_VOLCANO: 12,  // Volcán / basalto (obsidiana)
  RIVER:            13,  // Río — atravesable, fuente de agua
} as const;

export type TileId = (typeof TILE)[keyof typeof TILE];

/** Los 8 recursos primigenia. Obsidiana y concha fuerzan nomadismo
 *  (Sprint 9): obsidiana en montaña para Lanza, conchas en costa para Cesta. */
export const RESOURCE = {
  WOOD:     'wood',
  STONE:    'stone',
  BERRY:    'berry',
  GAME:     'game',
  WATER:    'water',
  FISH:     'fish',
  OBSIDIAN: 'obsidian',
  SHELL:    'shell',
  // Sprint 14.5
  CLAY:     'clay',
  COCONUT:  'coconut',
  FLINT:    'flint',
  MUSHROOM: 'mushroom',
} as const;

export type ResourceId = (typeof RESOURCE)[keyof typeof RESOURCE];

export const RESOURCE_LABEL: Record<ResourceId, string> = {
  [RESOURCE.WOOD]:     'Madera',
  [RESOURCE.STONE]:    'Piedra',
  [RESOURCE.BERRY]:    'Bayas',
  [RESOURCE.GAME]:     'Caza',
  [RESOURCE.WATER]:    'Agua',
  [RESOURCE.FISH]:     'Pescado',
  [RESOURCE.OBSIDIAN]: 'Obsidiana',
  [RESOURCE.SHELL]:    'Concha',
  [RESOURCE.CLAY]:     'Arcilla',
  [RESOURCE.COCONUT]:  'Coco',
  [RESOURCE.FLINT]:    'Sílex',
  [RESOURCE.MUSHROOM]: 'Seta',
};

/** Régimen de regeneración de un recurso (decisión #21). */
export type ResourceRegime = 'regenerable' | 'depletable' | 'continuous';

/** Instancia de recurso en un tile concreto del mapa. */
export interface ResourceSpawn {
  id: ResourceId;
  x: number;
  y: number;
  /** Cantidad disponible ahora. Para agotables, va a 0 sin vuelta.
   *  Para regenerables, puede dropear a 0 por harvest (Sprint 4.2)
   *  y volver a initialQuantity tras el timer. */
  quantity: number;
  /** Cantidad al spawn — referencia para restaurar al regenerar. */
  initialQuantity: number;
  regime: ResourceRegime;
  /** Tick en el que se agotó (quantity cayó a 0). null si no
   *  agotado. Irrelevante para depletable/continuous, pero se
   *  serializa igual para uniformidad. */
  depletedAtTick: number | null;
}

/** Metadata del mapa — versiona el generador y permite invalidación
 *  de fixtures cuando el shape o el seed canónico cambian. */
export interface WorldMapMeta {
  generatorVersion: number;
  shaHash: string;
  islandCount: number;
}

/** Mapa del mundo completo. Fuente de verdad del tablero primigenia. */
export interface WorldMap {
  seed: number;
  width: number;
  height: number;
  /** Array plano row-major de TileId. `tiles[y * width + x]`. */
  tiles: TileId[];
  resources: ResourceSpawn[];
  meta: WorldMapMeta;
  /** Heatmap de presencia territorial — Sprint 12. Array plano row-major
   *  de enteros 0–1000. `influence[y * width + x]`.
   *  Opcional en el shape porque el fixture estático no lo incluye
   *  (siempre arranca en ceros; `initialGameState` lo inicializa). */
  influence?: number[];
  /** Heatmap de pisadas — Fase 3.0. Array plano row-major de enteros.
   *  Representa el desgaste del suelo. Afecta al coste de pathfinding. */
  traffic?: number[];
  /** Contador de entidades por celda este tick — Fase 1.0. 
   *  Celdas con >5 causan penalización de velocidad (atasco). */
  density?: number[];
}

/** Devuelve un mundo vacío (toda agua, sin recursos) para tests de
 *  shape. NO usar en producción: el mundo real pasa por
 *  `generateWorld(seed)` en `world-gen.ts`. */
export function emptyWorldMap(
  seed: number,
  width: number,
  height: number,
): WorldMap {
  return {
    seed,
    width,
    height,
    tiles: new Array<TileId>(width * height).fill(TILE.WATER),
    resources: [],
    meta: {
      generatorVersion: 1,
      shaHash: '',
      islandCount: 0,
    },
  };
}
