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

import { seedState, next, nextChoice, nextInt, type PRNGState } from './prng';
import { pickUniqueName } from './names';
import {
  ARCHETYPE,
  CASTA,
  LINAJE,
  SEX,
  type Archetype,
  type Linaje,
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

/** Valida todas las invariantes de Bloque A y produce 4 NPCs.
 *  `excludeNames` permite al caller coordinar unicidad de nombres
 *  entre Bloque A y Bloque B (Sprint #4 Fase 5). */
export function finalizeBlockA(
  draft: DraftState,
  excludeNames: ReadonlySet<string> = new Set(),
): NPC[] {
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
  const usedNames = new Set<string>(excludeNames);
  // Cursores separados por sexo para que nombres masculinos y
  // femeninos recorran su pool independientemente. El seed del
  // naming deriva del seed del draft sesgado para no colisionar
  // con el cursor de stats.
  const nameSeed = (draft.seed ^ 0x4e41) | 0; // "NA" en ASCII
  let nameCursorM = 0;
  let nameCursorF = 0;
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
    const pick = pickUniqueName(
      nameSeed,
      sex,
      sex === SEX.M ? nameCursorM : nameCursorF,
      usedNames,
    );
    if (sex === SEX.M) nameCursorM = pick.nextCursor;
    else nameCursorF = pick.nextCursor;
    usedNames.add(pick.name);
    return {
      id,
      name: pick.name,
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
      inventory: { wood: 0, stone: 0, berry: 0, game: 0, fish: 0 },
      equippedItemId: null,
      lastReproducedTick: null,
    };
  });
  return npcs;
}

// --- Bloque B — 10 Ciudadanos en 4 tiers (decisión #3) ---

export type FollowerTierLabel = 'excelente' | 'bueno' | 'regular' | 'malo';

export interface FollowerTierDef {
  label: FollowerTierLabel;
  picks: number;
  /** Rango de stats supervivencia/socialización generados. */
  statRange: [number, number];
  /** Rango de skills generados por cada skill. */
  skillRange: [number, number];
}

export const FOLLOWER_TIERS: FollowerTierDef[] = [
  { label: 'excelente', picks: 3, statRange: [70, 95], skillRange: [25, 45] },
  { label: 'bueno', picks: 3, statRange: [50, 70], skillRange: [15, 30] },
  { label: 'regular', picks: 2, statRange: [30, 50], skillRange: [5, 20] },
  { label: 'malo', picks: 2, statRange: [10, 30], skillRange: [0, 10] },
];

export const TIER_CANDIDATE_COUNT = 10;

/** Linajes disponibles para Ciudadanos (excluye Tramuntana,
 *  reservado para Elegidos — decisión #14). */
const CITIZEN_LINAJES: Linaje[] = [
  LINAJE.LLEVANT,
  LINAJE.MIGJORN,
  LINAJE.PONENT,
  LINAJE.XALOC,
  LINAJE.MESTRAL,
  LINAJE.GREGAL,
  LINAJE.GARBI,
];

export interface FollowerCandidate {
  id: string;
  sex: Sex;
  linaje: Linaje;
  stats: { supervivencia: number; socializacion: number };
  skills: {
    hunting: number;
    gathering: number;
    crafting: number;
    fishing: number;
    healing: number;
  };
  tier: FollowerTierLabel;
}

/** Mezcla determinista de seed + tier + pantalla. */
function candidateSeed(
  baseSeed: number,
  tier: FollowerTierLabel,
  pantalla: number,
): number {
  const tierIdx = FOLLOWER_TIERS.findIndex((t) => t.label === tier);
  // Mezcla reversible para que seeds cercanos produzcan partidas
  // distintas, no variaciones pequeñas.
  return ((baseSeed | 0) ^ ((tierIdx + 1) * 0x9e37)) + pantalla * 0x53 | 0;
}

function pickLinajesForGame(baseSeed: number): Linaje[] {
  let prng = seedState(baseSeed ^ 0x1ddf);
  // Entre 2 y 4 linajes (decisión #14).
  const countR = nextInt(prng, 2, 5);
  prng = countR.next;
  const pool = [...CITIZEN_LINAJES];
  const chosen: Linaje[] = [];
  for (let i = 0; i < countR.value; i++) {
    const idxR = nextInt(prng, 0, pool.length);
    prng = idxR.next;
    chosen.push(pool[idxR.value]);
    pool.splice(idxR.value, 1);
  }
  return chosen;
}

export function generateCandidates(
  baseSeed: number,
  tier: FollowerTierLabel,
  pantalla: number,
): FollowerCandidate[] {
  const tierDef = FOLLOWER_TIERS.find((t) => t.label === tier);
  if (!tierDef) throw new Error(`tier inválido: ${tier}`);
  const linajes = pickLinajesForGame(baseSeed);
  let prng = seedState(candidateSeed(baseSeed, tier, pantalla));
  const out: FollowerCandidate[] = [];
  for (let i = 0; i < TIER_CANDIDATE_COUNT; i++) {
    const sxR = next(prng);
    prng = sxR.next;
    const sex: Sex = sxR.value < 0.5 ? SEX.M : SEX.F;
    const ljR = nextChoice(prng, linajes);
    prng = ljR.next;
    const [slo, shi] = tierDef.statRange;
    const [klo, khi] = tierDef.skillRange;
    const sv = nextInt(prng, slo, shi + 1);
    prng = sv.next;
    const so = nextInt(prng, slo, shi + 1);
    prng = so.next;
    const sk1 = nextInt(prng, klo, khi + 1);
    prng = sk1.next;
    const sk2 = nextInt(prng, klo, khi + 1);
    prng = sk2.next;
    const sk3 = nextInt(prng, klo, khi + 1);
    prng = sk3.next;
    const sk4 = nextInt(prng, klo, khi + 1);
    prng = sk4.next;
    const sk5 = nextInt(prng, klo, khi + 1);
    prng = sk5.next;
    out.push({
      id: `c-${tier}-${pantalla}-${i}-${baseSeed}`,
      sex,
      linaje: ljR.value,
      stats: { supervivencia: sv.value, socializacion: so.value },
      skills: {
        hunting: sk1.value,
        gathering: sk2.value,
        crafting: sk3.value,
        fishing: sk4.value,
        healing: sk5.value,
      },
      tier,
    });
  }
  return out;
}

export interface FollowerDraftState {
  seed: number;
  picks: FollowerCandidate[];
}

export function startFollowerDraft(seed: number): FollowerDraftState {
  return { seed, picks: [] };
}

export function pickFollower(
  state: FollowerDraftState,
  candidate: FollowerCandidate,
): FollowerDraftState {
  if (state.picks.length >= 10) {
    throw new Error('ya seleccionados 10 Ciudadanos');
  }
  return { ...state, picks: [...state.picks, candidate] };
}

export function finalizeBlockB(
  state: FollowerDraftState,
  excludeNames: ReadonlySet<string> = new Set(),
): NPC[] {
  if (state.picks.length !== 10) {
    throw new Error(
      `bloque B incompleto: esperados 10 picks, hay ${state.picks.length}`,
    );
  }
  const usedNames = new Set<string>(excludeNames);
  // Namespace de naming distinto del Bloque A para que los dos
  // bloques puedan correr independientes si hace falta, sin
  // producir colisiones determinísticas idénticas entre corridas.
  const nameSeed = (state.seed ^ 0x5242) | 0; // "RB" en ASCII
  let nameCursorM = 0;
  let nameCursorF = 0;
  return state.picks.map(
    (c): NPC => {
      const pick = pickUniqueName(
        nameSeed,
        c.sex,
        c.sex === SEX.M ? nameCursorM : nameCursorF,
        usedNames,
      );
      if (c.sex === SEX.M) nameCursorM = pick.nextCursor;
      else nameCursorF = pick.nextCursor;
      usedNames.add(pick.name);
      return {
        id: c.id,
        name: pick.name,
        sex: c.sex,
        casta: CASTA.CIUDADANO,
        linaje: c.linaje,
        archetype: null,
        stats: c.stats,
        skills: c.skills,
        position: { x: 0, y: 0 }, // Colocado al spawn del clan en Sprint 2.5+.
        visionRadius: 6,
        parents: null,
        traits: [],
        birthTick: 0,
        alive: true,
        inventory: { wood: 0, stone: 0, berry: 0, game: 0, fish: 0 },
        equippedItemId: null,
        lastReproducedTick: null,
      };
    },
  );
}
