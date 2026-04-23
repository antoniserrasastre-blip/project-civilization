/**
 * Tests Red — Sprint 9 CULTURA-MATERIAL.
 *
 * Contrato de `lib/item-crafting.ts`:
 *   - ITEM_RECIPES separa las recetas de herramientas de las de edificios.
 *   - canCraftItem y craftItem respetan costes e inventario del clan.
 *   - Estado GameState incluye campo `items: EquippableItem[]`.
 */

import { describe, it, expect } from 'vitest';
import {
  ITEM_RECIPES,
  canCraftItem,
  craftItem,
  type ItemRecipe,
} from '../../lib/item-crafting';
import { ITEM_KIND } from '../../lib/items';
import { makeTestNPC } from '../../lib/npcs';
import { initialGameState } from '../../lib/game-state';
import { seedState } from '../../lib/prng';

// ── helpers ──────────────────────────────────────────────────────────────────

function stockedNpc(id: string, inv: Partial<Record<string, number>> = {}) {
  return makeTestNPC({
    id,
    inventory: { wood: 0, stone: 0, berry: 0, game: 0, fish: 0, ...inv },
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

  it('incluye Aguja (bone_needle)', () => {
    expect(ITEM_RECIPES[ITEM_KIND.BONE_NEEDLE]).toBeDefined();
  });

  it('todas las recetas tienen daysWork > 0', () => {
    for (const r of Object.values(ITEM_RECIPES) as ItemRecipe[]) {
      expect(r.daysWork).toBeGreaterThan(0);
    }
  });

  it('todas las recetas tienen al menos un input', () => {
    for (const r of Object.values(ITEM_RECIPES) as ItemRecipe[]) {
      expect(Object.keys(r.inputs).length).toBeGreaterThan(0);
    }
  });
});

// ── canCraftItem ──────────────────────────────────────────────────────────────

describe('canCraftItem', () => {
  it('devuelve false si no hay recursos suficientes', () => {
    const npcs = [stockedNpc('a', { wood: 0, stone: 0 })];
    expect(canCraftItem(ITEM_KIND.HAND_AXE, npcs)).toBe(false);
  });

  it('devuelve true si el clan tiene los recursos exactos', () => {
    const recipe = ITEM_RECIPES[ITEM_KIND.HAND_AXE];
    const inv: Record<string, number> = {};
    for (const [k, v] of Object.entries(recipe.inputs)) inv[k] = v as number;
    const npcs = [stockedNpc('a', inv)];
    expect(canCraftItem(ITEM_KIND.HAND_AXE, npcs)).toBe(true);
  });

  it('devuelve true si el clan tiene más recursos de los necesarios', () => {
    const recipe = ITEM_RECIPES[ITEM_KIND.SPEAR];
    const inv: Record<string, number> = {};
    for (const [k, v] of Object.entries(recipe.inputs)) inv[k] = (v as number) + 5;
    const npcs = [stockedNpc('a', inv)];
    expect(canCraftItem(ITEM_KIND.SPEAR, npcs)).toBe(true);
  });
});

// ── craftItem ─────────────────────────────────────────────────────────────────

describe('craftItem', () => {
  it('produce un EquippableItem del tipo correcto', () => {
    const recipe = ITEM_RECIPES[ITEM_KIND.SPEAR];
    const inv: Record<string, number> = {};
    for (const [k, v] of Object.entries(recipe.inputs)) inv[k] = v as number;
    const npcs = [stockedNpc('a', inv)];
    const { item } = craftItem(ITEM_KIND.SPEAR, npcs, 100, null);
    expect(item.kind).toBe(ITEM_KIND.SPEAR);
  });

  it('consume los recursos del inventario del clan', () => {
    const recipe = ITEM_RECIPES[ITEM_KIND.HAND_AXE];
    const inv: Record<string, number> = {};
    for (const [k, v] of Object.entries(recipe.inputs)) inv[k] = (v as number) + 2;
    const npcs = [stockedNpc('a', inv)];
    const { npcs: after } = craftItem(ITEM_KIND.HAND_AXE, npcs, 100, null);
    // Verificar que se consumieron los recursos exactos
    const before = npcs[0].inventory;
    const afterInv = after[0].inventory;
    for (const [k, needed] of Object.entries(recipe.inputs)) {
      const key = k as keyof typeof before;
      expect(afterInv[key]).toBe(before[key] - (needed as number));
    }
  });

  it('asigna ownerNpcId al craftero si se provee', () => {
    const recipe = ITEM_RECIPES[ITEM_KIND.BONE_NEEDLE];
    const inv: Record<string, number> = {};
    for (const [k, v] of Object.entries(recipe.inputs)) inv[k] = v as number;
    const npcs = [stockedNpc('a', inv)];
    const { item } = craftItem(ITEM_KIND.BONE_NEEDLE, npcs, 50, 'a');
    expect(item.ownerNpcId).toBe('a');
  });

  it('item empieza con durabilidad máxima y prestige 0', () => {
    const recipe = ITEM_RECIPES[ITEM_KIND.SPEAR];
    const inv: Record<string, number> = {};
    for (const [k, v] of Object.entries(recipe.inputs)) inv[k] = v as number;
    const npcs = [stockedNpc('a', inv)];
    const { item } = craftItem(ITEM_KIND.SPEAR, npcs, 100, null);
    expect(item.durability).toBe(item.maxDurability);
    expect(item.prestige).toBe(0);
  });

  it('es determinista: mismo input → mismo item.id', () => {
    const recipe = ITEM_RECIPES[ITEM_KIND.SPEAR];
    const inv: Record<string, number> = {};
    for (const [k, v] of Object.entries(recipe.inputs)) inv[k] = v as number;
    const npcs1 = [stockedNpc('a', inv)];
    const npcs2 = [stockedNpc('a', inv)];
    const { item: i1 } = craftItem(ITEM_KIND.SPEAR, npcs1, 100, null);
    const { item: i2 } = craftItem(ITEM_KIND.SPEAR, npcs2, 100, null);
    expect(i1.id).toBe(i2.id);
  });
});

// ── GameState.items ──────────────────────────────────────────────────────────

describe('GameState incluye campo items', () => {
  const npcs = [makeTestNPC({ id: 'a' }), makeTestNPC({ id: 'b' })];
  const state = initialGameState(1, npcs);

  it('state.items existe y es array', () => {
    expect(Array.isArray(state.items)).toBe(true);
  });

  it('state.items empieza vacío', () => {
    expect(state.items).toHaveLength(0);
  });

  it('round-trip JSON preserva state.items', () => {
    const rt = JSON.parse(JSON.stringify(state));
    expect(rt.items).toEqual(state.items);
  });
});
