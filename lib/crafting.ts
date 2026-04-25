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
import type { Structure } from './structures';

export const CRAFTABLE = {
  REFUGIO: 'refugio',
  FOGATA_PERMANENTE: 'fogata_permanente',
  PIEL_ROPA: 'piel_ropa',
  DESPENSA: 'despensa',
  STOCKPILE_WOOD: 'stockpile_wood',
  STOCKPILE_STONE: 'stockpile_stone',
  SHAMAN_HUT: 'shaman_hut', // Nuevo crafteable para el rol de Chamán/Sabiduría
} as const;

export type CraftableId = (typeof CRAFTABLE)[keyof typeof CRAFTABLE];

export interface Recipe {
  id: CraftableId;
  inputs: Partial<Record<keyof NPCInventory, number>>;
  /** Días-hombre (tick = 1/TICKS_PER_DAY de día). */
  daysWork: number;
  /** Skill mínimo del crafter (usa max de los builders en construcción). */
  minSkill: number;
  /** Tecnologías requeridas para poder craftear esto. */
  requiresUnlock?: ItemKind[];
}

/** Decisión #20 — 4 estructuras umbral (HERRAMIENTA_SILEX migrado a
 *  lib/item-crafting.ts en Sprint 9). Costes B medios. */
export const RECIPES: Record<CraftableId, Recipe> = {
  [CRAFTABLE.REFUGIO]: {
    id: CRAFTABLE.REFUGIO,
    inputs: { wood: 10, stone: 5, game: 1 },
    daysWork: 5,
    minSkill: 10,
  },
  [CRAFTABLE.FOGATA_PERMANENTE]: {
    id: CRAFTABLE.FOGATA_PERMANENTE,
    inputs: { wood: 2 },
    daysWork: 1,
    minSkill: 0, // Cualquiera puede hacer fuego
  },
  [CRAFTABLE.PIEL_ROPA]: {
    id: CRAFTABLE.PIEL_ROPA,
    inputs: { game: 2 },
    daysWork: 2,
    minSkill: 10,
  },
  [CRAFTABLE.DESPENSA]: {
    id: CRAFTABLE.DESPENSA,
    inputs: { wood: 6, stone: 4 },
    daysWork: 4,
    minSkill: 5,
  },
  [CRAFTABLE.STOCKPILE_WOOD]: {
    id: CRAFTABLE.STOCKPILE_WOOD,
    inputs: { wood: 4 }, // Antes pedía piedra, bloqueo!
    daysWork: 2,
    minSkill: 5,
  },
  [CRAFTABLE.STOCKPILE_STONE]: {
    id: CRAFTABLE.STOCKPILE_STONE,
    inputs: { stone: 4 }, // Antes pedía madera, bloqueo!
    daysWork: 2,
    minSkill: 5,
  },
  [CRAFTABLE.SHAMAN_HUT]: {
    id: CRAFTABLE.SHAMAN_HUT,
    inputs: { wood: 20, stone: 10, obsidian: 5 },
    daysWork: 8,
    minSkill: 20,
  },
};

/** Suma del inventario de todos los NPCs vivos Y de todas las estructuras. */
export function clanInventoryTotal(
  npcs: readonly NPC[],
  structures: readonly Structure[] = [],
): NPCInventory {
  const total: NPCInventory = {
    wood: 0, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0,
  };
  // 1. Mochilas de los NPCs
  for (const n of npcs) {
    if (!n.alive) continue;
    for (const [key, val] of Object.entries(n.inventory) as Array<[keyof NPCInventory, number]>) {
      total[key] += val;
    }
  }
  // 2. Almacenes (Sprint 15)
  for (const s of structures) {
    if (!s.inventory) continue;
    for (const [key, val] of Object.entries(s.inventory) as Array<[keyof NPCInventory, number]>) {
      total[key] += (val || 0);
    }
  }
  return total;
}


export const STOCKPILE_CAPACITY = 50;

/** Define la especialidad de cada almacén (Sprint 15). */
export const STORAGE_SPECIALTY: Record<CraftableId, Array<keyof NPCInventory>> = {
  [CRAFTABLE.STOCKPILE_WOOD]: ['wood'],
  [CRAFTABLE.STOCKPILE_STONE]: ['stone', 'obsidian', 'shell'],
  [CRAFTABLE.DESPENSA]: ['berry', 'game', 'fish'],
  [CRAFTABLE.REFUGIO]: [],
  [CRAFTABLE.FOGATA_PERMANENTE]: [],
  [CRAFTABLE.PIEL_ROPA]: [],
};

export function canBuild(recipe: Recipe, clanInv: NPCInventory): boolean {
  for (const [key, needed] of Object.entries(recipe.inputs) as Array<
    [keyof NPCInventory, number]
  >) {
    if (clanInv[key] < needed) return false;
  }
  return true;
}

/**
 * Consume las inputs del recipe del inventario pooled del clan (NPCs + Estructuras).
 * Reparte la extracción entre estructuras primero (hub central) y luego NPCs.
 * Retorna NPCs y Estructuras nuevas; no muta.
 */
export function consumeForRecipe(
  npcs: readonly NPC[],
  recipe: Recipe,
  structures: readonly Structure[] = [],
): { npcs: NPC[]; structures: Structure[] } {
  const inv = clanInventoryTotal(npcs, structures);
  if (!canBuild(recipe, inv)) {
    throw new Error(
      `clan sin recursos suficientes para ${recipe.id}: inv=${JSON.stringify(
        inv,
      )}, needed=${JSON.stringify(recipe.inputs)}`,
    );
  }

  // 1. Clonar estructuras para mutación controlada
  const outStructures = structures.map((s) => ({
    ...s,
    inventory: s.inventory ? { ...s.inventory } : {},
  }));

  // 2. Clonar NPCs para mutación controlada
  const outNpcs = npcs.map((n) => ({ ...n, inventory: { ...n.inventory } }));

  for (const [key, needed] of Object.entries(recipe.inputs) as Array<
    [keyof NPCInventory, number]
  >) {
    let remaining = needed;

    // A. Consumir de Almacenes primero
    for (const s of outStructures) {
      if (remaining <= 0) break;
      if (!s.inventory) continue;
      const val = s.inventory[key] || 0;
      const take = Math.min(val, remaining);
      s.inventory[key] = val - take;
      remaining -= take;
    }

    // B. Consumir de NPCs si falta
    if (remaining > 0) {
      const sorted = [...outNpcs].sort((a, b) => (a.id < b.id ? -1 : 1));
      for (const n of sorted) {
        if (remaining <= 0) break;
        if (!n.alive) continue;
        const take = Math.min(n.inventory[key], remaining);
        n.inventory[key] -= take;
        remaining -= take;
      }
    }
  }

  return { npcs: outNpcs, structures: outStructures };
}
