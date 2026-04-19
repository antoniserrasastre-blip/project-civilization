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
} as const;

export type TileId = (typeof TILE)[keyof typeof TILE];

/** Los 6 recursos primigenia (§3.5 vision-primigenia). */
export const RESOURCE = {
  WOOD: 'wood',
  STONE: 'stone',
  BERRY: 'berry',
  GAME: 'game',
  WATER: 'water',
  FISH: 'fish',
} as const;

export type ResourceId = (typeof RESOURCE)[keyof typeof RESOURCE];

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
