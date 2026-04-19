/**
 * Tests del régimen de recursos (decisión #21).
 *
 * tickResources avanza timers de regeneración sin mutar el input.
 * Regenerable que se agotó + han pasado REGEN_TICKS(id) → vuelve a
 * initialQuantity. Depletable no regenera. Continuous no se toca.
 */

import { describe, it, expect } from 'vitest';
import {
  tickResources,
  REGEN_DAYS,
  TICKS_PER_DAY,
  regenTicksFor,
} from '@/lib/resources';
import { RESOURCE, type ResourceSpawn } from '@/lib/world-state';

function mkSpawn(overrides: Partial<ResourceSpawn> & { id: ResourceSpawn['id'] }): ResourceSpawn {
  return {
    x: 0,
    y: 0,
    quantity: 10,
    regime: 'regenerable',
    initialQuantity: 10,
    depletedAtTick: null,
    ...overrides,
  };
}

describe('Constantes del régimen (decisión #21)', () => {
  it('REGEN_DAYS: leña 60, baya 45, caza 100, piedra null, agua/pescado 0', () => {
    expect(REGEN_DAYS[RESOURCE.WOOD]).toBe(60);
    expect(REGEN_DAYS[RESOURCE.BERRY]).toBe(45);
    expect(REGEN_DAYS[RESOURCE.GAME]).toBe(100);
    expect(REGEN_DAYS[RESOURCE.STONE]).toBeNull();
    expect(REGEN_DAYS[RESOURCE.WATER]).toBe(0);
    expect(REGEN_DAYS[RESOURCE.FISH]).toBe(0);
  });

  it('TICKS_PER_DAY es positivo', () => {
    expect(TICKS_PER_DAY).toBeGreaterThan(0);
  });

  it('regenTicksFor escala a TICKS_PER_DAY', () => {
    expect(regenTicksFor(RESOURCE.WOOD)).toBe(60 * TICKS_PER_DAY);
    expect(regenTicksFor(RESOURCE.STONE)).toBeNull();
  });
});

describe('tickResources — pureza', () => {
  it('no muta el array de spawns', () => {
    const spawns = [mkSpawn({ id: RESOURCE.WOOD })];
    const before = JSON.stringify(spawns);
    tickResources(spawns, 100);
    expect(JSON.stringify(spawns)).toBe(before);
  });
});

describe('tickResources — regenerable', () => {
  it('spawn no agotado (depletedAtTick === null) no cambia', () => {
    const s = mkSpawn({ id: RESOURCE.WOOD, quantity: 5 });
    const r = tickResources([s], 100);
    expect(r[0]).toEqual(s);
  });

  it('spawn agotado antes del timer sigue a 0', () => {
    const s = mkSpawn({
      id: RESOURCE.WOOD,
      quantity: 0,
      depletedAtTick: 0,
    });
    const halfWay = regenTicksFor(RESOURCE.WOOD)! / 2;
    const r = tickResources([s], halfWay);
    expect(r[0].quantity).toBe(0);
    expect(r[0].depletedAtTick).toBe(0);
  });

  it('spawn agotado cuando pasa el timer → vuelve a initialQuantity', () => {
    const s = mkSpawn({
      id: RESOURCE.BERRY,
      quantity: 0,
      depletedAtTick: 100,
      initialQuantity: 12,
    });
    const done = 100 + regenTicksFor(RESOURCE.BERRY)!;
    const r = tickResources([s], done);
    expect(r[0].quantity).toBe(12);
    expect(r[0].depletedAtTick).toBeNull();
  });
});

describe('tickResources — depletable', () => {
  it('piedra agotada nunca regenera', () => {
    const s = mkSpawn({
      id: RESOURCE.STONE,
      regime: 'depletable',
      quantity: 0,
      depletedAtTick: 0,
      initialQuantity: 50,
    });
    const r = tickResources([s], 999999);
    expect(r[0].quantity).toBe(0);
    expect(r[0].depletedAtTick).toBe(0);
  });
});

describe('tickResources — continuous', () => {
  it('agua y pescado no cambian', () => {
    const w = mkSpawn({
      id: RESOURCE.WATER,
      regime: 'continuous',
      quantity: 999,
    });
    const f = mkSpawn({
      id: RESOURCE.FISH,
      regime: 'continuous',
      quantity: 5,
    });
    const r = tickResources([w, f], 100000);
    expect(r[0]).toEqual(w);
    expect(r[1]).toEqual(f);
  });
});

describe('tickResources — orden canónico preservado', () => {
  it('mantiene el orden del input', () => {
    const spawns = [
      mkSpawn({ id: RESOURCE.WOOD, x: 1 }),
      mkSpawn({ id: RESOURCE.BERRY, x: 2 }),
      mkSpawn({ id: RESOURCE.STONE, x: 3, regime: 'depletable' }),
    ];
    const r = tickResources(spawns, 100);
    expect(r.map((s) => s.x)).toEqual([1, 2, 3]);
  });
});
