/**
 * Pure pixel-parsing logic, extracted from `components/map-generator.tsx`
 * so it is testable without mounting React or a DOM.
 *
 * The classification rules are intentionally identical to the ones baked
 * into the original component — if you change one, change the other, or
 * (preferred) import from here inside the component.
 */

export const GRID_SIZE = 50;

export type TerrainType =
  | 'water'
  | 'plain'
  | 'mountain'
  | 'glacier'
  | 'unknown';

export interface TerrainCell {
  type: TerrainType;
  /** 0..1. Depth for water, height for mountain, fertility for plain. */
  intensity: number;
  /** CSS color used by the renderer. */
  color: string;
}

export class InvalidImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidImageError';
  }
}

/**
 * Classify a single RGB pixel into a terrain cell.
 *
 * Rule order matters: water is checked first because blue-dominant pixels
 * override any tie-breaker. Glacier is next (very bright) so near-white
 * pixels don't get misclassified as gray mountains. Mountain covers both
 * balanced-gray and brown-dominant. Plain is the green-dominant fallback.
 * Anything else is `unknown` — that includes pure black (0,0,0) and
 * saturated magentas, which are not part of the PLAN.md color scheme.
 */
export function classifyPixel(r: number, g: number, b: number): TerrainCell {
  // 0. Void guard: near-black pixels are unknown, not "dark gray mountains".
  // A pure-black region in a user-uploaded map almost always means "no
  // data" or a hole in the image — treating it as terrain yields ghost
  // mountains that the AI then writes stories about. Caught it when a
  // test asserted classifyPixel(0,0,0) === 'unknown' and the old isGray
  // branch was claiming it as mountain.
  if (r < 10 && g < 10 && b < 10) {
    return { type: 'unknown', intensity: 0, color: '#e2e8f0' };
  }

  // 1. Water (blue-dominated).
  if (b > r && b > g) {
    const depth = b / 255;
    return {
      type: 'water',
      intensity: depth,
      color: `rgb(30, 60, ${Math.floor(b * 0.8 + 100)})`,
    };
  }

  // 2. Glacier (very bright / white).
  if (r > 220 && g > 220 && b > 220) {
    return {
      type: 'glacier',
      intensity: (r + g + b) / 765,
      color: '#f8fafc',
    };
  }

  // 3. Mountains (gray or brown).
  const isGray = Math.abs(r - g) < 30 && Math.abs(g - b) < 30;
  const isBrown = r > g && g > b;
  if (isGray || isBrown) {
    const height = (r + g + b) / 765;
    return {
      type: 'mountain',
      intensity: height,
      color: `rgb(${Math.floor(r * 0.7 + 50)}, ${Math.floor(g * 0.7 + 40)}, ${Math.floor(b * 0.7 + 30)})`,
    };
  }

  // 4. Plains (green-dominated).
  if (g > r && g > b) {
    const fertility = g / 255;
    return {
      type: 'plain',
      intensity: fertility,
      color: `rgb(40, ${Math.floor(g * 0.8 + 80)}, 40)`,
    };
  }

  return { type: 'unknown', intensity: 0, color: '#e2e8f0' };
}

/**
 * Walk an RGBA byte buffer (as produced by `CanvasRenderingContext2D.getImageData`)
 * and return a GRID_SIZE × GRID_SIZE matrix of terrain cells.
 *
 * Callers are expected to have already resampled their source image down to
 * GRID_SIZE × GRID_SIZE (the original component uses `ctx.drawImage`). This
 * function does no resizing of its own — it trusts the dimensions you pass.
 *
 * Throws `InvalidImageError` if the buffer is empty or its size doesn't match
 * the declared width/height. Silent wrong-size bugs in image processing are
 * the worst kind, so we prefer a loud failure.
 *
 * Transparent pixels (alpha < 128) are classified as `unknown` regardless of
 * their RGB values — don't let a PNG with an alpha channel lie about its
 * terrain.
 */
export function processImageData(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): TerrainCell[][] {
  if (width <= 0 || height <= 0) {
    throw new InvalidImageError(
      `Image dimensions must be positive, got ${width}×${height}`,
    );
  }
  if (rgba.length !== width * height * 4) {
    throw new InvalidImageError(
      `Buffer length ${rgba.length} does not match ${width}×${height}×4 = ${width * height * 4}`,
    );
  }
  if (width !== GRID_SIZE || height !== GRID_SIZE) {
    throw new InvalidImageError(
      `Expected ${GRID_SIZE}×${GRID_SIZE} pre-resampled buffer, got ${width}×${height}`,
    );
  }

  const grid: TerrainCell[][] = [];
  for (let y = 0; y < height; y++) {
    const row: TerrainCell[] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = rgba[idx];
      const g = rgba[idx + 1];
      const b = rgba[idx + 2];
      const a = rgba[idx + 3];
      if (a < 128) {
        row.push({ type: 'unknown', intensity: 0, color: '#e2e8f0' });
      } else {
        row.push(classifyPixel(r, g, b));
      }
    }
    grid.push(row);
  }
  return grid;
}
