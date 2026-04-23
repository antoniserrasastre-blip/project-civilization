'use client';

/**
 * Precarga los SVGs de tiles y devuelve un Map<TileId, HTMLImageElement>.
 * Mientras carga devuelve un map vacío — el canvas cae al fallback de color.
 */

import { useEffect, useRef, useState } from 'react';
import { TILE, type TileId } from '@/lib/world-state';

const TILE_SPRITE_URLS: Record<TileId, string> = {
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
};

export type TileSpriteMap = Map<TileId, HTMLImageElement>;

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
        map.set(Number(tileId) as TileId, img);
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
