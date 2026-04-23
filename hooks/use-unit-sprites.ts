/**
 * Precarga los sprites de unidades desde /public/units/.
 * Devuelve un Map<nombre, HTMLImageElement> listo para ctx.drawImage.
 * Mientras carga devuelve un map vacío — el canvas cae al fallback geométrico.
 */
'use client';

import { useEffect, useRef, useState } from 'react';

export const UNIT_SPRITES = {
  ELEGIDO:    '/units/unit-elegido.svg',
  GUERRERO:   '/units/unit-guerrero.svg',
  CAZADOR:    '/units/unit-cazador.svg',
  RECOLECTOR: '/units/unit-recolector.svg',
  ARTESANO:   '/units/unit-artesano.svg',
} as const;

export type UnitSpriteKey = keyof typeof UNIT_SPRITES;
export type SpriteMap = Map<UnitSpriteKey, HTMLImageElement>;

export function useUnitSprites(): SpriteMap {
  const [sprites, setSprites] = useState<SpriteMap>(new Map());
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const entries = Object.entries(UNIT_SPRITES) as [UnitSpriteKey, string][];
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
