/**
 * Simplex 2D noise — seeded, determinista, §A4.
 *
 * Implementación estándar basada en Stefan Gustavson (dominio público).
 * La tabla de permutación se genera desde el seed via LCG, garantizando
 * que el mismo seed siempre produce el mismo mapa de ruido.
 *
 * Uso:
 *   const perm = buildPermTable(seed);
 *   const value = simplex2D(perm, x, y); // [-1, 1]
 *   const normalized = normalizedNoise(perm, x * 0.005, y * 0.005); // [0, 1]
 */

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

const GRAD2: [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

/** Genera la tabla de permutación 512 desde el seed. */
export function buildPermTable(seed: number): Uint8Array {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates shuffle con LCG seeded
  let s = (seed ^ 0x1337cafe) >>> 0;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = perm[i + 256] = p[i];
  return perm;
}

function dot2(g: [number, number], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}

/** Simplex 2D — devuelve valor en aprox. [-1, 1]. */
export function simplex2D(perm: Uint8Array, xin: number, yin: number): number {
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;

  const x0 = xin - (i - t);
  const y0 = yin - (j - t);

  const i1 = x0 > y0 ? 1 : 0;
  const j1 = x0 > y0 ? 0 : 1;

  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;

  const ii = i & 255;
  const jj = j & 255;

  let n = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 >= 0) {
    t0 *= t0;
    n += t0 * t0 * dot2(GRAD2[perm[ii + perm[jj]] & 7], x0, y0);
  }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 >= 0) {
    t1 *= t1;
    n += t1 * t1 * dot2(GRAD2[perm[ii + i1 + perm[jj + j1]] & 7], x1, y1);
  }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 >= 0) {
    t2 *= t2;
    n += t2 * t2 * dot2(GRAD2[perm[ii + 1 + perm[jj + 1]] & 7], x2, y2);
  }
  return n * 70;
}

/** Noise fractal con octavas. Devuelve valor en aprox. [-1, 1]. */
export function octaveNoise(
  perm: Uint8Array,
  x: number,
  y: number,
  octaves = 4,
  persistence = 0.5,
  lacunarity = 2.0,
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * simplex2D(perm, x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

/** Noise normalizado a [0, 1]. */
export function normalizedNoise(
  perm: Uint8Array,
  x: number,
  y: number,
  octaves = 4,
  persistence = 0.5,
  lacunarity = 2.0,
): number {
  return Math.max(0, Math.min(1, (octaveNoise(perm, x, y, octaves, persistence, lacunarity) + 1) / 2));
}
