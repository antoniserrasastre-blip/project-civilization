/**
 * Tests de crafting — Sprint 4.5.
 */

import { describe, it, expect } from 'vitest';
import {
  RECIPES,
  CRAFTABLE,
  clanInventoryTotal,
  canBuild,
  consumeForRecipe,
} from '@/lib/crafting';
import { makeTestNPC } from '@/lib/npcs';

function stocked(overrides: Partial<{ wood: number; stone: number; game: number; berry: number; fish: number }>) {
  return makeTestNPC({
    id: 'x',
    inventory: {
      wood: 0,
      stone: 0,
      berry: 0,
      game: 0,
      fish: 0,
      ...overrides,
    },
  });
}

describe('RECIPES — 5 crafteables (decisión #20)', () => {
  it('lista los 5 exactos', () => {
    const ids = Object.values(CRAFTABLE).sort();
    expect(Object.keys(RECIPES).sort()).toEqual(ids);
    expect(ids).toHaveLength(5);
  });

  it('Refugio: 15 wood + 8 stone + 3 game', () => {
    expect(RECIPES[CRAFTABLE.REFUGIO].inputs).toEqual({
      wood: 15,
      stone: 8,
      game: 3,
    });
    expect(RECIPES[CRAFTABLE.REFUGIO].daysWork).toBe(5);
  });

  it('Fogata permanente: 5 wood + 15 stone, 3 días', () => {
    expect(RECIPES[CRAFTABLE.FOGATA_PERMANENTE].inputs).toEqual({
      wood: 5,
      stone: 15,
    });
  });

  it('Despensa: 10 wood + 6 stone, 4 días', () => {
    expect(RECIPES[CRAFTABLE.DESPENSA].inputs).toEqual({
      wood: 10,
      stone: 6,
    });
  });

  it('Total mínimo clan: 32 wood + 34 stone + 5 game (tabla #20)', () => {
    let totalWood = 0;
    let totalStone = 0;
    let totalGame = 0;
    for (const r of Object.values(RECIPES)) {
      totalWood += r.inputs.wood ?? 0;
      totalStone += r.inputs.stone ?? 0;
      totalGame += r.inputs.game ?? 0;
    }
    expect(totalWood).toBe(32);
    expect(totalStone).toBe(34);
    expect(totalGame).toBe(5);
  });
});

describe('clanInventoryTotal', () => {
  it('suma inventarios de todos los vivos', () => {
    const a = stocked({ wood: 3, stone: 5 });
    const b = stocked({ wood: 7, game: 2 });
    const dead = makeTestNPC({
      id: 'dead',
      alive: false,
      inventory: { wood: 100, stone: 0, berry: 0, game: 0, fish: 0 },
    });
    const t = clanInventoryTotal([a, b, dead]);
    expect(t).toEqual({ wood: 10, stone: 5, berry: 0, game: 2, fish: 0 });
  });
});

describe('canBuild', () => {
  it('true si pooled >= inputs', () => {
    const clan = { wood: 20, stone: 20, berry: 0, game: 5, fish: 0 };
    expect(canBuild(RECIPES[CRAFTABLE.REFUGIO], clan)).toBe(true);
  });

  it('false si falta cualquier input', () => {
    const clan = { wood: 20, stone: 0, berry: 0, game: 5, fish: 0 };
    expect(canBuild(RECIPES[CRAFTABLE.REFUGIO], clan)).toBe(false);
  });
});

describe('consumeForRecipe', () => {
  it('resta del pooled respetando total', () => {
    const a = stocked({ wood: 10, stone: 10, game: 3 });
    a.id = 'a';
    const b = stocked({ wood: 10 });
    b.id = 'b';
    const after = consumeForRecipe([a, b], RECIPES[CRAFTABLE.REFUGIO]);
    const t = clanInventoryTotal(after);
    expect(t.wood).toBe(20 - 15); // 5 restantes
    expect(t.stone).toBe(10 - 8); // 2 restantes
    expect(t.game).toBe(3 - 3); // 0 restantes
  });

  it('tira si no hay recursos', () => {
    const a = stocked({ wood: 1 });
    expect(() =>
      consumeForRecipe([a], RECIPES[CRAFTABLE.REFUGIO]),
    ).toThrow(/recursos/i);
  });

  it('pureza: no muta input', () => {
    const a = stocked({ wood: 20, stone: 20, game: 5 });
    a.id = 'a';
    const snap = JSON.stringify(a);
    consumeForRecipe([a], RECIPES[CRAFTABLE.REFUGIO]);
    expect(JSON.stringify(a)).toBe(snap);
  });
});
