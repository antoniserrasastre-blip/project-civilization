/**
 * Sistema de reproducción — Sprint 2.3 + Fase 2.0 (Linajes).
 */

import type { NPC, NPCGenes, GenePair, Allele, Linaje, NPCAttributes, Casta } from './npcs';
import { CASTA, VOCATION, LINAJE, SEX } from './npcs';
import type { PRNGState } from './prng';
import { nextInt, next } from './prng';
import { TICKS_PER_DAY } from './resources';
import { inheritFromParents } from './inheritance';
import { pickUniqueName } from './names';

export const MIN_SURVIV_TO_REPRODUCE = 50;
export const REPRODUCTION_COOLDOWN_TICKS = 10 * TICKS_PER_DAY;
export const MAX_POPULATION = 50;

export interface ReproResult {
  npcs: NPC[];
  newBorns: NPC[];
  prng: PRNGState;
}

/**
 * Cruce Mendeliano Real — §3.9.
 * Selecciona un alelo al azar de cada progenitor.
 * El valor final se determina por dominancia o promedio.
 */
export function mendelianCrossover(
  parentA: NPC,
  parentB: NPC,
  prng: PRNGState,
): { genes: NPCGenes; prng: PRNGState } {
  let currentPrng = prng;

  const crossoverGene = <T>(
    geneA: GenePair<T>,
    geneB: GenePair<T>,
    p: PRNGState,
    mutationRate: number,
    mutationFn?: (val: T, p: PRNGState) => { val: T; dominant: boolean; p: PRNGState },
  ): { pair: GenePair<T>; p: PRNGState } => {
    let cp = p;
    const rA = nextInt(cp, 0, 2);
    cp = rA.next;
    const rB = nextInt(cp, 0, 2);
    cp = rB.next;

    let alleleA = { ...(rA.value === 0 ? geneA.a : geneA.b) };
    let alleleB = { ...(rB.value === 0 ? geneB.a : geneB.b) };

    // Mutación
    if (mutationFn) {
      const m1 = next(cp);
      cp = m1.next;
      if (m1.value < mutationRate) {
        const res = mutationFn(alleleA.value, cp);
        alleleA = { ...alleleA, value: res.val, dominant: res.dominant };
        cp = res.p;
      }
      const m2 = next(cp);
      cp = m2.next;
      if (m2.value < mutationRate) {
        const res = mutationFn(alleleB.value, cp);
        alleleB = { ...alleleB, value: res.val, dominant: res.dominant };
        cp = res.p;
      }
    }

    return { pair: { a: alleleA, b: alleleB }, p: cp };
  };

  const mutateNum = (_val: number, p: PRNGState) => {
    const r = nextInt(p, 0, 101);
    const d = next(r.next);
    // 20% de probabilidad de ser recesivo (dominant: false)
    return { val: r.value, dominant: d.value >= 0.20, p: d.next };
  };

  const mutateLinaje = (_val: Linaje, p: PRNGState) => {
    const lineages = Object.values(LINAJE).filter(l => l !== parentA.linaje && l !== parentB.linaje);
    const r = nextInt(p, 0, lineages.length);
    return { val: lineages[r.value], dominant: true, p: r.next };
  };

  const gS = crossoverGene(parentA.genes.strength, parentB.genes.strength, currentPrng, 0.02, mutateNum);
  currentPrng = gS.p;
  const gD = crossoverGene(parentA.genes.dexterity, parentB.genes.dexterity, currentPrng, 0.02, mutateNum);
  currentPrng = gD.p;
  const gW = crossoverGene(parentA.genes.wisdom, parentB.genes.wisdom, currentPrng, 0.02, mutateNum);
  currentPrng = gW.p;
  const gL = crossoverGene(parentA.genes.linaje, parentB.genes.linaje, currentPrng, 0.005, mutateLinaje);
  currentPrng = gL.p;

  return {
    genes: {
      strength: gS.pair,
      dexterity: gD.pair,
      wisdom: gW.pair,
      linaje: gL.pair,
    },
    prng: currentPrng,
  };
}

/** Calcula el atributo final basado en alelos. */
function resolveAttribute(pair: GenePair<number>): number {
  if (pair.a.dominant && !pair.b.dominant) return pair.a.value;
  if (!pair.a.dominant && pair.b.dominant) return pair.b.value;
  return Math.round((pair.a.value + pair.b.value) / 2);
}

/** Calcula el linaje final basado en alelos. */
function resolveLinaje(pair: GenePair<Linaje>, prng: PRNGState): { val: Linaje; p: PRNGState } {
  if (pair.a.dominant && !pair.b.dominant) return { val: pair.a.value, p: prng };
  if (!pair.a.dominant && pair.b.dominant) return { val: pair.b.value, p: prng };
  const r = nextInt(prng, 0, 2);
  return { val: r.value === 0 ? pair.a.value : pair.b.value, p: r.next };
}

/** Herencia de castas según §3.2. */
function resolveCasta(parentA: NPC, parentB: NPC): Casta {
  if (parentA.casta === CASTA.ELEGIDO || parentB.casta === CASTA.ELEGIDO) return CASTA.ELEGIDO;
  if (parentA.casta === CASTA.ESCLAVO || parentB.casta === CASTA.ESCLAVO) return CASTA.ESCLAVO;
  return CASTA.CIUDADANO;
}

/** Busca parejas elegibles para reproducción. */
export function findEligiblePairs(npcs: readonly NPC[], currentTick: number): [NPC, NPC][] {
  const alive = npcs.filter(n => n.alive);
  const males = alive.filter(n => n.sex === SEX.M && n.stats.supervivencia >= MIN_SURVIV_TO_REPRODUCE && (n.lastReproducedTick === null || currentTick - n.lastReproducedTick >= REPRODUCTION_COOLDOWN_TICKS));
  const females = alive.filter(n => n.sex === SEX.F && n.stats.supervivencia >= MIN_SURVIV_TO_REPRODUCE && (n.lastReproducedTick === null || currentTick - n.lastReproducedTick >= REPRODUCTION_COOLDOWN_TICKS));
  
  const pairs: [NPC, NPC][] = [];
  const usedFemales = new Set<string>();
  
  for (const male of males) {
    const female = females.find(f => !usedFemales.has(f.id));
    if (female) {
      pairs.push([male, female]);
      usedFemales.add(female.id);
    }
  }
  return pairs;
}

/** Crea un nuevo NPC a partir de dos padres. */
export function birthNPC(
  father: NPC,
  mother: NPC,
  currentTick: number,
  prng: PRNGState,
  usedNames: Set<string>,
  _traditions?: Record<string, number>
): { npc: NPC, prng: PRNGState } {
  let currentPrng = prng;
  const { value: sexRoll, next: nextP } = nextInt(currentPrng, 0, 2);
  currentPrng = nextP;

  const { genes, prng: nextGenPrng } = mendelianCrossover(father, mother, currentPrng);
  currentPrng = nextGenPrng;

  const { val: linaje, p: nextLinajePrng } = resolveLinaje(genes.linaje, currentPrng);
  currentPrng = nextLinajePrng;

  const attributes: NPCAttributes = {
    strength: resolveAttribute(genes.strength),
    dexterity: resolveAttribute(genes.dexterity),
    wisdom: resolveAttribute(genes.wisdom),
  };

  const { skills, traits, next: nextInheritPrng } = inheritFromParents(father, mother, currentPrng);
  currentPrng = nextInheritPrng;

  const babySex = sexRoll === 0 ? SEX.M : SEX.F;
  const { name, nextCursor } = pickUniqueName(currentPrng.seed, babySex, currentPrng.cursor, usedNames);
  currentPrng = { ...currentPrng, cursor: nextCursor };

  const id = `npc-born-${currentTick}-${father.id}-${mother.id}`;

  const baby: NPC = {
    id,
    name,
    sex: babySex,
    casta: resolveCasta(father, mother),
    linaje,
    vocation: VOCATION.CIUDADANO,
    attributes,
    genes,
    archetype: null,
    stats: { supervivencia: 60, socializacion: 100, proposito: 100, miedo: 0 },
    skills,
    position: { ...mother.position },
    visionRadius: 6,
    parents: [father.id, mother.id].sort() as [string, string],
    traits,
    birthTick: currentTick,
    alive: true,
    inventory: { wood: 0, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0, clay: 0, coconut: 0, flint: 0, mushroom: 0 },
    equippedItemId: null,
    lastReproducedTick: null,
  };

  return { npc: baby, prng: currentPrng };
}

/**
 * Los niños nacen con un bonus en la habilidad predominante de la tribu.
 */
export function tickReproduction(
  npcs: readonly NPC[],
  currentTick: number,
  prng: PRNGState,
  usedNames: Set<string>,
  traditions?: Record<string, number>,
): ReproResult {
  const nextNpcs = [...npcs];
  const newBorns: NPC[] = [];
  let currentPrng = prng;

  // 5% de probabilidad de un nuevo miembro cada amanecer
  if (currentTick % TICKS_PER_DAY === 0) {
    const { value: roll, next: nextP } = nextInt(currentPrng, 0, 100);
    currentPrng = nextP;

    if (roll < 5 && npcs.length < MAX_POPULATION) {
      const pairs = findEligiblePairs(npcs, currentTick);
      if (pairs.length > 0) {
        // En cada amanecer solo nace uno por ahora para mantener el ritmo
        const { value: pairIdx, next: nextP2 } = nextInt(currentPrng, 0, pairs.length);
        currentPrng = nextP2;
        
        const [father, mother] = pairs[pairIdx];
        const { npc: baby, prng: nextP3 } = birthNPC(father, mother, currentTick, currentPrng, usedNames, traditions);
        currentPrng = nextP3;

        newBorns.push(baby);
        
        // Actualizar padres
        const updatedNpcs = nextNpcs.map(n => {
          if (n.id === father.id || n.id === mother.id) {
            return { ...n, lastReproducedTick: currentTick };
          }
          return n;
        });
        
        return { npcs: [...updatedNpcs, baby], newBorns, prng: currentPrng };
      }
    }
  }

  return { npcs: nextNpcs, newBorns, prng: currentPrng };
}
