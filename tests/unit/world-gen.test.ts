/**
 * Tests del generador del archipiélago primigenia — §A4 determinismo
 * duro. Ver vision-primigenia §3.4 y ROADMAP-primigenia Sprint 1.
 *
 * Contrato del generador:
 *   - Puro: `generateWorld(seed)` no muta nada externo.
 *   - Determinista: mismo seed → mapa byte-idéntico 1000 rerolls.
 *   - Archipiélago balear-ficticio: 3-5 islas en el default 512×512.
 *   - 6 recursos distribuidos con régimen (vision-primigenia §3.5).
 *   - Conectividad: cada tile de tierra de una isla alcanzable por
 *     BFS desde cualquier otro tile de la misma isla.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { generateWorld, CANONICAL_SEED } from '@/lib/world-gen';
import { TILE, RESOURCE } from '@/lib/world-state';
import type { WorldMap, ResourceId, TileId } from '@/lib/world-state';

function sha(w: WorldMap): string {
  return createHash('sha256').update(JSON.stringify(w)).digest('hex');
}

function isLand(t: TileId): boolean {
  return t !== TILE.WATER && t !== TILE.SHALLOW_WATER;
}

/** BFS 4-conex sobre tiles de tierra desde (sx, sy). Devuelve tiles
 *  alcanzados. No toca agua. */
function bfsLand(w: WorldMap, sx: number, sy: number): Set<number> {
  const seen = new Set<number>();
  if (!isLand(w.tiles[sy * w.width + sx])) return seen;
  const queue: Array<[number, number]> = [[sx, sy]];
  seen.add(sy * w.width + sx);
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w.width || ny >= w.height) continue;
      const idx = ny * w.width + nx;
      if (seen.has(idx)) continue;
      if (!isLand(w.tiles[idx])) continue;
      seen.add(idx);
      queue.push([nx, ny]);
    }
  }
  return seen;
}

/** Devuelve los componentes conexos de tierra como arrays de índices. */
function landComponents(w: WorldMap): number[][] {
  const visited = new Set<number>();
  const components: number[][] = [];
  for (let y = 0; y < w.height; y++) {
    for (let x = 0; x < w.width; x++) {
      const idx = y * w.width + x;
      if (visited.has(idx)) continue;
      if (!isLand(w.tiles[idx])) continue;
      const comp = bfsLand(w, x, y);
      for (const c of comp) visited.add(c);
      components.push(Array.from(comp));
    }
  }
  return components;
}

describe('generateWorld — contrato §A4 de pureza y determinismo', () => {
  it('no muta el seed ni devuelve undefined', () => {
    const w = generateWorld(42);
    expect(w).toBeDefined();
    expect(w.seed).toBe(42);
  });

  it('mismo seed → mapa byte-idéntico 1000 veces (regen, mini-map)', () => {
    // Usa mini-mapa 64×64 para que 1000 rerolls corran en <5s.
    // El determinismo del tamaño default 512×512 se cubre en el test
    // de abajo con 3 rerolls.
    const opts = { width: 64, height: 64 };
    const reference = sha(generateWorld(42, opts));
    for (let i = 0; i < 1000; i++) {
      expect(sha(generateWorld(42, opts))).toBe(reference);
    }
  });

  it('mismo seed → mapa byte-idéntico en tamaño default 512×512', () => {
    const reference = sha(generateWorld(42));
    expect(sha(generateWorld(42))).toBe(reference);
    expect(sha(generateWorld(42))).toBe(reference);
  });

  it('seeds distintos → mapas distintos (sanity)', () => {
    const a = sha(generateWorld(1));
    const b = sha(generateWorld(2));
    const c = sha(generateWorld(3));
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('round-trip JSON del generado', () => {
    const w = generateWorld(42);
    const after = JSON.parse(JSON.stringify(w));
    expect(after).toEqual(w);
  });
});

describe('generateWorld — estructura del archipiélago', () => {
  it('dimensiones por defecto 512×512', () => {
    const w = generateWorld(CANONICAL_SEED);
    expect(w.width).toBe(512);
    expect(w.height).toBe(512);
    expect(w.tiles.length).toBe(512 * 512);
  });

  it('declara entre 3 y 5 islas en meta', () => {
    const w = generateWorld(CANONICAL_SEED);
    expect(w.meta.islandCount).toBeGreaterThanOrEqual(3);
    expect(w.meta.islandCount).toBeLessThanOrEqual(5);
  });

  it('componentes de tierra conectados == meta.islandCount', () => {
    const w = generateWorld(CANONICAL_SEED);
    // Islas "visibles" son componentes conexos no triviales.
    // Filtro de tamaño mínimo: evita contar píxeles de ruido como
    // islas independientes.
    const MIN_ISLAND_TILES = 50;
    const comps = landComponents(w).filter(
      (c) => c.length >= MIN_ISLAND_TILES,
    );
    expect(comps.length).toBe(w.meta.islandCount);
  });

  it('cada isla es internamente conexa (BFS desde un tile alcanza todos los demás)', () => {
    const w = generateWorld(CANONICAL_SEED);
    const comps = landComponents(w).filter((c) => c.length >= 50);
    for (const comp of comps) {
      const startIdx = comp[0];
      const sx = startIdx % w.width;
      const sy = Math.floor(startIdx / w.width);
      const reached = bfsLand(w, sx, sy);
      expect(reached.size).toBe(comp.length);
    }
  });
});

describe('generateWorld — distribución de recursos (§3.5 primigenia)', () => {
  it('spawnea los 6 tipos de recurso', () => {
    const w = generateWorld(CANONICAL_SEED);
    const ids = new Set<ResourceId>(w.resources.map((r) => r.id));
    expect(ids.has(RESOURCE.WOOD)).toBe(true);
    expect(ids.has(RESOURCE.STONE)).toBe(true);
    expect(ids.has(RESOURCE.BERRY)).toBe(true);
    expect(ids.has(RESOURCE.GAME)).toBe(true);
    expect(ids.has(RESOURCE.WATER)).toBe(true);
    expect(ids.has(RESOURCE.FISH)).toBe(true);
  });

  it('régimen correcto por recurso (#21)', () => {
    const w = generateWorld(CANONICAL_SEED);
    for (const r of w.resources) {
      if (r.id === RESOURCE.STONE) expect(r.regime).toBe('depletable');
      else if (r.id === RESOURCE.WATER || r.id === RESOURCE.FISH)
        expect(r.regime).toBe('continuous');
      else expect(r.regime).toBe('regenerable');
    }
  });

  it('genera aguas profundas y poco profundas', () => {
    const w = generateWorld(CANONICAL_SEED);
    expect(w.tiles.includes(TILE.WATER)).toBe(true);
    expect(w.tiles.includes(TILE.SHALLOW_WATER)).toBe(true);
  });

  it('cantidades dentro de rangos sanos', () => {
    const w = generateWorld(CANONICAL_SEED);
    // Un mapa 512×512 debe tener entre 30 y 2000 spawns totales —
    // suficiente para sostener un clan pero no ruido uniforme.
    expect(w.resources.length).toBeGreaterThanOrEqual(30);
    expect(w.resources.length).toBeLessThanOrEqual(2000);
    for (const r of w.resources) {
      expect(r.quantity).toBeGreaterThan(0);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x).toBeLessThan(w.width);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeLessThan(w.height);
    }
  });

  it('wood y berry solo sobre tierra; fish solo sobre agua poco profunda', () => {
    const w = generateWorld(CANONICAL_SEED);
    for (const r of w.resources) {
      const tile = w.tiles[r.y * w.width + r.x];
      if (r.id === RESOURCE.FISH) {
        expect(tile).toBe(TILE.SHALLOW_WATER);
      } else if (r.id === RESOURCE.WOOD || r.id === RESOURCE.BERRY) {
        expect(isLand(tile as TileId)).toBe(true);
      }
    }
  });
});

describe('generateWorld — size parametrizable (para tests rápidos)', () => {
  it('acepta width/height custom y los respeta', () => {
    const w = generateWorld(42, { width: 64, height: 64 });
    expect(w.width).toBe(64);
    expect(w.height).toBe(64);
    expect(w.tiles.length).toBe(64 * 64);
  });

  it('seed canónico expuesto como constante', () => {
    expect(typeof CANONICAL_SEED).toBe('number');
    expect(Number.isInteger(CANONICAL_SEED)).toBe(true);
  });
});
