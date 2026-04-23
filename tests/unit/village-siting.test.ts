/**
 * Tests de lib/village-siting.ts — colocación inteligente de edificios.
 *
 * Contrato:
 *   - scoreFogataSite evalúa tiles según agua, recursos y terreno.
 *   - findBuildSite devuelve el mejor tile válido según el tipo de edificio.
 *   - El radio de exclusión impide apilar edificios.
 *   - Todo es puro y determinista (§A4).
 */

import { describe, it, expect } from 'vitest';
import {
  scoreFogataSite,
  findBuildSite,
  isValidBuildTile,
  EXCLUSION_RADIUS,
  COHESION_RADIUS,
  cohesionMultiplier,
} from '@/lib/village-siting';
import { emptyWorldMap, TILE, RESOURCE, type WorldMap } from '@/lib/world-state';
import type { Structure } from '@/lib/structures';
import { CRAFTABLE } from '@/lib/crafting';

const W = 20;
const H = 20;

function mkWorld(overrides?: Partial<WorldMap>): WorldMap {
  const base = emptyWorldMap(0, W, H);
  return {
    ...base,
    tiles: new Array(W * H).fill(TILE.GRASS),
    ...overrides,
  };
}

function mkStructure(kind: typeof CRAFTABLE[keyof typeof CRAFTABLE], x: number, y: number): Structure {
  return { id: `s-${kind}-${x}-${y}`, kind, position: { x, y }, builtAtTick: 1 };
}

describe('isValidBuildTile', () => {
  it('GRASS es válido', () => {
    const world = mkWorld();
    expect(isValidBuildTile(world, { x: 5, y: 5 })).toBe(true);
  });

  it('SAND es válido', () => {
    const world = mkWorld();
    const tiles = [...world.tiles];
    tiles[5 * W + 5] = TILE.SAND;
    expect(isValidBuildTile({ ...world, tiles }, { x: 5, y: 5 })).toBe(true);
  });

  it('WATER no es válido', () => {
    const world = mkWorld();
    const tiles = [...world.tiles];
    tiles[5 * W + 5] = TILE.WATER;
    expect(isValidBuildTile({ ...world, tiles }, { x: 5, y: 5 })).toBe(false);
  });

  it('MOUNTAIN no es válido', () => {
    const world = mkWorld();
    const tiles = [...world.tiles];
    tiles[5 * W + 5] = TILE.MOUNTAIN;
    expect(isValidBuildTile({ ...world, tiles }, { x: 5, y: 5 })).toBe(false);
  });

  it('fuera del mapa no es válido', () => {
    const world = mkWorld();
    expect(isValidBuildTile(world, { x: -1, y: 0 })).toBe(false);
    expect(isValidBuildTile(world, { x: W, y: 0 })).toBe(false);
  });
});

describe('scoreFogataSite', () => {
  it('tile sin recursos tiene score 0', () => {
    const world = mkWorld();
    expect(scoreFogataSite(world, { x: 5, y: 5 })).toBe(0);
  });

  it('agua cercana suma puntos positivos', () => {
    const world = mkWorld({
      resources: [{
        id: RESOURCE.WATER, x: 5, y: 7,
        quantity: 1, initialQuantity: 1, regime: 'continuous', depletedAtTick: null,
      }],
    });
    const score = scoreFogataSite(world, { x: 5, y: 5 });
    expect(score).toBeGreaterThan(0);
  });

  it('agua lejana (>10 tiles) no suma puntos', () => {
    const world = mkWorld({
      resources: [{
        id: RESOURCE.WATER, x: 5, y: 18,
        quantity: 1, initialQuantity: 1, regime: 'continuous', depletedAtTick: null,
      }],
    });
    const score = scoreFogataSite(world, { x: 5, y: 5 }); // dist=13
    expect(score).toBe(0);
  });

  it('madera y bayas cercanas suman puntos', () => {
    const world = mkWorld({
      resources: [
        { id: RESOURCE.WOOD, x: 6, y: 5, quantity: 5, initialQuantity: 5, regime: 'regenerable', depletedAtTick: null },
        { id: RESOURCE.BERRY, x: 7, y: 5, quantity: 5, initialQuantity: 5, regime: 'regenerable', depletedAtTick: null },
      ],
    });
    const scoreWith = scoreFogataSite(world, { x: 5, y: 5 });
    const scoreWithout = scoreFogataSite(mkWorld(), { x: 5, y: 5 });
    expect(scoreWith).toBeGreaterThan(scoreWithout);
  });
});

describe('EXCLUSION_RADIUS', () => {
  it('es al menos 2 tiles', () => {
    expect(EXCLUSION_RADIUS).toBeGreaterThanOrEqual(2);
  });
});

describe('COHESION_RADIUS', () => {
  it('es al menos 6 tiles', () => {
    expect(COHESION_RADIUS).toBeGreaterThanOrEqual(6);
  });
});

describe('cohesionMultiplier', () => {
  it('devuelve 1.2 si el tile está dentro del radio de cohesión del fuego', () => {
    const fire = mkStructure(CRAFTABLE.FOGATA_PERMANENTE, 10, 10);
    const mult = cohesionMultiplier({ x: 10, y: 12 }, [fire]); // dist=2 ≤ COHESION_RADIUS
    expect(mult).toBeCloseTo(1.2, 5);
  });

  it('devuelve 1.0 si no hay fogata', () => {
    expect(cohesionMultiplier({ x: 10, y: 10 }, [])).toBe(1.0);
  });

  it('devuelve 1.0 si el tile está lejos del fuego', () => {
    const fire = mkStructure(CRAFTABLE.FOGATA_PERMANENTE, 0, 0);
    const mult = cohesionMultiplier({ x: 15, y: 15 }, [fire]); // dist=30
    expect(mult).toBe(1.0);
  });
});

describe('findBuildSite', () => {
  it('fogata elige el tile con mayor score', () => {
    // Tile (5,5) tiene agua cercana; tile (15,15) no
    const world = mkWorld({
      resources: [{
        id: RESOURCE.WATER, x: 5, y: 7,
        quantity: 1, initialQuantity: 1, regime: 'continuous', depletedAtTick: null,
      }],
    });
    const anchor = { x: 8, y: 8 };
    const site = findBuildSite(world, [], CRAFTABLE.FOGATA_PERMANENTE, anchor);
    // Debe estar cerca del agua, no en el extremo opuesto
    const distToWater = Math.abs(site.x - 5) + Math.abs(site.y - 7);
    expect(distToWater).toBeLessThan(12);
  });

  it('refugio respeta el radio de exclusión de la fogata', () => {
    const world = mkWorld();
    const fire = mkStructure(CRAFTABLE.FOGATA_PERMANENTE, 10, 10);
    const anchor = { x: 10, y: 10 };
    const site = findBuildSite(world, [fire], CRAFTABLE.REFUGIO, anchor);
    const dist = Math.abs(site.x - 10) + Math.abs(site.y - 10);
    expect(dist).toBeGreaterThanOrEqual(EXCLUSION_RADIUS);
  });

  it('findBuildSite es determinista', () => {
    const world = mkWorld();
    const fire = mkStructure(CRAFTABLE.FOGATA_PERMANENTE, 10, 10);
    const anchor = { x: 10, y: 10 };
    const s1 = findBuildSite(world, [fire], CRAFTABLE.REFUGIO, anchor);
    const s2 = findBuildSite(world, [fire], CRAFTABLE.REFUGIO, anchor);
    expect(s1).toEqual(s2);
  });

  it('no coloca edificios en tiles inválidos (agua/montaña)', () => {
    const tiles = new Array(W * H).fill(TILE.WATER);
    // Solo algunos tiles de grass en el mapa
    tiles[5 * W + 5] = TILE.GRASS;
    tiles[5 * W + 6] = TILE.GRASS;
    const world = mkWorld({ tiles });
    const anchor = { x: 5, y: 5 };
    const site = findBuildSite(world, [], CRAFTABLE.FOGATA_PERMANENTE, anchor);
    const tileType = world.tiles[site.y * W + site.x];
    expect([TILE.GRASS, TILE.SAND, TILE.SHORE]).toContain(tileType);
  });
});
