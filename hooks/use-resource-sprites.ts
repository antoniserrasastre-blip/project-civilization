'use client';

import { useEffect, useRef, useState } from 'react';

export const RESOURCE_SPRITE_URLS: Record<string, string> = {
  wood:     '/resources/wood.svg',
  stone:    '/resources/stone.svg',
  berry:    '/resources/berry.svg',
  game:     '/resources/game.svg',
  water:    '/resources/water.svg',
  fish:     '/resources/fish.svg',
  obsidian: '/resources/obsidian.svg',
  shell:    '/resources/shell.svg',
};

export type ResourceSpriteMap = Map<string, HTMLImageElement>;

export function useResourceSprites(): ResourceSpriteMap {
  const [sprites, setSprites] = useState<ResourceSpriteMap>(new Map());
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const entries = Object.entries(RESOURCE_SPRITE_URLS);
    const map: ResourceSpriteMap = new Map();
    let remaining = entries.length;

    for (const [key, src] of entries) {
      const img = new Image();
      img.onload = () => {
        map.set(key, img);
        remaining -= 1;
        if (remaining === 0) setSprites(new Map(map));
      };
      img.onerror = () => {
        remaining -= 1;
        if (remaining === 0) setSprites(new Map(map));
      };
      img.src = src;
    }
  }, []);

  return sprites;
}
