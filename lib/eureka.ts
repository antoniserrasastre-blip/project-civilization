/**
 * Sistema Eureka — Sprint 9 CULTURA-MATERIAL.
 *
 * Un NPC en necesidad crítica (supervivencia baja) tiene una pequeña
 * probabilidad de descubrir un tipo de herramienta que el clan aún no
 * conoce y para la que hay materiales. §A4: puro, PRNG explícito.
 *
 * "Necesidad crítica" = supervivencia <= EUREKA_NEED_THRESHOLD.
 * "Trauma" = supervivencia <= EUREKA_TRAUMA_THRESHOLD (menor, más raro).
 */

import { next as prngNext, type PRNGState } from './prng';
import { CASTA, type NPC } from './npcs';
import { ITEM_KIND, ITEM_DEFS, type ItemKind } from './items';
import { ITEM_RECIPES, canCraftItem } from './item-crafting';
import type { NPCInventory } from './npcs';

/** Supervivencia máxima para activar el trigger de Eureka. */
export const EUREKA_NEED_THRESHOLD = 30;

/** Supervivencia de trauma (bonus de probabilidad). */
export const EUREKA_TRAUMA_THRESHOLD = 15;

/** Probabilidad base por tick cuando supervivencia <= EUREKA_NEED_THRESHOLD. */
export const EUREKA_CHANCE_BASE = 0.003;

/** Multiplicador cuando supervivencia <= EUREKA_TRAUMA_THRESHOLD. */
export const EUREKA_TRAUMA_MULTIPLIER = 3;

export interface EurekaContext {
  /** Inventario total del clan (para comprobar si hay materiales). */
  clanInventory: NPCInventory;
  /** Tipos de item que el clan ya conoce (ya existen en state.items). */
  existingItemKinds: ReadonlySet<string>;
  currentTick: number;
}

/**
 * Comprueba si el NPC tiene un Eureka este tick.
 * Devuelve el tipo de item descubierto (o null) y el PRNG avanzado.
 */
export function checkEureka(
  npc: NPC,
  ctx: EurekaContext,
  prngIn: PRNGState,
): { discovered: ItemKind | null; prng: PRNGState } {
  // Trigger: supervivencia crítica
  if (npc.stats.supervivencia > EUREKA_NEED_THRESHOLD) {
    return { discovered: null, prng: prngIn };
  }

  // Candidatos: items no conocidos, con materiales, respetando casta
  const candidates = Object.values(ITEM_KIND).filter((k) => {
    if (ctx.existingItemKinds.has(k)) return false;
    const def = ITEM_DEFS[k];
    if (def.slot === 'relic') return false; // reliquias no se descubren por trauma
    if (npc.casta === CASTA.ESCLAVO && def.complex) return false;
    // Comprobar materiales — fake npcs array con el inventario del clan
    const fakeSingleNpc = {
      alive: true,
      inventory: ctx.clanInventory,
    } as Parameters<typeof canCraftItem>[1][number];
    return canCraftItem(k, [fakeSingleNpc]);
  });

  if (candidates.length === 0) {
    return { discovered: null, prng: prngIn };
  }

  // Probabilidad ajustada por trauma
  const chance =
    npc.stats.supervivencia <= EUREKA_TRAUMA_THRESHOLD
      ? EUREKA_CHANCE_BASE * EUREKA_TRAUMA_MULTIPLIER
      : EUREKA_CHANCE_BASE;

  const roll = prngNext(prngIn);
  let prng = roll.next;

  if (roll.value > chance) {
    return { discovered: null, prng };
  }

  // Elegir uno de los candidatos de forma determinista
  const idxRoll = prngNext(prng);
  prng = idxRoll.next;
  const idx = Math.floor(idxRoll.value * candidates.length);
  return { discovered: candidates[idx], prng };
}
