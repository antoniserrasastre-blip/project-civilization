/**
 * Tests del helper `computeNpcMarker` — shape visual de NPCs en mapa.
 *
 * §A4: el helper es puro y determinista. No depende de DOM, canvas
 * ni de tiempo. Este fichero describe el contrato que el render en
 * `components/map/MapView.tsx` obedece para pintar los marcadores.
 */

import { describe, it, expect } from 'vitest';
import { computeNpcMarker, MARKER_MIN_SIZE } from '@/lib/npc-marker';
import { CASTA, makeTestNPC } from '@/lib/npcs';

const elegido = makeTestNPC({ id: 'e0', casta: CASTA.ELEGIDO });
const ciudadano = makeTestNPC({ id: 'c0', casta: CASTA.CIUDADANO });

describe('computeNpcMarker — tamaño mínimo legible', () => {
  it('a zoom 0.3 (inicial), el marcador sigue siendo ≥ MARKER_MIN_SIZE', () => {
    const m = computeNpcMarker(ciudadano, 0.3, 32);
    expect(m.size).toBeGreaterThanOrEqual(MARKER_MIN_SIZE);
  });

  it('a zoom 1.0 el marcador es ≥14×14 (requisito del sprint)', () => {
    const m = computeNpcMarker(ciudadano, 1.0, 32);
    expect(m.size).toBeGreaterThanOrEqual(14);
  });

  it('a zoom 2.0 el marcador crece por encima del mínimo', () => {
    const big = computeNpcMarker(ciudadano, 2.0, 32);
    const small = computeNpcMarker(ciudadano, 1.0, 32);
    expect(big.size).toBeGreaterThan(small.size);
  });

  it('MARKER_MIN_SIZE es ≥ 14 (contrato del sprint)', () => {
    expect(MARKER_MIN_SIZE).toBeGreaterThanOrEqual(14);
  });
});

describe('computeNpcMarker — distinción Elegido vs Ciudadano', () => {
  it('Elegido usa shape diamante; Ciudadano usa shape círculo', () => {
    const e = computeNpcMarker(elegido, 1.0, 32);
    const c = computeNpcMarker(ciudadano, 1.0, 32);
    expect(e.shape).toBe('diamond');
    expect(c.shape).toBe('circle');
  });

  it('Elegido es estrictamente más grande que Ciudadano al mismo zoom', () => {
    const e = computeNpcMarker(elegido, 1.0, 32);
    const c = computeNpcMarker(ciudadano, 1.0, 32);
    expect(e.size).toBeGreaterThan(c.size);
  });

  it('Elegido usa color amarillo; Ciudadano usa color blanco', () => {
    const e = computeNpcMarker(elegido, 1.0, 32);
    const c = computeNpcMarker(ciudadano, 1.0, 32);
    expect(e.colors.fill.toLowerCase()).toMatch(/ffd5|ffcc|ffeb|fff2/);
    expect(c.colors.fill.toLowerCase()).toBe('#ffffff');
  });
});

describe('computeNpcMarker — outline contrastante (pixel-art)', () => {
  it('siempre devuelve outline thickness ≥ 1', () => {
    const m = computeNpcMarker(ciudadano, 1.0, 32);
    expect(m.outline).toBeGreaterThanOrEqual(1);
  });

  it('outline thickness ≤ 2 (nunca sombra gruesa)', () => {
    const m = computeNpcMarker(elegido, 3.0, 32);
    expect(m.outline).toBeLessThanOrEqual(2);
  });

  it('outline tiene color hex oscuro legible sobre tiles claros', () => {
    const m = computeNpcMarker(ciudadano, 1.0, 32);
    expect(m.colors.outline).toMatch(/^#[0-9a-f]{6}$/i);
    // Dark outline: sum of RGB components claramente bajo 128*3.
    const hex = m.colors.outline.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    expect(r + g + b).toBeLessThan(200);
  });
});

describe('computeNpcMarker — determinismo (§A4)', () => {
  it('mismo input → mismo output byte-a-byte', () => {
    const a = computeNpcMarker(elegido, 1.0, 32);
    const b = computeNpcMarker(elegido, 1.0, 32);
    expect(a).toEqual(b);
  });

  it('resultado round-trippable por JSON', () => {
    const m = computeNpcMarker(elegido, 1.5, 32);
    const after = JSON.parse(JSON.stringify(m));
    expect(after).toEqual(m);
  });

  it('no usa Math.random ni Date.now (ausencia observable por reproducibilidad)', () => {
    const runs = Array.from({ length: 20 }, () =>
      computeNpcMarker(elegido, 0.7, 32),
    );
    for (const r of runs) {
      expect(r).toEqual(runs[0]);
    }
  });
});

describe('computeNpcMarker — edge cases', () => {
  it('zoom muy pequeño sigue devolviendo marcador legible (clamp a mínimo)', () => {
    const m = computeNpcMarker(ciudadano, 0.01, 32);
    expect(m.size).toBeGreaterThanOrEqual(MARKER_MIN_SIZE);
  });

  it('zoom grande produce marcadores escalados proporcionalmente', () => {
    const m1 = computeNpcMarker(ciudadano, 1.0, 32);
    const m4 = computeNpcMarker(ciudadano, 4.0, 32);
    expect(m4.size).toBeGreaterThan(m1.size * 2);
  });

  it('tileSize distinto escala el marcador consistentemente', () => {
    const small = computeNpcMarker(ciudadano, 1.0, 16);
    const big = computeNpcMarker(ciudadano, 1.0, 64);
    expect(big.size).toBeGreaterThanOrEqual(small.size);
  });
});
