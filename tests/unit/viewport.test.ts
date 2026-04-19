/**
 * Tests del viewport pan+zoom. Sin DOM — solo matemática pura.
 */

import { describe, it, expect } from 'vitest';
import {
  minZoom,
  maxZoom,
  clampZoom,
  clampOffset,
  screenToTile,
  applyDrag,
  applyZoom,
  type ViewportDims,
  type ViewportState,
} from '@/lib/viewport';

const DIMS: ViewportDims = {
  worldWidth: 512,
  worldHeight: 512,
  tileSize: 32,
  screenWidth: 1024,
  screenHeight: 768,
};

describe('minZoom / maxZoom / clampZoom', () => {
  it('minZoom hace que el mapa entero quepa', () => {
    const z = minZoom(DIMS);
    expect(z * 512 * 32).toBeLessThanOrEqual(DIMS.screenHeight);
  });

  it('maxZoom muestra ~40 tiles en la dimensión corta', () => {
    const z = maxZoom(DIMS);
    const visible = DIMS.screenHeight / (DIMS.tileSize * z);
    expect(visible).toBeCloseTo(40, 0);
  });

  it('clampZoom respeta [min, max]', () => {
    expect(clampZoom(DIMS, 0.0001)).toBe(minZoom(DIMS));
    expect(clampZoom(DIMS, 999)).toBe(maxZoom(DIMS));
    const mid = (minZoom(DIMS) + maxZoom(DIMS)) / 2;
    expect(clampZoom(DIMS, mid)).toBe(mid);
  });
});

describe('clampOffset', () => {
  it('mapa mayor que pantalla → offset ∈ [screen - mapPx, 0]', () => {
    const z = maxZoom(DIMS); // mapa MUCHO mayor que pantalla
    const r = clampOffset(DIMS, { zoom: z, offsetX: 9999, offsetY: 9999 });
    expect(r.offsetX).toBeLessThanOrEqual(0);
    expect(r.offsetY).toBeLessThanOrEqual(0);
  });

  it('offset demasiado negativo se clampa al borde inferior del mapa', () => {
    const z = maxZoom(DIMS);
    const r = clampOffset(DIMS, { zoom: z, offsetX: -99999, offsetY: -99999 });
    const mapPxW = 512 * 32 * z;
    const mapPxH = 512 * 32 * z;
    expect(r.offsetX).toBe(DIMS.screenWidth - mapPxW);
    expect(r.offsetY).toBe(DIMS.screenHeight - mapPxH);
  });

  it('mapa menor que pantalla → offset centra', () => {
    // Forzamos un zoom muy pequeño para que el mapa < screen.
    const tinyDims = { ...DIMS, worldWidth: 16, worldHeight: 16 };
    const r = clampOffset(tinyDims, { zoom: 1, offsetX: 500, offsetY: 500 });
    expect(r.offsetX).toBe((tinyDims.screenWidth - 16 * 32) / 2);
    expect(r.offsetY).toBe((tinyDims.screenHeight - 16 * 32) / 2);
  });
});

describe('screenToTile', () => {
  it('pixel (0,0) con offset 0 y zoom 1 → tile (0,0)', () => {
    const state: ViewportState = { zoom: 1, offsetX: 0, offsetY: 0 };
    expect(screenToTile(DIMS, state, 0, 0)).toEqual({ x: 0, y: 0 });
  });

  it('pixel 33 con tileSize 32 zoom 1 → tile (1, 0)', () => {
    const state: ViewportState = { zoom: 1, offsetX: 0, offsetY: 0 };
    expect(screenToTile(DIMS, state, 33, 10)).toEqual({ x: 1, y: 0 });
  });

  it('fuera del mapa → null', () => {
    const state: ViewportState = { zoom: 1, offsetX: 0, offsetY: 0 };
    // tile (512, 0) está fuera (indices 0-511).
    expect(screenToTile(DIMS, state, 512 * 32, 0)).toBeNull();
  });
});

describe('applyDrag', () => {
  it('drag desplaza el offset y re-clampa', () => {
    const z = maxZoom(DIMS);
    const start = clampOffset(DIMS, { zoom: z, offsetX: -1000, offsetY: -1000 });
    const r = applyDrag(DIMS, start, 50, 50);
    expect(r.offsetX).toBe(start.offsetX + 50);
    expect(r.offsetY).toBe(start.offsetY + 50);
  });

  it('drag excesivo queda clampado', () => {
    const z = maxZoom(DIMS);
    const start: ViewportState = { zoom: z, offsetX: 0, offsetY: 0 };
    const r = applyDrag(DIMS, start, 99999, 99999);
    // offsetX no puede ser > 0 (clampOffset lo fuerza a ≤ 0).
    expect(r.offsetX).toBeLessThanOrEqual(0);
  });
});

describe('applyZoom', () => {
  it('el pivote queda fijo en pantalla tras zoom', () => {
    const z = (minZoom(DIMS) + maxZoom(DIMS)) / 2;
    const start = clampOffset(DIMS, { zoom: z, offsetX: 0, offsetY: 0 });
    const pivotX = 400;
    const pivotY = 300;
    const r = applyZoom(DIMS, start, 1.5, pivotX, pivotY);
    // Coordenada world-px bajo el pivote antes y después del zoom
    // debe ser la misma (± epsilon por el clampOffset).
    const worldPxBefore = {
      x: (pivotX - start.offsetX) / start.zoom,
      y: (pivotY - start.offsetY) / start.zoom,
    };
    const worldPxAfter = {
      x: (pivotX - r.offsetX) / r.zoom,
      y: (pivotY - r.offsetY) / r.zoom,
    };
    // Permitimos diff por clampOffset si el pivote está cerca del
    // borde; en el centro del mapa debe ser casi exacto.
    expect(Math.abs(worldPxAfter.x - worldPxBefore.x)).toBeLessThan(5);
    expect(Math.abs(worldPxAfter.y - worldPxBefore.y)).toBeLessThan(5);
  });

  it('zoom in bloqueado al máximo', () => {
    const start: ViewportState = {
      zoom: maxZoom(DIMS),
      offsetX: 0,
      offsetY: 0,
    };
    const r = applyZoom(DIMS, start, 999, 100, 100);
    expect(r.zoom).toBe(maxZoom(DIMS));
  });

  it('zoom out bloqueado al mínimo', () => {
    const start: ViewportState = {
      zoom: minZoom(DIMS),
      offsetX: 0,
      offsetY: 0,
    };
    const r = applyZoom(DIMS, start, 0.001, 100, 100);
    expect(r.zoom).toBe(minZoom(DIMS));
  });
});
