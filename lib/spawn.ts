/**
 * Spawn costero del clan — Sprint #5 Fase 5 SPAWN-COSTERO.
 */

import { nextInt, type PRNGState } from './prng';
import { TILE, type WorldMap } from './world-state';
import type { Position } from './npcs';

export interface Island {
  tiles: Position[];
  shoreTiles: Position[];
  centroid: Position;
  bounds: { minX: number; maxX: number; minY: number; maxY: number; };
}

export interface ClanSpawn {
  islandIndex: number;
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

export function findIslands(world: WorldMap): Island[] {
  const { width, height, tiles } = world;
  const visited = new Uint8Array(width * height);
  const islands: Island[] = [];
  for (let start = 0; start < tiles.length; start++) {
    if (visited[start] || !isLandTile(tiles[start])) continue;
    const queue: number[] = [start];
    visited[start] = 1;
    const members: Position[] = []; const shore: Position[] = [];
    let sumX = 0, sumY = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    while (queue.length > 0) {
      const cur = queue.shift() as number; const x = cur % width, y = Math.floor(cur / width);
      members.push({ x, y });
      if (tiles[cur] === TILE.SHORE) shore.push({ x, y });
      sumX += x; sumY += y;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      const dx = [-1, 1, 0, 0], dy = [0, 0, -1, 1];
      for (let i = 0; i < 4; i++) {
        const nx = x + dx[i], ny = y + dy[i];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const nIdx = ny * width + nx;
        if (visited[nIdx] || !isLandTile(tiles[nIdx])) continue;
        visited[nIdx] = 1; queue.push(nIdx);
      }
    }
    const cx = Math.round(sumX / members.length), cy = Math.round(sumY / members.length);
    let centroid: Position = { x: cx, y: cy };
    if (!inside(world, cx, cy) || !isLandTile(tileAt(world, cx, cy))) {
      let bestD = Infinity, best = members[0];
      for (const m of members) {
        const d = Math.abs(m.x - cx) + Math.abs(m.y - cy);
        if (d < bestD) { bestD = d; best = m; }
      }
      centroid = best;
    }
    islands.push({ tiles: members, shoreTiles: shore, centroid, bounds: { minX, maxX, minY, maxY } });
  }
  return islands;
}

/** 
 * ELIGE SPAWN ROBUSTO:
 * 1. Filtra islas que tengan al menos 5 tiles de bosque (madera garantizada).
 * 2. Si no hay ninguna con bosque, elige la isla más grande.
 */
export function pickClanSpawn(
  seed: number,
  islands: readonly Island[],
  world: WorldMap, // Necesario para comprobar bosques
): ClanSpawn {
  if (islands.length === 0) throw new Error('pickClanSpawn: sin islas');
  
  // Filtrar islas viables (tienen bosque y tamaño razonable)
  const viableIslands = islands.map((isle, idx) => {
    const forestTiles = isle.tiles.filter(t => world.tiles[t.y * world.width + t.x] === TILE.FOREST).length;
    return { idx, forestTiles, size: isle.tiles.length };
  }).filter(info => info.forestTiles >= 5 && info.size >= 50);

  let selectedIdx = 0;
  const prng0: PRNGState = { seed: seed | 0, cursor: 0 };

  if (viableIslands.length > 0) {
    const { value: vIdx } = nextInt(prng0, 0, viableIslands.length);
    selectedIdx = viableIslands[vIdx].idx;
  } else {
    // FALLBACK ROBUSTO: Elegir la isla que tenga MÁS BOSQUES, 
    // sin importar su tamaño total, para garantizar madera inicial.
    let bestIdx = 0;
    let maxForests = -1;
    for (let i = 0; i < islands.length; i++) {
      const fCount = islands[i].tiles.filter(t => world.tiles[t.y * world.width + t.x] === TILE.FOREST).length;
      if (fCount > maxForests) {
        maxForests = fCount;
        bestIdx = i;
      } else if (fCount === maxForests) {
        // Empate en bosques: la más grande
        if (islands[i].tiles.length > islands[bestIdx].tiles.length) {
          bestIdx = i;
        }
      }
    }
    selectedIdx = bestIdx;
  }

  const isle = islands[selectedIdx];
  const pool = isle.shoreTiles.length > 0 ? isle.shoreTiles : isle.tiles;
  const { value: pickIdx } = nextInt(prng0, 0, pool.length);
  return { islandIndex: selectedIdx, center: pool[pickIdx] };
}

export type SpawnZone = 'coast' | 'forest' | 'highland' | 'any';

function matchesZone(tileId: number, zone: SpawnZone): boolean {
  switch (zone) {
    case 'coast':    return tileId === TILE.SHORE;
    case 'forest':   return tileId === TILE.FOREST || tileId === TILE.GRASS;
    case 'highland': return tileId === TILE.MOUNTAIN;
    case 'any':      return isLandTile(tileId);
  }
}

export function pickZonedClanSpawn(
  seed: number,
  islands: readonly Island[],
  world: WorldMap,
  zone: SpawnZone,
): ClanSpawn {
  // Aplicamos la misma lógica de robustez
  const viable = islands.filter(i => i.tiles.length >= 50);
  const poolIslands = viable.length > 0 ? viable : islands;
  
  const prng0: PRNGState = { seed: seed | 0, cursor: 0 };
  const { value: islandIndex } = nextInt(prng0, 0, poolIslands.length);
  const isle = poolIslands[islandIndex];
  const realIdx = islands.indexOf(isle);

  const zoneTiles = isle.tiles.filter((t) => matchesZone(world.tiles[t.y * world.width + t.x], zone));
  const pool = zoneTiles.length > 0 ? zoneTiles : isle.tiles;
  const { value: pickIdx } = nextInt(prng0, 0, pool.length);
  return { islandIndex: realIdx, center: pool[pickIdx] };
}

export function pickLandCells(world: WorldMap, center: Position, n: number): Position[] {
  if (!inside(world, center.x, center.y) || !isLandTile(tileAt(world, center.x, center.y))) throw new Error(`pickLandCells: centro (${center.x},${center.y}) no es tierra`);
  const visited = new Uint8Array(world.width * world.height);
  const out: Position[] = []; const startIdx = center.y * world.width + center.x;
  const queue: number[] = [startIdx]; visited[startIdx] = 1;
  const dx = [-1, 1, 0, 0], dy = [0, 0, -1, 1];
  while (queue.length > 0 && out.length < n) {
    const cur = queue.shift() as number; const x = cur % world.width, y = Math.floor(cur / world.width);
    out.push({ x, y });
    for (let i = 0; i < 4; i++) {
      const nx = x + dx[i], ny = y + dy[i];
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      const nIdx = ny * world.width + nx;
      if (visited[nIdx] || !isLandTile(world.tiles[nIdx])) continue;
      visited[nIdx] = 1; queue.push(nIdx);
    }
  }
  const available = out.length;
  while (out.length < n) out.push({ ...out[out.length % available] });
  return out;
}
