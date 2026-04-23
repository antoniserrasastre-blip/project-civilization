/**
 * Generador del archipiélago primigenia V2 — "Geología Sagrada".
 *
 * Basado en la visión de Grand Strategy (CK3, EU4) y WorldBox:
 * 1. Generación por ruido fractal (Simplex) de Elevación y Humedad.
 * 2. Matriz bioclimática de Whittaker para asignar biomas realistas.
 * 3. Erosión hidráulica determinista para trazado de ríos.
 * 4. Distribución de recursos por nicho ecológico.
 */

import { createHash } from 'node:crypto';
import {
  next as prngNext,
  nextInt,
  seedState,
  type PRNGState,
} from './prng';
import { buildPermTable, normalizedNoise } from './noise';
import {
  TILE,
  RESOURCE,
  type TileId,
  type WorldMap,
  type ResourceSpawn,
} from './world-state';

export const CANONICAL_SEED = 20260419;
const GENERATOR_VERSION = 3; // Refactor masivo: Geología Sagrada

export interface WorldGenOpts {
  width?: number;
  height?: number;
}

/** Configuración de ruidos para el generador. */
const NOISE_CONFIG = {
  elevation: { scale: 0.004, octaves: 6, persistence: 0.5, lacunarity: 2.1 },
  moisture:  { scale: 0.005, octaves: 4, persistence: 0.5, lacunarity: 2.0 },
};

/**
 * Matriz de Biomas (Whittaker): (elevación, humedad) -> TileId.
 * Elevación: 0.0 (Mar Profundo) -> 1.0 (Pico Nevado).
 * Humedad: 0.0 (Árido) -> 1.0 (Selva).
 */
function getBiomeFromMatrix(e: number, m: number): TileId {
  // Agua y Costa
  if (e < 0.25) return TILE.WATER;
  if (e < 0.32) return TILE.SHALLOW_WATER;
  if (e < 0.38) {
    // Playas: dependen de la humedad (manglar vs duna)
    return m > 0.6 ? TILE.SAND_TROPICAL : TILE.SHORE;
  }

  // Tierras Bajas y Llanuras
  if (e < 0.65) {
    if (m < 0.25) return TILE.GRASS_SABANA;
    if (m < 0.60) return TILE.GRASS;
    if (m < 0.75) return TILE.FOREST;
    return TILE.JUNGLE_SOIL;
  }

  // Montañas
  if (e < 0.85) {
    if (m > 0.75) return TILE.MOUNTAIN_VOLCANO;
    return TILE.MOUNTAIN;
  }

  // Cumbres
  return TILE.MOUNTAIN_SNOW;
}

/** Aplica una máscara circular para forzar un archipiélago centrado. */
function applyIslandMask(val: number, x: number, y: number, w: number, h: number): number {
  const nx = (x / w) * 2 - 1;
  const ny = (y / h) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);
  // Máscara suave: 1.0 en el centro, cae a 0.0 en los bordes
  const mask = Math.max(0, 1 - dist * 1.4);
  return val * mask;
}

/** Trazado de ríos determinista por camino de menor resistencia. */
function applyRivers(
  tiles: TileId[],
  elevMap: number[],
  width: number,
  height: number,
  prng: PRNGState,
): PRNGState {
  let currentPrng = prng;
  const rivCount = 5; // Unos pocos ríos principales

  // Encontrar picos como manantiales
  const peaks: number[] = [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === TILE.MOUNTAIN_SNOW || tiles[i] === TILE.MOUNTAIN) {
      peaks.push(i);
    }
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

      const cx = curr % width;
      const cy = Math.floor(curr / width);

      // Si llegamos al mar, paramos
      if (tiles[curr] === TILE.WATER || tiles[curr] === TILE.SHALLOW_WATER) break;
      
      // No marcar sobre montañas nevadas (nacimiento invisible)
      if (tiles[curr] !== TILE.MOUNTAIN_SNOW) {
        tiles[curr] = TILE.RIVER;
      }

      // Buscar vecino con menor elevación
      let bestNeighbor = curr;
      let minElev = elevMap[curr];

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (elevMap[nIdx] < minElev) {
            minElev = elevMap[nIdx];
            bestNeighbor = nIdx;
          }
        }
      }

      if (bestNeighbor === curr) break;
      curr = bestNeighbor;
    }
  }

  return currentPrng;
}

/** Siembra de recursos basada en el bioma (Endemismo). */
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

      // Lógica de endemismo
      let res: ResourceId | null = null;
      let chance = 0;
      let quantityRange: [number, number] = [10, 20];
      let regime: 'regenerable' | 'depletable' | 'continuous' = 'regenerable';

      switch (tile) {
        case TILE.FOREST:
        case TILE.JUNGLE_SOIL:
          if (r.value < 0.12) { res = RESOURCE.WOOD; chance = 1; quantityRange = [20, 40]; }
          else if (r.value < 0.14) { res = RESOURCE.BERRY; chance = 1; }
          else if (r.value > 0.98) { res = RESOURCE.GAME; chance = 1; quantityRange = [3, 8]; }
          break;
        case TILE.MOUNTAIN:
        case TILE.MOUNTAIN_SNOW:
          if (r.value < 0.15) { res = RESOURCE.STONE; chance = 1; regime = 'depletable'; quantityRange = [30, 60]; }
          break;
        case TILE.MOUNTAIN_VOLCANO:
          if (r.value < 0.25) { res = RESOURCE.OBSIDIAN; chance = 1; regime = 'depletable'; quantityRange = [10, 25]; }
          break;
        case TILE.SHORE:
        case TILE.SAND_TROPICAL:
          if (r.value < 0.05) { res = RESOURCE.SHELL; chance = 1; }
          else if (r.value > 0.96) { res = RESOURCE.WATER; chance = 1; regime = 'continuous'; }
          break;
        case TILE.RIVER:
          if (r.value < 0.15) { res = RESOURCE.WATER; chance = 1; regime = 'continuous'; }
          break;
        case TILE.SHALLOW_WATER:
          if (r.value < 0.03) { res = RESOURCE.FISH; chance = 1; regime = 'continuous'; }
          break;
      }

      if (res) {
        const q = nextInt(prng, quantityRange[0], quantityRange[1] + 1);
        prng = q.next;
        spawns.push({
          id: res,
          x,
          y,
          quantity: res === RESOURCE.WATER ? 999 : q.value,
          initialQuantity: res === RESOURCE.WATER ? 999 : q.value,
          regime,
          depletedAtTick: null,
        });
      }
    }
  }
  return { spawns, next: prng };
}

export function generateWorld(
  seed: number,
  opts: WorldGenOpts = {},
): WorldMap {
  const width = opts.width ?? 512;
  const height = opts.height ?? 512;
  
  const elevPerm = buildPermTable(seed ^ 0x11111111);
  const moistPerm = buildPermTable(seed ^ 0x22222222);

  const tiles = new Array<TileId>(width * height);
  const elevMap = new Array<number>(width * height);

  // Fase 1: Generar mapas de ruido base
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      // Elevación con máscara de isla
      let e = normalizedNoise(elevPerm, x * NOISE_CONFIG.elevation.scale, y * NOISE_CONFIG.elevation.scale, 
                              NOISE_CONFIG.elevation.octaves, NOISE_CONFIG.elevation.persistence, NOISE_CONFIG.elevation.lacunarity);
      e = applyIslandMask(e, x, y, width, height);
      elevMap[idx] = e;

      // Humedad
      const m = normalizedNoise(moistPerm, x * NOISE_CONFIG.moisture.scale, y * NOISE_CONFIG.moisture.scale,
                                NOISE_CONFIG.moisture.octaves, NOISE_CONFIG.moisture.persistence, NOISE_CONFIG.moisture.lacunarity);
      
      tiles[idx] = getBiomeFromMatrix(e, m);
    }
  }

  // Fase 2: Ríos
  let prng = seedState(seed ^ 0x33333333);
  prng = applyRivers(tiles, elevMap, width, height, prng);

  // Fase 3: Recursos
  const { spawns, next: n2 } = scatterResources(prng, tiles, width, height);
  prng = n2;

  // Fase 4: Metadatos y Hash
  const preHash = createHash('sha256')
    .update(JSON.stringify({ seed, width, height, tiles: tiles.slice(0, 100), islandCount: 1 }))
    .digest('hex');

  return {
    seed,
    width,
    height,
    tiles,
    resources: spawns,
    meta: {
      generatorVersion: GENERATOR_VERSION,
      shaHash: preHash,
      islandCount: 1, // En V2 tratamos el archipiélago como una entidad geológica única
    },
  };
}
