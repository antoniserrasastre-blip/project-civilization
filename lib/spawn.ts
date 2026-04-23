/**
 * Spawn costero del clan — Sprint #5 Fase 5 SPAWN-COSTERO.
 *
 * Reemplaza el hardcode `SPAWN_CENTER=(85,73)` del patch rápido
 * por selección automática:
 *
 *   1. `findIslands(world)` detecta componentes conexos de tiles
 *      non-water mediante flood-fill 4-vecinos.
 *   2. `pickClanSpawn(seed, islands)` elige UNA isla y un tile
 *      costero dentro de ella, todo determinista por seed.
 *   3. `pickLandCells(world, center, n)` expande BFS desde el
 *      centro y devuelve las N celdas de tierra más cercanas —
 *      base para repartir los 14 NPCs sin aterrizar ninguno en
 *      agua.
 *
 * API pensada para Fase 7 (rival): el dios enemigo pedirá otra
 * isla distinta; añadir `excludeIslandIndices` será un parámetro
 * opcional cuando aterrice ese sprint.
 *
 * Reglas §A4: puro, sin side effects, sin PRNG oculto. La
 * aleatoriedad deriva siempre de (seed, cursor).
 */

import { nextInt, type PRNGState } from './prng';
import { TILE, type WorldMap } from './world-state';
import type { Position } from './npcs';

/** Componente conexo non-water del mundo. */
export interface Island {
  /** Tiles de la isla en coordenadas XY. El orden es el de descubrimiento
   *  por flood-fill — determinista dado el mismo mapa. */
  tiles: Position[];
  /** Subconjunto de `tiles` cuyo TILE original es SHORE. */
  shoreTiles: Position[];
  /** Centroide entero dentro de la isla. Si el centroide matemático
   *  cae en agua (isla cóncava) se ajusta al miembro más cercano. */
  centroid: Position;
  /** Bounding box inclusivo. */
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface ClanSpawn {
  /** Índice del `Island` seleccionado dentro del array original. */
  islandIndex: number;
  /** Centro canónico del clan — un tile costero si la isla tiene
   *  shore; si no, el centroide. */
  center: Position;
}

function inside(world: WorldMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < world.width && y < world.height;
}

function tileAt(world: WorldMap, x: number, y: number): number {
  return world.tiles[y * world.width + x];
}

function isLandTile(tile: number): boolean {
  return tile !== TILE.WATER && tile !== TILE.SHALLOW_WATER;
}

/** 4-vecinos flood-fill. Conectividad diagonal explícitamente
 *  excluida (dos tiles sólo cuentan como una isla si comparten
 *  arista, no esquina). */
export function findIslands(world: WorldMap): Island[] {
  const { width, height, tiles } = world;
  const visited = new Uint8Array(width * height);
  const islands: Island[] = [];

  for (let start = 0; start < tiles.length; start++) {
    if (visited[start]) continue;
    if (!isLandTile(tiles[start])) continue;

    const queue: number[] = [start];
    visited[start] = 1;
    const members: Position[] = [];
    const shore: Position[] = [];
    let sumX = 0;
    let sumY = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    while (queue.length > 0) {
      const cur = queue.shift() as number;
      const x = cur % width;
      const y = Math.floor(cur / width);
      members.push({ x, y });
      if (tiles[cur] === TILE.SHORE) shore.push({ x, y });
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      const dx = [-1, 1, 0, 0];
      const dy = [0, 0, -1, 1];
      for (let i = 0; i < 4; i++) {
        const nx = x + dx[i];
        const ny = y + dy[i];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (visited[nIdx]) continue;
        if (!isLandTile(tiles[nIdx])) continue;
        visited[nIdx] = 1;
        queue.push(nIdx);
      }
    }

    const cx = Math.round(sumX / members.length);
    const cy = Math.round(sumY / members.length);
    let centroid: Position = { x: cx, y: cy };
    if (!inside(world, cx, cy) || !isLandTile(tileAt(world, cx, cy))) {
      // Miembro más cercano al centroide matemático (Manhattan).
      let bestD = Infinity;
      let best = members[0];
      for (const m of members) {
        const d = Math.abs(m.x - cx) + Math.abs(m.y - cy);
        if (d < bestD) {
          bestD = d;
          best = m;
        }
      }
      centroid = best;
    }

    islands.push({
      tiles: members,
      shoreTiles: shore,
      centroid,
      bounds: { minX, maxX, minY, maxY },
    });
  }
  return islands;
}

/** Elige una isla y un tile costero dentro de ella. Determinista
 *  por seed. Prefiere shore tiles; si la isla no tiene (raro) cae
 *  sobre el centroide. */
export function pickClanSpawn(
  seed: number,
  islands: readonly Island[],
): ClanSpawn {
  if (islands.length === 0) {
    throw new Error('pickClanSpawn: sin islas — no hay dónde poblar');
  }
  const prng0: PRNGState = { seed: seed | 0, cursor: 0 };
  const { value: islandIndex, next: prng1 } = nextInt(
    prng0,
    0,
    islands.length,
  );
  const isle = islands[islandIndex];
  const pool = isle.shoreTiles.length > 0 ? isle.shoreTiles : isle.tiles;
  const { value: pickIdx } = nextInt(prng1, 0, pool.length);
  const center = pool[pickIdx];
  return { islandIndex, center };
}

/** Tipo de zona de spawn — corresponde con ScenarioDef.preferredSpawnZone. */
export type SpawnZone = 'coast' | 'forest' | 'highland' | 'any';

function matchesZone(tileId: number, zone: SpawnZone): boolean {
  switch (zone) {
    case 'coast':    return tileId === TILE.SHORE;
    case 'forest':   return tileId === TILE.FOREST || tileId === TILE.GRASS;
    case 'highland': return tileId === TILE.MOUNTAIN;
    case 'any':      return isLandTile(tileId);
  }
}

/** Como `pickClanSpawn` pero respeta una zona de spawn preferida.
 *  Si la isla elegida no tiene tiles de la zona (raro), cae al
 *  pool completo de tierra de la isla. */
export function pickZonedClanSpawn(
  seed: number,
  islands: readonly Island[],
  world: WorldMap,
  zone: SpawnZone,
): ClanSpawn {
  if (islands.length === 0) {
    throw new Error('pickZonedClanSpawn: sin islas — no hay dónde poblar');
  }
  const prng0: PRNGState = { seed: seed | 0, cursor: 0 };
  const { value: islandIndex, next: prng1 } = nextInt(prng0, 0, islands.length);
  const isle = islands[islandIndex];

  const zoneTiles = isle.tiles.filter((t) =>
    matchesZone(world.tiles[t.y * world.width + t.x], zone),
  );
  const pool = zoneTiles.length > 0 ? zoneTiles : isle.tiles;
  const { value: pickIdx } = nextInt(prng1, 0, pool.length);
  return { islandIndex, center: pool[pickIdx] };
}

/** BFS desde `center` por tiles no-water. Devuelve las `n` celdas
 *  más cercanas. Determinista: el orden de expansión sigue el
 *  mismo patrón de vecinos 4-direccional. */
export function pickLandCells(
  world: WorldMap,
  center: Position,
  n: number,
): Position[] {
  if (
    !inside(world, center.x, center.y) ||
    !isLandTile(tileAt(world, center.x, center.y))
  ) {
    throw new Error(
      `pickLandCells: centro (${center.x},${center.y}) no es tierra`,
    );
  }
  const visited = new Uint8Array(world.width * world.height);
  const out: Position[] = [];
  const startIdx = center.y * world.width + center.x;
  const queue: number[] = [startIdx];
  visited[startIdx] = 1;
  const dx = [-1, 1, 0, 0];
  const dy = [0, 0, -1, 1];
  while (queue.length > 0 && out.length < n) {
    const cur = queue.shift() as number;
    const x = cur % world.width;
    const y = Math.floor(cur / world.width);
    out.push({ x, y });
    for (let i = 0; i < 4; i++) {
      const nx = x + dx[i];
      const ny = y + dy[i];
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      const nIdx = ny * world.width + nx;
      if (visited[nIdx]) continue;
      if (!isLandTile(world.tiles[nIdx])) continue;
      visited[nIdx] = 1;
      queue.push(nIdx);
    }
  }
  if (out.length < n) {
    throw new Error(
      `pickLandCells: tiles insuficientes (${out.length} < ${n})`,
    );
  }
  return out;
}
