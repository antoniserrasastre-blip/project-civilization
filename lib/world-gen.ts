/**
 * Generador del archipiélago primigenia — §3.4 vision-primigenia.
 *
 * Contrato §A4:
 *   - Puro: `generateWorld(seed)` sin side effects. Mismo input →
 *     mismo output byte a byte (ver tests/unit/world-gen.test.ts).
 *   - Seedable: toda aleatoriedad pasa por `lib/prng.ts`. Ni
 *     `Math.random`, ni `Date.now`, ni ruido no-seedeable.
 *   - Round-trip JSON: el WorldMap producido se serializa sin clases
 *     ni funciones ocultas.
 *
 * Diseño: 3-5 islas colocadas como blobs en ruido trigonométrico
 * (radio varía con el ángulo). Shore en el perímetro, clusters de
 * bosque y montaña dentro, recursos distribuidos por tile type
 * + régimen (#21).
 *
 * NO renderiza — eso es Sprint 2 (`components/map/MapView.tsx`).
 */

import { createHash } from 'node:crypto';
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
  type WorldMap,
  type ResourceSpawn,
} from './world-state';

/** Seed canónico de la versión de producción. Bumpear obliga a
 *  regenerar el fixture (`scripts/compile-world.ts`) e invalidar
 *  saves (bump de STORAGE_KEY en `lib/persistence.ts`). */
export const CANONICAL_SEED = 20260419;

const GENERATOR_VERSION = 2; // bumped: biomas bioclimáticos + ríos

export interface WorldGenOpts {
  width?: number;
  height?: number;
}

interface Island {
  cx: number;
  cy: number;
  baseR: number;
  amp: number;
  freq: number;
  phase: number;
}

function placeIslands(
  prngIn: PRNGState,
  width: number,
  height: number,
  count: number,
): { islands: Island[]; next: PRNGState } {
  let prng = prngIn;
  const islands: Island[] = [];
  const margin = 0.15;
  const minDim = Math.min(width, height);
  // Buffer en tiles entre perímetros de islas — garantiza que los
  // componentes de tierra sean conexos solo dentro de cada isla,
  // nunca por rebose entre vecinas.
  const BUFFER = Math.max(4, Math.floor(minDim * 0.03));
  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 200 && !placed; attempt++) {
      const xR = nextRange(prng, margin * width, (1 - margin) * width);
      prng = xR.next;
      const yR = nextRange(prng, margin * height, (1 - margin) * height);
      prng = yR.next;
      const baseRR = nextRange(prng, minDim * 0.08, minDim * 0.14);
      prng = baseRR.next;
      const ampR = nextRange(prng, 0.15, 0.3);
      prng = ampR.next;
      const freqR = nextInt(prng, 3, 8);
      prng = freqR.next;
      const phaseR = nextRange(prng, 0, Math.PI * 2);
      prng = phaseR.next;
      const candidate: Island = {
        cx: xR.value,
        cy: yR.value,
        baseR: baseRR.value,
        amp: ampR.value,
        freq: freqR.value,
        phase: phaseR.value,
      };
      let overlaps = false;
      for (const existing of islands) {
        const ddx = candidate.cx - existing.cx;
        const ddy = candidate.cy - existing.cy;
        const dist = Math.sqrt(ddx * ddx + ddy * ddy);
        const maxCandR = candidate.baseR * (1 + candidate.amp);
        const maxExistR = existing.baseR * (1 + existing.amp);
        if (dist < maxCandR + maxExistR + BUFFER) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        islands.push(candidate);
        placed = true;
      }
    }
  }
  return { islands, next: prng };
}

function shapeRadius(isl: Island, angle: number): number {
  return isl.baseR * (1 + isl.amp * Math.sin(isl.freq * angle + isl.phase));
}

function fillTerrain(
  tiles: TileId[],
  width: number,
  height: number,
  islands: Island[],
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let land = false;
      for (const isl of islands) {
        const dx = x - isl.cx;
        const dy = y - isl.cy;
        const dist2 = dx * dx + dy * dy;
        const maxR = isl.baseR * (1 + isl.amp);
        if (dist2 > maxR * maxR) continue;
        const angle = Math.atan2(dy, dx);
        const r = shapeRadius(isl, angle);
        if (dist2 < r * r) {
          land = true;
          break;
        }
      }
      tiles[y * width + x] = land ? TILE.GRASS : TILE.WATER;
    }
  }
}

function markShore(tiles: TileId[], width: number, height: number): void {
  const toShore: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (tiles[idx] !== TILE.GRASS) continue;
      const left = x > 0 ? tiles[idx - 1] : TILE.WATER;
      const right = x < width - 1 ? tiles[idx + 1] : TILE.WATER;
      const up = y > 0 ? tiles[idx - width] : TILE.WATER;
      const down = y < height - 1 ? tiles[idx + width] : TILE.WATER;
      if (
        left === TILE.WATER ||
        right === TILE.WATER ||
        up === TILE.WATER ||
        down === TILE.WATER
      ) {
        toShore.push(idx);
      }
    }
  }
  for (const idx of toShore) tiles[idx] = TILE.SHORE;
}

function markShallowWater(
  tiles: TileId[],
  width: number,
  height: number,
  depth: number,
): void {
  for (let step = 0; step < depth; step++) {
    const toShallow: number[] = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (tiles[idx] !== TILE.WATER) continue;
        const left = x > 0 ? tiles[idx - 1] : TILE.WATER;
        const right = x < width - 1 ? tiles[idx + 1] : TILE.WATER;
        const up = y > 0 ? tiles[idx - width] : TILE.WATER;
        const down = y < height - 1 ? tiles[idx + width] : TILE.WATER;
        if (
          left === TILE.SHORE ||
          right === TILE.SHORE ||
          up === TILE.SHORE ||
          down === TILE.SHORE ||
          left === TILE.SHALLOW_WATER ||
          right === TILE.SHALLOW_WATER ||
          up === TILE.SHALLOW_WATER ||
          down === TILE.SHALLOW_WATER
        ) {
          toShallow.push(idx);
        }
      }
    }
    for (const idx of toShallow) tiles[idx] = TILE.SHALLOW_WATER;
  }
}

function placeClusters(
  prngIn: PRNGState,
  tiles: TileId[],
  width: number,
  height: number,
  target: TileId,
  count: number,
  radius: number,
): PRNGState {
  let prng = prngIn;
  for (let c = 0; c < count; c++) {
    let cx = 0;
    let cy = 0;
    let found = false;
    for (let tries = 0; tries < 50; tries++) {
      const xR = nextInt(prng, 0, width);
      prng = xR.next;
      const yR = nextInt(prng, 0, height);
      prng = yR.next;
      if (tiles[yR.value * width + xR.value] === TILE.GRASS) {
        cx = xR.value;
        cy = yR.value;
        found = true;
        break;
      }
    }
    if (!found) continue;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (tiles[ny * width + nx] === TILE.GRASS) {
          tiles[ny * width + nx] = target;
        }
      }
    }
  }
  return prng;
}

// ─── Bioma bioclimático ───────────────────────────────────────────────

/** Tabla de bioma: (baseTile, humidity) → bioma final.
 *  GRASS y FOREST se refinan; MOUNTAIN también según volcánico. */
function selectBiome(
  base: TileId,
  humidity: number,
  volcanic: number,
): TileId {
  if (base === TILE.MOUNTAIN) {
    if (volcanic > 0.72) return TILE.MOUNTAIN_VOLCANO;
    if (humidity < 0.3)   return TILE.MOUNTAIN_SNOW;
    return TILE.MOUNTAIN;
  }
  if (base === TILE.FOREST) {
    if (humidity > 0.65) return TILE.JUNGLE_SOIL;
    if (humidity < 0.25) return TILE.GRASS_SABANA;
    return TILE.FOREST;
  }
  if (base === TILE.SHORE) {
    return humidity > 0.55 ? TILE.SAND_TROPICAL : TILE.SHORE;
  }
  // GRASS
  if (humidity > 0.62)  return TILE.GRASS_LUSH;
  if (humidity < 0.28)  return TILE.GRASS_SABANA;
  return TILE.GRASS;
}

/** Pasa bioclimático: asigna biomas usando ruido de humedad y volcánico. */
function applyBiomes(
  tiles: TileId[],
  width: number,
  height: number,
  humidPerm: Uint8Array,
  volcPerm: Uint8Array,
  scale = 0.005,
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const t = tiles[idx];
      if (t === TILE.WATER || t === TILE.SHALLOW_WATER || t === TILE.SAND) continue;
      const h = normalizedNoise(humidPerm, x * scale, y * scale, 4, 0.5, 2.0);
      const v = normalizedNoise(volcPerm, x * scale * 1.3, y * scale * 1.3, 3, 0.6, 2.2);
      tiles[idx] = selectBiome(t, h, v);
    }
  }
}

// ─── Erosión hidráulica (ríos) ────────────────────────────────────────

/** Traza un río desde `start` bajando siempre al vecino con menor elevación.
 *  Marca los tiles como RIVER hasta llegar al agua. */
function traceRiver(
  tiles: TileId[],
  elevMap: Float32Array,
  width: number,
  height: number,
  start: { x: number; y: number },
): void {
  let cx = start.x;
  let cy = start.y;
  const visited = new Set<number>();

  for (let step = 0; step < 800; step++) {
    const idx = cy * width + cx;
    if (visited.has(idx)) break;
    visited.add(idx);

    const t = tiles[idx];
    if (t === TILE.WATER || t === TILE.SHALLOW_WATER) break;
    if (t !== TILE.MOUNTAIN && t !== TILE.MOUNTAIN_SNOW && t !== TILE.MOUNTAIN_VOLCANO) {
      tiles[idx] = TILE.RIVER;
    }

    // Buscar vecino con menor elevación
    const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
    let bestElev = elevMap[idx];
    let bx = cx;
    let by = cy;
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (visited.has(nIdx)) continue;
      if (elevMap[nIdx] < bestElev) {
        bestElev = elevMap[nIdx];
        bx = nx;
        by = ny;
      }
    }
    if (bx === cx && by === cy) break; // atascado — terminar
    cx = bx;
    cy = by;
  }
}

/** Genera un mapa de elevación continuo a partir del tile type. */
function buildElevMap(
  tiles: TileId[],
  width: number,
  height: number,
): Float32Array {
  const elev = new Float32Array(width * height);
  const ELEV: Partial<Record<number, number>> = {
    [TILE.WATER]:            0.1,
    [TILE.SHALLOW_WATER]:    0.2,
    [TILE.SHORE]:            0.3,
    [TILE.SAND]:             0.35,
    [TILE.SAND_TROPICAL]:    0.35,
    [TILE.GRASS]:            0.45,
    [TILE.GRASS_LUSH]:       0.48,
    [TILE.GRASS_SABANA]:     0.42,
    [TILE.FOREST]:           0.55,
    [TILE.JUNGLE_SOIL]:      0.52,
    [TILE.RIVER]:            0.38,
    [TILE.MOUNTAIN]:         0.72,
    [TILE.MOUNTAIN_SNOW]:    0.88,
    [TILE.MOUNTAIN_VOLCANO]: 0.85,
  };
  for (let i = 0; i < tiles.length; i++) {
    elev[i] = ELEV[tiles[i]] ?? 0.45;
  }
  return elev;
}

/** Traza N ríos desde los tiles más altos de cada isla. */
function addRivers(
  tiles: TileId[],
  width: number,
  height: number,
  rivCount: number,
  prngIn: PRNGState,
): PRNGState {
  const elevMap = buildElevMap(tiles, width, height);
  let prng = prngIn;
  // Candidatos: tiles MOUNTAIN_SNOW o MOUNTAIN_VOLCANO (picos)
  const peaks: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = tiles[y * width + x];
      if (t === TILE.MOUNTAIN_SNOW || t === TILE.MOUNTAIN_VOLCANO) {
        peaks.push({ x, y });
      }
    }
  }
  if (peaks.length === 0) return prng;
  const n = Math.min(rivCount, peaks.length);
  for (let i = 0; i < n; i++) {
    const idxR = nextInt(prng, 0, peaks.length);
    prng = idxR.next;
    traceRiver(tiles, elevMap, width, height, peaks[idxR.value]);
  }
  return prng;
}

function spawnResources(
  prngIn: PRNGState,
  tiles: TileId[],
  width: number,
  height: number,
): { spawns: ResourceSpawn[]; next: PRNGState } {
  const spawns: ResourceSpawn[] = [];
  let prng = prngIn;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tile = tiles[y * width + x];
      if (tile === TILE.WATER || tile === TILE.SHALLOW_WATER) continue;
      const r = prngNext(prng);
      prng = r.next;
      // Madera: bosque normal y jungla
      if ((tile === TILE.FOREST || tile === TILE.JUNGLE_SOIL) && r.value < 0.15) {
        const q = nextInt(prng, 10, 30);
        prng = q.next;
        spawns.push({ id: RESOURCE.WOOD, x, y, quantity: q.value, initialQuantity: q.value, regime: 'regenerable', depletedAtTick: null });
      // Piedra: montaña normal y nevada
      } else if ((tile === TILE.MOUNTAIN || tile === TILE.MOUNTAIN_SNOW) && r.value < 0.2) {
        const q = nextInt(prng, 20, 60);
        prng = q.next;
        spawns.push({ id: RESOURCE.STONE, x, y, quantity: q.value, initialQuantity: q.value, regime: 'depletable', depletedAtTick: null });
      // Obsidiana: volcánica + montaña normal (rara)
      } else if ((tile === TILE.MOUNTAIN_VOLCANO && r.value < 0.25) || (tile === TILE.MOUNTAIN && r.value >= 0.2 && r.value < 0.26)) {
        const q = nextInt(prng, 5, 20);
        prng = q.next;
        spawns.push({ id: RESOURCE.OBSIDIAN, x, y, quantity: q.value, initialQuantity: q.value, regime: 'depletable', depletedAtTick: null });
      // Conchas: costa normal y tropical
      } else if ((tile === TILE.SHORE || tile === TILE.SAND_TROPICAL) && r.value >= 0.02 && r.value < 0.06) {
        const q = nextInt(prng, 5, 15);
        prng = q.next;
        spawns.push({ id: RESOURCE.SHELL, x, y, quantity: q.value, initialQuantity: q.value, regime: 'regenerable', depletedAtTick: null });
      // Bayas: pradera normal, frondosa (más frecuente) y jungla
      } else if (tile === TILE.GRASS_LUSH && r.value < 0.025) {
        const q = nextInt(prng, 8, 20);
        prng = q.next;
        spawns.push({ id: RESOURCE.BERRY, x, y, quantity: q.value, initialQuantity: q.value, regime: 'regenerable', depletedAtTick: null });
      } else if ((tile === TILE.GRASS || tile === TILE.JUNGLE_SOIL) && r.value < 0.012) {
        const q = nextInt(prng, 5, 15);
        prng = q.next;
        spawns.push({ id: RESOURCE.BERRY, x, y, quantity: q.value, initialQuantity: q.value, regime: 'regenerable', depletedAtTick: null });
      // Caza: pradera, sabana, bosque, jungla
      } else if ((tile === TILE.GRASS || tile === TILE.GRASS_LUSH || tile === TILE.FOREST || tile === TILE.JUNGLE_SOIL) && r.value >= 0.99) {
        const q = nextInt(prng, 2, 6);
        prng = q.next;
        spawns.push({ id: RESOURCE.GAME, x, y, quantity: q.value, initialQuantity: q.value, regime: 'regenerable', depletedAtTick: null });
      } else if (tile === TILE.GRASS_SABANA && r.value >= 0.97) {
        const q = nextInt(prng, 1, 4);
        prng = q.next;
        spawns.push({ id: RESOURCE.GAME, x, y, quantity: q.value, initialQuantity: q.value, regime: 'regenerable', depletedAtTick: null });
      // Agua potable: costa + río (fuente continua)
      } else if ((tile === TILE.SHORE || tile === TILE.SAND_TROPICAL) && r.value < 0.02) {
        spawns.push({ id: RESOURCE.WATER, x, y, quantity: 999, initialQuantity: 999, regime: 'continuous', depletedAtTick: null });
      } else if (tile === TILE.RIVER && r.value < 0.08) {
        spawns.push({ id: RESOURCE.WATER, x, y, quantity: 999, initialQuantity: 999, regime: 'continuous', depletedAtTick: null });
      }
    }
  }
  return { spawns, next: prng };
}

function spawnFish(
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
      if (tiles[idx] !== TILE.SHALLOW_WATER) continue;
      const isShorelike = (t: TileId) => t === TILE.SHORE || t === TILE.SAND_TROPICAL;
      let hasShore = false;
      if (x > 0 && isShorelike(tiles[idx - 1])) hasShore = true;
      else if (x < width - 1 && isShorelike(tiles[idx + 1])) hasShore = true;
      else if (y > 0 && isShorelike(tiles[idx - width])) hasShore = true;
      else if (y < height - 1 && isShorelike(tiles[idx + width])) hasShore = true;
      if (!hasShore) continue;
      const r = prngNext(prng);
      prng = r.next;
      if (r.value < 0.05) {
        const q = nextInt(prng, 3, 10);
        prng = q.next;
        spawns.push({
          id: RESOURCE.FISH,
          x,
          y,
          quantity: q.value,
          initialQuantity: q.value,
          regime: 'continuous',
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
  let prng = seedState(seed);

  // Island count ∈ {3, 4, 5} (declarado). El número real puede ser
  // menor si no caben sin solaparse — meta.islandCount reporta el
  // real, nunca el declarado.
  const countR = nextInt(prng, 3, 6);
  const declaredCount = countR.value;
  prng = countR.next;

  const placed = placeIslands(prng, width, height, declaredCount);
  prng = placed.next;
  const islandCount = placed.islands.length;

  const tiles: TileId[] = new Array<TileId>(width * height).fill(TILE.WATER);
  fillTerrain(tiles, width, height, placed.islands);
  markShore(tiles, width, height);
  markShallowWater(tiles, width, height, 2);

  // Cluster counts escalados al tamaño del mapa. Densidad baja para
  // mantener recursos totales ≤ 2000 en el default 512×512.
  const grassCount = tiles.reduce<number>(
    (acc, t) => (t === TILE.GRASS ? acc + 1 : acc),
    0,
  );
  const forestClusters = Math.max(3, Math.floor(grassCount / 4000));
  const mountainClusters = Math.max(2, Math.floor(grassCount / 7000));
  prng = placeClusters(prng, tiles, width, height, TILE.FOREST, forestClusters, 6);
  prng = placeClusters(prng, tiles, width, height, TILE.MOUNTAIN, mountainClusters, 4);

  // Biomas bioclimáticos: humidity + volcanic noise refinan FOREST/MOUNTAIN/GRASS
  const humidPerm = buildPermTable(seed ^ 0xBEEF0001);
  const volcPerm  = buildPermTable(seed ^ 0xDEAD0002);
  applyBiomes(tiles, width, height, humidPerm, volcPerm);

  // Ríos: nacen en picos (MOUNTAIN_SNOW/VOLCANO) y bajan hasta el mar
  const rivCount = Math.max(2, Math.floor(islandCount * 1.5));
  prng = addRivers(tiles, width, height, rivCount, prng);

  const resMain = spawnResources(prng, tiles, width, height);
  prng = resMain.next;
  const resFish = spawnFish(prng, tiles, width, height);
  prng = resFish.next;
  const resources = [...resMain.spawns, ...resFish.spawns];

  const preHash = createHash('sha256')
    .update(
      JSON.stringify({ seed, width, height, tiles, resources, islandCount }),
    )
    .digest('hex');

  return {
    seed,
    width,
    height,
    tiles,
    resources,
    meta: {
      generatorVersion: GENERATOR_VERSION,
      shaHash: preHash,
      islandCount,
    },
  };
}
