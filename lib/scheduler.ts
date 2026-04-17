/**
 * Scheduler de ciclo vital — GODGAME v0.1 (Sprint 2).
 *
 * Misión: observar el estado del mundo y emitir los eventos "lo que pasa
 * si nadie mira" — muertes por edad, conflictos, emparejamientos y
 * nacimientos. Cada tick los genera y `applyEvents` los traduce a un
 * nuevo estado.
 *
 * Contratos duros (§A4):
 *   - Pura: no muta el input, no toca DOM/localStorage/red.
 *   - Determinista: consume el MISMO PRNG de `state.prng_cursor` y devuelve
 *     el cursor final. Mismo estado ⇒ mismos eventos byte a byte.
 *   - JSON-clean: los eventos son JSON puro (discriminated union de objetos
 *     planos); `applyEvents` los aplica sin más.
 *
 * Por qué no combinarlo con `tick()`:
 *   - S5a (onboarding coreografiado) inyectará "eventos forzados" en ciertos
 *     días (NPC más ambicioso gana halo, acto notable a t=60s, etc.). Tener
 *     el scheduler separado deja ese gancho preparado: el tutorial podrá
 *     reemplazar `scheduleEvents` por una variante con eventos semilla.
 */

import { next, nextChoice, type PRNGState } from './prng';
import {
  generateNewborn,
  npcIdString,
  type NPC,
  type WorldState,
} from './world-state';
import {
  appendChronicle,
  narrateBirth,
  narrateConflict,
  narrateDeath,
} from './chronicle';

// ---------------------------------------------------------------------------
// Constantes tunables — valores de arranque. Se ajustarán en Sprint 7.
// ---------------------------------------------------------------------------

/** Desde qué edad (años) empieza a poder morir de viejo. */
const DEATH_START_AGE_YEARS = 50;
/** A partir de qué edad (años) la probabilidad de morir satura a 1/año. */
const DEATH_GUARANTEED_AGE_YEARS = 95;

/** Rango fértil / emparejable. */
const ADULT_MIN_AGE_YEARS = 16;
const PAIR_MAX_AGE_YEARS = 50;
const FERTILE_MAX_AGE_YEARS = 45;

/** Proximidad máxima (unidades de mapa) para interactuar. */
const PAIR_PROX_RADIUS = 8;
const CONFLICT_PROX_RADIUS = 6;

/** Probabilidades base por tick (día). */
const PAIRING_PROB_PER_TICK = 0.004;
const BIRTH_PROB_PER_TICK = 0.003;
const CONFLICT_BASE_PROB_PER_TICK = 0.0015;

/** Umbral de ambición para iniciar conflicto. */
const AMBICION_CONFLICT_THRESHOLD = 60;

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type LifecycleEvent =
  | { type: 'death_by_age'; npc_id: string }
  | {
      type: 'death_by_conflict';
      killer_id: string;
      victim_id: string;
      reason: string;
    }
  | { type: 'pairing'; a_id: string; b_id: string }
  | { type: 'birth'; newborn: NPC };

export interface ScheduleResult {
  events: LifecycleEvent[];
  prng_cursor: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function distSq(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function deathByAgeProb(ageDays: number): number {
  const years = ageDays / 365;
  if (years < DEATH_START_AGE_YEARS) return 0;
  const span = DEATH_GUARANTEED_AGE_YEARS - DEATH_START_AGE_YEARS;
  const norm = Math.min(1, (years - DEATH_START_AGE_YEARS) / span);
  // Curva cuadrática × 5 para acelerar turnover: a ~95 años la mortalidad
  // diaria satura cerca de 5/365 ≈ 1.4% (~99%/año). Se afinará en Sprint 7.
  return Math.min(1, (norm * norm * 5) / 365);
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

/**
 * Genera la lista de eventos de este tick y devuelve el cursor final.
 *
 * Orden canónico de pases (NO se puede alterar sin romper determinismo
 * entre versiones guardadas):
 *   1. Muerte por edad.
 *   2. Conflictos entre ambiciosos.
 *   3. Nuevos emparejamientos.
 *   4. Nacimientos de parejas ya consolidadas.
 */
export function scheduleEvents(state: WorldState): ScheduleResult {
  let prng: PRNGState = { seed: state.seed, cursor: state.prng_cursor };
  const events: LifecycleEvent[] = [];

  // Índices auxiliares que reflejan el *estado mental* del scheduler al
  // avanzar por sus pases — sin mutar el input.
  const deadSet = new Set<string>();
  const pairedThisTick = new Set<string>();
  let nextId = state.next_npc_id;

  // Pase 1 — muerte por edad
  for (const npc of state.npcs) {
    if (!npc.alive) continue;
    const p = deathByAgeProb(npc.age_days);
    if (p <= 0) continue;
    const roll = next(prng);
    prng = roll.next;
    if (roll.value < p) {
      events.push({ type: 'death_by_age', npc_id: npc.id });
      deadSet.add(npc.id);
    }
  }

  const isAlive = (n: NPC): boolean => n.alive && !deadSet.has(n.id);

  // Pase 2 — conflictos entre ambiciosos
  for (const npc of state.npcs) {
    if (!isAlive(npc)) continue;
    if (npc.partner_id) continue; // los emparejados no inician peleas (tosco pero útil)
    if (npc.traits.ambicion < AMBICION_CONFLICT_THRESHOLD) continue;
    if (npc.age_days / 365 < ADULT_MIN_AGE_YEARS) continue;

    const p =
      (npc.traits.ambicion / 100) * CONFLICT_BASE_PROB_PER_TICK;
    const roll = next(prng);
    prng = roll.next;
    if (roll.value >= p) continue;

    // Vecino en rango de conflicto — mismo grupo o cualquiera.
    const radSq = CONFLICT_PROX_RADIUS * CONFLICT_PROX_RADIUS;
    const candidates = state.npcs.filter(
      (o) => o.id !== npc.id && isAlive(o) && distSq(o.position, npc.position) <= radSq,
    );
    if (candidates.length === 0) continue;

    const pick = nextChoice(prng, candidates);
    prng = pick.next;
    const target = pick.value;

    // Resolución por fuerza: mayor fuerza gana; empate ⇒ el iniciador gana
    // (simplificación consistente con determinismo).
    const attackerWins = npc.stats.fuerza >= target.stats.fuerza;
    const killer = attackerWins ? npc : target;
    const victim = attackerWins ? target : npc;

    events.push({
      type: 'death_by_conflict',
      killer_id: killer.id,
      victim_id: victim.id,
      reason: 'el honor',
    });
    deadSet.add(victim.id);
  }

  // Pase 3 — emparejamientos
  for (const npc of state.npcs) {
    if (!isAlive(npc)) continue;
    if (npc.partner_id) continue;
    if (pairedThisTick.has(npc.id)) continue;
    const y = npc.age_days / 365;
    if (y < ADULT_MIN_AGE_YEARS || y > PAIR_MAX_AGE_YEARS) continue;

    const roll = next(prng);
    prng = roll.next;
    if (roll.value >= PAIRING_PROB_PER_TICK) continue;

    const radSq = PAIR_PROX_RADIUS * PAIR_PROX_RADIUS;
    const candidates = state.npcs.filter((o) => {
      if (o.id === npc.id) return false;
      if (!isAlive(o)) return false;
      if (o.partner_id) return false;
      if (pairedThisTick.has(o.id)) return false;
      if (o.group_id !== npc.group_id) return false;
      const oy = o.age_days / 365;
      if (oy < ADULT_MIN_AGE_YEARS || oy > PAIR_MAX_AGE_YEARS) return false;
      return distSq(o.position, npc.position) <= radSq;
    });
    if (candidates.length === 0) continue;

    const pick = nextChoice(prng, candidates);
    prng = pick.next;
    const partner = pick.value;

    events.push({ type: 'pairing', a_id: npc.id, b_id: partner.id });
    pairedThisTick.add(npc.id);
    pairedThisTick.add(partner.id);
  }

  // Pase 4 — nacimientos
  for (const npc of state.npcs) {
    if (!isAlive(npc)) continue;
    if (!npc.partner_id) continue;
    // Enumerar cada pareja una vez — el miembro con id menor manda.
    if (npc.id >= npc.partner_id) continue;
    const partner = state.npcs.find((o) => o.id === npc.partner_id);
    if (!partner || !isAlive(partner)) continue;

    const y1 = npc.age_days / 365;
    const y2 = partner.age_days / 365;
    if (y1 < ADULT_MIN_AGE_YEARS || y2 < ADULT_MIN_AGE_YEARS) continue;
    if (y1 > FERTILE_MAX_AGE_YEARS || y2 > FERTILE_MAX_AGE_YEARS) continue;

    const roll = next(prng);
    prng = roll.next;
    if (roll.value >= BIRTH_PROB_PER_TICK) continue;

    const id = npcIdString(nextId++);
    const { npc: newborn, next: nextPrng } = generateNewborn(
      prng,
      id,
      npc,
      partner,
    );
    prng = nextPrng;
    events.push({ type: 'birth', newborn });
  }

  return { events, prng_cursor: prng.cursor };
}

// ---------------------------------------------------------------------------
// applyEvents
// ---------------------------------------------------------------------------

/**
 * Aplica una lista de eventos a un estado y devuelve el nuevo estado.
 * Pura. NO consume PRNG — toda la aleatoriedad ya la fijó el scheduler.
 *
 * Efectos secundarios lógicos:
 *   - Las muertes rompen vínculos de pareja del superviviente.
 *   - Los nacimientos añaden al final del array de NPCs y adelantan
 *     `next_npc_id` al siguiente sufijo no usado.
 *   - Cada evento narrativo empuja una entrada a la crónica con la voz
 *     partisana de `chronicle.ts`.
 */
export function applyEvents(
  state: WorldState,
  events: LifecycleEvent[],
): WorldState {
  let out: WorldState = state;

  for (const ev of events) {
    if (ev.type === 'death_by_age') {
      const victim = out.npcs.find((n) => n.id === ev.npc_id);
      if (!victim || !victim.alive) continue;
      out = applyDeath(out, ev.npc_id);
      out = appendChronicle(out, narrateDeath(out, victim));
    } else if (ev.type === 'death_by_conflict') {
      const killer = out.npcs.find((n) => n.id === ev.killer_id);
      const victim = out.npcs.find((n) => n.id === ev.victim_id);
      if (!killer || !victim || !victim.alive) continue;
      out = applyDeath(out, ev.victim_id);
      out = appendChronicle(out, narrateConflict(out, killer, victim, ev.reason));
    } else if (ev.type === 'pairing') {
      out = {
        ...out,
        npcs: out.npcs.map((n) => {
          if (n.id === ev.a_id) return { ...n, partner_id: ev.b_id };
          if (n.id === ev.b_id) return { ...n, partner_id: ev.a_id };
          return n;
        }),
      };
    } else if (ev.type === 'birth') {
      out = {
        ...out,
        npcs: [...out.npcs, ev.newborn],
        next_npc_id: Math.max(
          out.next_npc_id,
          parseNpcSuffix(ev.newborn.id) + 1,
        ),
      };
      out = appendChronicle(out, narrateBirth(out, ev.newborn));
    }
  }

  return out;
}

function applyDeath(state: WorldState, victim_id: string): WorldState {
  return {
    ...state,
    npcs: state.npcs.map((n) => {
      if (n.id === victim_id) return { ...n, alive: false, partner_id: null };
      if (n.partner_id === victim_id) return { ...n, partner_id: null };
      return n;
    }),
  };
}

function parseNpcSuffix(id: string): number {
  const n = parseInt(id.slice('npc_'.length), 10);
  return Number.isFinite(n) ? n : 0;
}
