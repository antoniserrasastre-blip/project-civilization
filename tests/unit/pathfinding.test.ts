/**
 * Tests del A* determinista — CLAUDE-primigenia §4.
 *
 * Contrato:
 *   - Grid 4-conexo, heurística Manhattan, coste entero.
 *   - Cap de expansión (default 10.000 nodos).
 *   - Tie-break: f → h → (x, y) lex → prng.
 *   - Puro: (world, start, end, prng) → (path | null, prng').
 */

import { describe, it, expect } from 'vitest';
import { findPath, type PathWorld } from '@/lib/pathfinding';
import { seedState } from '@/lib/prng';
import { TILE } from '@/lib/world-state';

// Mini mapa 5×5 — X = agua (no pasable), · = hierba.
// (0,0) ······
// (0,1) ·X·X·
// (0,2) ··X··
// (0,3) ·X·X·
// (0,4) ······
function mkWorld(rows: string[]): PathWorld {
  const width = rows[0].length;
  const height = rows.length;
  const tiles = new Array<number>(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles[y * width + x] = rows[y][x] === 'X' ? TILE.WATER : TILE.GRASS;
    }
  }
  return { tiles, width, height };
}

describe('A* — happy paths sobre mini fixture', () => {
  const open = mkWorld(['.....', '.....', '.....', '.....', '.....']);

  it('camino recto horizontal (5 pasos)', () => {
    const r = findPath(open, { x: 0, y: 0 }, { x: 4, y: 0 }, seedState(1));
    expect(r.path).not.toBeNull();
    expect(r.path!).toHaveLength(5); // 0,1,2,3,4
    expect(r.path![0]).toEqual({ x: 0, y: 0 });
    expect(r.path![4]).toEqual({ x: 4, y: 0 });
  });

  it('camino diagonal (4-conex → Manhattan = 4+4 = 8 pasos)', () => {
    const r = findPath(open, { x: 0, y: 0 }, { x: 4, y: 4 }, seedState(1));
    expect(r.path!).toHaveLength(9); // incluye start+end → Manhattan 8 + 1
  });

  it('start == end → path con 1 nodo', () => {
    const r = findPath(open, { x: 2, y: 2 }, { x: 2, y: 2 }, seedState(1));
    expect(r.path).toEqual([{ x: 2, y: 2 }]);
  });
});

describe('A* — bloqueos', () => {
  it('agua bloquea el paso → rodea', () => {
    const world = mkWorld(['.....', '.....', 'XXXX.', '.....', '.....']);
    const r = findPath(world, { x: 0, y: 1 }, { x: 0, y: 3 }, seedState(1));
    expect(r.path).not.toBeNull();
    // El camino óptimo sube, bordea y baja. Longitud Manhattan
    // directa sería 2, el rodeo debe añadir pasos.
    expect(r.path!.length).toBeGreaterThan(3);
  });

  it('sin ruta (isla aislada) → null', () => {
    const world = mkWorld(['.....', 'XXXXX', '.....', '.....', '.....']);
    const r = findPath(world, { x: 0, y: 0 }, { x: 0, y: 4 }, seedState(1));
    expect(r.path).toBeNull();
  });

  it('start sobre tile no pasable → null', () => {
    const world = mkWorld(['X....', '.....', '.....', '.....', '.....']);
    const r = findPath(world, { x: 0, y: 0 }, { x: 4, y: 4 }, seedState(1));
    expect(r.path).toBeNull();
  });

  it('end sobre tile no pasable → null', () => {
    const world = mkWorld(['.....', '.....', '.....', '.....', '....X']);
    const r = findPath(world, { x: 0, y: 0 }, { x: 4, y: 4 }, seedState(1));
    expect(r.path).toBeNull();
  });
});

describe('A* — determinismo (§A4)', () => {
  it('mismo input → misma ruta 1000 veces', () => {
    const world = mkWorld(['.....', '.....', '.....', '.....', '.....']);
    const first = findPath(world, { x: 0, y: 0 }, { x: 4, y: 4 }, seedState(42));
    for (let i = 0; i < 1000; i++) {
      const r = findPath(world, { x: 0, y: 0 }, { x: 4, y: 4 }, seedState(42));
      expect(r.path).toEqual(first.path);
    }
  });

  it('tie-break por (x,y) lex sobre mapa abierto', () => {
    // Entre dos caminos equidistantes, el A* prefiere el de menor
    // (x, y) al expandir. Sobre un mapa completamente abierto
    // diagonal 0,0 → 4,4 hay múltiples caminos óptimos; el elegido
    // debe ser estable entre seeds distintos (no se usa prng si
    // los tie-breaks por (x,y) ya deciden).
    const world = mkWorld(['.....', '.....', '.....', '.....', '.....']);
    const a = findPath(world, { x: 0, y: 0 }, { x: 4, y: 4 }, seedState(1));
    const b = findPath(world, { x: 0, y: 0 }, { x: 4, y: 4 }, seedState(999));
    expect(a.path).toEqual(b.path);
  });
});

describe('A* — cap de expansión', () => {
  it('cap respeta maxExpand y devuelve null si se supera', () => {
    // Mapa grande abierto — un cap muy bajo no permite encontrar
    // el camino.
    const side = 50;
    const rows: string[] = [];
    for (let i = 0; i < side; i++) rows.push('.'.repeat(side));
    const world = mkWorld(rows);
    const r = findPath(
      world,
      { x: 0, y: 0 },
      { x: side - 1, y: side - 1 },
      seedState(1),
      { maxExpand: 10 },
    );
    expect(r.path).toBeNull();
  });
});
