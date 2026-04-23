'use client';

/**
 * useGratitudeFloaters — hook que deriva floaters efímeros de los
 * cambios del pool de gratitud entre renders.
 *
 * Contrato:
 *   - Input: `VillageState`. Se trackea `gratitude` entre renders.
 *   - Output: array inmutable de `GratitudeFloater` con TTL 1200ms.
 *   - Cada cambio positivo o negativo del pool dispara UN floater
 *     agregado (no uno por evento dentro del tick batched). Si el
 *     render agrupa múltiples eventos, se reportan en conjunto.
 *
 * Nota alcance: el diseño v2 contempla también floaters anclados
 * a la posición del NPC en mapa. Los `gratitudeEventKeys` ya
 * exponen los identificadores de los eventos del día, pero su
 * emparejamiento con posiciones + una cola FIFO en el canvas
 * entra como sprint UI-floaters-map (follow-up). Aquí solo damos
 * el floater HUD agregado — es el canal principal del diseño §4.1.
 *
 * Sin Math.random() (sería impuro), sin lectura de localStorage —
 * el hook es de UI pura.
 */

import { useEffect, useRef, useState } from 'react';
import type { VillageState } from '@/lib/village';

export interface GratitudeFloater {
  id: string;
  delta: number;
  createdAt: number;
}

const FLOATER_TTL_MS = 1200;
const GC_INTERVAL_MS = 250;

export function useGratitudeFloaters(
  village: VillageState,
): readonly GratitudeFloater[] {
  const prevPool = useRef<number>(village.gratitude);
  const seq = useRef<number>(0);
  const [floaters, setFloaters] = useState<GratitudeFloater[]>([]);

  useEffect(() => {
    const prev = prevPool.current;
    const cur = village.gratitude;
    if (cur === prev) return;
    const delta = cur - prev;
    seq.current += 1;
    const id = `g-${seq.current}`;
    const createdAt =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    setFloaters((list) => {
      const trimmed = list.slice(-3);
      return [...trimmed, { id, delta, createdAt }];
    });
    prevPool.current = cur;
  }, [village.gratitude]);

  useEffect(() => {
    if (floaters.length === 0) return;
    const handle = setInterval(() => {
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      setFloaters((list) => list.filter((f) => now - f.createdAt < FLOATER_TTL_MS));
    }, GC_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [floaters.length]);

  return floaters;
}
