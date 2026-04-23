'use client';

/**
 * Precarga los SVGs de tiles y devuelve un Map<TileId, HTMLImageElement>.
 * Mientras carga devuelve un map vacío — el canvas cae al fallback de color.
 */

import { useEffect, useRef, useState } from 'react';
import { TILE, type TileId } from '@/lib/world-state';

const TILE_SPRITE_URLS: Record<TileId | string, string> = {
  [TILE.WATER]:            '/tiles/water.svg',
  [TILE.SHORE]:            '/tiles/shore.svg',
  [TILE.GRASS]:            '/tiles/grass.svg',
  [TILE.FOREST]:           '/tiles/forest.svg',
  [TILE.MOUNTAIN]:         '/tiles/mountain.svg',
  [TILE.SAND]:             '/tiles/sand.svg',
  [TILE.SHALLOW_WATER]:    '/tiles/water_shallow.svg',
  [TILE.GRASS_LUSH]:       '/tiles/grass_lush.svg',
  [TILE.GRASS_SABANA]:     '/tiles/grass_sabana.svg',
  [TILE.SAND_TROPICAL]:    '/tiles/sand_tropical.svg',
  [TILE.JUNGLE_SOIL]:      '/tiles/jungle_soil.svg',
  [TILE.MOUNTAIN_SNOW]:    '/tiles/mountain_snow.svg',
  [TILE.MOUNTAIN_VOLCANO]: '/tiles/mountain_volcano.svg',
  [TILE.RIVER]:            '/tiles/river_flow.svg',
  // Variantes (Sprint 14.5)
  'grass_alt1':  '/tiles/grass_alt1.svg',
  'grass_alt2':  '/tiles/grass_alt2.svg',
  'forest_alt1': '/tiles/forest_alt1.svg',
  'forest_alt2': '/tiles/forest_alt2.svg',
  'river_corner': '/tiles/river_corner.svg',
  'river_t_junction': '/tiles/river_t_junction.svg',
  // Decoraciones (Sprint 14.5)
  'cactus':      '/tiles/cactus.svg',
  'dead_tree':   '/tiles/dead_tree.svg',
  'jungle_tree': '/tiles/jungle_tree.svg',
  'palm_tree':   '/tiles/palm_tree.svg',
  'pine_tree':   '/tiles/pine_tree.svg',
  'reeds':       '/tiles/reeds.svg',
  // VFX
  'shadow':      '/ui/vfx_shadow_cast.svg',
};

export type TileSpriteMap = Map<TileId | string, HTMLImageElement>;

export function useTileSprites(): TileSpriteMap {
  const [sprites, setSprites] = useState<TileSpriteMap>(new Map());
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const entries = Object.entries(TILE_SPRITE_URLS) as Array<[string, string]>;
    const map: TileSpriteMap = new Map();
    let remaining = entries.length;

    for (const [tileId, url] of entries) {
      const img = new Image();
      img.onload = () => {
        // Si el tileId es un número (del enum TILE), lo guardamos como número,
        // si no (decoraciones), como string.
        const key = isNaN(Number(tileId)) ? tileId : Number(tileId);
        map.set(key as any, img);
        remaining -= 1;
        if (remaining === 0) setSprites(new Map(map));
      };
      img.onerror = () => {
        remaining -= 1;
        if (remaining === 0) setSprites(new Map(map));
      };
      img.src = url;
    }
  }, []);

  return sprites;
}
