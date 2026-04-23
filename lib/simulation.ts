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
import { tickInfluence } from './influence';
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
import { TILE, type TileId } from './world-state';
import { tickReproduction } from './reproduction';
import { applyEsclavoDrain, elegidoFaithBonusPerTick } from './casta-effects';
import type { ChronicleEntry } from './game-state';
import { CHRONICLE_MAX } from './game-state';
import { narrate } from './chronicle';
import { ITEM_KIND, type EquippableItem } from './items';
import { canCraftItem, craftItem, ITEM_RECIPES } from './item-crafting';
import { checkEureka, detectUnlockTrigger, canAutoCraft } from './eureka';
import { transferLegacyItem } from './legacy';

/** Umbrales de detección de `hunger_escape` — §diseño gratitud v2. */
const HUNGER_ESCAPE_LOW = 20;
const HUNGER_ESCAPE_RECOVERY = 40;
const SWIM_TICK_INTERVAL = 3;

function tileAt(state: GameState, x: number, y: number): TileId {
  return state.world.tiles[y * state.world.width + x] as TileId;
}

function isMovementPassable(tile: TileId): boolean {
  // Primigenia: pueden nadar solo en aguas poco profundas.
  // El coste temporal se aplica después del pathfinding para
  // mantener A* entero y determinista.
  return tile !== TILE.WATER;
}

export function canReachByNpcMovement(
  state: GameState,
  from: { x: number; y: number },
  to: { x: number; y: number },
): boolean {
  return reachableTilesByNpcMovement(state, from).has(
    to.y * state.world.width + to.x,
  );
}

function reachableTilesByNpcMovement(
  state: GameState,
  from: { x: number; y: number },
): Set<number> {
  const { world } = state;
  const start = from.y * world.width + from.x;
  const seen = new Set<number>();
  if (
    from.x < 0 ||
    from.y < 0 ||
    from.x >= world.width ||
    from.y >= world.height ||
    !isMovementPassable(world.tiles[start] as TileId)
  ) {
    return seen;
  }
  const queue: number[] = [start];
  let head = 0;
  seen.add(start);
  while (head < queue.length) {
    const cur = queue[head++];
    const x = cur % world.width;
    const y = Math.floor(cur / world.width);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) {
        continue;
      }
      const idx = ny * world.width + nx;
      if (seen.has(idx)) continue;
      if (!isMovementPassable(world.tiles[idx] as TileId)) continue;
      seen.add(idx);
      queue.push(idx);
    }
  }
  return seen;
}

export function makeNpcReachabilityChecker(
  state: GameState,
): (from: { x: number; y: number }, to: { x: number; y: number }) => boolean {
  const cache = new Map<string, Set<number>>();
  return (from, to) => {
    const key = `${from.x},${from.y}`;
    let reachable = cache.get(key);
    if (!reachable) {
      reachable = reachableTilesByNpcMovement(state, from);
      cache.set(key, reachable);
    }
    return reachable.has(to.y * state.world.width + to.x);
  };
}

function canMoveThisTick(
  state: GameState,
  npc: NPC,
  nextStep: { x: number; y: number },
): boolean {
  const currentTile = tileAt(state, npc.position.x, npc.position.y);
  const nextTile = tileAt(state, nextStep.x, nextStep.y);
  const swimming =
    currentTile === TILE.SHALLOW_WATER || nextTile === TILE.SHALLOW_WATER;
  if (!swimming) return true;
  return state.tick % SWIM_TICK_INTERVAL === 0;
}

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
  CRAFTABLE.REFUGIO,
  CRAFTABLE.DESPENSA,
  CRAFTABLE.PIEL_ROPA,
];

function aliveWorkers(npcs: readonly NPC[]): number {
  return npcs.reduce((n, npc) => n + (npc.alive ? 1 : 0), 0);
}

/** El clan construye de forma autónoma si tiene recursos y la
 *  receta no está ya construida. Orden fijo — el jugador no decide
 *  (en primigenia el verbo del jugador es mensaje, no orden directa).
 *  Una construcción por tick. */
function tryAutoBuild(state: GameState): GameState {
  if (state.buildProject) {
    const progress = state.buildProject.progress + aliveWorkers(state.npcs);
    if (progress < state.buildProject.required) {
      return {
        ...state,
        buildProject: { ...state.buildProject, progress },
      };
    }
    const structures = addStructure(
      state.structures,
      state.buildProject.kind,
      state.buildProject.position,
      state.tick,
      state.structures.length,
    );
    return { ...state, structures, buildProject: null };
  }

  const existing = new Set(state.structures.map((s) => s.kind));
  const inv = clanInventoryTotal(state.npcs);
  const kind = BUILD_PRIORITY.find((k) => !existing.has(k));
  if (!kind) return state;
  const recipe = RECIPES[kind];
  if (!canBuild(recipe, inv)) return state;
  const npcs = consumeForRecipe(state.npcs, recipe);
  // Posición: el primer NPC vivo (determinista). La plaza real
  // del clan la decidiremos con diseño mejorado; por ahora el
  // asentamiento no tiene "centro" canónico.
  const anchor =
    state.npcs.find((n) => n.alive) ?? { position: { x: 0, y: 0 } };
  return {
    ...state,
    npcs,
    buildProject: {
      id: `bp-${kind}-${state.tick}`,
      kind,
      position: { ...anchor.position },
      startedAtTick: state.tick,
      progress: 0,
      required: recipe.daysWork * TICKS_PER_DAY,
    },
  };
}

export function nextBuildPriority(state: GameState): CraftableId | undefined {
  if (state.buildProject) return undefined;
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
    isReachable: makeNpcReachabilityChecker(state),
    items: state.items ?? [],
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
      { maxExpand: 2000, passable: isMovementPassable },
    );
    prng = r.next;
    if (!r.path || r.path.length < 2) {
      // Sin ruta o ya está — se queda quieto.
      newNPCs.push(npc);
      fog = markDiscovered(fog, npc.position.x, npc.position.y, npc.visionRadius);
      continue;
    }
    const nextStep = r.path[1];
    if (!canMoveThisTick(state, npc, nextStep)) {
      newNPCs.push(npc);
      fog = markDiscovered(fog, npc.position.x, npc.position.y, npc.visionRadius);
      continue;
    }
    const moved: NPC = { ...npc, position: { ...nextStep } };
    newNPCs.push(moved);
    fog = markDiscovered(fog, moved.position.x, moved.position.y, moved.visionRadius);
  }

  // Actualizar heatmap de influencia con posiciones post-movimiento.
  const nextInfluence = tickInfluence(
    state.world.influence,
    newNPCs,
    state.world.width,
    state.world.height,
  );
  const regen = tickResources(
    state.world.resources,
    state.tick + 1,
    nextInfluence,
    state.world.width,
  );
  // Recolección ANTES de tickNeeds para que el inventario post-harvest
  // pueda usarse en sprints siguientes. El estado "on-the-spot" de
  // needs también puede ver el mismo spawn antes de agotarse.
  const harvested = tickHarvests(newNPCs, regen, state.tick + 1);
  const nextWorld = { ...state.world, resources: harvested.resources, influence: nextInfluence };
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

  // ── Cultura material (Sprint 9) ───────────────────────────────────────────

  // Legado Divino — herramientas de prestige pasan al heredero cuando
  // el portador muere. Detectamos muertes comparando state.npcs vs afterBuild.
  let itemsAfterLegacy = afterBuild.items ?? [];
  let npcsAfterLegacy = afterBuild.npcs;
  for (const prev of state.npcs) {
    if (!prev.alive) continue;
    const cur = afterBuild.npcs.find((n) => n.id === prev.id);
    if (!cur || cur.alive) continue;
    // NPC murió este tick
    const equippedItem = prev.equippedItemId
      ? itemsAfterLegacy.find((i) => i.id === prev.equippedItemId)
      : null;
    if (equippedItem && equippedItem.prestige > 0) {
      const result = transferLegacyItem(
        cur,
        equippedItem,
        itemsAfterLegacy,
        npcsAfterLegacy,
      );
      itemsAfterLegacy = result.items;
      npcsAfterLegacy = result.npcs;
    }
  }

  // Detección de triggers de desbloqueo Eureka (primera herida / exceso wood).
  const clanInvForTrigger = clanInventoryTotal(npcsAfterLegacy);
  const newlyUnlocked = detectUnlockTrigger(state.npcs, npcsAfterLegacy, clanInvForTrigger);
  const unlockedSet = new Set([
    ...(afterBuild.unlockedItemKinds ?? []),
    ...newlyUnlocked,
  ]);

  // Item auto-craft — un item por tick, orden por ITEM_KIND. Similar al
  // auto-build de estructuras pero produce EquippableItem, no Structure.
  const existingKinds = new Set(itemsAfterLegacy.map((i) => i.kind));
  const itemCraftPriority = [
    ITEM_KIND.BASKET,
    ITEM_KIND.HAND_AXE,
    ITEM_KIND.SPEAR,
    ITEM_KIND.BONE_NEEDLE,
  ] as const;
  let npcsAfterItemCraft = npcsAfterLegacy;
  let itemsAfterItemCraft = itemsAfterLegacy;
  for (const kind of itemCraftPriority) {
    if (existingKinds.has(kind)) continue;
    if (!canAutoCraft(kind, unlockedSet)) continue;
    if (!canCraftItem(kind, npcsAfterItemCraft)) continue;
    const anchor = npcsAfterItemCraft.find((n) => n.alive) ?? null;
    const result = craftItem(
      kind,
      npcsAfterItemCraft,
      afterBuild.tick,
      anchor?.id ?? null,
    );
    // Equipar al craftero si no lleva ya herramienta
    const ownerIdx = anchor
      ? npcsAfterItemCraft.findIndex((n) => n.id === anchor.id)
      : -1;
    if (ownerIdx >= 0 && !npcsAfterItemCraft[ownerIdx].equippedItemId) {
      result.npcs[ownerIdx] = {
        ...result.npcs[ownerIdx],
        equippedItemId: result.item.id,
      };
    }
    itemsAfterItemCraft = [...itemsAfterItemCraft, result.item];
    npcsAfterItemCraft = result.npcs;
    break; // máximo un item por tick
  }

  // Eureka — NPCs en necesidad crítica pueden descubrir herramientas.
  // Se comprueba por NPC; máx 1 descubrimiento por tick global.
  const existingKindsAfterCraft = new Set(itemsAfterItemCraft.map((i) => i.kind));
  let npcsAfterEureka = npcsAfterItemCraft;
  let itemsAfterEureka = itemsAfterItemCraft;
  let eurekaFound = false;
  let eurekaPrng = afterBuild.prng;
  for (const npc of npcsAfterEureka) {
    if (!npc.alive || eurekaFound) continue;
    const clanInv = clanInventoryTotal(npcsAfterEureka);
    const eurekaCtx = {
      clanInventory: clanInv,
      existingItemKinds: existingKindsAfterCraft,
      currentTick: afterBuild.tick,
    };
    const eureka = checkEureka(npc, eurekaCtx, eurekaPrng);
    eurekaPrng = eureka.prng;
    if (eureka.discovered) {
      const eItem = craftItem(
        eureka.discovered,
        npcsAfterEureka,
        afterBuild.tick,
        npc.id,
        1,
      );
      const npcIdx = npcsAfterEureka.findIndex((n) => n.id === npc.id);
      if (npcIdx >= 0 && !npcsAfterEureka[npcIdx].equippedItemId) {
        eItem.npcs[npcIdx] = { ...eItem.npcs[npcIdx], equippedItemId: eItem.item.id };
      }
      itemsAfterEureka = [...itemsAfterEureka, eItem.item];
      npcsAfterEureka = eItem.npcs;
      existingKindsAfterCraft.add(eureka.discovered);
      eurekaFound = true;
    }
  }

  // Esclavo drain — supervivencia cae pasivamente (§3.2 castas).
  const npcsAfterCasta = applyEsclavoDrain(npcsAfterEureka);

  // Reproducción — pairing + nacimientos. PRNG explícito (§A4).
  const usedNames = new Set(afterBuild.npcs.map((n) => n.name));
  const repro = tickReproduction(
    npcsAfterCasta,
    afterBuild.tick,
    eurekaPrng,
    usedNames,
  );
  const npcsAfterRepro = repro.npcs;
  let prngAfterRepro = repro.prng;

  // Crónica y gratitud por nacimientos
  let chronicleAfterRepro = afterBuild.chronicle;
  let villageAfterRepro = nextVillage;
  for (const born of repro.newBorns) {
    const text = narrate({
      type: 'birth',
      childName: born.name,
      parents: born.parents as [string, string],
      tick: Math.floor(afterBuild.tick / TICKS_PER_DAY),
    });
    const entry: ChronicleEntry = {
      day: Math.floor(afterBuild.tick / TICKS_PER_DAY),
      tick: afterBuild.tick,
      text,
    };
    chronicleAfterRepro = [
      ...chronicleAfterRepro.slice(-(CHRONICLE_MAX - 1)),
      entry,
    ];
    villageAfterRepro = applyGratitudeFromEvent(
      villageAfterRepro,
      { type: 'birth', npcId: born.id, position: born.position },
      villageAfterRepro.activeMessage,
    );
  }
  // Fe pasiva (§3.7b) — sqrt(vivos) por día, distribuido por tick.
  const aliveCount = npcsAfterRepro.reduce(
    (n, npc) => n + (npc.alive ? 1 : 0),
    0,
  );
  nextVillage = applyFaithDelta(villageAfterRepro, faithPerTick(aliveCount));

  // Fe bonus de Elegidos vivos (Sprint 8 §3.2).
  const elegidoBonus = elegidoFaithBonusPerTick(npcsAfterRepro);
  if (elegidoBonus > 0) {
    nextVillage = applyFaithDelta(nextVillage, elegidoBonus);
  }

  // Gratitud legacy trickle (Sprint 5.3, rate 0.1 post Fase 5 #1).
  const gratitudeDelta = computeGratitudeTickDelta(
    npcsAfterRepro,
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
    npcsAfterRepro,
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
    npcs: npcsAfterRepro,
    prng: prngAfterRepro,
    chronicle: chronicleAfterRepro,
    items: itemsAfterEureka,
    unlockedItemKinds: Array.from(unlockedSet),
    relations: state.relations,
    village: nextVillage,
  };
}
