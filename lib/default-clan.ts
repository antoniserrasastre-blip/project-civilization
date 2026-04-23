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
 * Sprint #5 Fase 5 SPAWN-COSTERO: el centro del clan deja de estar
 * hardcoded. `lib/spawn.ts` detecta islas sobre el fixture y elige
 * una por seed; dentro de esa isla toma un tile costero. Los 14
 * NPCs se distribuyen BFS por tierra alrededor del centro — ya
 * nunca aterrizan en agua.
 *
 * Pura: mismo seed → mismos 14 NPCs.
 */

import worldMapJson from './fixtures/world-map.v1.json';
import type { WorldMap } from './world-state';
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
import { findIslands, pickClanSpawn, pickZonedClanSpawn, pickLandCells } from './spawn';
import { SCENARIO_CATALOG, type ScenarioId } from './scenarios';

const WORLD = worldMapJson as unknown as WorldMap;

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

/** Calcula el spawn del clan sobre el fixture canónico. Exportado
 *  para que el shell pueda centrar el viewport al arrancar. */
export function defaultClanSpawn(seed: number): {
  islandIndex: number;
  center: { x: number; y: number };
} {
  const islands = findIslands(WORLD);
  return pickClanSpawn(seed, islands);
}

/** Posiciona `npcs` en celdas de tierra alrededor del spawn que
 *  corresponde al escenario elegido. Pura: devuelve NPCs nuevos. */
export function spawnClanForScenario(
  seed: number,
  npcs: readonly NPC[],
  scenarioId: ScenarioId | null,
): NPC[] {
  const islands = findIslands(WORLD);
  const zone = scenarioId ? SCENARIO_CATALOG[scenarioId].preferredSpawnZone : 'coast';
  const spawn = zone === 'coast' || !scenarioId
    ? pickClanSpawn(seed, islands)
    : pickZonedClanSpawn(seed, islands, WORLD, zone);
  const cells = pickLandCells(WORLD, spawn.center, npcs.length);
  return npcs.map((npc, i) => ({ ...npc, position: { x: cells[i].x, y: cells[i].y } }));
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
  const ciudadanos = finalizeBlockB(
    draftB,
    new Set(elegidos.map((n) => n.name)),
  );

  // Selección de isla y centro costero por seed (§3.4 vision,
  // Sprint #5). BFS sobre tierra para 14 celdas contiguas.
  const { center } = defaultClanSpawn(seed);
  const cells = pickLandCells(WORLD, center, 14);

  return [...elegidos, ...ciudadanos].map((npc, i) => ({
    ...npc,
    position: { x: cells[i].x, y: cells[i].y },
  }));
}
