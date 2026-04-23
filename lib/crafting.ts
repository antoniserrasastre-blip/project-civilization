/**
 * Crafting primigenia — Sprint 4.5 (decisión #20, §3.6).
 *
 * 5 recetas umbral que materializan el final del nomadismo. Los
 * costes son provisionales (playtest Fase 4 valida), viven como
 * constantes auditables. `game` representa "pieles" (caza yields
 * raw piel); la receta Piel/ropa consume game para producir piel
 * tratada como output abstracto (Sprint 4.6 conecta a Structure).
 *
 * Este módulo solo expone recetas + utilidades puras. La
 * construcción real (Structure + ticks-en-obra) la monta
 * simulation.ts en sprints siguientes.
 */

import type { NPC, NPCInventory } from './npcs';

export const CRAFTABLE = {
  REFUGIO: 'refugio',
  FOGATA_PERMANENTE: 'fogata_permanente',
  PIEL_ROPA: 'piel_ropa',
  DESPENSA: 'despensa',
} as const;

export type CraftableId = (typeof CRAFTABLE)[keyof typeof CRAFTABLE];

export interface Recipe {
  id: CraftableId;
  inputs: Partial<Record<keyof NPCInventory, number>>;
  /** Días-hombre (tick = 1/TICKS_PER_DAY de día). */
  daysWork: number;
  /** Skill mínimo del crafter (usa max de los builders en construcción). */
  minSkill: number;
}

/** Decisión #20 — 4 estructuras umbral (HERRAMIENTA_SILEX migrado a
 *  lib/item-crafting.ts en Sprint 9). Costes B medios. */
export const RECIPES: Record<CraftableId, Recipe> = {
  [CRAFTABLE.REFUGIO]: {
    id: CRAFTABLE.REFUGIO,
    inputs: { wood: 15, stone: 8, game: 3 },
    daysWork: 5,
    minSkill: 10,
  },
  [CRAFTABLE.FOGATA_PERMANENTE]: {
    id: CRAFTABLE.FOGATA_PERMANENTE,
    inputs: { wood: 5, stone: 15 },
    daysWork: 3,
    minSkill: 5,
  },
  [CRAFTABLE.PIEL_ROPA]: {
    id: CRAFTABLE.PIEL_ROPA,
    inputs: { game: 2 },
    daysWork: 2,
    minSkill: 10,
  },
  [CRAFTABLE.DESPENSA]: {
    id: CRAFTABLE.DESPENSA,
    inputs: { wood: 10, stone: 6 },
    daysWork: 4,
    minSkill: 10,
  },
};

/** Suma del inventario de todos los NPCs vivos. */
export function clanInventoryTotal(npcs: readonly NPC[]): NPCInventory {
  const total: NPCInventory = {
    wood: 0,
    stone: 0,
    berry: 0,
    game: 0,
    fish: 0,
    obsidian: 0,
    shell: 0,
  };
  for (const n of npcs) {
    if (!n.alive) continue;
    total.wood += n.inventory.wood;
    total.stone += n.inventory.stone;
    total.berry += n.inventory.berry;
    total.game += n.inventory.game;
    total.fish += n.inventory.fish;
    total.obsidian += n.inventory.obsidian;
    total.shell += n.inventory.shell;
  }
  return total;
}

export function canBuild(recipe: Recipe, clanInv: NPCInventory): boolean {
  for (const [key, needed] of Object.entries(recipe.inputs) as Array<
    [keyof NPCInventory, number]
  >) {
    if (clanInv[key] < needed) return false;
  }
  return true;
}

/**
 * Consume las inputs del recipe del inventario pooled del clan.
 * Reparte la extracción entre NPCs vivos en orden lex de id para
 * determinismo. Retorna NPCs nuevos; no muta.
 * Si no hay suficiente, throw — el caller debe llamar canBuild primero.
 */
export function consumeForRecipe(
  npcs: readonly NPC[],
  recipe: Recipe,
): NPC[] {
  const inv = clanInventoryTotal(npcs);
  if (!canBuild(recipe, inv)) {
    throw new Error(
      `clan sin recursos suficientes para ${recipe.id}: inv=${JSON.stringify(
        inv,
      )}, needed=${JSON.stringify(recipe.inputs)}`,
    );
  }
  const out = npcs.map((n) => ({ ...n, inventory: { ...n.inventory } }));
  const sorted = [...out].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const [key, needed] of Object.entries(recipe.inputs) as Array<
    [keyof NPCInventory, number]
  >) {
    let remaining = needed;
    for (const n of sorted) {
      if (remaining <= 0) break;
      if (!n.alive) continue;
      const take = Math.min(n.inventory[key], remaining);
      n.inventory[key] -= take;
      remaining -= take;
    }
  }
  return out;
}
