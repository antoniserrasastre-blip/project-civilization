'use client';

/**
 * Precarga los sprites de unidades desde /public/units/.
 * Devuelve un Map<SpriteKey, HTMLImageElement> listo para ctx.drawImage.
 * Mientras carga devuelve un map vacío — el canvas cae al fallback geométrico.
 */

import { useEffect, useRef, useState } from 'react';
import { SPRITE_URLS, type SpriteKey } from '@/lib/npc-sprite';

export type { SpriteKey as UnitSpriteKey } from '@/lib/npc-sprite';
export type SpriteMap = Map<SpriteKey, HTMLImageElement>;

export function useUnitSprites(): SpriteMap {
  const [sprites, setSprites] = useState<SpriteMap>(new Map());
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const entries = Object.entries(SPRITE_URLS) as [SpriteKey, string][];
    const map: SpriteMap = new Map();
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
