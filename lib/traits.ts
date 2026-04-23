/**
 * Rasgos del clan — catálogo estilo Project Zomboid.
 *
 * Presupuesto unificado de 15 pts por draft. Rasgos positivos cuestan
 * puntos; negativos devuelven puntos. La suma neta de la selección no
 * puede superar TRAIT_BUDGET.
 *
 * Contrato §A4: puro, determinista, round-trip JSON.
 */

import type { NPC } from './npcs';

export const TRAIT_BUDGET = 15;

export const TRAIT = {
  // ── Positivos ────────────────────────────────────────────────────
  FUERTE: 'fuerte',
  CURANDERO_NATO: 'curandero_nato',
  CAZADOR_NATO: 'cazador_nato',
  RECOLECTOR_NATO: 'recolector_nato',
  ARTESANO_NATO: 'artesano_nato',
  PESCADOR_NATO: 'pescador_nato',
  RESISTENTE: 'resistente',
  LIDER_NATO: 'lider_nato',
  AGILIDAD: 'agilidad',
  MEMORIOSA: 'memoriosa',
  // ── Negativos ────────────────────────────────────────────────────
  FRAGIL: 'fragil',
  COBARDE: 'cobarde',
  TORPE: 'torpe',
  MIOPE: 'miope',
  ANSIOSO: 'ansioso',
  LENTO: 'lento',
} as const;

export type TraitId = (typeof TRAIT)[keyof typeof TRAIT];

export interface TraitModifiers {
  supervivencia?: number;
  socializacion?: number;
  hunting?: number;
  gathering?: number;
  crafting?: number;
  fishing?: number;
  healing?: number;
}

export interface TraitDef {
  id: TraitId;
  name: string;
  cost: number;
  modifiers: TraitModifiers;
}

export const TRAIT_CATALOG: Record<TraitId, TraitDef> = {
  [TRAIT.FUERTE]: {
    id: TRAIT.FUERTE,
    name: 'Fuerte',
    cost: 3,
    modifiers: { supervivencia: 15, hunting: 8 },
  },
  [TRAIT.CURANDERO_NATO]: {
    id: TRAIT.CURANDERO_NATO,
    name: 'Curandero Nato',
    cost: 3,
    modifiers: { healing: 25, gathering: 8 },
  },
  [TRAIT.CAZADOR_NATO]: {
    id: TRAIT.CAZADOR_NATO,
    name: 'Cazador Nato',
    cost: 3,
    modifiers: { hunting: 25, supervivencia: 5 },
  },
  [TRAIT.RECOLECTOR_NATO]: {
    id: TRAIT.RECOLECTOR_NATO,
    name: 'Recolector Nato',
    cost: 2,
    modifiers: { gathering: 25 },
  },
  [TRAIT.ARTESANO_NATO]: {
    id: TRAIT.ARTESANO_NATO,
    name: 'Artesano Nato',
    cost: 2,
    modifiers: { crafting: 25 },
  },
  [TRAIT.PESCADOR_NATO]: {
    id: TRAIT.PESCADOR_NATO,
    name: 'Pescador Nato',
    cost: 2,
    modifiers: { fishing: 25 },
  },
  [TRAIT.RESISTENTE]: {
    id: TRAIT.RESISTENTE,
    name: 'Resistente',
    cost: 3,
    modifiers: { supervivencia: 12, socializacion: 8 },
  },
  [TRAIT.LIDER_NATO]: {
    id: TRAIT.LIDER_NATO,
    name: 'Líder Nato',
    cost: 2,
    modifiers: { socializacion: 18 },
  },
  [TRAIT.AGILIDAD]: {
    id: TRAIT.AGILIDAD,
    name: 'Agilidad',
    cost: 2,
    modifiers: { hunting: 10, gathering: 10 },
  },
  [TRAIT.MEMORIOSA]: {
    id: TRAIT.MEMORIOSA,
    name: 'Memoriosa',
    cost: 2,
    modifiers: { crafting: 12, gathering: 6 },
  },
  [TRAIT.FRAGIL]: {
    id: TRAIT.FRAGIL,
    name: 'Frágil',
    cost: -2,
    modifiers: { supervivencia: -18 },
  },
  [TRAIT.COBARDE]: {
    id: TRAIT.COBARDE,
    name: 'Cobarde',
    cost: -2,
    modifiers: { socializacion: -15, hunting: -8 },
  },
  [TRAIT.TORPE]: {
    id: TRAIT.TORPE,
    name: 'Torpe',
    cost: -2,
    modifiers: { crafting: -14, hunting: -6 },
  },
  [TRAIT.MIOPE]: {
    id: TRAIT.MIOPE,
    name: 'Miope',
    cost: -2,
    modifiers: { hunting: -14, gathering: -6 },
  },
  [TRAIT.ANSIOSO]: {
    id: TRAIT.ANSIOSO,
    name: 'Ansioso',
    cost: -1,
    modifiers: { socializacion: -8, supervivencia: -5 },
  },
  [TRAIT.LENTO]: {
    id: TRAIT.LENTO,
    name: 'Lento',
    cost: -2,
    modifiers: { gathering: -12, hunting: -10 },
  },
};

/** Coste neto de una selección de rasgos (puede ser negativo si hay
 *  más negativos que positivos). */
export function traitBudgetCost(traitIds: TraitId[]): number {
  return traitIds.reduce((sum, id) => sum + TRAIT_CATALOG[id].cost, 0);
}

/** Lanza si la selección supera el presupuesto unificado. */
export function validateTraitSelection(traitIds: TraitId[]): void {
  const cost = traitBudgetCost(traitIds);
  if (cost > TRAIT_BUDGET) {
    throw new Error(
      `presupuesto excedido: coste neto ${cost} > ${TRAIT_BUDGET}`,
    );
  }
}

/** Aplica rasgos a un NPC. Devuelve NPC nuevo — no muta el input.
 *  Los modificadores se suman linealmente. Stats se clamean a [0, 100];
 *  skills no tienen cap (pueden superar 100 por rareza de rasgos). */
export function applyTraits(npc: NPC, traitIds: TraitId[]): NPC {
  let sv = npc.stats.supervivencia;
  let so = npc.stats.socializacion;
  let hunting = npc.skills.hunting;
  let gathering = npc.skills.gathering;
  let crafting = npc.skills.crafting;
  let fishing = npc.skills.fishing;
  let healing = npc.skills.healing;

  for (const id of traitIds) {
    const m = TRAIT_CATALOG[id].modifiers;
    if (m.supervivencia !== undefined) sv += m.supervivencia;
    if (m.socializacion !== undefined) so += m.socializacion;
    if (m.hunting !== undefined) hunting += m.hunting;
    if (m.gathering !== undefined) gathering += m.gathering;
    if (m.crafting !== undefined) crafting += m.crafting;
    if (m.fishing !== undefined) fishing += m.fishing;
    if (m.healing !== undefined) healing += m.healing;
  }

  return {
    ...npc,
    stats: {
      supervivencia: Math.max(0, Math.min(100, sv)),
      socializacion: Math.max(0, Math.min(100, so)),
    },
    skills: {
      hunting: Math.max(0, hunting),
      gathering: Math.max(0, gathering),
      crafting: Math.max(0, crafting),
      fishing: Math.max(0, fishing),
      healing: Math.max(0, healing),
    },
    traits: [...traitIds],
  };
}
