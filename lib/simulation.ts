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
import { CASTA } from './npcs';
import { tickResources, TICKS_PER_DAY } from './resources';
import { tickHarvests } from './harvest';
import { markDiscovered } from './fog';
import type { FogState } from './fog';
import { evaluateNight, isNightCheckTick } from './nights';
import { isDawn } from './messages';
import { applyFaithDelta, faithPerTick } from './faith';
import {
  applyGratitudeDelta,
  applyGratitudeFromEvent,
  computeGratitudeTickDelta,
  computeSilenceDrainPerDay,
  evaluateDawnGratitude,
  penalizeElegidoDeath,
  resetGratitudeDailyTracking,
} from './gratitude';
import type { VillageState } from './village';
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

/** Umbrales de detección de `hunger_escape` — §diseño gratitud v2. */
const HUNGER_ESCAPE_LOW = 20;
const HUNGER_ESCAPE_RECOVERY = 40;

/**
 * Diffs prev/post un tick de NPCs para detectar transiciones
 * relevantes a la gratitud. Aplica eventos + pérdidas al village
 * y acumula contadores diarios. El orden es determinista (por
 * índice de `prev`) y no consume PRNG.
 *
 * Detecta:
 *   - Muerte de Elegido → penalty (no cuenta contra cap diario).
 *   - Escape de hambre crítica → evento `hunger_escape` (cuenta).
 */
function applyGratitudeEventsForTick(
  village: VillageState,
  prev: readonly NPC[],
  next: readonly NPC[],
): VillageState {
  const byId = new Map<string, NPC>();
  for (const n of next) byId.set(n.id, n);
  let v = village;
  for (const p of prev) {
    const n = byId.get(p.id);
    if (!n) continue;
    const diedThisTick = p.alive && !n.alive;
    if (diedThisTick) {
      v = { ...v, dailyDeaths: v.dailyDeaths + 1 };
      if (p.casta === CASTA.ELEGIDO) v = penalizeElegidoDeath(v);
      continue;
    }
    if (!p.alive || !n.alive) continue;
    const escaped =
      p.stats.supervivencia < HUNGER_ESCAPE_LOW &&
      n.stats.supervivencia >= HUNGER_ESCAPE_RECOVERY;
    if (escaped) {
      v = applyGratitudeFromEvent(
        v,
        {
          type: 'hunger_escape',
          npcId: n.id,
          position: { x: n.position.x, y: n.position.y },
        },
        v.activeMessage,
      );
      v = { ...v, dailyHungerEscapes: v.dailyHungerEscapes + 1 };
    }
  }
  return v;
}

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

  let nextVillage: VillageState = isNightCheckTick(afterBuild.tick)
    ? {
        ...state.village,
        consecutiveNightsAtFire: evaluateNight(
          afterBuild.structures,
          afterBuild.npcs,
          state.village.consecutiveNightsAtFire,
        ),
      }
    : state.village;

  // Fe pasiva (§3.7b) — sqrt(vivos) por día, distribuido por tick.
  const aliveCount = afterBuild.npcs.reduce(
    (n, npc) => n + (npc.alive ? 1 : 0),
    0,
  );
  nextVillage = applyFaithDelta(nextVillage, faithPerTick(aliveCount));

  // Gratitud legacy trickle (Sprint 5.3, rate 0.1 post Fase 5 #1).
  // Conservada como ruta pasiva mientras el v2 event-driven es la
  // ruta principal — ambas coexisten hasta que el playtest #1.5
  // decida el balance final.
  const gratitudeDelta = computeGratitudeTickDelta(
    afterBuild.npcs,
    nextVillage.activeMessage,
  );
  if (gratitudeDelta !== 0) {
    nextVillage = applyGratitudeDelta(nextVillage, gratitudeDelta);
  }

  // Gratitud v2 — eventos detectados en este tick (per-NPC diffs).
  // Hunger-escape + muerte de Elegido. §A4 — sin PRNG.
  nextVillage = applyGratitudeEventsForTick(
    nextVillage,
    state.npcs,
    afterBuild.npcs,
  );

  // Flujo de amanecer (tick > 0, múltiplo de TICKS_PER_DAY):
  //   1. Decrementar gracia del silencio-por-default.
  //   2. Drain de silencio si activeMessage === null y gracia agotada.
  //   3. Pulsos B sobre el susurro activo persistente.
  //   4. Reset de tracking diario.
  // Nota: no hay `archiveAtDawn` — el susurro persiste (§3.7). Se
  // archiva al cambiar, vía `applyPlayerIntent`.
  if (isDawn(afterBuild.tick) && afterBuild.tick > 0) {
    if (
      nextVillage.activeMessage === null &&
      nextVillage.silenceGraceDaysRemaining > 0
    ) {
      nextVillage = {
        ...nextVillage,
        silenceGraceDaysRemaining:
          nextVillage.silenceGraceDaysRemaining - 1,
      };
    }
    const drain = computeSilenceDrainPerDay(nextVillage);
    if (drain > 0) {
      nextVillage = applyGratitudeDelta(nextVillage, -drain);
    }
    nextVillage = evaluateDawnGratitude(
      nextVillage,
      nextVillage.activeMessage,
    );
    nextVillage = resetGratitudeDailyTracking(nextVillage);
  }

  return {
    ...afterBuild,
    relations: state.relations,
    village: nextVillage,
  };
}
