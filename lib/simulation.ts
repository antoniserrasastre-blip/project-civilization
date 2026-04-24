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
import { firstStructureOfKind, addStructure, type Structure } from './structures';
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
import { TILE, type TileId } from './world-state';
import { tickReproduction } from './reproduction';
import { applyEsclavoDrain, elegidoFaithBonusPerTick } from './casta-effects';
import { narrate } from './chronicle';
import type { EquippableItem } from './items';
import { transferLegacyItem } from './legacy';
import { computeRole } from './roles';
import { nextInt } from './prng';

const SWIM_TICK_INTERVAL = 3;
const MAX_DENSITY_THRESHOLD = 5; 
const FOREMAN_FOLLOW_RADIUS = 3;
const STRUCTURE_LIFESPAN = 10 * TICKS_PER_DAY;

const BUILD_PRIORITY: CraftableId[] = [
  CRAFTABLE.FOGATA_PERMANENTE,
  CRAFTABLE.REFUGIO,
  CRAFTABLE.DESPENSA,
];

export function nextBuildPriority(state: GameState): CraftableId | undefined {
  if (state.buildProject) return undefined;
  const existing = new Set(state.structures.map((s) => s.kind));
  for (const kind of BUILD_PRIORITY) {
    if (!existing.has(kind)) return kind;
  }
  return undefined;
}

function isMovementPassable(tile: TileId): boolean {
  return tile !== TILE.WATER;
}

const REACHABILITY_BFS_LIMIT = 25000;

function reachableTilesByNpcMovement(state: GameState, from: { x: number; y: number }): Set<number> {
  const { world } = state;
  const start = from.y * world.width + from.x;
  const seen = new Set<number>();
  if (from.x < 0 || from.y < 0 || from.x >= world.width || from.y >= world.height || !isMovementPassable(world.tiles[start] as TileId)) return seen;
  const queue: number[] = [start];
  let head = 0; seen.add(start);
  while (head < queue.length && seen.size < REACHABILITY_BFS_LIMIT) {
    const cur = queue[head++];
    const x = cur % world.width; const y = Math.floor(cur / world.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx; const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
      const idx = ny * world.width + nx;
      if (seen.has(idx) || !isMovementPassable(world.tiles[idx] as TileId)) continue;
      seen.add(idx); queue.push(idx);
    }
  }
  return seen;
}

export function makeNpcReachabilityChecker(state: GameState): (from: { x: number; y: number }, to: { x: number; y: number }) => boolean {
  const cache = new Map<string, Set<number>>();
  return (from, to) => {
    const key = `${from.x},${from.y}`;
    let reachable = cache.get(key);
    if (!reachable) { reachable = reachableTilesByNpcMovement(state, from); cache.set(key, reachable); }
    return reachable.has(to.y * state.world.width + to.x);
  };
}

export function tick(state: GameState): GameState {
  let nextState = tickMovement(state);
  nextState = tickWorldSystems(nextState);
  nextState = tickClanSystems(nextState);
  nextState = tickDevelopment(nextState);
  nextState = tickCultureAndSocial(nextState, state);
  return { ...nextState, tick: state.tick + 1 };
}

function tickMovement(state: GameState): GameState {
  const fire = firstStructureOfKind(state.structures, CRAFTABLE.FOGATA_PERMANENTE);
  const buildPrio = nextBuildPriority(state);
  const activeBuilderIds = new Set(selectBuilders(state.npcs, NEED_THRESHOLDS.supervivenciaBuildReady).map(n => n.id));
  
  let currentPrng = state.prng;
  const nextTraffic = (state.world.traffic || new Array<number>(state.world.width * state.world.height).fill(0)).map(v => Math.floor(v * 0.99));
  const groupsByDest = new Map<string, NPC[]>();
  
  for (const npc of state.npcs) {
    if (!npc.alive) continue;
    const ctx = {
      world: state.world, npcs: state.npcs, firePosition: fire?.position,
      currentTick: state.tick, ticksPerDay: TICKS_PER_DAY,
      isReachable: makeNpcReachabilityChecker(state), items: state.items ?? [],
      faith: state.village.faith, gratitude: state.village.gratitude,
      synergies: computeActiveSynergies(state.npcs), buildSitePosition: state.buildProject?.position,
      nextBuildPriority: buildPrio, prng: currentPrng
    };
    const decision = decideDestination(npc, { ...ctx, isBuilder: activeBuilderIds.has(npc.id) });
    (npc as any)._nextDest = decision.position;
    currentPrng = decision.next; 
    const key = `${decision.position.x},${decision.position.y}`;
    if (!groupsByDest.has(key)) groupsByDest.set(key, []);
    groupsByDest.get(key)!.push(npc);
  }

  const newNPCs: NPC[] = [];
  let fog: FogState = state.fog;
  const foremanPaths = new Map<string, { x: number, y: number }>();

  for (const npc of state.npcs) {
    if (!npc.alive) { newNPCs.push(npc); continue; }
    const dest = (npc as any)._nextDest;
    const foreman = (groupsByDest.get(`${dest.x},${dest.y}`) || [])[0];
    const isForeman = foreman.id === npc.id;

    if (dest.x === npc.position.x && dest.y === npc.position.y) {
      newNPCs.push({ ...npc, destination: dest });
      fog = markDiscovered(fog, npc.position.x, npc.position.y, npc.visionRadius);
      continue;
    }

    let nextStep: { x: number, y: number } | null = null;
    if (isForeman) {
      const r = findPath(state.world, npc.position, dest, currentPrng);
      currentPrng = r.next;
      if (r.path && r.path.length > 1) {
        nextStep = r.path[1];
        foremanPaths.set(`${dest.x},${dest.y}`, { x: nextStep.x - npc.position.x, y: nextStep.y - npc.position.y });
      }
    } else {
      const distToForeman = Math.abs(npc.position.x - foreman.position.x) + Math.abs(npc.position.y - foreman.position.y);
      const vector = foremanPaths.get(`${dest.x},${dest.y}`);
      if (distToForeman <= FOREMAN_FOLLOW_RADIUS && vector) nextStep = { x: npc.position.x + vector.x, y: npc.position.y + vector.y };
      else {
        const r = findPath(state.world, npc.position, dest, currentPrng);
        currentPrng = r.next;
        if (r.path && r.path.length > 1) nextStep = r.path[1];
      }
    }
    
    if (!nextStep) { newNPCs.push({ ...npc, destination: dest }); continue; }
    const moved: NPC = { ...npc, position: { ...nextStep }, destination: dest };
    newNPCs.push(moved);
    const nextIdx = nextStep.y * state.world.width + nextStep.x;
    nextTraffic[nextIdx] = Math.min(1000, (nextTraffic[nextIdx] || 0) + 10);
    fog = markDiscovered(fog, moved.position.x, moved.position.y, moved.visionRadius);
  }

  return { ...state, npcs: newNPCs, fog, prng: currentPrng, world: { ...state.world, traffic: nextTraffic } };
}

function tickWorldSystems(state: GameState): GameState {
  const influenceSources = state.structures.map(s => ({ position: s.position, kind: s.kind }));
  const nextInfluence = tickInfluence(state.world.influence || [], state.npcs, state.world.width, state.world.height, influenceSources);
  const nextResources = tickResources(state.world.resources, state.tick, nextInfluence, state.world.width, state.world.reserves || []);
  return { ...state, world: { ...state.world, influence: nextInfluence, resources: nextResources.resources, reserves: nextResources.reserves } };
}

function tickInfrastructureDecay(state: GameState): { structures: Structure[], chronicle: ChronicleEntry[] } {
  let structures = state.structures.map(s => ({ ...s, inventory: s.inventory ? { ...s.inventory } : {} }));
  let chronicle = [...state.chronicle];
  let currentPrng = state.prng;

  const nextStructures = [];
  for (const s of structures) {
    const age = state.tick - s.builtAtTick;
    if (age < STRUCTURE_LIFESPAN) {
      nextStructures.push(s);
      continue;
    }

    if (s.kind === CRAFTABLE.DESPENSA) {
      const { value: roll, next: nextP } = nextInt(currentPrng, 0, 100);
      currentPrng = nextP;
      if (roll < 5) { 
        const foods: (keyof NPCInventory)[] = ['berry', 'fish', 'game'];
        const food = foods[roll % 3];
        if (s.inventory[food] && s.inventory[food]! > 0) s.inventory[food]!--;
      }
    }

    const { value: collapseRoll, next: nextP2 } = nextInt(currentPrng, 0, 20000); // Vida extendida si se repara
    currentPrng = nextP2;
    if (collapseRoll === 0) {
      chronicle = [...chronicle.slice(-(CHRONICLE_MAX - 1)), { 
        day: Math.floor(state.tick / TICKS_PER_DAY), 
        tick: state.tick, 
        text: `Día ${Math.floor(state.tick / TICKS_PER_DAY)}: Una estructura de ${s.kind} ha colapsado por vejez.`,
        type: 'system', impact: -10, expiresAtTick: state.tick + TICKS_PER_DAY
      }];
      continue; 
    }
    nextStructures.push(s);
  }
  return { structures: nextStructures, chronicle };
}

function tickClanSystems(state: GameState): GameState {
  const harvested = tickHarvests(state.npcs, state.world.resources, state.tick, state.world.reserves || [], state.world.width, state.structures, state.items);
  const logistics = tickLogistics(harvested.npcs, state.structures);
  const traditions = { ...(state.world.traditions || {}) };
  for (const npc of state.npcs) { if (npc.alive) { const role = computeRole(npc, null); traditions[role] = (traditions[role] || 0) + 1; } }

  const { structures: decayedStructures, chronicle: nextChronicle } = tickInfrastructureDecay({ ...state, structures: logistics.structures });
  const moodModifier = calculateCollectiveMemoryModifier(nextChronicle, state.tick);
  const npcsWithNeeds = tickNeeds(logistics.npcs, { 
    world: state.world, npcs: logistics.npcs,
    faith: state.village.faith, gratitude: state.village.gratitude,
    moodModifier, prng: state.prng, currentTick: state.tick, ticksPerDay: TICKS_PER_DAY, synergies: []
  });

  return {
    ...state, npcs: npcsWithNeeds, structures: decayedStructures, chronicle: nextChronicle,
    world: { ...state.world, resources: harvested.resources, reserves: harvested.reserves, traditions }
  };
}

function tickDevelopment(state: GameState): GameState {
  return tryAutoBuild(state);
}

function tickCultureAndSocial(state: GameState, prevState: GameState): GameState {
  let { npcs, items, chronicle, village, prng, world } = state;
  const nextTags = { ...(world.terrainTags || {}) };
  for (const prev of prevState.npcs) {
    if (!prev.alive) continue;
    const cur = npcs.find(n => n.id === prev.id);
    if (cur && !cur.alive) {
      const entry = narrate({ type: 'death', npcName: cur.name, cause: 'agotamiento', tick: state.tick });
      chronicle = addChronicleEntry(chronicle, entry, state.tick);
      const posKey = `${cur.position.x},${cur.position.y}`;
      if (!nextTags[posKey]) nextTags[posKey] = [];
      nextTags[posKey].push('maldita');
      if (prev.equippedItemId) {
        const item = items.find(i => i.id === prev.equippedItemId);
        if (item && item.prestige > 0) {
          const result = transferLegacyItem(cur, item, items, npcs);
          items = result.items; npcs = result.npcs;
        }
      }
    }
  }
  const repro = tickReproduction(npcs, state.tick, prng, new Set(npcs.map(n => n.name)), world.traditions);
  npcs = repro.npcs; prng = repro.prng;
  for (const born of repro.newBorns) {
    const entry = narrate({ type: 'birth', childName: born.name, parents: born.parents as [string, string], tick: state.tick });
    chronicle = addChronicleEntry(chronicle, entry, state.tick);
  }
  return { ...state, npcs, items, chronicle, village, prng, world: { ...world, terrainTags: nextTags } };
}

function addChronicleEntry(chronicle: ChronicleEntry[], result: any, tick: number): ChronicleEntry[] {
  const entry: ChronicleEntry = {
    day: Math.floor(tick / TICKS_PER_DAY), tick, text: result.text,
    type: result.type, impact: result.impact, expiresAtTick: tick + result.duration
  };
  return [...chronicle.slice(-(CHRONICLE_MAX - 1)), entry];
}

function selectBuilders(npcs: readonly NPC[], minSurvival: number): NPC[] {
  return [...npcs].filter(n => n.alive && n.stats.supervivencia >= minSurvival).sort((a, b) => b.skills.crafting - a.skills.crafting).slice(0, 3);
}

function tickLogistics(npcs: readonly NPC[], structures: readonly any[]): { npcs: NPC[], structures: any[] } {
  const outNpcs = npcs.map((n) => ({ ...n, inventory: { ...n.inventory } }));
  const outStructures = [...structures].map((s) => ({ ...s, inventory: s.inventory ? { ...s.inventory } : {} }));
  for (const n of outNpcs) {
    if (!n.alive) continue;
    const s = outStructures.find((s) => s.position.x === n.position.x && s.position.y === n.position.y);
    if (!s) continue;
    const specialty = STORAGE_SPECIALTY[s.kind] ?? [];
    for (const key of specialty) {
      const amount = n.inventory[key]; if (amount <= 0) continue;
      const current = s.inventory![key] || 0;
      const space = STOCKPILE_CAPACITY - current;
      const transfer = Math.min(amount, space);
      if (transfer > 0) { n.inventory[key] -= transfer; s.inventory![key] = current + transfer; }
    }
  }
  return { npcs: outNpcs, structures: outStructures };
}

function tryAutoBuild(state: GameState): GameState {
  if (state.buildProject) {
    const activeBuilders = selectBuilders(state.npcs, NEED_THRESHOLDS.supervivenciaBuildReady);
    const mult = cohesionMultiplier(state.buildProject.position, state.structures);
    const progress = state.buildProject.progress + Math.round(activeBuilders.length * mult);
    const builderIds = new Set(activeBuilders.map((b) => b.id));
    const nextNpcs = state.npcs.map((n) => builderIds.has(n.id) ? updateNpcStats(n, { proposito: (n.stats.proposito ?? 100) - 5 }) : n);

    if (progress < state.buildProject.required) return { ...state, npcs: nextNpcs, buildProject: { ...state.buildProject, progress } };

    // AL FINALIZAR: ¿Es una reparación o construcción nueva?
    if (state.buildProject.targetStructureId) {
      const structures = state.structures.map(s => 
        s.id === state.buildProject!.targetStructureId ? { ...s, builtAtTick: state.tick } : s
      );
      return { ...state, npcs: nextNpcs, structures, buildProject: null };
    }

    const structures = addStructure(state.structures, state.buildProject.kind, state.buildProject.position, state.tick, state.structures.length);
    return { ...state, npcs: nextNpcs, structures, buildProject: null };
  }

  // LÓGICA DE SELECCIÓN: 1. Reparaciones prioritarias
  const decaying = state.structures.find(s => (state.tick - s.builtAtTick) > STRUCTURE_LIFESPAN);
  if (decaying) {
    const recipe = RECIPES[decaying.kind];
    const repairInputs: any = {};
    for (const [k, v] of Object.entries(recipe.inputs)) repairInputs[k] = Math.ceil((v as number) * 0.5);
    const repairRecipe = { ...recipe, inputs: repairInputs, daysWork: Math.ceil(recipe.daysWork * 0.5) };

    const inv = clanInventoryTotal(state.npcs, state.structures);
    if (canBuild(repairRecipe, inv)) {
      const { npcs, structures } = consumeForRecipe(state.npcs, repairRecipe, state.structures);
      return { ...state, npcs, structures, buildProject: { 
        id: `repair-${decaying.id}-${state.tick}`, kind: decaying.kind, position: decaying.position, 
        startedAtTick: state.tick, progress: 0, required: repairRecipe.daysWork * TICKS_PER_DAY,
        targetStructureId: decaying.id
      }};
    }
  }

  // 2. Construcciones nuevas
  const existing = new Set(state.structures.map((s) => s.kind));
  const inv = clanInventoryTotal(state.npcs, state.structures);
  const kind = BUILD_PRIORITY.find((k) => !existing.has(k));
  if (!kind) return state;
  const recipe = RECIPES[kind];
  if (!canBuild(recipe, inv)) return state;
  const { npcs, structures } = consumeForRecipe(state.npcs, recipe, state.structures);
  const anchorNpc = state.npcs.find((n) => n.alive) ?? { position: { x: 0, y: 0 } };
  const buildPos = findBuildSite(state.world, structures, kind, anchorNpc.position);
  return { ...state, npcs, structures, buildProject: { id: `bp-${kind}-${state.tick}`, kind, position: { ...buildPos }, startedAtTick: state.tick, progress: 0, required: recipe.daysWork * TICKS_PER_DAY } };
}

function calculateCollectiveMemoryModifier(chronicle: ChronicleEntry[], currentTick: number): number {
  return chronicle.filter(entry => entry.expiresAtTick > currentTick).reduce((total, entry) => total + entry.impact, 0);
}
