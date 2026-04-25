/**
 * Clan por defecto para arranque UI — 14 fundadores deterministas.
 *
 * Wrapper sobre `drafting.ts` (Bloque A + Bloque B) que fija picks
 * canónicos desde un seed y devuelve los 14 NPCs listos para
 * `initialGameState`. Es una conveniencia de cableado; el drafting
 * interactivo por UI llegará en un sprint dedicado.
 *
 * Picks canónicos:
 *   - Bloque A: 2 Cazadores + 2 Recolectores (3+3+2+2 = 10,
 *     cumple budget exacto y 2M+2F). Equilibrado y barato; deja
 *     margen para rebalance futuro sin comerse el cap.
 *   - Bloque B: picks top de cada tier — 3 'excelente', 3 'bueno',
 *     2 'regular', 2 'malo' (decisión #3).
 *
 * Pura: mismo seed → mismos 14 NPCs.
 */

import type { NPC } from './npcs';
import { ARCHETYPE, SEX } from './npcs';
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

/** picks canónicos de Bloque A — budget 10 exacto. 
 *  Mapeo de almas: Líder (Ambicioso), Cazador (Guerrero), 
 *  Artesano (Sabio), Recolector (Simplezas). 
 */
const BLOCK_A_PICKS: Array<{
  archetype: (typeof ARCHETYPE)[keyof typeof ARCHETYPE];
  sex: (typeof SEX)[keyof typeof SEX];
}> = [
  { archetype: ARCHETYPE.ARTESANO,  sex: SEX.M }, // SABIO (Coste 3)
  { archetype: ARCHETYPE.CAZADOR,   sex: SEX.F }, // GUERRERO (Coste 3)
  { archetype: ARCHETYPE.RECOLECTOR, sex: SEX.M }, // SIMPLEZAS (Coste 2)
  { archetype: ARCHETYPE.PESCADOR,   sex: SEX.F }, // SIMPLEZAS (Coste 2)
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

/** Devuelve los 14 NPCs iniciales para el modo sandbox/auto. 
 *  No asigna posiciones; eso es responsabilidad de initialGameState. */
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
  const ciudadanos = finalizeBlockB(
    draftB,
    new Set(elegidos.map((n) => n.name)),
  );

  return [...elegidos, ...ciudadanos];
}
