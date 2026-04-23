/**
 * Tests del spawn costero — Sprint #5 Fase 5 SPAWN-COSTERO.
 *
 * Reemplaza el patch quick de `SPAWN_CENTER=(85,73)` hardcoded por
 * selección automática de isla por seed, respetando "una civ =
 * una isla" hacia Fase 7 (rival en isla distinta).
 */

import { describe, it, expect } from 'vitest';
import {
  findIslands,
  pickClanSpawn,
  pickLandCells,
  type Island,
} from '@/lib/spawn';
import { TILE, type TileId, type WorldMap } from '@/lib/world-state';
import worldMapJson from '@/lib/fixtures/world-map.v1.json';

const WORLD = worldMapJson as unknown as WorldMap;

function mkWorld(tiles: TileId[], width: number, height: number): WorldMap {
  return {
    seed: 0,
    width,
    height,
    tiles,
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 0 },
  };
}

/** Parsea una grid de caracteres a tiles. `~`=WATER, `.`=GRASS,
 *  `#`=MOUNTAIN, `s`=SHORE. Cada fila es una string, todas iguales. */
function parseGrid(lines: string[]): WorldMap {
  const height = lines.length;
  const width = lines[0].length;
  const tiles: TileId[] = new Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = lines[y][x];
      tiles[y * width + x] =
        c === '~'
          ? TILE.WATER
          : c === 's'
            ? TILE.SHORE
            : c === '#'
              ? TILE.MOUNTAIN
              : TILE.GRASS;
    }
  }
  return mkWorld(tiles, width, height);
}

describe('findIslands — componentes conexos sobre fixtures sintéticas', () => {
  it('mundo all-water → 0 islas', () => {
    const w = parseGrid([
      '~~~~~',
      '~~~~~',
      '~~~~~',
    ]);
    expect(findIslands(w)).toHaveLength(0);
  });

  it('una isla única', () => {
    const w = parseGrid([
      '~~~~~',
      '~.#.~',
      '~~~~~',
    ]);
    const islands = findIslands(w);
    expect(islands).toHaveLength(1);
    expect(islands[0].tiles.length).toBe(3);
  });

  it('dos islas separadas por agua', () => {
    const w = parseGrid([
      '.~##',
      '.~##',
      '~~~~',
    ]);
    const islands = findIslands(w);
    expect(islands).toHaveLength(2);
    const sizes = islands.map((i) => i.tiles.length).sort();
    expect(sizes).toEqual([2, 4]);
  });

  it('conectividad 4-vecinos: diagonal NO conecta', () => {
    const w = parseGrid([
      '.~~',
      '~.~',
      '~~.',
    ]);
    expect(findIslands(w)).toHaveLength(3);
  });

  it('centroid dentro de la isla', () => {
    const w = parseGrid([
      '~~~~~',
      '~...~',
      '~...~',
      '~...~',
      '~~~~~',
    ]);
    const [isle] = findIslands(w);
    expect(isle.centroid.x).toBe(2);
    expect(isle.centroid.y).toBe(2);
  });

  it('SHORE tiles se incluyen en la isla y marcan shoreTiles', () => {
    const w = parseGrid([
      '~~~~~',
      '~sss~',
      '~s.s~',
      '~sss~',
      '~~~~~',
    ]);
    const [isle] = findIslands(w);
    expect(isle.tiles.length).toBe(9);
    expect(isle.shoreTiles.length).toBe(8);
  });
});

describe('findIslands — sobre fixture canónico v1', () => {
  it('detecta las 5 islas declaradas en meta', () => {
    const islands = findIslands(WORLD);
    expect(islands).toHaveLength(WORLD.meta.islandCount);
    expect(islands).toHaveLength(5);
  });

  it('todas las islas tienen al menos un tile de shore', () => {
    const islands = findIslands(WORLD);
    for (const isle of islands) {
      expect(isle.shoreTiles.length).toBeGreaterThan(0);
    }
  });

  it('ninguna isla está vacía', () => {
    const islands = findIslands(WORLD);
    for (const isle of islands) {
      expect(isle.tiles.length).toBeGreaterThan(0);
    }
  });
});

describe('pickClanSpawn — selección por seed', () => {
  const islands: Island[] = findIslands(WORLD);

  it('determinista: mismo seed → misma isla + tile', () => {
    const a = pickClanSpawn(42, islands);
    const b = pickClanSpawn(42, islands);
    expect(a.islandIndex).toBe(b.islandIndex);
    expect(a.center.x).toBe(b.center.x);
    expect(a.center.y).toBe(b.center.y);
  });

  it('el centro cae sobre tierra (no WATER)', () => {
    const { center } = pickClanSpawn(1, islands);
    const tile = WORLD.tiles[center.y * WORLD.width + center.x];
    expect(tile).not.toBe(TILE.WATER);
  });

  it('el centro es preferentemente shore o adyacente a shore', () => {
    // El sprint pide "un tile shore o costero". Validamos que hay
    // al menos un tile de shore a distancia Manhattan ≤ 2 del centro.
    const { center } = pickClanSpawn(1, islands);
    let nearShore = false;
    for (let dy = -2; dy <= 2 && !nearShore; dy++) {
      for (let dx = -2; dx <= 2 && !nearShore; dx++) {
        const x = center.x + dx;
        const y = center.y + dy;
        if (x < 0 || y < 0 || x >= WORLD.width || y >= WORLD.height) continue;
        if (WORLD.tiles[y * WORLD.width + x] === TILE.SHORE) {
          nearShore = true;
        }
      }
    }
    expect(nearShore).toBe(true);
  });

  it('diversidad: sobre 20 pares de seeds consecutivos, la mayoría cae en islas distintas', () => {
    let differentCount = 0;
    for (let i = 0; i < 20; i++) {
      const a = pickClanSpawn(i, islands);
      const b = pickClanSpawn(i + 100, islands);
      if (a.islandIndex !== b.islandIndex) differentCount++;
    }
    // Con 5 islas uniformes y mapeo determinista, P(mismo)=0.2.
    // Exigimos ≥ 60% para robustez estadística (holgura sobre
    // el 80% teórico que menciona el sprint).
    expect(differentCount).toBeGreaterThanOrEqual(12);
  });

  it('tira si islands[] está vacío', () => {
    expect(() => pickClanSpawn(42, [])).toThrow(/sin islas/i);
  });
});

describe('pickLandCells — 14 celdas contiguas land-only', () => {
  it('devuelve exactamente N celdas, todas no-water', () => {
    const islands = findIslands(WORLD);
    const { center } = pickClanSpawn(42, islands);
    const cells = pickLandCells(WORLD, center, 14);
    expect(cells).toHaveLength(14);
    for (const c of cells) {
      const t = WORLD.tiles[c.y * WORLD.width + c.x];
      expect(t).not.toBe(TILE.WATER);
    }
  });

  it('las celdas son únicas', () => {
    // Arranca desde un centro sobre tierra — usamos el picker para
    // que los tests no dependan de un hardcode que pueda moverse.
    const islands = findIslands(WORLD);
    const { center } = pickClanSpawn(7, islands);
    const cells = pickLandCells(WORLD, center, 14);
    const keys = new Set(cells.map((c) => `${c.x},${c.y}`));
    expect(keys.size).toBe(14);
  });

  it('determinista por (world, center, n)', () => {
    const islands = findIslands(WORLD);
    const { center } = pickClanSpawn(33, islands);
    const a = pickLandCells(WORLD, center, 14);
    const b = pickLandCells(WORLD, center, 14);
    expect(a).toEqual(b);
  });

  it('tira si la isla es demasiado pequeña', () => {
    const tiny = parseGrid([
      '~~~',
      '~.~',
      '~~~',
    ]);
    expect(() => pickLandCells(tiny, { x: 1, y: 1 }, 14)).toThrow(
      /insuficientes/i,
    );
  });
});
