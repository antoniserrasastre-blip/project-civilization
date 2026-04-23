/**
 * Heatmap de presencia territorial — Sprint 12.
 *
 * Cada tick, los NPCs vivos "pintan" influencia en los tiles dentro de
 * su radio de presencia. La influencia decae exponencialmente cuando los
 * NPCs se alejan. Valores enteros 0–INFLUENCE_MAX para garantizar
 * round-trip JSON sin precisión flotante.
 *
 * Contrato §A4: puro, determinista, round-trip JSON.
 */

import type { NPC } from './npcs';
import { CASTA } from './npcs';

/** Valor máximo de influencia por tile. */
export const INFLUENCE_MAX = 1000;

/** Tasa de decaimiento por tick (se multiplica: value * RATE / 1000).
 *  0.98 → pierde ~2% de influencia por tick sin presencia de NPCs. */
export const INFLUENCE_DECAY_RATE = 980;

/** Radio Manhattan en el que un NPC deja huella de presencia. */
export const INFLUENCE_RADIUS = 3;

/** Contribución base por tick según casta. */
export const INFLUENCE_CASTA_WEIGHT: Record<string, number> = {
  [CASTA.ELEGIDO]: 12,
  [CASTA.CIUDADANO]: 6,
  [CASTA.ESCLAVO]: 3,
};

/** Array plano row-major: `grid[y * width + x]`. Valores 0–INFLUENCE_MAX. */
export type InfluenceGrid = number[];

/** Construye un grid de influencia vacío (todo ceros). */
export function emptyInfluenceGrid(width: number, height: number): InfluenceGrid {
  return new Array(width * height).fill(0);
}

/** Avanza el heatmap un tick. Pura — no muta el grid de entrada.
 *
 *  1. Aplica decay a todos los tiles (floor).
 *  2. Cada NPC vivo añade influencia a los tiles dentro de INFLUENCE_RADIUS,
 *     con magnitud decreciente según la distancia Manhattan desde su posición.
 *  3. Clamea a [0, INFLUENCE_MAX]. */
export function tickInfluence(
  grid: InfluenceGrid,
  npcs: readonly NPC[],
  width: number,
  height: number,
): InfluenceGrid {
  // Decay
  const next = grid.map((v) => Math.floor((v * INFLUENCE_DECAY_RATE) / 1000));

  // Presencia de NPCs vivos
  for (const npc of npcs) {
    if (!npc.alive) continue;
    const weight = INFLUENCE_CASTA_WEIGHT[npc.casta] ?? INFLUENCE_CASTA_WEIGHT[CASTA.CIUDADANO];
    const { x, y } = npc.position;

    for (let dy = -INFLUENCE_RADIUS; dy <= INFLUENCE_RADIUS; dy++) {
      for (let dx = -INFLUENCE_RADIUS; dx <= INFLUENCE_RADIUS; dx++) {
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist > INFLUENCE_RADIUS) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        // Contribución decrece con la distancia: base − dist * 2, mínimo 1
        const contribution = Math.max(1, weight - dist * 2);
        const idx = ny * width + nx;
        next[idx] = Math.min(INFLUENCE_MAX, next[idx] + contribution);
      }
    }
  }

  return next;
}
