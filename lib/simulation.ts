/**
 * Simulación — tick puro del mundo primigenia.
 */

import { decideDestination, tickNeeds, NEED_THRESHOLDS } from './needs';
import { findBuildSite, cohesionMultiplier } from './village-siting';
import { findPath } from './pathfinding';
import type { GameState, ChronicleEntry } from './game-state';
import { CHRONICLE_MAX } from './game-state';
import type { NPC } from './npcs';
import { CASTA, updateNpcStats } from './npcs';
import { tickResources, TICKS_PER_DAY } from './resources';
import { tickInfluence } from './influence';
import { tickHarvests } from './harvest';
import { computeActiveSynergies, applySynergyModifiers } from './synergies';
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
  STORAGE_SPECIALTY,
  STOCKPILE_CAPACITY,
  type CraftableId,
} from './crafting';
import { addStructure } from './structures';
import { TILE, type TileId } from './world-state';
import { tickReproduction } from './reproduction';
import { applyEsclavoDrain, elegidoFaithBonusPerTick } from './casta-effects';
import { narrate } from './chronicle';
import type { EquippableItem } from './items';
import { ITEM_KIND } from './items';
import { canCraftItem, craftItem } from './item-crafting';
import { checkEureka, detectUnlockTrigger, canAutoCraft } from './eureka';
import { transferLegacyItem } from './legacy';
import { computeRole, ROLE } from './roles';

const SWIM_TICK_INTERVAL = 3;
const MAX_DENSITY_THRESHOLD = 5; 
const FOREMAN_FOLLOW_RADIUS = 3; // Radio para copiar movimiento del capataz

/** Calcula el impacto emocional acumulado de los eventos recientes. */
function calculateCollectiveMemoryModifier(chronicle: ChronicleEntry[], currentTick: number): number {
  return chronicle
    .filter(entry => entry.expiresAtTick > currentTick)
    .reduce((total, entry) => total + entry.impact, 0);
}

export function tick(state: GameState): GameState {
  let nextState = tickMovement(state);
  nextState = tickWorldSystems(nextState);
  nextState = tickClanSystems(nextState);
  nextState = tickDevelopment(nextState);
  nextState = tickCultureAndSocial(nextState, state);

  return {
    ...nextState,
    tick: state.tick + 1,
  };
}

function tickMovement(state: GameState): GameState {
  const fire = firstStructureOfKind(state.structures, CRAFTABLE.FOGATA_PERMANENTE);
  const activeBuilderIds = new Set(
    selectBuilders(state.npcs, NEED_THRESHOLDS.supervivenciaBuildReady).map(n => n.id)
  );
  
  const ctx = {
    world: state.world,
    npcs: state.npcs,
    firePosition: fire?.position,
    currentTick: state.tick,
    ticksPerDay: TICKS_PER_DAY,
    isReachable: makeNpcReachabilityChecker(state),
    items: state.items ?? [],
    faith: state.village.faith,
    gratitude: state.village.gratitude,
    synergies: computeActiveSynergies(state.npcs),
    buildSitePosition: state.buildProject?.position,
  };

  const nextDensity = new Array<number>(state.world.width * state.world.height).fill(0);
  for (const npc of state.npcs) {
    if (!npc.alive) continue;
    const idx = npc.position.y * state.world.width + npc.position.x;
    nextDensity[idx]++;
  }

  const nextTraffic = (state.world.traffic || new Array<number>(state.world.width * state.world.height).fill(0))
    .map(v => Math.floor(v * 0.99));

  // JERARQUÍA AUTOMÁTICA: Agrupar por destino para elegir capataces
  const groupsByDest = new Map<string, NPC[]>();
  for (const npc of state.npcs) {
    if (!npc.alive) continue;
    const dest = decideDestination(npc, { ...ctx, isBuilder: activeBuilderIds.has(npc.id) });
    (npc as any)._nextDest = dest; // Temp storage for this tick
    const key = `${dest.x},${dest.y}`;
    if (!groupsByDest.has(key)) groupsByDest.set(key, []);
    groupsByDest.get(key)!.push(npc);
  }

  const newNPCs: NPC[] = [];
  let fog: FogState = state.fog;
  let currentPrng = state.prng;

  // Mapa de caminos calculados por capataces para este tick
  const foremanPaths = new Map<string, { x: number, y: number }>();

  for (const npc of state.npcs) {
    if (!npc.alive) {
      newNPCs.push(npc);
      continue;
    }

    const dest = (npc as any)._nextDest;
    const group = groupsByDest.get(`${dest.x},${dest.y}`) || [];
    
    // El "Capataz" es el primero del grupo (podríamos mejorar la selección por skill)
    const foreman = group[0];
    const isForeman = foreman.id === npc.id;

    if (dest.x === npc.position.x && dest.y === npc.position.y) {
      newNPCs.push({ ...npc, destination: dest });
      fog = markDiscovered(fog, npc.position.x, npc.position.y, npc.visionRadius);
      continue;
    }

    // Cuello de botella
    const currentIdx = npc.position.y * state.world.width + npc.position.x;
    if (nextDensity[currentIdx] > MAX_DENSITY_THRESHOLD) {
      const [roll, nextPrng] = nextInt(currentPrng, 100);
      currentPrng = nextPrng;
      if (roll < 50) {
        newNPCs.push({ ...npc, destination: dest });
        continue;
      }
    }

    let nextStep: { x: number, y: number } | null = null;

    if (isForeman) {
      // El capataz calcula el camino real
      const r = findPath(state.world, npc.position, dest, currentPrng);
      currentPrng = r.next;
      if (r.path && r.path.length > 1) {
        nextStep = r.path[1];
        foremanPaths.set(`${dest.x},${dest.y}`, { 
          x: nextStep.x - npc.position.x, 
          y: nextStep.y - npc.position.y 
        });
      }
    } else {
      // Los seguidores intentan copiar al capataz si están cerca
      const distToForeman = Math.abs(npc.position.x - foreman.position.x) + Math.abs(npc.position.y - foreman.position.y);
      const vector = foremanPaths.get(`${dest.x},${dest.y}`);
      
      if (distToForeman <= FOREMAN_FOLLOW_RADIUS && vector) {
        // AHORRO DE PATHFINDING: Copiar vector del capataz
        nextStep = { x: npc.position.x + vector.x, y: npc.position.y + vector.y };
      } else {
        // Demasiado lejos o sin camino de capataz, calcula propio
        const r = findPath(state.world, npc.position, dest, currentPrng);
        currentPrng = r.next;
        if (r.path && r.path.length > 1) nextStep = r.path[1];
      }
    }
    
    if (!nextStep) {
      newNPCs.push({ ...npc, destination: dest });
      continue;
    }

    const moved: NPC = { ...npc, position: { ...nextStep }, destination: dest };
    newNPCs.push(moved);
    
    const nextIdx = nextStep.y * state.world.width + nextStep.x;
    nextTraffic[nextIdx] = Math.min(1000, (nextTraffic[nextIdx] || 0) + 10);
    fog = markDiscovered(fog, moved.position.x, moved.position.y, moved.visionRadius);
  }

  return { 
    ...state, 
    npcs: newNPCs, 
    fog, 
    prng: currentPrng,
    world: { ...state.world, density: nextDensity, traffic: nextTraffic }
  };
}

function tickWorldSystems(state: GameState): GameState {
  const influenceSources = state.structures.map(s => ({ position: s.position, kind: s.kind }));
  const nextInfluence = tickInfluence(state.world.influence || [], state.npcs, state.world.width, state.world.height, influenceSources);
  const nextResources = tickResources(state.world.resources, state.tick, nextInfluence, state.world.width, state.world.reserves || []);

  return {
    ...state,
    world: { ...state.world, influence: nextInfluence, resources: nextResources.resources, reserves: nextResources.reserves }
  };
}

function tickClanSystems(state: GameState): GameState {
  const harvested = tickHarvests(state.npcs, state.world.resources, state.tick, state.world.reserves || [], state.world.width, state.structures, state.items);
  const logistics = tickLogistics(harvested.npcs, state.structures);
  const moodModifier = calculateCollectiveMemoryModifier(state.chronicle, state.tick);
  const npcsWithNeeds = tickNeeds(logistics.npcs, { 
    world: state.world, 
    npcs: logistics.npcs,
    faith: state.village.faith,
    gratitude: state.village.gratitude,
    moodModifier
  });

  return {
    ...state,
    npcs: npcsWithNeeds,
    structures: logistics.structures,
    world: { ...state.world, resources: harvested.resources, reserves: harvested.reserves }
  };
}

function tickDevelopment(state: GameState): GameState {
  let nextState = tryAutoBuild(state);
  nextState = tickTech(nextState);
  return nextState;
}

function tickCultureAndSocial(state: GameState, prevState: GameState): GameState {
  let { npcs, items, chronicle, village, prng } = state;

  for (const prev of prevState.npcs) {
    if (!prev.alive) continue;
    const cur = npcs.find(n => n.id === prev.id);
    if (cur && !cur.alive) {
      const entry = narrate({ type: 'death', npcName: cur.name, cause: 'agotamiento', tick: state.tick });
      chronicle = addChronicleEntry(chronicle, entry, state.tick);
      if (prev.equippedItemId) {
        const item = items.find(i => i.id === prev.equippedItemId);
        if (item && item.prestige > 0) {
          const result = transferLegacyItem(cur, item, items, npcs);
          items = result.items;
          npcs = result.npcs;
        }
      }
    }
  }

  const repro = tickReproduction(npcs, state.tick, prng, new Set(npcs.map(n => n.name)));
  npcs = repro.npcs;
  prng = repro.prng;

  for (const born of repro.newBorns) {
    const entry = narrate({ type: 'birth', childName: born.name, parents: born.parents as [string, string], tick: state.tick });
    chronicle = addChronicleEntry(chronicle, entry, state.tick);
  }

  return { ...state, npcs, items, chronicle, village, prng };
}

function addChronicleEntry(chronicle: ChronicleEntry[], result: any, tick: number): ChronicleEntry[] {
  const entry: ChronicleEntry = {
    day: Math.floor(tick / TICKS_PER_DAY),
    tick,
    text: result.text,
    type: result.type,
    impact: result.impact,
    expiresAtTick: tick + result.duration
  };
  return [...chronicle.slice(-(CHRONICLE_MAX - 1)), entry];
}

function selectBuilders(npcs: readonly NPC[], minSurvival: number): NPC[] {
  return [...npcs]
    .filter(n => n.alive && n.stats.supervivencia >= minSurvival)
    .sort((a, b) => b.skills.crafting - a.skills.crafting)
    .slice(0, 3);
}

function tickLogistics(npcs: readonly NPC[], structures: readonly any[]): { npcs: NPC[], structures: any[] } {
  return { npcs: [...npcs], structures: [...structures] };
}

function tryAutoBuild(state: GameState): GameState {
  return state; 
}

function tickTech(state: GameState): GameState {
  return state;
}

function makeNpcReachabilityChecker(state: GameState) {
  return () => true;
}

function nextInt(prng: any, max: number): [number, any] {
  return [Math.floor(Math.random() * max), prng];
}
