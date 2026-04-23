/**
 * Tests Red — Eureka Real: recetas bloqueadas hasta evento detonante.
 *
 * Contrato:
 *   - SPEAR y BASKET tienen requiresUnlock = true en ITEM_RECIPES.
 *   - detectUnlockTrigger detecta "primera herida" (wound) y
 *     "exceso de inventario" (inventory_excess).
 *   - canAutoCraft respeta el flag y los unlockedItemKinds del estado.
 */

import { describe, it, expect } from 'vitest';
import { ITEM_RECIPES } from '../../lib/item-crafting';
import { ITEM_KIND } from '../../lib/items';
import {
  detectUnlockTrigger,
  canAutoCraft,
  WOUND_UNLOCK_DROP,
  WOOD_EXCESS_THRESHOLD,
} from '../../lib/eureka';
import { makeTestNPC } from '../../lib/npcs';

// ── requiresUnlock ───────────────────────────────────────────────────────────

describe('ITEM_RECIPES.requiresUnlock', () => {
  it('SPEAR requiere unlock', () => {
    expect(ITEM_RECIPES[ITEM_KIND.SPEAR].requiresUnlock).toBe(true);
  });

  it('BASKET requiere unlock', () => {
    expect(ITEM_RECIPES[ITEM_KIND.BASKET].requiresUnlock).toBe(true);
  });

  it('HAND_AXE NO requiere unlock', () => {
    expect(ITEM_RECIPES[ITEM_KIND.HAND_AXE].requiresUnlock).toBe(false);
  });

  it('BONE_NEEDLE NO requiere unlock', () => {
    expect(ITEM_RECIPES[ITEM_KIND.BONE_NEEDLE].requiresUnlock).toBe(false);
  });
});

// ── detectUnlockTrigger ──────────────────────────────────────────────────────

describe('detectUnlockTrigger — primera herida → desbloquea SPEAR', () => {
  it('detecta herida cuando supervivencia cae ≥ WOUND_UNLOCK_DROP en un tick', () => {
    const prev = makeTestNPC({ id: 'a', stats: { supervivencia: 70, socializacion: 50 } });
    const next = makeTestNPC({
      id: 'a',
      stats: { supervivencia: 70 - WOUND_UNLOCK_DROP, socializacion: 50 },
    });
    const result = detectUnlockTrigger([prev], [next], { wood: 0, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0 });
    expect(result).toContain(ITEM_KIND.SPEAR);
  });

  it('no detecta herida si la caída es menor al umbral', () => {
    const prev = makeTestNPC({ id: 'a', stats: { supervivencia: 70, socializacion: 50 } });
    const next = makeTestNPC({
      id: 'a',
      stats: { supervivencia: 70 - WOUND_UNLOCK_DROP + 1, socializacion: 50 },
    });
    const result = detectUnlockTrigger([prev], [next], { wood: 0, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0 });
    expect(result).not.toContain(ITEM_KIND.SPEAR);
  });
});

describe('detectUnlockTrigger — exceso de inventario → desbloquea BASKET', () => {
  it('detecta exceso de madera cuando wood > WOOD_EXCESS_THRESHOLD', () => {
    const npc = makeTestNPC({ id: 'a' });
    const inv = { wood: WOOD_EXCESS_THRESHOLD + 1, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0 };
    const result = detectUnlockTrigger([npc], [npc], inv);
    expect(result).toContain(ITEM_KIND.BASKET);
  });

  it('no detecta exceso si wood <= WOOD_EXCESS_THRESHOLD', () => {
    const npc = makeTestNPC({ id: 'a' });
    const inv = { wood: WOOD_EXCESS_THRESHOLD, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0 };
    const result = detectUnlockTrigger([npc], [npc], inv);
    expect(result).not.toContain(ITEM_KIND.BASKET);
  });
});

// ── canAutoCraft ─────────────────────────────────────────────────────────────

describe('canAutoCraft', () => {
  it('false para SPEAR si no está en unlockedItemKinds', () => {
    expect(canAutoCraft(ITEM_KIND.SPEAR, new Set())).toBe(false);
  });

  it('true para SPEAR si está en unlockedItemKinds', () => {
    expect(canAutoCraft(ITEM_KIND.SPEAR, new Set([ITEM_KIND.SPEAR]))).toBe(true);
  });

  it('true para HAND_AXE siempre (no requiere unlock)', () => {
    expect(canAutoCraft(ITEM_KIND.HAND_AXE, new Set())).toBe(true);
  });
});
