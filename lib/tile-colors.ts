/**
 * Colores de tile para el renderizado canvas.
 *
 * Fuente de verdad del color visual de cada TileId. Los SVGs en
 * `assets/tiles/` comparten estos mismos valores (sincronizados a
 * mano — se verifican visualmente, no se importan desde el SVG).
 *
 * Cuando lleguen assets Kenney reales, este fichero pasa a ser
 * solo fallback y el render usa Image sprites.
 */

import { TILE, type TileId } from './world-state';

export const TILE_COLOR: Record<TileId, string> = {
  [TILE.WATER]: '#3c6e9b',
  [TILE.SHORE]: '#d2b48c',
  [TILE.GRASS]: '#6b8e4e',
  [TILE.FOREST]: '#2f5132',
  [TILE.MOUNTAIN]: '#7a6a5a',
  [TILE.SAND]: '#e7d8a8',
  [TILE.SHALLOW_WATER]: '#5f8eb1',
};
