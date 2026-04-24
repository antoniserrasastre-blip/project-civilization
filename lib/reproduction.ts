/**
 * Reproducción — Sprint 8 MODULO-SOCIAL.
 *
 * Lógica pura de pairing y nacimiento. §A4: sin side effects, sin
 * Math.random(), determinista vía PRNG seedable.
 *
 * Contrato:
 *   - findEligiblePairs: pares M×F vivos, stats mínimas, sin cooldown.
 *   - birthNPC: hijo con herencia de skills/traits/linaje. PRNG explícito.
 *   - tickReproduction: aplica nacimientos al estado de NPCs.
 */

import { next as prngNext, type PRNGState } from './prng';
import { inheritFromParents } from './inheritance';
import { pickUniqueName } from './names';
import { CASTA, SEX, type NPC } from './npcs';
import { TICKS_PER_DAY } from './resources';

/** Días de cooldown entre reproducciones para el mismo NPC. */
export const REPRODUCTION_COOLDOWN_DAYS = 30;
export const REPRODUCTION_COOLDOWN_TICKS = REPRODUCTION_COOLDOWN_DAYS * TICKS_PER_DAY;

/** Supervivencia mínima para reproducirse — hambre crítica impide pairing. */
export const MIN_SURVIV_TO_REPRODUCE = 45;

/** Cap poblacional duro — el clan no supera este número. */
export const MAX_POPULATION = 60;

/**
 * Probabilidad base de reproducción por par elegible por tick.
 * Equivale a ~1 nacimiento cada 20 días por par activo.
 */
export const BIRTH_CHANCE_PER_TICK = 1 / (20 * TICKS_PER_DAY);

// ── helpers internos ──────────────────────────────────────────────────────────

function isEligible(npc: NPC, currentTick: number): boolean {
  if (!npc.alive) return false;
  if (npc.stats.supervivencia < MIN_SURVIV_TO_REPRODUCE) return false;
  if (
    npc.lastReproducedTick !== null &&
    currentTick - npc.lastReproducedTick < REPRODUCTION_COOLDOWN_TICKS
  ) {
    return false;
  }
  return true;
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Devuelve pares [macho, hembra] elegibles para reproducirse.
 * Cada NPC aparece en a lo sumo un par (greedy, orden estable).
 * Prioriza misma casta; dentro del mismo grupo, orden de array.
 */
export function findEligiblePairs(
  npcs: readonly NPC[],
  currentTick: number,
): [NPC, NPC][] {
  const males = npcs.filter((n) => n.sex === SEX.M && isEligible(n, currentTick));
  const females = npcs.filter((n) => n.sex === SEX.F && isEligible(n, currentTick));
  if (males.length === 0 || females.length === 0) return [];

  const pairs: [NPC, NPC][] = [];
  const usedFemaleIds = new Set<string>();

  for (const m of males) {
    // Priorizar misma casta
    const sameCasta = females.find(
      (f) => !usedFemaleIds.has(f.id) && f.casta === m.casta,
    );
    const partner = sameCasta ?? females.find((f) => !usedFemaleIds.has(f.id));
    if (!partner) continue;
    pairs.push([m, partner]);
    usedFemaleIds.add(partner.id);
  }
  return pairs;
}

/**
 * Genera un NPC hijo a partir de dos padres. Consume PRNG explícito.
 * - Sexo: 50/50.
 * - Linaje: del padre.
 * - Casta: mínima de los dos padres (Esclavo < Ciudadano < Elegido).
 * - Stats iniciales: recién nacido (supervivencia y socialización bajas).
 * - Skills/traits: heredados via `inheritFromParents`.
 */
export function birthNPC(
  father: NPC,
  mother: NPC,
  tick: number,
  prngIn: PRNGState,
  usedNames: ReadonlySet<string>,
): { npc: NPC; prng: PRNGState } {
  // Sexo
  const sexRoll = prngNext(prngIn);
  const sex = sexRoll.value < 0.5 ? SEX.M : SEX.F;
  let prng = sexRoll.next;

  // Herencia de skills y traits
  const inherited = inheritFromParents(father, mother, prng);
  prng = inherited.next;

  // Nombre único — seed = tick, cursor derivado del PRNG actual
  const cursorRoll = prngNext(prng);
  prng = cursorRoll.next;
  const cursor = Math.abs(Math.floor(cursorRoll.value * 1000));
  const namePick = pickUniqueName(tick, sex, cursor, usedNames as Set<string>);

  // Casta: la más baja de los dos padres
  const castaOrder = [CASTA.ELEGIDO, CASTA.CIUDADANO, CASTA.ESCLAVO];
  const fIdx = castaOrder.indexOf(father.casta);
  const mIdx = castaOrder.indexOf(mother.casta);
  const casta = castaOrder[Math.max(fIdx, mIdx)];

  const id = `npc-born-${tick}-${father.id}-${mother.id}`;

  const npc: NPC = {
    id,
    name: namePick.name,
    sex,
    casta,
    linaje: father.linaje,
    archetype: null,
    stats: { supervivencia: 50, socializacion: 40, proposito: 100 },
    skills: inherited.skills,
    position: { ...father.position },
    visionRadius: 5,
    parents: [father.id, mother.id],
    traits: inherited.traits,
    birthTick: tick,
    alive: true,
    inventory: { wood: 0, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0 },
    equippedItemId: null,
    lastReproducedTick: null,
  };

  return { npc, prng };
}

/**
 * Aplica reproducción para un tick. Cada par elegible tira dados
 * contra BIRTH_CHANCE_PER_TICK. Al menos 1 nacimiento por tick (cap
 * suave — si el dado pasa para 2 pares, nacen 2). Si MAX_POPULATION
 * está alcanzada, no nace nadie.
 *
 * Devuelve:
 *   - npcs: array completo actualizado (padres con lastReproducedTick).
 *   - newBorns: sólo los recién nacidos (para integrar en state.npcs).
 *   - prng: estado PRNG tras la operación.
 */
export function tickReproduction(
  npcs: readonly NPC[],
  currentTick: number,
  prngIn: PRNGState,
  usedNames: ReadonlySet<string>,
): { npcs: NPC[]; newBorns: NPC[]; prng: PRNGState } {
  const aliveCount = npcs.filter((n) => n.alive).length;
  if (aliveCount >= MAX_POPULATION) {
    return { npcs: [...npcs], newBorns: [], prng: prngIn };
  }

  const pairs = findEligiblePairs(npcs, currentTick);
  if (pairs.length === 0) {
    return { npcs: [...npcs], newBorns: [], prng: prngIn };
  }

  let prng = prngIn;
  const newBorns: NPC[] = [];
  const updatedParentIds = new Set<string>();
  const mutableNames = new Set(usedNames);

  for (const [father, mother] of pairs) {
    if (aliveCount + newBorns.length >= MAX_POPULATION) break;
    const roll = prngNext(prng);
    prng = roll.next;
    if (roll.value > BIRTH_CHANCE_PER_TICK) continue;

    const result = birthNPC(father, mother, currentTick, prng, mutableNames);
    prng = result.prng;
    newBorns.push(result.npc);
    mutableNames.add(result.npc.name);
    updatedParentIds.add(father.id);
    updatedParentIds.add(mother.id);
  }

  const nextNpcs: NPC[] = npcs.map((n) =>
    updatedParentIds.has(n.id)
      ? { ...n, lastReproducedTick: currentTick }
      : n,
  );

  return { npcs: [...nextNpcs, ...newBorns], newBorns, prng };
}
