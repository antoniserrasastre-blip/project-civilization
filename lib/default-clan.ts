/**
 * Clan por defecto para arranque UI — 14 fundadores deterministas.
 *
 * Wrapper sobre `drafting.ts` (Bloque A + Bloque B) que fija picks
 * canónicos desde un seed y devuelve los 14 NPCs listos para
 * `initialGameState`. Es una conveniencia de cableado; el drafting
 * interactivo por UI llegará en un sprint dedicado.
 *
 * Picks canónicos:
 *   - Bloque A: Lider M (4) + Cazador F (3) + Curandero F (3) =
 *     10 puntos, 4 slots, 2M + 2F. Cuarto slot: Artesano M (pero
 *     excedería budget 4+3+3+3=13 >10). Reajuste: Lider M +
 *     Cazador F + Recolector F + Scout M = 4+3+2+2=11 >10 también.
 *     Budget 10: Lider(4) + Cazador(3) + Recolector(2) + Scout(2)
 *     = 11 — excede. Usamos: Cazador M + Cazador F + Recolector M
 *     + Recolector F = 3+3+2+2 = 10. 2M+2F exacto. Equilibrado y
 *     barato; deja margen para futuros pivots de balance.
 *   - Bloque B: 10 Ciudadanos generados con `generateCandidates`
 *     por tier (3-3-2-2) — los mejores 3 del tier 'excelente',
 *     los 3 primeros de 'bueno', 2 de 'regular', 2 de 'malo'.
 *
 * Pura: mismo seed → mismos 14 NPCs.
 */

import { ARCHETYPE, SEX, type NPC } from './npcs';
import {
  finalizeBlockA,
  finalizeBlockB,
  generateCandidates,
  pickArchetype,
  pickFollower,
  setSex,
  startDraft,
  startFollowerDraft,
} from './drafting';

/** Los 4 picks canónicos de Bloque A — budget 10 exacto. */
const BLOCK_A_PICKS: Array<{
  archetype: (typeof ARCHETYPE)[keyof typeof ARCHETYPE];
  sex: (typeof SEX)[keyof typeof SEX];
}> = [
  { archetype: ARCHETYPE.CAZADOR, sex: SEX.M },
  { archetype: ARCHETYPE.CAZADOR, sex: SEX.F },
  { archetype: ARCHETYPE.RECOLECTOR, sex: SEX.M },
  { archetype: ARCHETYPE.RECOLECTOR, sex: SEX.F },
];

/** Orden canónico de picks por tier (decisión #3: 3+3+2+2). */
const FOLLOWER_PICKS: Array<{
  tier: 'excelente' | 'bueno' | 'regular' | 'malo';
  count: number;
}> = [
  { tier: 'excelente', count: 3 },
  { tier: 'bueno', count: 3 },
  { tier: 'regular', count: 2 },
  { tier: 'malo', count: 2 },
];

export function makeDefaultClan(seed: number): NPC[] {
  let draftA = startDraft(seed);
  BLOCK_A_PICKS.forEach((p, i) => {
    draftA = pickArchetype(draftA, i, p.archetype);
    draftA = setSex(draftA, i, p.sex);
  });
  const elegidos = finalizeBlockA(draftA);

  let draftB = startFollowerDraft(seed);
  for (const { tier, count } of FOLLOWER_PICKS) {
    const candidates = generateCandidates(seed, tier, 0);
    for (let i = 0; i < count; i++) {
      draftB = pickFollower(draftB, candidates[i]);
    }
  }
  const ciudadanos = finalizeBlockB(draftB);

  return [...elegidos, ...ciudadanos];
}
