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

/**
 * Spawn del clan en la isla visible del fixture `world-map.v1.json`.
 * Verificado con el fixture actual: grid 5×3 alrededor de (85, 73)
 * cae íntegramente en grass/mountain (no agua). Placeholder hasta
 * que llegue Sprint SPAWN-COSTERO con selección automática de costa.
 */
export const SPAWN_CENTER = { x: 85, y: 73 } as const;

/** Grid 5×3 para repartir 14 NPCs sin superposición. Determinista. */
function spawnOffset(i: number): { x: number; y: number } {
  return { x: (i % 5) - 2, y: Math.floor(i / 5) - 1 };
}

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

  return [...elegidos, ...ciudadanos].map((npc, i) => {
    const off = spawnOffset(i);
    return {
      ...npc,
      position: {
        x: SPAWN_CENTER.x + off.x,
        y: SPAWN_CENTER.y + off.y,
      },
    };
  });
}
