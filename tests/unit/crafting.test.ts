/**
 * Tests de crafting — Sprint 4.5 + Sprint 15 (Logistics).
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

function stocked(overrides: Partial<{ wood: number; stone: number; game: number; berry: number; fish: number; obsidian: number; shell: number }>) {
  return makeTestNPC({
    id: 'x',
    inventory: {
      wood: 0, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0,
      ...overrides,
    } as import('@/lib/npcs').NPCInventory,
  });
}

describe('RECIPES — edificios (Sprint 15 incluye Stockpiles)', () => {
  it('lista los exactos (al menos 6, incluyendo stockpiles y estructuras avanzadas)', () => {
    const ids = Object.values(CRAFTABLE).sort();
    expect(Object.keys(RECIPES).sort()).toEqual(ids);
    expect(ids.length).toBeGreaterThanOrEqual(6);
  });

  it('Refugio: tiene inputs de wood, stone y game', () => {
    expect(RECIPES[CRAFTABLE.REFUGIO].inputs.wood).toBeGreaterThan(0);
    expect(RECIPES[CRAFTABLE.REFUGIO].inputs.stone).toBeGreaterThan(0);
    expect(RECIPES[CRAFTABLE.REFUGIO].inputs.game).toBeGreaterThan(0);
    expect(RECIPES[CRAFTABLE.REFUGIO].daysWork).toBe(5);
  });

  it('Stockpile Wood: cuesta wood (es una estructura de madera)', () => {
    expect(RECIPES[CRAFTABLE.STOCKPILE_WOOD].inputs.wood).toBeGreaterThan(0);
  });
});

describe('clanInventoryTotal', () => {
  it('suma inventarios de todos los vivos Y estructuras', () => {
    const a = stocked({ wood: 3, stone: 5 });
    const b = stocked({ wood: 7, game: 2 });
    const struct = {
      id: 's1',
      kind: CRAFTABLE.STOCKPILE_WOOD,
      position: { x: 0, y: 0 },
      builtAtTick: 0,
      inventory: { wood: 10 }
    } as any;

    const t = clanInventoryTotal([a, b], [struct]);
    expect(t.wood).toBe(20); // 3 + 7 + 10
    expect(t.stone).toBe(5);
    expect(t.game).toBe(2);
  });
});

describe('canBuild', () => {
  it('true si pooled >= inputs', () => {
    const clan = { wood: 20, stone: 20, berry: 0, game: 5, fish: 0, obsidian: 0, shell: 0 };
    expect(canBuild(RECIPES[CRAFTABLE.REFUGIO], clan)).toBe(true);
  });
});

describe('consumeForRecipe', () => {
  it('consume de estructuras PRIMERO, luego de NPCs', () => {
    // Fogata pide wood:2. Struct tiene wood:10. Debe quitar 2 de struct.
    const woodNeeded = RECIPES[CRAFTABLE.FOGATA_PERMANENTE].inputs.wood ?? 0;
    const a = stocked({ wood: 2 });
    a.id = 'a';
    const struct = {
      id: 's1',
      kind: CRAFTABLE.STOCKPILE_WOOD,
      position: { x: 0, y: 0 },
      builtAtTick: 0,
      inventory: { wood: 10 }
    } as any;

    const { npcs, structures } = consumeForRecipe([a], RECIPES[CRAFTABLE.FOGATA_PERMANENTE], [struct]);
    expect(structures[0].inventory.wood).toBe(10 - woodNeeded);
    expect(npcs[0].inventory.wood).toBe(2); // NPC no se toca, suficiente en struct
  });

  it('consume de múltiples fuentes para una receta compleja (Refugio)', () => {
    // Refugio: wood:10, stone:5, game:1 (receta actual del juego)
    const woodNeeded = RECIPES[CRAFTABLE.REFUGIO].inputs.wood ?? 0;
    const stoneNeeded = RECIPES[CRAFTABLE.REFUGIO].inputs.stone ?? 0;
    const gameNeeded = RECIPES[CRAFTABLE.REFUGIO].inputs.game ?? 0;

    const npc1 = stocked({ wood: 5, stone: 2 });
    npc1.id = 'npc1';
    const npc2 = stocked({ game: gameNeeded + 2 });
    npc2.id = 'npc2';
    const s_wood = { id: 'sw', kind: 'stockpile_wood' as any, position: {x:0,y:0}, builtAtTick: 0, inventory: { wood: woodNeeded } };
    const s_stone = { id: 'ss', kind: 'stockpile_stone' as any, position: {x:0,y:0}, builtAtTick: 0, inventory: { stone: stoneNeeded } };

    const { npcs, structures } = consumeForRecipe([npc1, npc2], RECIPES[CRAFTABLE.REFUGIO], [s_wood, s_stone]);

    // Wood: todo de s_wood (tiene exactamente lo necesario)
    expect(structures[0].inventory?.wood).toBe(0);
    expect(npcs.find(n => n.id === 'npc1')!.inventory.wood).toBe(5); // no se toca
    // Stone: todo de s_stone (tiene exactamente lo necesario)
    expect(structures[1].inventory?.stone).toBe(0);
    expect(npcs.find(n => n.id === 'npc1')!.inventory.stone).toBe(2); // no se toca
    // Game: de npc2
    expect(npcs.find(n => n.id === 'npc2')!.inventory.game).toBe(2);
  });

  it('tira si no hay recursos', () => {
    const a = stocked({ wood: 1 });
    expect(() =>
      consumeForRecipe([a], RECIPES[CRAFTABLE.REFUGIO], []),
    ).toThrow(/recursos/i);
  });
});
