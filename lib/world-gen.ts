/**
 * Generador del archipiélago primigenia V2 — "Geología Sagrada".
 *
 * Soporta escenarios cartográficos: Archipiélago, Pangea, Continentes.
 */

import {
  next as prngNext,
  nextInt,
  nextRange,
  seedState,
  type PRNGState,
} from './prng';
import { buildPermTable, normalizedNoise } from './noise';
import {
  TILE,
  RESOURCE,
  type TileId,
  type ResourceId,
  type WorldMap,
  type ResourceSpawn,
} from './world-state';

export const CANONICAL_SEED = 20260419;
const GENERATOR_VERSION = 5; // Refactor: Tipos de mapa (Archipiélago, Pangea, Continentes)

export type MapType = 'archipelago' | 'pangea' | 'continents';

export interface WorldGenOpts {
  width?: number;
  height?: number;
  type?: MapType;
}

const NOISE_CONFIG = {
  elevation: { scale: 0.004, octaves: 6, persistence: 0.5, lacunarity: 2.1 },
  moisture:  { scale: 0.005, octaves: 4, persistence: 0.5, lacunarity: 2.0 },
};

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function getBiomeFromMatrix(e: number, m: number): TileId {
  if (e < 0.25) return TILE.WATER;
  if (e < 0.32) return TILE.SHALLOW_WATER;
  if (e < 0.40) {
    if (m > 0.65) return TILE.SAND_TROPICAL;
    if (m < 0.25) return TILE.SAND;
    return TILE.GRASS;
  }
  if (e < 0.65) {
    if (m < 0.25) return TILE.GRASS_SABANA;
    if (m < 0.60) return TILE.GRASS;
    if (m < 0.75) return TILE.FOREST;
    return TILE.JUNGLE_SOIL;
  }
  if (e < 0.85) {
    if (m > 0.75) return TILE.MOUNTAIN_VOLCANO;
    return TILE.MOUNTAIN;
  }
  return TILE.MOUNTAIN_SNOW;
}

/** 
 * Máscara Dinámica: define la forma de la tierra.
 * archipelago -> muchas manchas circulares.
 * pangea -> una mancha central gigante.
 * continents -> 5 manchas grandes.
 */
function applyMapTypeMask(
  val: number, x: number, y: number, w: number, h: number, 
  type: MapType, prng: PRNGState
): { value: number, next: PRNGState } {
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  
  if (type === 'pangea') {
    const dist = Math.sqrt(nx * nx + ny * ny);
    const mask = Math.max(0, 1 - dist * 1.2);
    return { value: val * mask, next: prng };
  }

  // Para archipiélago y continentes, usamos una suma de distancias a centros
  // Generamos los centros una sola vez (esto es ineficiente aquí, pero ilustrativo)
  // En la implementación real, los centros se pre-calculan en generateWorld.
  return { value: val, next: prng }; // Placeholder para el pipeline real abajo
}

function markCoastline(tiles: TileId[], width: number, height: number): void {
  const toShore: number[] = [];
  const neighbors = [{ dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const t = tiles[idx];
      // Shore puede aparecer en arena y hierba (toda la costa), 
      // pero NUNCA en bosques o montañas (para preservar recursos).
      if (t !== TILE.SAND && t !== TILE.SAND_TROPICAL && t !== TILE.GRASS && t !== TILE.GRASS_SABANA) continue;
      
      let isOnCoast = false;
      for (const n of neighbors) {
        const nx = x + n.dx; const ny = y + n.dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const nt = tiles[ny * width + nx];
        // En este caso, permitimos que cualquier tipo de agua cree una orilla visual.
        if (nt === TILE.WATER || nt === TILE.SHALLOW_WATER) { isOnCoast = true; break; }
      }
      if (isOnCoast) toShore.push(idx);
    }
  }
  for (const idx of toShore) tiles[idx] = TILE.SHORE;
}

export function generateWorld(
  seed: number,
  opts: WorldGenOpts = {},
): WorldMap {
  const width = opts.width ?? 512;
  const height = opts.height ?? 512;
  const mapType = opts.type ?? 'archipelago';
  
  let prng = seedState(seed);
  const elevPerm = buildPermTable(seed ^ 0x11111111);
  const moistPerm = buildPermTable(seed ^ 0x22222222);

  // Pre-calcular centros de masa de tierra según el tipo
  const blobs: Array<{ x: number, y: number, r: number }> = [];
  if (mapType === 'pangea') {
    blobs.push({ x: 0.5, y: 0.5, r: 0.8 });
  } else if (mapType === 'continents') {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const xR = nextRange(prng, 0.2, 0.8); prng = xR.next;
      const yR = nextRange(prng, 0.2, 0.8); prng = yR.next;
      blobs.push({ x: xR.value, y: yR.value, r: 0.35 });
    }
  } else { // archipelago
    const count = 12;
    for (let i = 0; i < count; i++) {
      const xR = nextRange(prng, 0.1, 0.9); prng = xR.next;
      const yR = nextRange(prng, 0.1, 0.9); prng = yR.next;
      const sizeR = nextRange(prng, 0.1, 0.25); prng = sizeR.next;
      blobs.push({ x: xR.value, y: yR.value, r: sizeR.value });
    }
  }

  const tiles = new Array<TileId>(width * height);
  const elevMap = new Array<number>(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const nx = x / width;
      const ny = y / height;
      
      // Ruido base
      const e = normalizedNoise(elevPerm, x * NOISE_CONFIG.elevation.scale, y * NOISE_CONFIG.elevation.scale, 
                              NOISE_CONFIG.elevation.octaves, NOISE_CONFIG.elevation.persistence, NOISE_CONFIG.elevation.lacunarity);
      
      // Aplicar máscara multi-blob
      let mask = 0;
      for (const b of blobs) {
        const dx = nx - b.x;
        const dy = ny - b.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        mask = Math.max(mask, 1 - d / b.r);
      }
      
      const finalE = e * mask;
      elevMap[idx] = finalE;

      const m = normalizedNoise(moistPerm, x * NOISE_CONFIG.moisture.scale, y * NOISE_CONFIG.moisture.scale,
                                NOISE_CONFIG.moisture.octaves, NOISE_CONFIG.moisture.persistence, NOISE_CONFIG.moisture.lacunarity);
      
      tiles[idx] = getBiomeFromMatrix(finalE, m);
    }
  }

  markCoastline(tiles, width, height);
  prng = applyRivers(tiles, elevMap, width, height, prng);
  const { spawns, next: n2 } = scatterResources(prng, tiles, width, height);
  const preHash = simpleHash(JSON.stringify({ seed, width, height, islandCount: blobs.length }));

  return {
    seed, width, height, tiles, resources: spawns,
    meta: { generatorVersion: GENERATOR_VERSION, shaHash: preHash, islandCount: blobs.length },
  };
}

// ... (funciones auxiliares getTileVariant, getRiverVariant, applyRivers, scatterResources permanecen igual)

/** Variantes visuales deterministas. */
export function getTileVariant(
  tileId: TileId,
  x: number,
  y: number,
  seed: number,
  world?: WorldMap,
): string | TileId {
  if (tileId !== TILE.FOREST && tileId !== TILE.GRASS) {
    if (tileId === TILE.RIVER && world) return getRiverVariant(x, y, world);
    return tileId;
  }
  const h = (seed ^ (x * 7919) ^ (y * 5231)) >>> 0;
  const mod = h % 10;
  if (tileId === TILE.FOREST) {
    if (mod < 2) return 'forest_alt1';
    if (mod < 4) return 'forest_alt2';
    return TILE.FOREST;
  }
  if (tileId === TILE.GRASS) {
    if (mod < 2) return 'grass_alt1';
    if (mod < 4) return 'grass_alt2';
    return TILE.GRASS;
  }
  return tileId;
}

function getRiverVariant(x: number, y: number, world: WorldMap): string {
  const connections = [
    { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
  ].map(n => {
    const nx = x + n.dx; const ny = y + n.dy;
    if (nx < 0 || nx >= world.width || ny < 0 || ny >= world.height) return false;
    return world.tiles[ny * world.width + nx] === TILE.RIVER;
  });
  const count = connections.filter(Boolean).length;
  if (count >= 3) return 'river_t_junction';
  if (count === 2) {
    const [n, e, s, w] = connections;
    if ((n && s) || (e && w)) return 'river_flow';
    return 'river_corner';
  }
  return 'river_flow';
}

function applyRivers(
  tiles: TileId[],
  elevMap: number[],
  width: number,
  height: number,
  prng: PRNGState,
): PRNGState {
  let currentPrng = prng;
  const rivCount = 5;
  const peaks: number[] = [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === TILE.MOUNTAIN_SNOW || tiles[i] === TILE.MOUNTAIN) peaks.push(i);
  }
  if (peaks.length === 0) return currentPrng;
  for (let r = 0; r < rivCount; r++) {
    const { value: startIdx, next: n1 } = nextInt(currentPrng, 0, peaks.length);
    currentPrng = n1;
    let curr = peaks[startIdx];
    const visited = new Set<number>();
    for (let step = 0; step < 1000; step++) {
      if (visited.has(curr)) break;
      visited.add(curr);
      const cx = curr % width; const cy = Math.floor(curr / width);
      if (tiles[curr] === TILE.WATER || tiles[curr] === TILE.SHALLOW_WATER) break;
      if (tiles[curr] !== TILE.MOUNTAIN_SNOW) tiles[curr] = TILE.RIVER;
      let bestNeighbor = curr;
      let minElev = elevMap[curr];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx; const ny = cy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (elevMap[nIdx] < minElev) { minElev = elevMap[nIdx]; bestNeighbor = nIdx; }
        }
      }
      if (bestNeighbor === curr) break;
      curr = bestNeighbor;
    }
  }
  return currentPrng;
}

function scatterResources(
  prngIn: PRNGState,
  tiles: TileId[],
  width: number,
  height: number,
): { spawns: ResourceSpawn[]; next: PRNGState } {
  const spawns: ResourceSpawn[] = [];
  let prng = prngIn;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const tile = tiles[idx];
      const r = prngNext(prng);
      prng = r.next;
      let res: ResourceId | null = null;
      let quantityRange: [number, number] = [10, 20];
      let regime: 'regenerable' | 'depletable' | 'continuous' = 'regenerable';
      switch (tile) {
        case TILE.FOREST:
        case TILE.JUNGLE_SOIL:
          if (r.value < 0.12) { res = RESOURCE.WOOD; quantityRange = [20, 40]; }
          else if (r.value < 0.14) { res = RESOURCE.BERRY; }
          else if (r.value > 0.98) { res = RESOURCE.GAME; quantityRange = [3, 8]; }
          break;
        case TILE.GRASS_SABANA:
          if (r.value < 0.08) { res = RESOURCE.STONE; regime = 'depletable'; quantityRange = [8, 20]; }
          else if (r.value > 0.96) { res = RESOURCE.GAME; quantityRange = [2, 5]; }
          break;
        case TILE.GRASS:
        case TILE.GRASS_LUSH:
          if (r.value < 0.015) { res = RESOURCE.BERRY; }
          else if (r.value > 0.985) { res = RESOURCE.GAME; quantityRange = [2, 5]; }
          else if (r.value > 0.975 && r.value <= 0.985) { res = RESOURCE.STONE; regime = 'depletable'; quantityRange = [5, 15]; }
          break;
        case TILE.MOUNTAIN:
        case TILE.MOUNTAIN_SNOW:
          if (r.value < 0.15) { res = RESOURCE.STONE; regime = 'depletable'; quantityRange = [30, 60]; }
          else if (r.value < 0.17) { res = RESOURCE.OBSIDIAN; regime = 'depletable'; quantityRange = [5, 15]; }
          break;
        case TILE.MOUNTAIN_VOLCANO:
          if (r.value < 0.25) { res = RESOURCE.OBSIDIAN; regime = 'depletable'; quantityRange = [10, 25]; }
          break;
        case TILE.SHORE:
        case TILE.SAND_TROPICAL:
          if (r.value < 0.05) { res = RESOURCE.SHELL; }
          else if (r.value > 0.96) { res = RESOURCE.WATER; regime = 'continuous'; }
          break;
        case TILE.RIVER:
          if (r.value < 0.15) { res = RESOURCE.WATER; regime = 'continuous'; }
          break;
        case TILE.SHALLOW_WATER:
          if (r.value < 0.03) { res = RESOURCE.FISH; regime = 'continuous'; }
          break;
      }
      if (res) {
        const q = nextInt(prng, quantityRange[0], quantityRange[1] + 1);
        prng = q.next;
        const isBiotic = [RESOURCE.WOOD, RESOURCE.BERRY, RESOURCE.FISH, RESOURCE.GAME, RESOURCE.COCONUT, RESOURCE.MUSHROOM].includes(res);
        const isWater = res === RESOURCE.WATER;
        
        spawns.push({
          id: res,
          x, y,
          quantity: isWater ? 9999 : q.value,
          initialQuantity: isWater ? 9999 : (isBiotic ? q.value : q.value * 20),
          regenerationRate: isWater ? 100 : (isBiotic ? Math.max(1, Math.floor(q.value / 10)) : 0),
        });
      }
    }
  }
  return { spawns, next: prng };
}
