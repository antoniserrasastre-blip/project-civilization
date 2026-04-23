/**
 * Colocación inteligente de edificios — Sprint 14.5 URBANISMO-SAGRADO.
 *
 * Reemplaza el `anchor.position` (primer NPC vivo) por evaluación real
 * del terreno. Cada tipo de edificio tiene criterios distintos:
 *   - Fogata: agua cercana, recursos variados, grass/sand.
 *   - Refugio: en semicírculo alrededor del fuego, radio de exclusión.
 *   - Despensa/Piel: cerca del fuego pero con margen.
 *
 * §A4: puro, determinista, sin PRNG.
 */

import { TILE, type WorldMap, type ResourceSpawn } from './world-state';
import { RESOURCE } from './world-state';
import type { Structure } from './structures';
import { CRAFTABLE, type CraftableId } from './crafting';

/** Radio mínimo entre dos estructuras (evita apilarlas). */
export const EXCLUSION_RADIUS = 2;

/** Radio dentro del cual un edificio cerca de la Fogata
 *  recibe el bono de cohesión (+20% velocidad). */
export const COHESION_RADIUS = 8;

/** Radio en el que la Despensa aumenta la capacidad de inventario. */
export const DESPENSA_BONUS_RADIUS = 5;

/** Bonus de inventario de la Despensa (unidades extra por tipo). */
export const DESPENSA_INVENTORY_BONUS = 3;

function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

/** Tiles válidos para construir (no agua, no montaña). */
export function isValidBuildTile(world: WorldMap, pos: { x: number; y: number }): boolean {
  if (pos.x < 0 || pos.y < 0 || pos.x >= world.width || pos.y >= world.height) return false;
  const tile = world.tiles[pos.y * world.width + pos.x];
  return tile === TILE.GRASS || tile === TILE.SAND || tile === TILE.SHORE || tile === TILE.FOREST;
}

/** Puntúa un tile como candidato para la Fogata.
 *  Agua ≤10 tiles: +10. Bayas ≤8 tiles: +5. Madera ≤8 tiles: +5. */
export function scoreFogataSite(
  world: WorldMap,
  pos: { x: number; y: number },
): number {
  let score = 0;
  for (const r of world.resources) {
    if (r.quantity <= 0) continue;
    const d = manhattan(pos.x, pos.y, r.x, r.y);
    if (r.id === RESOURCE.WATER && d <= 10) score += 10;
    if (r.id === RESOURCE.BERRY && d <= 8) score += 5;
    if (r.id === RESOURCE.WOOD  && d <= 8) score += 5;
    if (r.id === RESOURCE.FISH  && d <= 6) score += 3;
  }
  return score;
}

/** ¿Hay alguna estructura a menos de minDist tiles de pos? */
function tooClose(
  structures: readonly Structure[],
  pos: { x: number; y: number },
  minDist: number,
): boolean {
  return structures.some(
    (s) => manhattan(pos.x, pos.y, s.position.x, s.position.y) < minDist,
  );
}

/** Devuelve el multiplicador de velocidad de construcción según la
 *  proximidad a la Fogata (bono de cohesión). */
export function cohesionMultiplier(
  pos: { x: number; y: number },
  structures: readonly Structure[],
): number {
  const fire = structures.find((s) => s.kind === CRAFTABLE.FOGATA_PERMANENTE);
  if (!fire) return 1.0;
  const d = manhattan(pos.x, pos.y, fire.position.x, fire.position.y);
  return d <= COHESION_RADIUS ? 1.2 : 1.0;
}

/** Genera los tiles en expansión BFS desde `center` por tiles de tierra
 *  válidos, ordenados por distancia creciente. Límite `maxSearch`. */
function candidateTiles(
  world: WorldMap,
  center: { x: number; y: number },
  maxSearch = 200,
): Array<{ x: number; y: number }> {
  const visited = new Set<number>();
  const out: Array<{ x: number; y: number }> = [];
  const queue: Array<{ x: number; y: number }> = [center];
  visited.add(center.y * world.width + center.x);

  while (queue.length > 0 && out.length < maxSearch) {
    const cur = queue.shift()!;
    if (isValidBuildTile(world, cur)) out.push(cur);
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      const idx = ny * world.width + nx;
      if (visited.has(idx)) continue;
      visited.add(idx);
      queue.push({ x: nx, y: ny });
    }
  }
  return out;
}

/**
 * Elige el mejor tile para un edificio dado.
 *
 * - FOGATA_PERMANENTE: maximiza scoreFogataSite, sin exclusión.
 * - REFUGIO / DESPENSA / PIEL_ROPA: respeta EXCLUSION_RADIUS respecto
 *   a estructuras existentes, colocado en anillo alrededor del fuego.
 */
export function findBuildSite(
  world: WorldMap,
  structures: readonly Structure[],
  kind: CraftableId,
  anchor: { x: number; y: number },
): { x: number; y: number } {
  const fire = structures.find((s) => s.kind === CRAFTABLE.FOGATA_PERMANENTE);
  const searchCenter = fire ? fire.position : anchor;
  const candidates = candidateTiles(world, searchCenter);

  if (kind === CRAFTABLE.FOGATA_PERMANENTE) {
    // Para la fogata: buscar en radio expandido desde el ancla y elegir
    // el tile con mejor score de recursos (agua + comida).
    const anchCandidates = candidateTiles(world, anchor, 400);
    let best = anchor;
    let bestScore = -1;
    for (const c of anchCandidates) {
      const s = scoreFogataSite(world, c);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    return best;
  }

  // Para el resto: respetar el radio de exclusión y preferir tiles cercanos.
  for (const c of candidates) {
    if (!tooClose(structures, c, EXCLUSION_RADIUS)) return c;
  }
  // Fallback si no hay tile libre
  return anchor;
}
