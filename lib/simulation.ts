/**
 * Simulación — tick puro del mundo primigenia.
 *
 * `tick(state): GameState'` avanza un paso simulado. Sin side
 * effects, sin mutación. §A4.
 *
 * Responsabilidades actuales (Sprint 3.3):
 *   - Decidir destino de cada NPC vivo (needs).
 *   - Encontrar ruta (A*) y mover 1 tile en su dirección.
 *   - Regenerar recursos agotados (tickResources).
 *   - Actualizar fog con radio de visión.
 *
 * Las necesidades-que-consumen (supervivencia baja por hambre,
 * socialización) llegan en Sprint 4.1.
 */

import { decideDestination, tickNeeds } from './needs';
import { findPath } from './pathfinding';
import type { GameState } from './game-state';
import type { NPC } from './npcs';
import { tickResources, TICKS_PER_DAY } from './resources';
import { tickHarvests } from './harvest';
import { markDiscovered } from './fog';
import type { FogState } from './fog';
import { evaluateNight, isNightCheckTick } from './nights';
import { accumulateFaithDaily, tickSilenceGraceDay } from './faith';
import { isDawn } from './messages';
import { firstStructureOfKind } from './structures';
import {
  canBuild,
  CRAFTABLE,
  clanInventoryTotal,
  consumeForRecipe,
  RECIPES,
  type CraftableId,
} from './crafting';
import { addStructure } from './structures';

const BUILD_PRIORITY: CraftableId[] = [
  CRAFTABLE.FOGATA_PERMANENTE,
  CRAFTABLE.HERRAMIENTA_SILEX,
  CRAFTABLE.REFUGIO,
  CRAFTABLE.DESPENSA,
  CRAFTABLE.PIEL_ROPA,
];

/** El clan construye de forma autónoma si tiene recursos y la
 *  receta no está ya construida. Orden fijo — el jugador no decide
 *  (en primigenia el verbo del jugador es mensaje, no orden directa).
 *  Una construcción por tick. */
function tryAutoBuild(state: GameState): GameState {
  const existing = new Set(state.structures.map((s) => s.kind));
  const inv = clanInventoryTotal(state.npcs);
  for (const kind of BUILD_PRIORITY) {
    if (existing.has(kind)) continue;
    const recipe = RECIPES[kind];
    if (!canBuild(recipe, inv)) continue;
    const npcs = consumeForRecipe(state.npcs, recipe);
    // Posición: el primer NPC vivo (determinista). La plaza real
    // del clan la decidiremos con diseño mejorado; por ahora el
    // asentamiento no tiene "centro" canónico.
    const anchor =
      state.npcs.find((n) => n.alive) ?? { position: { x: 0, y: 0 } };
    const structures = addStructure(
      state.structures,
      kind,
      anchor.position,
      state.tick,
      state.structures.length,
    );
    return { ...state, npcs, structures };
  }
  return state;
}

function nextBuildPriority(state: GameState): CraftableId | undefined {
  const existing = new Set(state.structures.map((s) => s.kind));
  for (const kind of BUILD_PRIORITY) {
    if (!existing.has(kind)) return kind;
  }
  return undefined;
}

export function tick(state: GameState): GameState {
  const fire = firstStructureOfKind(
    state.structures,
    CRAFTABLE.FOGATA_PERMANENTE,
  );
  const ctx = {
    world: state.world,
    npcs: state.npcs,
    nextBuildPriority: nextBuildPriority(state),
    firePosition: fire?.position,
    currentTick: state.tick,
    ticksPerDay: TICKS_PER_DAY,
  };
  const newNPCs: NPC[] = [];
  let prng = state.prng;
  let fog: FogState = state.fog;

  for (const npc of state.npcs) {
    if (!npc.alive) {
      newNPCs.push(npc);
      continue;
    }
    const dest = decideDestination(npc, ctx);
    if (dest.x === npc.position.x && dest.y === npc.position.y) {
      newNPCs.push(npc);
      fog = markDiscovered(fog, npc.position.x, npc.position.y, npc.visionRadius);
      continue;
    }
    const r = findPath(
      state.world,
      npc.position,
      dest,
      prng,
      { maxExpand: 2000 },
    );
    prng = r.next;
    if (!r.path || r.path.length < 2) {
      // Sin ruta o ya está — se queda quieto.
      newNPCs.push(npc);
      fog = markDiscovered(fog, npc.position.x, npc.position.y, npc.visionRadius);
      continue;
    }
    const nextStep = r.path[1];
    const moved: NPC = { ...npc, position: { ...nextStep } };
    newNPCs.push(moved);
    fog = markDiscovered(fog, moved.position.x, moved.position.y, moved.visionRadius);
  }

  const regen = tickResources(state.world.resources, state.tick + 1);
  // Recolección ANTES de tickNeeds para que el inventario post-harvest
  // pueda usarse en sprints siguientes. El estado "on-the-spot" de
  // needs también puede ver el mismo spawn antes de agotarse.
  const harvested = tickHarvests(newNPCs, regen, state.tick + 1);
  const nextWorld = { ...state.world, resources: harvested.resources };
  const npcsAfterNeeds = tickNeeds(harvested.npcs, {
    world: nextWorld,
    npcs: harvested.npcs,
  });

  // Auto-build antes del night-check para que una fogata construida
  // este tick ya permita dormir esta noche.
  const afterBuild = tryAutoBuild({
    ...state,
    world: nextWorld,
    npcs: npcsAfterNeeds,
    fog,
    tick: state.tick + 1,
    prng,
  });

  let nextVillage = isNightCheckTick(afterBuild.tick)
    ? {
        ...state.village,
        consecutiveNightsAtFire: evaluateNight(
          afterBuild.structures,
          afterBuild.npcs,
          state.village.consecutiveNightsAtFire,
        ),
      }
    : state.village;

  // §3.7 Sprint #1: el susurro persiste entre ticks; no se archiva
  // por paso del tiempo. El archivado sucede en selectIntent cuando
  // el jugador cambia explícitamente (lib/messages.ts).

  // §3.7b Sprint #1: al cruzar un amanecer (tick > 0 múltiplo de
  // TICKS_PER_DAY) acumulamos Fe según vivos y descontamos un día
  // de gracia de silencio.
  if (afterBuild.tick > 0 && isDawn(afterBuild.tick)) {
    const aliveCount = afterBuild.npcs.filter((n) => n.alive).length;
    nextVillage = accumulateFaithDaily(nextVillage, aliveCount);
    nextVillage = tickSilenceGraceDay(nextVillage);
  }

  return {
    ...afterBuild,
    relations: state.relations,
    village: nextVillage,
  };
}
