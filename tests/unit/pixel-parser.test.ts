/**
 * Capa 1 — Pixel parser.
 *
 * Tests sobre funciones PURAS de lib/pixel-parser.ts: sin DOM, sin canvas.
 * Aseguran el contrato de TEST_SPEC §2. Si fallan, el generador de mapa
 * clasificará mal el terreno y Gemini recibirá un mundo equivocado.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyPixel,
  processImageData,
  GRID_SIZE,
  InvalidImageError,
} from '@/lib/pixel-parser';
import { solidColorBuffer, checkerboardBuffer } from '../fixtures/test-image-generator';

describe('classifyPixel — happy path según la paleta de PLAN.md', () => {
  // Por qué importa: cada color en PLAN.md mapea a un bioma jugable distinto.
  // Si uno se miscodifica, todo el mundo deriva.

  it('clasifica píxeles azul-dominantes como water', () => {
    expect(classifyPixel(10, 10, 200).type).toBe('water');
    expect(classifyPixel(0, 0, 255).type).toBe('water');
  });

  it('clasifica píxeles muy brillantes como glacier', () => {
    // Los tres canales por encima de 220 → glacier. Caso tramposo:
    // (221,221,221) también es "gris" por la regla de mountain. Glacier
    // DEBE ganar porque se evalúa antes.
    expect(classifyPixel(230, 240, 235).type).toBe('glacier');
    expect(classifyPixel(255, 255, 255).type).toBe('glacier');
  });

  it('clasifica píxeles grises balanceados como mountain', () => {
    expect(classifyPixel(128, 128, 128).type).toBe('mountain');
    expect(classifyPixel(100, 110, 95).type).toBe('mountain');
  });

  it('clasifica píxeles marrón-dominantes como mountain', () => {
    // Rama isBrown: r > g > b. PLAN.md mete marrón bajo mountain porque
    // representa terreno rocoso/térreo.
    expect(classifyPixel(139, 90, 43).type).toBe('mountain');
  });

  it('clasifica píxeles verde-dominantes como plain', () => {
    expect(classifyPixel(10, 200, 10).type).toBe('plain');
    expect(classifyPixel(0, 255, 0).type).toBe('plain');
  });
});

describe('classifyPixel — sad path', () => {
  // Por qué importa: colores fuera de la paleta deben ser "unknown",
  // no forzados al bioma más cercano. La UI puede pedir al usuario
  // que suba un mapa más limpio.

  it('devuelve unknown para negro puro', () => {
    expect(classifyPixel(0, 0, 0).type).toBe('unknown');
  });

  it('devuelve unknown para magenta saturado', () => {
    // r y b empatan (200), g es el menor. Ninguna regla dispara limpio.
    expect(classifyPixel(200, 100, 200).type).toBe('unknown');
  });
});

describe('classifyPixel — invariantes de intensidad', () => {
  // Por qué importa: la IA consume `intensity` como fertilidad/altura/profundidad.
  // Si alguna vez supera 1, la narrativa habla de ciudades flotando en el cielo.

  it('mantiene intensity en [0, 1] para cualquier color', () => {
    const samples = [
      [0, 0, 255],
      [255, 255, 255],
      [128, 128, 128],
      [139, 90, 43],
      [0, 255, 0],
      [0, 0, 0],
    ];
    for (const [r, g, b] of samples) {
      const { intensity } = classifyPixel(r, g, b);
      expect(intensity).toBeGreaterThanOrEqual(0);
      expect(intensity).toBeLessThanOrEqual(1);
    }
  });
});

describe('processImageData — forma del grid', () => {
  it('devuelve una matriz GRID_SIZE × GRID_SIZE para un buffer válido', () => {
    const buf = solidColorBuffer({ r: 0, g: 0, b: 255 });
    const grid = processImageData(buf, GRID_SIZE, GRID_SIZE);
    expect(grid.length).toBe(GRID_SIZE);
    for (const row of grid) expect(row.length).toBe(GRID_SIZE);
  });

  it('clasifica toda celda de un buffer azul sólido como water', () => {
    const buf = solidColorBuffer({ r: 0, g: 0, b: 255 });
    const grid = processImageData(buf, GRID_SIZE, GRID_SIZE);
    const allWater = grid.every((row) => row.every((c) => c.type === 'water'));
    expect(allWater).toBe(true);
  });

  it('preserva el orden row-major en un checkerboard (water/plain)', () => {
    // Si el parser transpone filas y columnas por error, (0,0) y
    // (GRID_SIZE-1, GRID_SIZE-1) — ambos sumas pares — seguirían siendo
    // `a`, pero (0,1) NO coincidiría con `b`. Lo pinamos aquí.
    const water = { r: 0, g: 0, b: 255 };
    const plain = { r: 0, g: 255, b: 0 };
    const buf = checkerboardBuffer(water, plain);
    const grid = processImageData(buf, GRID_SIZE, GRID_SIZE);
    expect(grid[0][0].type).toBe('water');
    expect(grid[0][1].type).toBe('plain');
    expect(grid[1][0].type).toBe('plain');
  });
});

describe('processImageData — transparencia', () => {
  it('trata píxeles totalmente transparentes como unknown aunque RGB mienta', () => {
    // Alfa = 0 pero RGB dice "azul". Un PNG mentiroso no debería inventar
    // océanos donde hay vacío transparente.
    const buf = solidColorBuffer({ r: 0, g: 0, b: 255, a: 0 });
    const grid = processImageData(buf, GRID_SIZE, GRID_SIZE);
    expect(grid[0][0].type).toBe('unknown');
  });
});

describe('processImageData — sad path', () => {
  it('lanza InvalidImageError con input de tamaño cero', () => {
    expect(() => processImageData(new Uint8ClampedArray(0), 0, 0)).toThrow(
      InvalidImageError,
    );
  });

  it('lanza InvalidImageError si las dimensiones no cuadran con el buffer', () => {
    // Buffer es 50×50×4 pero declaramos 10×10.
    const buf = solidColorBuffer({ r: 0, g: 0, b: 255 });
    expect(() => processImageData(buf, 10, 10)).toThrow(InvalidImageError);
  });

  it('lanza InvalidImageError si no se resampleó a GRID_SIZE', () => {
    // Un caller que olvidó downsamplear. Queremos un fallo ruidoso,
    // no un éxito silencioso con un grid diminuto.
    const buf = new Uint8ClampedArray(10 * 10 * 4);
    expect(() => processImageData(buf, 10, 10)).toThrow(InvalidImageError);
  });
});

describe('processImageData — presupuesto de performance', () => {
  // Por qué importa: corre en el hilo de UI al subir un mapa.
  // Una regresión O(n²) se notaría como un freeze visible.
  it('procesa un grid completo en menos de 100ms', () => {
    const buf = solidColorBuffer({ r: 0, g: 200, b: 0 });
    const start = performance.now();
    processImageData(buf, GRID_SIZE, GRID_SIZE);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(100);
  });
});
