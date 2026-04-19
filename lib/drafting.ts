/**
 * Drafting inicial — Bloques A (4 Elegidos) y B (10 Ciudadanos).
 *
 * Decisión #2 (Bloque A): 4 slots, 10 puntos, 2M+2F, 8 arquetipos
 * con coste 2-4. Decisión #3 (Bloque B): 10 picks en 4 tiers (3-3-
 * 2-2) de calidad decreciente.
 *
 * Todo puro y determinista: `startDraft(seed)` + transiciones que
 * reciben y devuelven DraftState nuevo. El PRNG se consume solo en
 * operaciones que lo pidan explícitamente (finalize hashea stats
 * arrancables del arquetipo + linaje; Bloque B genera candidatos).
 */

import { seedState, nextInt, type PRNGState } from './prng';
import {
  ARCHETYPE,
  CASTA,
  LINAJE,
  SEX,
  type Archetype,
  type NPC,
  type Sex,
} from './npcs';

export const CHOSEN_SLOTS = 4;
export const CHOSEN_BUDGET = 10;

/** Coste en puntos de cada arquetipo (decisión #2).
 *  Total 2-4 — Lider es el más caro por versatilidad narrativa;
 *  Cazador/Curandero/Artesano medios; resto baratos. */
export const ARCHETYPE_COST: Record<Archetype, number> = {
  [ARCHETYPE.LIDER]: 4,
  [ARCHETYPE.CAZADOR]: 3,
  [ARCHETYPE.CURANDERO]: 3,
  [ARCHETYPE.ARTESANO]: 3,
  [ARCHETYPE.RECOLECTOR]: 2,
  [ARCHETYPE.SCOUT]: 2,
  [ARCHETYPE.TEJEDOR]: 2,
  [ARCHETYPE.PESCADOR]: 2,
};

export interface ChosenSlot {
  archetype: Archetype | null;
  sex: Sex | null;
}

export interface DraftState {
  seed: number;
  slots: ChosenSlot[];
  budgetRemaining: number;
}

export function startDraft(seed: number): DraftState {
  return {
    seed,
    slots: Array.from({ length: CHOSEN_SLOTS }, () => ({
      archetype: null,
      sex: null,
    })),
    budgetRemaining: CHOSEN_BUDGET,
  };
}

function requireSlotInRange(slotIdx: number): void {
  if (slotIdx < 0 || slotIdx >= CHOSEN_SLOTS) {
    throw new Error(`slot fuera de rango: ${slotIdx}`);
  }
}

/** Asigna (o reemplaza) un arquetipo en un slot. Devuelve draft
 *  nuevo; no muta el input. Tira si el cambio excede el budget. */
export function pickArchetype(
  draft: DraftState,
  slotIdx: number,
  archetype: Archetype,
): DraftState {
  requireSlotInRange(slotIdx);
  const current = draft.slots[slotIdx];
  const prevCost = current.archetype ? ARCHETYPE_COST[current.archetype] : 0;
  const newCost = ARCHETYPE_COST[archetype];
  const nextBudget = draft.budgetRemaining + prevCost - newCost;
  if (nextBudget < 0) {
    throw new Error(
      `presupuesto insuficiente: necesitas ${newCost - prevCost} más`,
    );
  }
  const slots = draft.slots.map((s, i) =>
    i === slotIdx ? { archetype, sex: s.sex } : s,
  );
  return { ...draft, slots, budgetRemaining: nextBudget };
}

export function setSex(
  draft: DraftState,
  slotIdx: number,
  sex: Sex,
): DraftState {
  requireSlotInRange(slotIdx);
  const slots = draft.slots.map((s, i) =>
    i === slotIdx ? { archetype: s.archetype, sex } : s,
  );
  return { ...draft, slots };
}

/** Stats iniciales según arquetipo. Los arquetipos empujan las
 *  skills hacia su dominio; el resto arranca en 10. Valores
 *  provisionales — revalidar en playtest Fase 4. */
function archetypeBaseSkills(arch: Archetype): {
  hunting: number;
  gathering: number;
  crafting: number;
  fishing: number;
  healing: number;
} {
  const base = {
    hunting: 10,
    gathering: 10,
    crafting: 10,
    fishing: 10,
    healing: 10,
  };
  switch (arch) {
    case ARCHETYPE.CAZADOR:
      return { ...base, hunting: 45 };
    case ARCHETYPE.RECOLECTOR:
      return { ...base, gathering: 45 };
    case ARCHETYPE.CURANDERO:
      return { ...base, healing: 45, gathering: 20 };
    case ARCHETYPE.ARTESANO:
      return { ...base, crafting: 45 };
    case ARCHETYPE.LIDER:
      return { ...base, hunting: 25, gathering: 25, crafting: 25 };
    case ARCHETYPE.SCOUT:
      return { ...base, hunting: 30, gathering: 20 };
    case ARCHETYPE.TEJEDOR:
      return { ...base, crafting: 35, gathering: 20 };
    case ARCHETYPE.PESCADOR:
      return { ...base, fishing: 45 };
  }
}

/** Valida todas las invariantes de Bloque A y produce 4 NPCs. */
export function finalizeBlockA(draft: DraftState): NPC[] {
  if (draft.budgetRemaining < 0) {
    throw new Error(`presupuesto excedido (${-draft.budgetRemaining})`);
  }
  for (let i = 0; i < CHOSEN_SLOTS; i++) {
    if (!draft.slots[i].archetype) {
      throw new Error(`slot ${i} sin arquetipo`);
    }
    if (!draft.slots[i].sex) {
      throw new Error(`slot ${i} sin sexo`);
    }
  }
  const males = draft.slots.filter((s) => s.sex === SEX.M).length;
  const females = draft.slots.filter((s) => s.sex === SEX.F).length;
  if (males !== 2 || females !== 2) {
    throw new Error(`2M+2F obligatorio (género): actual M=${males} F=${females}`);
  }

  // Genera NPCs deterministamente a partir del seed.
  let prng: PRNGState = seedState(draft.seed);
  const npcs: NPC[] = draft.slots.map((slot, i) => {
    const arch = slot.archetype as Archetype;
    const sex = slot.sex as Sex;
    const skills = archetypeBaseSkills(arch);
    // Id determinista por posición; usa seed como sufijo para
    // distinguir entre partidas distintas.
    const id = `e${i}-${draft.seed}`;
    // Consumir prng una vez por slot para que futuras variaciones
    // (ej. stats base ruido ±5) sean seedables; ahora mismo solo
    // da estabilidad al cursor para ticks siguientes.
    const jitter = nextInt(prng, 0, 10);
    prng = jitter.next;
    return {
      id,
      sex,
      casta: CASTA.ELEGIDO,
      linaje: LINAJE.TRAMUNTANA,
      archetype: arch,
      stats: { supervivencia: 85 + (jitter.value % 5), socializacion: 70 },
      skills,
      position: { x: 0, y: 0 }, // Sprint 2.3+ colocará al spawn del clan.
      visionRadius: 6,
      parents: null,
      traits: [],
      birthTick: 0,
      alive: true,
    };
  });
  return npcs;
}
