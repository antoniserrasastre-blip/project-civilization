/**
 * Tests del archipiélago balear — v1.2 mapa antiguo.
 *
 * Contrato:
 *   - `generateArchipelago(seed, mapSize)` devuelve 4 islas nombradas
 *     (mallorca, menorca, ibiza, formentera) + posición de rosa de
 *     los vientos. Pura, determinista, dentro del mapa.
 *   - `generateCoast` mantenida por backwards-compat.
 */

import { describe, it, expect } from 'vitest';
import { generateArchipelago } from '@/lib/map';

function bboxArea(points: Array<{ x: number; y: number }>): number {
  if (points.length === 0) return 0;
  let minX = points[0].x, maxX = points[0].x, minY = points[0].y, maxY = points[0].y;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return (maxX - minX) * (maxY - minY);
}

function centroid(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  let sx = 0, sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length, y: sy / points.length };
}

describe('generateArchipelago — Baleares', () => {
  it('devuelve 4 islas con nombres canónicos', () => {
    const arch = generateArchipelago(42, 100);
    expect(arch.islands).toHaveLength(4);
    const kinds = arch.islands.map((i) => i.kind).sort();
    expect(kinds).toEqual(['formentera', 'ibiza', 'mallorca', 'menorca']);
  });

  it('Mallorca es la isla más grande (bbox área)', () => {
    const arch = generateArchipelago(42, 100);
    const mallorca = arch.islands.find((i) => i.kind === 'mallorca')!;
    const menorca = arch.islands.find((i) => i.kind === 'menorca')!;
    const ibiza = arch.islands.find((i) => i.kind === 'ibiza')!;
    const formentera = arch.islands.find((i) => i.kind === 'formentera')!;
    const aM = bboxArea(mallorca.points);
    expect(aM).toBeGreaterThan(bboxArea(menorca.points));
    expect(aM).toBeGreaterThan(bboxArea(ibiza.points));
    expect(aM).toBeGreaterThan(bboxArea(formentera.points));
    // Formentera es la más pequeña.
    expect(bboxArea(formentera.points)).toBeLessThan(bboxArea(ibiza.points));
  });

  it('cada isla tiene nombre legible (label)', () => {
    const arch = generateArchipelago(42, 100);
    for (const isla of arch.islands) {
      expect(isla.name.length).toBeGreaterThan(0);
    }
  });

  it('todas las coordenadas dentro de [0, mapSize]', () => {
    const arch = generateArchipelago(42, 100);
    for (const isla of arch.islands) {
      for (const p of isla.points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(100);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(100);
      }
    }
    expect(arch.compassRose.x).toBeGreaterThanOrEqual(0);
    expect(arch.compassRose.x).toBeLessThanOrEqual(100);
  });

  it('los centros de las islas están geográficamente coherentes', () => {
    const arch = generateArchipelago(42, 100);
    const find = (k: string) =>
      centroid(arch.islands.find((i) => i.kind === k)!.points);
    const m = find('mallorca');
    const me = find('menorca');
    const ib = find('ibiza');
    const fo = find('formentera');
    // Menorca al NE de Mallorca (x mayor, y menor).
    expect(me.x).toBeGreaterThan(m.x);
    expect(me.y).toBeLessThan(m.y);
    // Ibiza al SW de Mallorca (x menor, y mayor).
    expect(ib.x).toBeLessThan(m.x);
    expect(ib.y).toBeGreaterThan(m.y);
    // Formentera al sur de Ibiza.
    expect(fo.y).toBeGreaterThan(ib.y);
    // Todas distinguibles (distancia centros > 10 unidades).
    const centros = [m, me, ib, fo];
    for (let i = 0; i < centros.length; i++) {
      for (let j = i + 1; j < centros.length; j++) {
        const dx = centros[i].x - centros[j].x;
        const dy = centros[i].y - centros[j].y;
        expect(Math.hypot(dx, dy)).toBeGreaterThan(10);
      }
    }
  });

  it('determinismo: misma seed ⇒ mismo archipiélago byte a byte', () => {
    const a = generateArchipelago(42, 100);
    const b = generateArchipelago(42, 100);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('seeds distintas producen archipiélagos distintos', () => {
    const a = generateArchipelago(1, 100);
    const b = generateArchipelago(2, 100);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('round-trip JSON preserva el archipiélago', () => {
    const arch = generateArchipelago(42, 100);
    const rt = JSON.parse(JSON.stringify(arch));
    expect(rt).toEqual(arch);
  });

  it('polígono de cada isla es cerrado (primer punto = último)', () => {
    const arch = generateArchipelago(42, 100);
    for (const isla of arch.islands) {
      const first = isla.points[0];
      const last = isla.points[isla.points.length - 1];
      expect(first.x).toBe(last.x);
      expect(first.y).toBe(last.y);
    }
  });
});
