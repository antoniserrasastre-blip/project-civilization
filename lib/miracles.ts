/**
 * Los 5 milagros primigenia — Sprint 5.4 (decisión #32, §3.8).
 *
 * Catálogo reducido de bendiciones individuales raras. Cuestan
 * gratitud sustancial. Cada milagro añade un rasgo permanente al
 * NPC; máx 3 rasgos simultáneos (el 4º reemplaza al más antiguo).
 * Herencia 50% a descendientes directos vía lib/inheritance.ts.
 */

import { spendGratitude } from './gratitude';
import type { GameState } from './game-state';
import type { NPC } from './npcs';

export const MIRACLE = {
  HAMBRE_SAGRADA: 'hambre_sagrada',
  OJO_DE_HALCON: 'ojo_de_halcon',
  VOZ_DE_TODOS: 'voz_de_todos',
  MANOS_QUE_RECUERDAN: 'manos_que_recuerdan',
  CORAZON_FIEL: 'corazon_fiel',
} as const;

export type MiracleId = (typeof MIRACLE)[keyof typeof MIRACLE];

export interface MiracleDef {
  id: MiracleId;
  cost: number;
  traitId: string;
  nameCastellano: string;
}

/** Decisión #32 — costes provisionales. Revalidar en playtest. */
export const MIRACLES_CATALOG: Record<MiracleId, MiracleDef> = {
  [MIRACLE.HAMBRE_SAGRADA]: {
    id: MIRACLE.HAMBRE_SAGRADA,
    cost: 30,
    traitId: 'hambre_sagrada',
    nameCastellano: 'Hambre sagrada',
  },
  [MIRACLE.OJO_DE_HALCON]: {
    id: MIRACLE.OJO_DE_HALCON,
    cost: 40,
    traitId: 'ojo_de_halcon',
    nameCastellano: 'Ojo de halcón',
  },
  [MIRACLE.VOZ_DE_TODOS]: {
    id: MIRACLE.VOZ_DE_TODOS,
    cost: 50,
    traitId: 'voz_de_todos',
    nameCastellano: 'Voz de todos',
  },
  [MIRACLE.MANOS_QUE_RECUERDAN]: {
    id: MIRACLE.MANOS_QUE_RECUERDAN,
    cost: 60,
    traitId: 'manos_que_recuerdan',
    nameCastellano: 'Manos que recuerdan',
  },
  [MIRACLE.CORAZON_FIEL]: {
    id: MIRACLE.CORAZON_FIEL,
    cost: 80,
    traitId: 'corazon_fiel',
    nameCastellano: 'Corazón fiel',
  },
};

export const MAX_TRAITS_PER_NPC = 3;

/**
 * Otorga un milagro a un NPC. Valida:
 *   - NPC existe y alive.
 *   - Pool de gratitud suficiente.
 *
 * Si el NPC ya tiene MAX_TRAITS_PER_NPC rasgos, el 4º reemplaza
 * al más antiguo (primer elemento del array). El jugador asume
 * esta política implícita — decisión de UX.
 *
 * Puro: devuelve GameState nuevo.
 */
export function grantMiracle(
  state: GameState,
  npcId: string,
  miracleId: MiracleId,
): GameState {
  const miracle = MIRACLES_CATALOG[miracleId];
  if (!miracle) throw new Error(`milagro inválido: ${miracleId}`);
  const npcIdx = state.npcs.findIndex((n) => n.id === npcId);
  if (npcIdx < 0) throw new Error(`NPC no encontrado: ${npcId}`);
  const npc = state.npcs[npcIdx];
  if (!npc.alive) throw new Error(`NPC ${npcId} está muerto`);
  if (npc.traits.includes(miracle.traitId)) {
    // Ya tiene ese rasgo — milagro inválido (no gastamos pool).
    throw new Error(`NPC ${npcId} ya tiene ${miracle.traitId}`);
  }
  const village = spendGratitude(state.village, miracle.cost);
  let nextTraits = [...npc.traits, miracle.traitId];
  if (nextTraits.length > MAX_TRAITS_PER_NPC) {
    // Reemplaza el más antiguo (elemento 0).
    nextTraits = nextTraits.slice(1);
  }
  const nextNpcs = [...state.npcs];
  nextNpcs[npcIdx] = { ...npc, traits: nextTraits };
  return { ...state, village, npcs: nextNpcs };
}

/** Devuelve true si el milagro podría otorgarse (validaciones
 *  ligeras, sin throw). Útil para UI. */
export function canGrantMiracle(
  state: GameState,
  npcId: string,
  miracleId: MiracleId,
): boolean {
  const miracle = MIRACLES_CATALOG[miracleId];
  if (!miracle) return false;
  const npc = state.npcs.find((n) => n.id === npcId);
  if (!npc) return false;
  if (!npc.alive) return false;
  if (npc.traits.includes(miracle.traitId)) return false;
  if (state.village.gratitude < miracle.cost) return false;
  return true;
}
