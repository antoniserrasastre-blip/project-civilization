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
import { findPath } from '@/lib/pathfinding';
import type { WorldMap } from '@/lib/world-state';
import { seedState } from '@/lib/prng';
import { TILE } from '@/lib/world-state';

// Mini mapa 5×5 — X = agua (no pasable), · = hierba.
// (0,0) ······
// (0,1) ·X·X·
// (0,2) ··X··
// (0,3) ·X·X·
// (0,4) ······
function mkWorld(rows: string[]): WorldMap {
  const width = rows[0].length;
  const height = rows.length;
  const tiles = new Array<number>(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      tiles[y * width + x] = rows[y][x] === 'X' ? TILE.WATER : TILE.GRASS;
    }
  }
  return {
    tiles,
    width,
    height,
    traffic: new Uint8Array(width * height),
    influence: new Array<number>(width * height).fill(0),
    reserves: new Array<number>(width * height).fill(0),
    resources: [],
    terrainTags: {},
    traditions: {},
  } as unknown as WorldMap;
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

// EL MAR (05c): el agua ya no bloquea — cuesta 80 vs 10. Estos pins fijan la
// ECONOMÍA del nado: se cruza cuando el rodeo sale más caro, y las islas
// dejaron de estar aisladas.
describe('A* — el agua cuesta, no bloquea', () => {
  it('cruza el tile mojado cuando el rodeo es más caro (1×80 < 10 pasos ×10)', () => {
    const world = mkWorld(['.....', '.....', 'XXXX.', '.....', '.....']);
    const r = findPath(world, { x: 0, y: 1 }, { x: 0, y: 3 }, seedState(1));
    expect(r.path).not.toBeNull();
    expect(r.path!).toHaveLength(3); // directo: (0,1)→(0,2 agua)→(0,3)
    const mojados = r.path!.filter((p) => world.tiles[p.y * world.width + p.x] === 0);
    expect(mojados).toHaveLength(1);
  });

  it('la isla aislada ya no existe: se nada el estrecho (1 solo tile mojado)', () => {
    const world = mkWorld(['.....', 'XXXXX', '.....', '.....', '.....']);
    const r = findPath(world, { x: 0, y: 0 }, { x: 0, y: 4 }, seedState(1));
    expect(r.path).not.toBeNull();
    expect(r.path![r.path!.length - 1]).toEqual({ x: 0, y: 4 });
    const mojados = r.path!.filter((p) => world.tiles[p.y * world.width + p.x] === 0);
    expect(mojados).toHaveLength(1);
  });

  // Contrato cambiado en sprint 05 (auditoría-agua C2): el origen intransitable
  // NO invalida el path — un NPC empujado al agua por error debe poder salir.
  // El A* solo expande vecinos transitables: sale en el primer paso y no reentra.
  it('start sobre tile no pasable → path que sale y no vuelve a pisar intransitable', () => {
    const world = mkWorld(['X....', '.....', '.....', '.....', '.....']);
    const r = findPath(world, { x: 0, y: 0 }, { x: 4, y: 4 }, seedState(1));
    expect(r.path).not.toBeNull();
    const steps = r.path!.slice(1); // todos los pasos POSTERIORES al origen
    expect(steps.length).toBeGreaterThan(0);
    for (const s of steps) {
      expect(world.tiles[s.y * world.width + s.x], `paso (${s.x},${s.y})`).not.toBe(0);
    }
    expect(steps[steps.length - 1]).toEqual({ x: 4, y: 4 });
  });

  it('destino en el agua: nadable por defecto; null solo con passable custom', () => {
    const world = mkWorld(['.....', '.....', '.....', '.....', '....X']);
    // 05c: el agua es destino válido (se puede nadar hasta allí).
    const r = findPath(world, { x: 0, y: 0 }, { x: 4, y: 4 }, seedState(1));
    expect(r.path).not.toBeNull();
    expect(r.path![r.path!.length - 1]).toEqual({ x: 4, y: 4 });
    // El contrato de options.passable sigue mandando para callers custom.
    const rCustom = findPath(world, { x: 0, y: 0 }, { x: 4, y: 4 }, seedState(1), {
      passable: (tile) => tile !== 0,
    });
    expect(rCustom.path).toBeNull();
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
