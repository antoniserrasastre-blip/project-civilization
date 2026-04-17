/**
 * Tests del mapa procedural — Sprint 2.
 *
 * El mapa es (por ahora) una costa cerrada: un polígono aproximando una
 * isla balear ficticia. Se genera a partir de `seed` + `mapSize` sumando
 * varias ondas sinusoidales deterministas. Cumple §A4:
 *   - Pura.
 *   - Determinista (misma seed ⇒ mismo polígono byte a byte).
 *   - JSON-serializable (objeto plano con array de puntos).
 */

import { describe, it, expect } from 'vitest';
import { generateCoast } from '@/lib/map';

describe('generateCoast — shape básico', () => {
  it('devuelve un array cerrado de al menos 64 puntos', () => {
    const coast = generateCoast(42, 100);
    expect(coast.points.length).toBeGreaterThanOrEqual(64);
    expect(coast.points[0].x).toBe(coast.points[coast.points.length - 1].x);
    expect(coast.points[0].y).toBe(coast.points[coast.points.length - 1].y);
  });

  it('todos los puntos están dentro de [0, mapSize]', () => {
    const coast = generateCoast(42, 100);
    for (const p of coast.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(100);
    }
  });

  it('resolución custom respetada', () => {
    const coast = generateCoast(42, 100, { resolution: 256 });
    expect(coast.points.length).toBe(256 + 1); // cerrado
  });
});

describe('generateCoast — determinismo (§A4)', () => {
  it('misma seed + mismo tamaño ⇒ mismo polígono byte a byte', () => {
    const a = generateCoast(42, 100);
    const b = generateCoast(42, 100);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('seeds distintas divergen', () => {
    const a = generateCoast(1, 100);
    const b = generateCoast(2, 100);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('JSON.stringify + parse round-trip OK', () => {
    const coast = generateCoast(42, 100);
    const rt = JSON.parse(JSON.stringify(coast));
    expect(rt).toEqual(coast);
  });
});

describe('generateCoast — forma de isla', () => {
  it('la costa describe una forma cerrada alrededor del centro del mapa', () => {
    const coast = generateCoast(42, 200);
    const center = 100;
    // El centro debe estar dentro del polígono (isla): test de winding
    // simplificado mediante ray-casting.
    let inside = false;
    const px = center;
    const py = center;
    const pts = coast.points;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x;
      const yi = pts[i].y;
      const xj = pts[j].x;
      const yj = pts[j].y;
      const intersect =
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    expect(inside).toBe(true);
  });
});
