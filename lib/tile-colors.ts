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
  [TILE.WATER]:            '#3c6e9b',
  [TILE.SHORE]:            '#d2b48c',
  [TILE.GRASS]:            '#6b8e4e',
  [TILE.FOREST]:           '#2f5132',
  [TILE.MOUNTAIN]:         '#7a6a5a',
  [TILE.SAND]:             '#e7d8a8',
  [TILE.SHALLOW_WATER]:    '#5f8eb1',
  // Sprint 14.5 biomas
  [TILE.GRASS_LUSH]:       '#3a7a2a',
  [TILE.GRASS_SABANA]:     '#b8a050',
  [TILE.SAND_TROPICAL]:    '#f0e090',
  [TILE.JUNGLE_SOIL]:      '#2a4a1a',
  [TILE.MOUNTAIN_SNOW]:    '#dce8f0',
  [TILE.MOUNTAIN_VOLCANO]: '#2a1a1a',
  [TILE.RIVER]:            '#4a8ab8',
};
