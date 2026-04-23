/**
 * Tests del shape de WorldMap — contrato §A4 (round-trip JSON).
 *
 * No testean el generador — solo que los tipos declarados permiten
 * serialización round-trip sin pérdida estructural. El generador tiene
 * su propia suite (world-gen.test.ts).
 */

import { describe, it, expect } from 'vitest';
import type { WorldMap, ResourceSpawn, TileId } from '@/lib/world-state';
import { emptyWorldMap, TILE, RESOURCE } from '@/lib/world-state';

describe('WorldMap — shape básico', () => {
  it('emptyWorldMap devuelve un mundo con campos obligatorios', () => {
    const w = emptyWorldMap(42, 16, 16);
    expect(w.seed).toBe(42);
    expect(w.width).toBe(16);
    expect(w.height).toBe(16);
    expect(Array.isArray(w.tiles)).toBe(true);
    expect(w.tiles.length).toBe(16 * 16);
    expect(Array.isArray(w.resources)).toBe(true);
    expect(w.resources).toEqual([]);
    expect(typeof w.meta.generatorVersion).toBe('number');
    expect(typeof w.meta.shaHash).toBe('string');
    expect(typeof w.meta.islandCount).toBe('number');
  });

  it('tiles son enteros (TileId)', () => {
    const w = emptyWorldMap(42, 8, 8);
    for (const t of w.tiles) {
      expect(Number.isInteger(t)).toBe(true);
      expect(t).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('WorldMap — round-trip JSON (§A4)', () => {
  it('empty world round-trip estructuralmente idéntico', () => {
    const w = emptyWorldMap(7, 32, 32);
    const after = JSON.parse(JSON.stringify(w)) as WorldMap;
    expect(after).toEqual(w);
  });

  it('round-trip preserva resources con todos sus campos', () => {
    const w = emptyWorldMap(7, 32, 32);
    const spawn: ResourceSpawn = {
      id: 'wood',
      x: 5,
      y: 10,
      quantity: 20,
      initialQuantity: 20,
      regime: 'regenerable',
      depletedAtTick: null,
    };
    const withRes: WorldMap = { ...w, resources: [spawn] };
    const after = JSON.parse(JSON.stringify(withRes)) as WorldMap;
    expect(after.resources).toEqual([spawn]);
  });

  it('no contiene funciones, Map, Set, ni undefined', () => {
    const w = emptyWorldMap(99, 16, 16);
    const json = JSON.stringify(w);
    // Si algo es undefined, JSON.stringify lo omite y round-trip no
    // reproduce la clave — detecta fugas.
    const after = JSON.parse(json);
    for (const k of Object.keys(w) as Array<keyof WorldMap>) {
      expect(after[k]).toBeDefined();
    }
    expect(json).not.toContain('undefined');
  });
});

describe('Constantes TILE y RESOURCE', () => {
  it('TILE expone al menos tierra y agua', () => {
    expect(typeof TILE.WATER).toBe('number');
    expect(typeof TILE.GRASS).toBe('number');
    expect(typeof TILE.FOREST).toBe('number');
    expect(typeof TILE.MOUNTAIN).toBe('number');
    expect(typeof TILE.SHORE).toBe('number');
  });

  it('RESOURCE lista los 8 tipos primigenia (Sprint 9: +obsidiana +concha)', () => {
    const ids: string[] = Object.values(RESOURCE);
    expect(ids).toContain('wood');
    expect(ids).toContain('stone');
    expect(ids).toContain('berry');
    expect(ids).toContain('game');
    expect(ids).toContain('water');
    expect(ids).toContain('fish');
    expect(ids).toContain('obsidian');
    expect(ids).toContain('shell');
    expect(new Set(ids).size).toBeGreaterThanOrEqual(8);
  });

  it('TileId acepta cualquier valor de TILE en compile-time', () => {
    // Si un TILE.* no es asignable a TileId, el type-check fallará
    // antes de llegar aquí.
    const t: TileId = TILE.GRASS;
    expect(Number.isInteger(t)).toBe(true);
  });
});
