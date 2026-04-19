/**
 * Herencia genética — Sprint 4.3.
 *
 * Cuando nace un NPC, sus skills son la media de los padres + ruido
 * determinista; cada rasgo tiene 50% de probabilidad de heredarse.
 * Decisión #11: herencia 50% de rasgos; Decisión #22/§3.8: traits de
 * milagros también 50%.
 *
 * Puro: (p1, p2, prng) → (child skills/traits, prng'). Consume
 * PRNG explícitamente.
 */

import { next, nextRange, type PRNGState } from './prng';
import type { NPC, NPCSkills } from './npcs';

/** Ruido añadido al mean de skills ±SKILL_JITTER. */
const SKILL_JITTER = 5;

/**
 * Devuelve skills del hijo = (p1.skill + p2.skill)/2 ±
 * SKILL_JITTER. Enteros, clamp [0, 100].
 */
export function inheritSkills(
  p1: NPCSkills,
  p2: NPCSkills,
  prngIn: PRNGState,
): { skills: NPCSkills; next: PRNGState } {
  let prng = prngIn;
  const keys: Array<keyof NPCSkills> = [
    'hunting',
    'gathering',
    'crafting',
    'fishing',
    'healing',
  ];
  const out = {} as NPCSkills;
  for (const k of keys) {
    const mean = (p1[k] + p2[k]) / 2;
    const r = nextRange(prng, -SKILL_JITTER, SKILL_JITTER);
    prng = r.next;
    const value = Math.max(0, Math.min(100, Math.round(mean + r.value)));
    out[k] = value;
  }
  return { skills: out, next: prng };
}

/**
 * Cada rasgo del padre + madre tiene 50% probabilidad de pasar al
 * hijo. Rasgos compartidos no se duplican. Orden canónico (único,
 * alfabético).
 */
export function inheritTraits(
  p1Traits: readonly string[],
  p2Traits: readonly string[],
  prngIn: PRNGState,
): { traits: string[]; next: PRNGState } {
  let prng = prngIn;
  const pool = Array.from(new Set([...p1Traits, ...p2Traits])).sort();
  const traits: string[] = [];
  for (const t of pool) {
    const r = next(prng);
    prng = r.next;
    if (r.value < 0.5) traits.push(t);
  }
  return { traits, next: prng };
}

/** Helper para NPCs concretos; atajo que evita que el caller
 *  manualmente pase stats. */
export function inheritFromParents(
  p1: NPC,
  p2: NPC,
  prng: PRNGState,
): {
  skills: NPCSkills;
  traits: string[];
  next: PRNGState;
} {
  const s = inheritSkills(p1.skills, p2.skills, prng);
  const t = inheritTraits(p1.traits, p2.traits, s.next);
  return { skills: s.skills, traits: t.traits, next: t.next };
}
