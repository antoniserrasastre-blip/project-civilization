/**
 * Tests Red — Obsidiana y Conchas en el generador de mundo.
 *
 * Contrato:
 *   - generateWorld produce spawns de RESOURCE.OBSIDIAN en tiles MOUNTAIN.
 *   - generateWorld produce spawns de RESOURCE.SHELL en tiles SHORE.
 *   - Ambos recursos son deterministas con mismo seed.
 *   - Obsidiana es depletable; Conchas son regenerables.
 */

import { describe, it, expect } from 'vitest';
import { generateWorld, CANONICAL_SEED } from '../../lib/world-gen';
import { RESOURCE, TILE } from '../../lib/world-state';

const world = generateWorld(CANONICAL_SEED);

describe('RESOURCE.OBSIDIAN en world-gen', () => {
  it('existen spawns de obsidiana', () => {
    const obs = world.resources.filter((r) => r.id === RESOURCE.OBSIDIAN);
    expect(obs.length).toBeGreaterThan(0);
  });

  it('la obsidiana spawnea sobre tiles de montaña (MOUNTAIN o MOUNTAIN_VOLCANO)', () => {
    const obs = world.resources.filter((r) => r.id === RESOURCE.OBSIDIAN);
    for (const r of obs) {
      const tile = world.tiles[r.y * world.width + r.x];
      expect([TILE.MOUNTAIN, TILE.MOUNTAIN_SNOW, TILE.MOUNTAIN_VOLCANO]).toContain(tile);
    }
  });

  it('la obsidiana es depletable', () => {
    const obs = world.resources.filter((r) => r.id === RESOURCE.OBSIDIAN);
    for (const r of obs) {
      expect(r.regime).toBe('depletable');
    }
  });

  it('cantidad inicial sensata (5–30 por spawn)', () => {
    const obs = world.resources.filter((r) => r.id === RESOURCE.OBSIDIAN);
    for (const r of obs) {
      expect(r.quantity).toBeGreaterThanOrEqual(5);
      expect(r.quantity).toBeLessThanOrEqual(30);
    }
  });

  it('determinista: mismo seed → mismos spawns', () => {
    const w2 = generateWorld(CANONICAL_SEED);
    const obs1 = world.resources.filter((r) => r.id === RESOURCE.OBSIDIAN);
    const obs2 = w2.resources.filter((r) => r.id === RESOURCE.OBSIDIAN);
    expect(JSON.stringify(obs1)).toBe(JSON.stringify(obs2));
  });
});

describe('RESOURCE.SHELL en world-gen', () => {
  it('existen spawns de conchas', () => {
    const shells = world.resources.filter((r) => r.id === RESOURCE.SHELL);
    expect(shells.length).toBeGreaterThan(0);
  });

  it('las conchas spawnean sobre tiles SHORE o SAND_TROPICAL', () => {
    const shells = world.resources.filter((r) => r.id === RESOURCE.SHELL);
    for (const r of shells) {
      const tile = world.tiles[r.y * world.width + r.x];
      expect([TILE.SHORE, TILE.SAND_TROPICAL]).toContain(tile);
    }
  });

  it('las conchas son regenerables', () => {
    const shells = world.resources.filter((r) => r.id === RESOURCE.SHELL);
    for (const r of shells) {
      expect(r.regime).toBe('regenerable');
    }
  });

  it('determinista: mismo seed → mismas conchas', () => {
    const w2 = generateWorld(CANONICAL_SEED);
    const s1 = world.resources.filter((r) => r.id === RESOURCE.SHELL);
    const s2 = w2.resources.filter((r) => r.id === RESOURCE.SHELL);
    expect(JSON.stringify(s1)).toBe(JSON.stringify(s2));
  });
});
