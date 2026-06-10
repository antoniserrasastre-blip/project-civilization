/**
 * Motor de Eventos (Semillas de Caos) — Fase 4.0.
 */

import type { ChronicleEntry, GameState } from './game-state';
import type { NPC } from './npcs';
import { CASTA, SEX, LINAJE, VOCATION, makePurifiedGenes, updateNpcStats } from './npcs';
import { nextInt, type PRNGState } from './prng';
import { TILE } from './world-state';
import { narrate } from './chronicle';
import { TICKS_PER_DAY } from './resources';
import { CRAFTABLE, clanInventoryTotal } from './crafting';
import { firstStructureOfKind, type Structure , type BuildProject } from './structures';
import type { MonumentState } from './monument';
import { SEASON } from './climate';
import { MESSAGE_INTENTS } from './messages';
import { MIRACLE } from './miracles';
import { NEED_THRESHOLDS } from './needs';
import { penalizeElegidoDeath, applyGratitudeFromEvent, type GratitudeEvent } from './gratitude';

export interface EventResult {
  state: GameState;
  triggered: boolean;
}

/** Tipos de fractura para Fricción Divina (Semillas de Caos extendidas, §A4 puro). */
export type FractureType =
  | 'hunger_cascade'
  | 'social_conflict'
  | 'cold_exposure'
  | 'spiritual_defeat'
  | 'resource_pressure'
  | 'fear_panic'
  | 'build_collapse';

export interface Fracture {
  type: FractureType;
  day: number;
  tick: number;
  mitigated: boolean;
  impact: number; // for chronicle ref
}

/**
 * Procesa la posibilidad de eventos aleatorios en el mundo.
 */
export function tickEvents(state: GameState): EventResult {
  let currentPrng = state.prng;
  
  // 1. MIGRACIÓN FRONTERIZA (Probabilidad 0.05% por tick)
  const { value: roll, next: nextP } = nextInt(currentPrng, 0, 2000);
  currentPrng = nextP;

  if (roll === 0) {
    return { state: triggerMigration(state, currentPrng), triggered: true };
  }

  return { state: { ...state, prng: currentPrng }, triggered: false };
}

/**
 * Añade entre 2 y 4 NPCs en un borde aleatorio del mapa (siempre en tierra).
 */
function triggerMigration(state: GameState, prng: PRNGState): GameState {
  const { width, height, tiles } = state.world;
  let currentPrng = prng;
  
  const { value: count, next: nextP } = nextInt(currentPrng, 2, 5); // 2 a 4 personas
  currentPrng = nextP;

  const newNPCs: NPC[] = [];
  const borders = ['N', 'S', 'E', 'W'];
  const { value: side, next: nextP2 } = nextInt(currentPrng, 0, 4);
  currentPrng = nextP2;

  const sideChar = borders[side];
  let attempts = 0;
  
  while (newNPCs.length < count && attempts < 100) {
    attempts++;
    let x = 0, y = 0;
    if (sideChar === 'N') { const r = nextInt(currentPrng, 0, width); x = r.value; y = 0; currentPrng = r.next; }
    else if (sideChar === 'S') { const r = nextInt(currentPrng, 0, width); x = r.value; y = height - 1; currentPrng = r.next; }
    else if (sideChar === 'E') { const r = nextInt(currentPrng, 0, height); x = width - 1; y = r.value; currentPrng = r.next; }
    else if (sideChar === 'W') { const r = nextInt(currentPrng, 0, height); x = 0; y = r.value; currentPrng = r.next; }

    const tile = tiles[y * width + x];
    if (tile !== TILE.WATER && tile !== TILE.SHALLOW_WATER) {
      const id = `migrant-${state.tick}-${newNPCs.length}`;
      const migrantAttributes = { strength: 50, dexterity: 50, wisdom: 50 };
      const migrantLinaje = LINAJE.TRAMUNTANA;
      newNPCs.push({
        id, name: `Migrante ${id.split('-')[2]}`, alive: true,
        position: { x, y },
        sex: SEX.M,
        casta: CASTA.CIUDADANO,
        linaje: migrantLinaje,
        vocation: VOCATION.CIUDADANO,
        attributes: migrantAttributes,
        genes: makePurifiedGenes(migrantAttributes, migrantLinaje),
        archetype: null,
        stats: { supervivencia: 80, socializacion: 50, proposito: 80, miedo: 20 },
        skills: { hunting: 15, gathering: 15, crafting: 10, fishing: 10, healing: 5, exploration: 10 },
        visionRadius: 6,
        parents: null,
        traits: [],
        birthTick: state.tick,
        inventory: { wood: 0, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0, clay: 0, coconut: 0, flint: 0, mushroom: 0 },
        equippedItemId: null,
        lastReproducedTick: null,
      });
    }
  }

  if (newNPCs.length > 0) {
    const chronicle = [...state.chronicle];
    const entry = {
      day: Math.floor(state.tick / 480), tick: state.tick,
      text: `Día ${Math.floor(state.tick / 480)}: Un grupo de ${newNPCs.length} migrantes ha llegado desde el ${sideChar === 'N' ? 'Norte' : sideChar === 'S' ? 'Sur' : sideChar === 'E' ? 'Este' : 'Oeste'}.`,
      type: 'system' as const, impact: 15, expiresAtTick: state.tick + 480 * 2
    };
    return { ...state, npcs: [...state.npcs, ...newNPCs], chronicle: [...chronicle, entry], prng: currentPrng };
  }

  return { ...state, prng: currentPrng };
}

/* =========================================================
 * Fricción Divina — tickFractures (extensión Semillas de Caos)
 * Pure `state -> {state, fractures}` per §A4, spec, crisis report.
 * Dawn-only logic (caller guards), consec updates before checks,
 * stable id/pos tie-breaks, updateNpcStats, narrate for deaths,
 * direct chronicle partisana, mitigation via activeMessage + MIRACLE traits,
 * integers only, no mut, prng unused (det by state), reuses existing pure.
 * ========================================================= */

function computeDay(tick: number): number {
  return Math.floor(tick / TICKS_PER_DAY);
}

function makeChronicleEntry(
  tick: number,
  text: string,
  type: ChronicleEntry['type'],
  impact: number,
  durationDays: number = 2,
): ChronicleEntry {
  const day = computeDay(tick);
  return {
    day,
    tick,
    text,
    type,
    impact,
    expiresAtTick: tick + TICKS_PER_DAY * durationDays,
  };
}

/** Stable sort by id for determinism (never insertion order). */
function sortById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Stable sort by (x, y, id) for position-based selection (A* spirit). */
function sortByPosId<T extends { position: { x: number; y: number }; id: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort((a, b) => {
    if (a.position.x !== b.position.x) return a.position.x - b.position.x;
    if (a.position.y !== b.position.y) return a.position.y - b.position.y;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/** Sum food for hunger (berry+game+fish) from clan total. */
function getFoodTotal(npcs: readonly NPC[], structures: readonly Structure[]): number {
  const inv = clanInventoryTotal(npcs, structures);
  return (inv.berry || 0) + (inv.game || 0) + (inv.fish || 0);
}

/** Check + apply one pure fracture; returns updated state + whether triggered + fracture diag. */
function checkHungerCascade(state: GameState): { state: GameState; triggered: boolean; fracture?: Fracture } {
  const tick = state.tick;
  const v = state.village;
  const alive = state.npcs.filter((n) => n.alive);
  if (alive.length === 0) return { state, triggered: false };

  const food = getFoodTotal(state.npcs, state.structures);
  const escapes = v.dailyHungerEscapes || 0;
  const prevConsec = v.consecutiveHungerDays ?? 0;
  // Hambre REAL del día que cierra (datos pre-reset del caller): despensa
  // vacía, hubo escapes de hambre (alguien cayó a zona crítica y se salvó),
  // o hay NPCs vivos en zona crítica de supervivencia ahora mismo.
  // Un día sano resetea la racha; así una aldea con comida de sobra nunca
  // acumula `consecutiveHungerDays` ni re-dispara tras una cascada mitigada.
  const criticalNow = alive.some(
    (n) => n.stats.supervivencia < NEED_THRESHOLDS.supervivenciaCritical,
  );
  const hungerToday = food <= 0 || escapes > 0 || criticalNow;
  const newConsec = hungerToday ? prevConsec + 1 : 0;
  let village = { ...v, consecutiveHungerDays: newConsec };

  const trigger = food <= 0 || newConsec >= 10;
  if (!trigger) {
    return { state: { ...state, village }, triggered: false };
  }

  // mitigation?
  const active = v.activeMessage;
  const hasHambreSagrada = alive.some((n) =>
    n.traits.includes(MIRACLE.HAMBRE_SAGRADA),
  );
  const mitigated = active === MESSAGE_INTENTS.AUXILIO || hasHambreSagrada;

  let npcs = state.npcs;
  let chronicle = [...state.chronicle];
  const day = computeDay(tick);

  if (mitigated) {
    // reduced effect: smaller/no decay, recovery chron, +gratitude if whisper
    // small recovery bump on lowest sv
    const sorted = sortById(alive);
    for (let i = 0; i < Math.min(2, sorted.length); i++) {
      const n = sorted[i];
      const idx = npcs.findIndex((p) => p.id === n.id);
      if (idx >= 0) {
        npcs = npcs.map((p, j) =>
          j === idx
            ? updateNpcStats(p, { supervivencia: p.stats.supervivencia + 2 })
            : p,
        );
      }
    }
    const recText = `Día ${day}: Los nuestros resistieron el hambre gracias al Auxilio. La despensa y el reparto sagrado sostuvieron a los hijos de Tramuntana.`;
    chronicle = [...chronicle, makeChronicleEntry(tick, recText, 'system', 8, 2)];
    if (active === MESSAGE_INTENTS.AUXILIO) {
      const ev: GratitudeEvent = { type: 'hunger_escape', npcId: 'global-hunger-mit' };
      village = applyGratitudeFromEvent(village, ev, active);
    }
  } else {
    // bad: sv-8 on first low sv (sorted id), deaths if <=0 , terrain maldita, dailyDeaths, penalize
    const sorted = sortById(alive);
    const affected = sorted.filter((n) => n.stats.supervivencia < 60).slice(0, 5); // up to 5
    const toAffect = affected.length > 0 ? affected : sorted.slice(0, 3);
    const nextNpcs: NPC[] = [...npcs];
    const terrainTags: Record<string, string[]> = { ...(state.world.terrainTags || {}) };
    for (const n of toAffect) {
      const idx = nextNpcs.findIndex((p) => p.id === n.id);
      if (idx < 0) continue;
      const updated = updateNpcStats(nextNpcs[idx], {
        supervivencia: nextNpcs[idx].stats.supervivencia - 8,
        proposito: Math.max(0, (nextNpcs[idx].stats.proposito ?? 100) - 2),
      });
      if (updated.stats.supervivencia <= 0) {
        const dead: NPC = { ...updated, alive: false };
        nextNpcs[idx] = dead;
        const posKey = `${dead.position.x},${dead.position.y}`;
        // inmutable: nunca push sobre el array del estado de entrada (§A4)
        if (!(terrainTags[posKey] ?? []).includes('maldita')) {
          terrainTags[posKey] = [...(terrainTags[posKey] ?? []), 'maldita'];
        }
        const cause = 'agotamiento por hambre';
        const entry = narrate({ type: 'death', npcName: dead.name, cause, tick });
        chronicle = [...chronicle, makeChronicleEntry(tick, entry, 'death', -30, 3)];
        village = { ...village, dailyDeaths: (village.dailyDeaths || 0) + 1 };
        if (dead.casta === CASTA.ELEGIDO) {
          village = penalizeElegidoDeath(village);
        }
      } else {
        nextNpcs[idx] = updated;
      }
    }
    const badText = `Día ${day}: Los nuestros sufrieron la cascada de hambre. La despensa vacía devoró fuerzas durante días.`;
    chronicle = [...chronicle, makeChronicleEntry(tick, badText, 'system', -15, 3)];
    npcs = nextNpcs;
    // update world tags immut
    const world = { ...state.world, terrainTags };
    return {
      state: { ...state, npcs, chronicle, village, world },
      triggered: true,
      fracture: { type: 'hunger_cascade' as const, day, tick, mitigated: false, impact: -15 },
    };
  }

  return {
    state: { ...state, npcs, chronicle, village },
    triggered: true,
    fracture: { type: 'hunger_cascade' as const, day, tick, mitigated: true, impact: 8 },
  };
}

function checkSocialColapso(state: GameState): { state: GameState; triggered: boolean; fracture?: Fracture } {
  const tick = state.tick;
  const v = state.village;
  const alive = state.npcs.filter((n) => n.alive);
  if (alive.length === 0) return { state, triggered: false };

  const socialSum = alive.reduce((s, n) => s + n.stats.socializacion, 0);
  const avgSocial = alive.length ? Math.floor(socialSum / alive.length) : 100;
  const prevConsec = v.consecutiveLowSocialDays ?? 0;
  const newConsec = avgSocial < 20 ? prevConsec + 1 : 0;
  let village = { ...v, consecutiveLowSocialDays: newConsec };

  // Un "conflicto interno" necesita al menos dos vivos: un NPC solitario
  // con socialización baja no puede pelearse consigo mismo.
  // Sprint 03: el conflicto fatal NO es instantáneo — requiere 3 amaneceres
  // consecutivos de tensión (media < 20). La crisis avisa antes de matar.
  const trigger = (newConsec >= 3 || prevConsec >= 30) && alive.length >= 2;
  if (!trigger) {
    return { state: { ...state, village }, triggered: false };
  }

  const active = v.activeMessage;
  const mitigated = active === MESSAGE_INTENTS.PACIENCIA || active === MESSAGE_INTENTS.ENCUENTRO;

  let npcs = state.npcs;
  let chronicle = [...state.chronicle];
  const day = computeDay(tick);

  if (mitigated) {
    // +social to all, no death, reset consec, recovery chron
    const nextNpcs = npcs.map((n) =>
      n.alive
        ? updateNpcStats(n, { socializacion: n.stats.socializacion + 2 })
        : n,
    );
    village = { ...village, consecutiveLowSocialDays: 0 };
    const recText = `Día ${day}: Paciencia prevaleció. Los nuestros negociaron y repararon lazos; el conflicto interno se aplacó.`;
    chronicle = [...chronicle, makeChronicleEntry(tick, recText, 'system', 10, 2)];
    if (active) {
      const ev: GratitudeEvent = { type: 'day_social', npcId: 'global-social' };
      village = applyGratitudeFromEvent(village, ev, active);
    }
    return {
      state: { ...state, npcs: nextNpcs, chronicle, village },
      triggered: true,
      fracture: { type: 'social_conflict' as const, day, tick, mitigated: true, impact: 10 },
    };
  }

  // failure: 1 death (lowest id non-elegido prefer, else lowest), nearby social-5, dailyDeath+penal, chron death
  let candidates = sortByPosId(alive);
  // prefer non-elegido
  const nonEleg = candidates.filter((n) => n.casta !== CASTA.ELEGIDO);
  const victimPool = nonEleg.length > 0 ? nonEleg : candidates;
  const victim = victimPool[0]; // first after stable id sort
  const idx = npcs.findIndex((p) => p.id === victim.id);
  if (idx < 0) return { state: { ...state, village }, triggered: false };

  const updated = updateNpcStats(npcs[idx], {
    socializacion: Math.max(0, npcs[idx].stats.socializacion - 5),
  });
  const dead: NPC = { ...updated, alive: false };
  const nextNpcs = npcs.map((p, j) => (j === idx ? dead : p));

  // nearby <=3 manh manhattan social -5
  const pos = dead.position;
  const nextNpcs2 = nextNpcs.map((n) => {
    if (!n.alive || n.id === dead.id) return n;
    const dist = Math.abs(n.position.x - pos.x) + Math.abs(n.position.y - pos.y);
    if (dist <= 3) {
      return updateNpcStats(n, { socializacion: Math.max(0, n.stats.socializacion - 5) });
    }
    return n;
  });

  const posKey = `${pos.x},${pos.y}`;
  // inmutable: nunca push sobre el array del estado de entrada (§A4)
  const terrainTags: Record<string, string[]> = { ...(state.world.terrainTags || {}) };
  if (!(terrainTags[posKey] ?? []).includes('maldita')) {
    terrainTags[posKey] = [...(terrainTags[posKey] ?? []), 'maldita'];
  }

  const deathText = narrate({ type: 'death', npcName: dead.name, cause: 'conflicto interno', tick });
  chronicle = [...chronicle, makeChronicleEntry(tick, deathText, 'death', -25, 3)];

  village = { ...village, dailyDeaths: (village.dailyDeaths || 0) + 1 };
  if (dead.casta === CASTA.ELEGIDO) {
    village = penalizeElegidoDeath(village);
  }

  // proposito -3 on some witnesses
  const witnesses = sortById(alive.filter((n) => n.id !== dead.id)).slice(0, 3);
  let finalNpcs = nextNpcs2;
  for (const w of witnesses) {
    const wIdx = finalNpcs.findIndex((p) => p.id === w.id);
    if (wIdx >= 0) {
      finalNpcs = finalNpcs.map((p, j) =>
        j === wIdx ? updateNpcStats(p, { proposito: Math.max(0, p.stats.proposito - 3) }) : p,
      );
    }
  }

  const badText = `Día ${day}: Conflicto fatal interno. La media social <20 durante 30 días rompió a los nuestros.`;
  chronicle = [...chronicle, makeChronicleEntry(tick, badText, 'system', -25, 4)];

  const world = { ...state.world, terrainTags };
  return {
    state: { ...state, npcs: finalNpcs, chronicle, village, world },
    triggered: true,
    fracture: { type: 'social_conflict' as const, day, tick, mitigated: false, impact: -25 },
  };
}

function checkColdWinter(state: GameState): { state: GameState; triggered: boolean; fracture?: Fracture } {
  const tick = state.tick;
  const v = state.village;
  const alive = state.npcs.filter((n) => n.alive);
  if (alive.length === 0) return { state, triggered: false };

  const isWinter = state.climate.season === SEASON.WINTER;
  const hasShelter =
    !!firstStructureOfKind(state.structures, CRAFTABLE.REFUGIO) ||
    !!firstStructureOfKind(state.structures, CRAFTABLE.DESPENSA);
  const prevConsec = v.consecutiveColdDays ?? 0;
  const bad = isWinter && !hasShelter;
  const newConsec = bad ? prevConsec + 1 : 0;
  let village = { ...v, consecutiveColdDays: newConsec };

  const trigger = bad && newConsec >= 5;
  if (!trigger) {
    return { state: { ...state, village }, triggered: false };
  }

  const active = v.activeMessage;
  const mitigated = active === MESSAGE_INTENTS.CORAJE || active === MESSAGE_INTENTS.AUXILIO;

  let npcs = state.npcs;
  let chronicle = [...state.chronicle];
  const day = computeDay(tick);

  if (mitigated) {
    // attenuate
    const nextNpcs = npcs.map((n) => {
      if (!n.alive) return n;
      return updateNpcStats(n, {
        miedo: Math.max(0, n.stats.miedo - 1),
        supervivencia: Math.min(100, n.stats.supervivencia + 1),
      });
    });
    const recText = `Día ${day}: Los nuestros encontraron calor en la fogata y el Coraje divino. El invierno no doblegó a los hijos de Tramuntana.`;
    chronicle = [...chronicle, makeChronicleEntry(tick, recText, 'system', 6, 2)];
    return {
      state: { ...state, npcs: nextNpcs, chronicle, village },
      triggered: true,
      fracture: { type: 'cold_exposure' as const, day, tick, mitigated: true, impact: 6 },
    };
  }

  // bad: on exposed (no shelter near, use pos sort), sv-6 miedo+8
  const sorted = sortByPosId(alive);
  // all exposed if no shelter
  const affected = sorted.slice(0, Math.min(6, sorted.length));
  const nextNpcs: NPC[] = [...npcs];
  for (const n of affected) {
    const idx = nextNpcs.findIndex((p) => p.id === n.id);
    if (idx >= 0) {
      nextNpcs[idx] = updateNpcStats(nextNpcs[idx], {
        supervivencia: nextNpcs[idx].stats.supervivencia - 6,
        miedo: Math.min(100, nextNpcs[idx].stats.miedo + 8),
      });
    }
  }
  const badText = `Día ${day}: Frío invernal sin refugio. El invierno extremo heló los huesos de los nuestros durante días.`;
  chronicle = [...chronicle, makeChronicleEntry(tick, badText, 'system', -12, 3)];

  return {
    state: { ...state, npcs: nextNpcs, chronicle, village },
    triggered: true,
    fracture: { type: 'cold_exposure' as const, day, tick, mitigated: false, impact: -12 },
  };
}

function checkSpiritualLastElegido(state: GameState): { state: GameState; triggered: boolean; fracture?: Fracture } {
  const tick = state.tick;
  const v = state.village;
  const alive = state.npcs.filter((n) => n.alive);
  const aliveEleg = alive.filter((n) => n.casta === CASTA.ELEGIDO).length;
  const everEleg = state.npcs.some((n) => n.casta === CASTA.ELEGIDO);
  const hasCorazon = state.npcs.some(
    (n) => n.casta === CASTA.ELEGIDO && n.traits.includes(MIRACLE.CORAZON_FIEL),
  );
  const bornThisCycle = state.npcs.some(
    (n) =>
      n.casta === CASTA.ELEGIDO &&
      n.birthTick > tick - TICKS_PER_DAY &&
      n.alive,
  );
  const prevDefeat = !!v.spiritualDefeat;

  const trigger =
    aliveEleg === 0 &&
    everEleg &&
    !hasCorazon &&
    !bornThisCycle &&
    !prevDefeat;

  if (!trigger) {
    return { state, triggered: false };
  }

  let village = { ...v, spiritualDefeat: true };
  const day = computeDay(tick);
  const text = `Día ${day}: El último de los Elegidos ha caído sin heredero. El linaje divino de Tramuntana se extingue en la carne.`;
  const chronicle = [
    ...state.chronicle,
    makeChronicleEntry(tick, text, 'system', -100, 10),
  ];

  return {
    state: { ...state, village, chronicle },
    triggered: true,
    fracture: { type: 'spiritual_defeat' as const, day, tick, mitigated: false, impact: -100 },
  };
}

function checkResourcePressure(state: GameState): { state: GameState; triggered: boolean; fracture?: Fracture } {
  const tick = state.tick;
  const v = state.village;
  const alive = state.npcs.filter((n) => n.alive);
  if (alive.length === 0) return { state, triggered: false };

  const food = getFoodTotal(state.npcs, state.structures);
  const depletedWild = state.world.resources.some(
    (r) => (r.id === 'game' || r.id === 'berry' || r.id === 'fish') && (r.quantity || 0) <= 0,
  );
  const stocksLow = food < 10 && !firstStructureOfKind(state.structures, CRAFTABLE.DESPENSA);
  const prevConsec = v.consecutiveDepletedDays ?? 0;
  const bad = depletedWild || stocksLow;
  const newConsec = bad ? prevConsec + 1 : 0;
  let village = { ...v, consecutiveDepletedDays: newConsec };

  const active = v.activeMessage;
  const mitigatedByWhisper = active === MESSAGE_INTENTS.RENUNCIA;
  const trigger = bad && newConsec >= 3 && !mitigatedByWhisper;

  if (!trigger) {
    if (mitigatedByWhisper && newConsec > 0) {
      village = { ...village, consecutiveDepletedDays: 0 };
    }
    return { state: { ...state, village }, triggered: false };
  }

  // effect: pressure, low prop on foragers-ish (first by id)
  const sorted = sortById(alive);
  const foragers = sorted.slice(0, Math.min(4, sorted.length));
  let npcs = state.npcs;
  for (const n of foragers) {
    const idx = npcs.findIndex((p) => p.id === n.id);
    if (idx >= 0) {
      npcs = npcs.map((p, j) =>
        j === idx ? updateNpcStats(p, { proposito: Math.max(0, p.stats.proposito - 4) }) : p,
      );
    }
  }
  const day = computeDay(tick);
  const text = `Día ${day}: Recurso agotado localmente. El clan duda entre quedarse y morir o renunciar al sitio.`;
  const chronicle = [...state.chronicle, makeChronicleEntry(tick, text, 'system', -10, 3)];
  return {
    state: { ...state, npcs, chronicle, village },
    triggered: true,
    fracture: { type: 'resource_pressure' as const, day, tick, mitigated: false, impact: -10 },
  };
}

function checkFearPanic(state: GameState): { state: GameState; triggered: boolean; fracture?: Fracture } {
  const tick = state.tick;
  const v = state.village;
  const alive = state.npcs.filter((n) => n.alive);
  if (alive.length === 0) return { state, triggered: false };

  const miedoSum = alive.reduce((s, n) => s + n.stats.miedo, 0);
  const avgMiedo = alive.length ? Math.floor(miedoSum / alive.length) : 0;
  const prevConsec = v.consecutiveFearDays ?? 0;
  const newConsec = avgMiedo > 65 ? prevConsec + 1 : 0;
  let village = { ...v, consecutiveFearDays: newConsec };

  const fire = firstStructureOfKind(state.structures, CRAFTABLE.FOGATA_PERMANENTE);
  const isNightHeavy = (tick % TICKS_PER_DAY) > TICKS_PER_DAY / 2;
  const badEnv = !fire || isNightHeavy;
  const trigger = avgMiedo > 65 && newConsec >= 4 && badEnv;

  if (!trigger) {
    return { state: { ...state, village }, triggered: false };
  }

  const active = v.activeMessage;
  const mitigated = active === MESSAGE_INTENTS.CORAJE || active === MESSAGE_INTENTS.ESPERANZA || active === MESSAGE_INTENTS.AUXILIO;

  let npcs = state.npcs;
  let chronicle = [...state.chronicle];
  const day = computeDay(tick);

  if (mitigated) {
    const nextNpcs = npcs.map((n) =>
      n.alive
        ? updateNpcStats(n, {
            miedo: Math.max(0, n.stats.miedo - 2),
            proposito: Math.min(100, (n.stats.proposito ?? 100) + 2),
          })
        : n,
    );
    const recText = `Día ${day}: Los nuestros contaron historias y el miedo se disipó gracias al Coraje. La fogata y la voz divina sostuvieron el ánimo.`;
    chronicle = [...chronicle, makeChronicleEntry(tick, recText, 'system', 7, 2)];
    return {
      state: { ...state, npcs: nextNpcs, chronicle, village },
      triggered: true,
      fracture: { type: 'fear_panic' as const, day, tick, mitigated: true, impact: 7 },
    };
  }

  // bad
  const sorted = sortById(alive.filter((n) => n.stats.miedo > 50));
  const affected = sorted.length ? sorted : sortById(alive).slice(0, 3);
  let nextNpcs: NPC[] = [...npcs];
  for (const n of affected) {
    const idx = nextNpcs.findIndex((p) => p.id === n.id);
    if (idx >= 0) {
      nextNpcs[idx] = updateNpcStats(nextNpcs[idx], {
        miedo: Math.min(100, nextNpcs[idx].stats.miedo + 4),
        proposito: Math.max(0, (nextNpcs[idx].stats.proposito ?? 100) - 3),
      });
    }
  }
  const badText = `Día ${day}: Terrores de la oscuridad sin amparo. El pánico se propagó; los nuestros se apagaron.`;
  chronicle = [...chronicle, makeChronicleEntry(tick, badText, 'system', -11, 3)];

  return {
    state: { ...state, npcs: nextNpcs, chronicle, village },
    triggered: true,
    fracture: { type: 'fear_panic' as const, day, tick, mitigated: false, impact: -11 },
  };
}

function checkBuildCollapse(
  state: GameState,
  dawnVillage: GameState['village'],
): { state: GameState; triggered: boolean; fracture?: Fracture } {
  const tick = state.tick;
  const v = state.village;
  const alive = state.npcs.filter((n) => n.alive);
  if (alive.length === 0 || !state.buildProject) return { state, triggered: false };

  const propSum = alive.reduce((s, n) => s + (n.stats.proposito ?? 100), 0);
  const avgProposito = alive.length ? Math.floor(propSum / alive.length) : 100;
  const prevConsec = v.consecutiveLowPropositoDays ?? 0;
  const newConsec = avgProposito < 30 ? prevConsec + 1 : 0;
  let village = { ...v, consecutiveLowPropositoDays: newConsec };

  // secondary crises rough — leídas del estado de ENTRADA del amanecer
  // (los checks previos pueden haber reseteado contadores en un día sano)
  const hasOtherCrisis =
    (dawnVillage.consecutiveHungerDays ?? 0) > 0 ||
    (dawnVillage.consecutiveColdDays ?? 0) > 0 ||
    (dawnVillage.consecutiveLowSocialDays ?? 0) > 0;
  const trigger = (avgProposito < 30 || prevConsec >= 7) && hasOtherCrisis;

  if (!trigger) {
    return { state: { ...state, village }, triggered: false };
  }

  const active = v.activeMessage;
  const hasManos = alive.some((n) => n.traits.includes(MIRACLE.MANOS_QUE_RECUERDAN));
  const mitigated = (active === MESSAGE_INTENTS.CORAJE || active === MESSAGE_INTENTS.PACIENCIA) || hasManos;

  let chronicle = [...state.chronicle];
  let monument = state.monument;
  let buildProject = state.buildProject;
  const day = computeDay(tick);

  if (mitigated) {
    const recText = `Día ${day}: La voz del dios sostuvo los brazos de los constructores. El monumento resistió la fatiga gracias al Coraje y Manos que recuerdan.`;
    chronicle = [...chronicle, makeChronicleEntry(tick, recText, 'system', 12, 3)];
    // small prop bump to builders
    let npcs = state.npcs;
    const builders = sortById(alive).slice(0, 3);
    for (const b of builders) {
      const idx = npcs.findIndex((p) => p.id === b.id);
      if (idx >= 0) {
        npcs = npcs.map((p, j) =>
          j === idx ? updateNpcStats(p, { proposito: Math.min(100, (p.stats.proposito ?? 100) + 3) }) : p,
        );
      }
    }
    return {
      state: { ...state, npcs, chronicle, village },
      triggered: true,
      fracture: { type: 'build_collapse' as const, day, tick, mitigated: true, impact: 12 },
    };
  }

  // failure: ruin risk
  const badText = `Día ${day}: El trabajo del monumento agota a los nuestros. El clan colapsa; la obra queda a medias como ruina.`;
  chronicle = [...chronicle, makeChronicleEntry(tick, badText, 'system', -20, 5)];

  const ruinMonument: MonumentState = monument
    ? { ...monument, phase: 'ruin' }
    : { phase: 'ruin', progress: 0, startedAtTick: null };

  return {
    state: { ...state, chronicle, village, monument: ruinMonument, buildProject: null },
    triggered: true,
    fracture: { type: 'build_collapse' as const, day, tick, mitigated: false, impact: -20 },
  };
}

/** Pure entry: tickFractures. Matches recommended CrisisResult shape. Called at dawn by sim (future). */
export function tickFractures(state: GameState): { state: GameState; fractures: Fracture[] } {
  // backfill counters for roundtrip/legacy fixtures pre-extension (pure, §A4)
  const vv0 = state.village;
  const backfilledVillage = {
    ...vv0,
    consecutiveHungerDays: vv0.consecutiveHungerDays ?? 0,
    consecutiveLowSocialDays: vv0.consecutiveLowSocialDays ?? 0,
    consecutiveColdDays: vv0.consecutiveColdDays ?? 0,
    consecutiveFearDays: vv0.consecutiveFearDays ?? 0,
    consecutiveLowPropositoDays: vv0.consecutiveLowPropositoDays ?? 0,
    consecutiveDepletedDays: vv0.consecutiveDepletedDays ?? 0,
    spiritualDefeat: vv0.spiritualDefeat ?? false,
  };
  const stateForCheck: GameState = { ...state, village: backfilledVillage };

  // Only process on dawn boundary (tests set tick=479 etc); otherwise no-op for counters.
  const atDawnBoundary = (stateForCheck.tick + 1) % TICKS_PER_DAY === 0;
  if (!atDawnBoundary) {
    return { state, fractures: [] };
  }

  let current: GameState = stateForCheck;
  const fractures: Fracture[] = [];

  // 1. Hunger
  let r = checkHungerCascade(current);
  if (r.triggered && r.fracture) {
    current = r.state;
    fractures.push(r.fracture);
  } else {
    current = r.state; // may have updated consec even if no trigger
  }

  // 2. Social (may compound from hunger)
  r = checkSocialColapso(current);
  if (r.triggered && r.fracture) {
    current = r.state;
    fractures.push(r.fracture);
  } else {
    current = r.state;
  }

  // 3. Cold
  r = checkColdWinter(current);
  if (r.triggered && r.fracture) {
    current = r.state;
    fractures.push(r.fracture);
  } else {
    current = r.state;
  }

  // 4. Spiritual (post death detect)
  r = checkSpiritualLastElegido(current);
  if (r.triggered && r.fracture) {
    current = r.state;
    fractures.push(r.fracture);
  }

  // 5. Resource
  r = checkResourcePressure(current);
  if (r.triggered && r.fracture) {
    current = r.state;
    fractures.push(r.fracture);
  } else {
    current = r.state;
  }

  // 6. Fear
  r = checkFearPanic(current);
  if (r.triggered && r.fracture) {
    current = r.state;
    fractures.push(r.fracture);
  } else {
    current = r.state;
  }

  // 7. Build collapse (monument risk) — la propia rama de fallo de
  // checkBuildCollapse anula buildProject; una mitigación lo conserva.
  r = checkBuildCollapse(current, backfilledVillage);
  if (r.triggered && r.fracture) {
    current = r.state;
    fractures.push(r.fracture);
  } else {
    current = r.state;
  }

  // preserve prng etc, no advance
  return { state: current, fractures };
}
