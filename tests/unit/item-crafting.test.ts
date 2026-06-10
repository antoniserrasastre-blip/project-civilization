/**
 * Tests Red — Sprint 9 CULTURA-MATERIAL + Sprint 15.
 */

import { describe, it, expect } from 'vitest';
import {
  ITEM_RECIPES,
  canCraftItem,
  craftItem,
  type ItemRecipe,
} from '../../lib/item-crafting';
import { ITEM_KIND } from '../../lib/items';
import { makeTestNPC, makeFullInventory } from '../helpers/npc-fixtures';
import { initialGameState } from '../../lib/game-state';

// ── helpers ──────────────────────────────────────────────────────────────────

function stockedNpc(id: string, inv: Partial<Record<string, number>> = {}) {
  // Use shared makeFullInventory (which completes the shape from SSOT) to dedup
  // the 7-11 key literal that was repeated.
  return makeTestNPC({
    id,
    inventory: makeFullInventory(inv as any),
  });
}

// ── ITEM_RECIPES ──────────────────────────────────────────────────────────────

describe('ITEM_RECIPES — catálogo de herramientas', () => {
  it('incluye Lanza (spear)', () => {
    expect(ITEM_RECIPES[ITEM_KIND.SPEAR]).toBeDefined();
  });

  it('incluye Hacha (hand_axe)', () => {
    expect(ITEM_RECIPES[ITEM_KIND.HAND_AXE]).toBeDefined();
  });

  it('incluye Cesta (basket)', () => {
    expect(ITEM_RECIPES[ITEM_KIND.BASKET]).toBeDefined();
  });

  it('todas las recetas tienen daysWork > 0', () => {
    for (const r of Object.values(ITEM_RECIPES) as ItemRecipe[]) {
      expect(r.daysWork).toBeGreaterThan(0);
    }
  });
});

// ── canCraftItem ──────────────────────────────────────────────────────────────

describe('canCraftItem', () => {
  it('devuelve false si no hay recursos suficientes', () => {
    const npcs = [stockedNpc('a', { wood: 0, stone: 0 })];
    expect(canCraftItem(ITEM_KIND.HAND_AXE, npcs)).toBe(false);
  });

  it('devuelve true si el clan tiene los recursos en estructuras', () => {
    const recipe = ITEM_RECIPES[ITEM_KIND.HAND_AXE];
    const struct = {
      id: 's', kind: 'stockpile_wood' as any, position: {x:0,y:0}, builtAtTick: 0,
      inventory: { wood: 10, stone: 10 }
    };
    const npcs = [stockedNpc('a', {})];
    expect(canCraftItem(ITEM_KIND.HAND_AXE, npcs, [struct])).toBe(true);
  });
});

// ── craftItem ─────────────────────────────────────────────────────────────────

describe('craftItem', () => {
  it('produce un EquippableItem y actualiza NPCs y estructuras', () => {
    const npcs = [stockedNpc('a', { wood: 0, stone: 0 })];
    const structs = [{
      id: 's', kind: 'stockpile_wood' as any, position: {x:0,y:0}, builtAtTick: 0,
      inventory: { wood: 20, stone: 20 }
    } as any];
    
    const { item, npcs: afterNpcs, structures: afterStructs } = craftItem(
      ITEM_KIND.HAND_AXE, npcs, 100, npcs[0], structs
    );
    
    expect(item.kind).toBe(ITEM_KIND.HAND_AXE);
    // HAND_AXE usa stone:3, no wood — verificar stone se redujo
    expect((afterStructs[0] as any).inventory.stone).toBe(20 - 3);
    expect((afterStructs[0] as any).inventory.wood).toBe(20); // Wood intacto
    });
});

// ── GameState.items ──────────────────────────────────────────────────────────

describe('GameState incluye campo items', () => {
  const npcs = [makeTestNPC({ id: 'a' }), makeTestNPC({ id: 'b' })];
  const state = initialGameState(1, npcs);

  it('state.items existe y es array', () => {
    expect(Array.isArray(state.items)).toBe(true);
  });
});
