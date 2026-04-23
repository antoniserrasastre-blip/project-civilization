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

/** Radio y peso de las estructuras. Son anclas permanentes —
 *  emiten más que un Elegido y con radio mayor para marcar
 *  el territorio incluso cuando los NPCs se alejan. */
export const STRUCTURE_INFLUENCE_WEIGHT = 20;
export const STRUCTURE_INFLUENCE_RADIUS = 5;

/** Array plano row-major: `grid[y * width + x]`. Valores 0–INFLUENCE_MAX. */
export type InfluenceGrid = number[];

/** Construye un grid de influencia vacío (todo ceros). */
export function emptyInfluenceGrid(width: number, height: number): InfluenceGrid {
  return new Array(width * height).fill(0);
}

/** Tipo mínimo que necesita tickInfluence para procesar estructuras.
 *  Compatible con Structure de lib/structures.ts sin acoplamiento. */
export interface InfluenceSource {
  position: { x: number; y: number };
}

/** Pinta influencia desde un punto emisor en el grid. Reutilizable
 *  tanto para NPCs como para estructuras. */
function paintInfluence(
  next: number[],
  x: number,
  y: number,
  weight: number,
  radius: number,
  width: number,
  height: number,
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const dist = Math.abs(dx) + Math.abs(dy);
      if (dist > radius) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const contribution = Math.max(1, weight - dist * 2);
      const idx = ny * width + nx;
      next[idx] = Math.min(INFLUENCE_MAX, next[idx] + contribution);
    }
  }
}

/** Avanza el heatmap un tick. Pura — no muta el grid de entrada.
 *
 *  1. Aplica decay a todos los tiles (floor).
 *  2. Cada NPC vivo añade influencia dentro de INFLUENCE_RADIUS.
 *  3. Cada estructura añade influencia dentro de STRUCTURE_INFLUENCE_RADIUS
 *     con peso STRUCTURE_INFLUENCE_WEIGHT — son anclas permanentes que
 *     mantienen el territorio incluso cuando los NPCs se alejan.
 *  4. Clamea a [0, INFLUENCE_MAX]. */
export function tickInfluence(
  grid: InfluenceGrid,
  npcs: readonly NPC[],
  width: number,
  height: number,
  structures: readonly InfluenceSource[] = [],
): InfluenceGrid {
  const next = grid.map((v) => Math.floor((v * INFLUENCE_DECAY_RATE) / 1000));

  for (const npc of npcs) {
    if (!npc.alive) continue;
    const weight = INFLUENCE_CASTA_WEIGHT[npc.casta] ?? INFLUENCE_CASTA_WEIGHT[CASTA.CIUDADANO];
    paintInfluence(next, npc.position.x, npc.position.y, weight, INFLUENCE_RADIUS, width, height);
  }

  for (const s of structures) {
    paintInfluence(next, s.position.x, s.position.y,
      STRUCTURE_INFLUENCE_WEIGHT, STRUCTURE_INFLUENCE_RADIUS, width, height);
  }

  return next;
}
