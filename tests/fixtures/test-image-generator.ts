/**
 * Synthetic RGBA buffer generators for pixel-parser tests.
 *
 * We deliberately DO NOT author PNG binaries by hand (unreliable, hard to
 * diff). Instead we build the same `Uint8ClampedArray` that
 * `CanvasRenderingContext2D.getImageData().data` would produce, at the
 * exact size the parser expects (GRID_SIZE × GRID_SIZE × 4 bytes).
 *
 * Each helper paints a known color across the full grid, so tests can assert
 * "an all-blue input yields an all-water grid" without ever touching disk.
 */

import { GRID_SIZE } from '@/lib/pixel-parser';

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/** Fills a GRID_SIZE × GRID_SIZE × 4 buffer with a single RGBA color. */
export function solidColorBuffer(
  color: Rgba,
  size: number = GRID_SIZE,
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = color.r;
    buf[i * 4 + 1] = color.g;
    buf[i * 4 + 2] = color.b;
    buf[i * 4 + 3] = color.a ?? 255;
  }
  return buf;
}

/**
 * Paints a checkerboard of two colors. Used to verify the parser visits
 * cells in row-major order (if we swap rows/cols by mistake, the first
 * and last cells flip colors).
 */
export function checkerboardBuffer(
  a: Rgba,
  b: Rgba,
  size: number = GRID_SIZE,
): Uint8ClampedArray {
  const buf = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const color = (x + y) % 2 === 0 ? a : b;
      buf[idx] = color.r;
      buf[idx + 1] = color.g;
      buf[idx + 2] = color.b;
      buf[idx + 3] = color.a ?? 255;
    }
  }
  return buf;
}
