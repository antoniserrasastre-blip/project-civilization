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
import { applyGifts } from './gifts';
import {
  TUTORIAL_END_DAY,
  TUTORIAL_FORCED_EVENT_DAY,
} from './tutorial';
import { nextEra, pendingTechs, shouldAdvanceEra, TECH_POOLS } from './tech';
import { decideRivalActions } from './rival-ai';

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

/** Probabilidades base por tick (día). Ajustadas en Sprint 7 para que la
 *  población no explote a 10k ticks (pre-Sprint 7 saturaba ≥599). */
const PAIRING_PROB_PER_TICK = 0.004;
const BIRTH_PROB_PER_TICK = 0.0015;
const CONFLICT_BASE_PROB_PER_TICK = 0.0015;

/** Factor de probabilidad relativo para emparejamiento cross-grupo (Sprint 11).
 *  Menor que 1 — el intermatrimonio existe pero es infrecuente; la deriva
 *  dinástica emerge de forma natural a lo largo de generaciones. */
const CROSS_GROUP_PAIRING_FACTOR = 0.25;

/** Umbral de ambición para iniciar conflicto. */
const AMBICION_CONFLICT_THRESHOLD = 60;

/** Follower attraction — Sprint 3. */
const FOLLOWER_PROX_RADIUS = 8;
/** El líder requiere carisma ≥ 80 + ambición ≥ 50. Aura de Carisma sube el carisma a ~150. */
const LEADER_CARISMA_THRESHOLD = 80;
const LEADER_AMBICION_THRESHOLD = 50;
/** El potencial seguidor necesita ambicion ≤ 40 (§A2: los tímidos siguen). */
const FOLLOWER_AMBICION_THRESHOLD = 40;
/** Probabilidad base por tick para que un candidato entre en órbita de un líder. */
const FOLLOWER_PROB_PER_TICK = 0.01;

/** Probabilidad de heredar cada don del padre/madre en el nacimiento. */
const GIFT_INHERITANCE_PROB = 0.5;

// -----------------------------------------------------------------------
// Economía de Fe (Sprint 4, §A1 de la visión).
// -----------------------------------------------------------------------

/** Fe pasiva por día por cada NPC sagrado (Elegido o descendiente). */
const FAITH_PER_TICK_PER_HOLY = 0.05;
/** Fe extra al caer un enemigo de mano de un sagrado (§A1 "enemigo caído"). */
const FAITH_PER_ENEMY_FALLEN = 10;
/** Fe extra por descendencia nacida de al menos un padre sagrado. */
const FAITH_PER_HOLY_BIRTH = 5;

/** Probabilidad base por tick de descubrir UNA tecnología pendiente. */
const TECH_DISCOVERY_BASE_PROB = 0.0008;
/** Bonus por inteligencia media del pueblo vivo (0..1). */
const TECH_DISCOVERY_INTEL_WEIGHT = 0.002;

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
  | { type: 'birth'; newborn: NPC }
  | { type: 'follower_formed'; follower_id: string; leader_id: string }
  | {
      type: 'faith_gained';
      amount: number;
      reason: 'rezar' | 'enemigo_caido' | 'descendencia';
    }
  | { type: 'tutorial_end' }
  | { type: 'tech_discovered'; tech_id: string }
  | { type: 'era_transition'; from: string; to: string }
  | { type: 'rival_anoint'; rival_group_id: string; npc_id: string }
  | {
      type: 'rival_faith_gained';
      rival_group_id: string;
      amount: number;
      reason: 'rezar';
    }
  | { type: 'rival_decision_tick'; rival_group_id: string };

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

  const chosenSet = new Set(state.player_god.chosen_ones);
  const isHoly = (n: NPC): boolean =>
    chosenSet.has(n.id) || n.descends_from_chosen;

  // Pase 0 — tutorial (§A1). Solo emite cuando tutorial_active es true
  // y el día es exactamente el umbral correspondiente. Usa el mismo PRNG
  // compartido — replay determinista respetado.
  if (state.tutorial_active && state.tutorial_highlight_id) {
    const highlight = state.npcs.find(
      (n) => n.id === state.tutorial_highlight_id,
    );
    if (highlight && highlight.alive && state.day === TUTORIAL_FORCED_EVENT_DAY) {
      // El señalado gana un acto dramático: si tiene a alguien cerca, le
      // vence en conflicto. Si no, un bono simbólico de Fe.
      const radSq = CONFLICT_PROX_RADIUS * 4 * (CONFLICT_PROX_RADIUS * 4);
      const candidates = state.npcs.filter(
        (o) =>
          o.id !== highlight.id &&
          o.alive &&
          o.group_id === highlight.group_id &&
          !chosenSet.has(o.id) &&
          distSq(o.position, highlight.position) <= radSq,
      );
      if (candidates.length > 0) {
        const pick = nextChoice(prng, candidates);
        prng = pick.next;
        events.push({
          type: 'death_by_conflict',
          killer_id: highlight.id,
          victim_id: pick.value.id,
          reason: 'un desafío del tutorial',
        });
        deadSet.add(pick.value.id);
        if (isHoly(highlight)) {
          events.push({
            type: 'faith_gained',
            amount: FAITH_PER_ENEMY_FALLEN,
            reason: 'enemigo_caido',
          });
        }
      }
    }
    // Fin del tutorial: tras llegar a TUTORIAL_END_DAY.
    if (state.day >= TUTORIAL_END_DAY) {
      events.push({ type: 'tutorial_end' });
    }
  }

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

    // Fe extra si el ganador era de los nuestros y la víctima no.
    if (isHoly(killer) && !isHoly(victim)) {
      events.push({
        type: 'faith_gained',
        amount: FAITH_PER_ENEMY_FALLEN,
        reason: 'enemigo_caido',
      });
    }
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
    // Sprint 11: permite cross-group pairing con peso reducido. Se
    // expande el pool duplicando el peso de los same-group para que el
    // intermatrimonio sea posible pero raro (~20% de los emparejamientos
    // cuando hay candidatos de ambos tipos en rango).
    const sameGroup: typeof state.npcs = [];
    const crossGroup: typeof state.npcs = [];
    for (const o of state.npcs) {
      if (o.id === npc.id) continue;
      if (!isAlive(o)) continue;
      if (o.partner_id) continue;
      if (pairedThisTick.has(o.id)) continue;
      const oy = o.age_days / 365;
      if (oy < ADULT_MIN_AGE_YEARS || oy > PAIR_MAX_AGE_YEARS) continue;
      if (distSq(o.position, npc.position) > radSq) continue;
      if (o.group_id === npc.group_id) sameGroup.push(o);
      else crossGroup.push(o);
    }
    if (sameGroup.length === 0 && crossGroup.length === 0) continue;

    // Pool ponderado: cada same-group pesa 1/CROSS_GROUP_PAIRING_FACTOR
    // veces un cross-group. Con factor 0.25 → same pesa 4× cross.
    const weightSame = Math.round(1 / CROSS_GROUP_PAIRING_FACTOR);
    const pool: typeof state.npcs = [];
    for (const o of sameGroup) for (let i = 0; i < weightSame; i++) pool.push(o);
    for (const o of crossGroup) pool.push(o);
    const pick = nextChoice(prng, pool);
    prng = pick.next;
    const partner = pick.value;

    events.push({ type: 'pairing', a_id: npc.id, b_id: partner.id });
    pairedThisTick.add(npc.id);
    pairedThisTick.add(partner.id);
  }

  // Pase 4 — nacimientos (con herencia de dones)
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
    const parentsAreHoly = isHoly(npc) || isHoly(partner);
    const { npc: babyBase, next: nextPrng } = generateNewborn(
      prng,
      id,
      npc,
      partner,
      parentsAreHoly,
    );
    prng = nextPrng;

    // Herencia de dones — cada don único presente en algún padre se tira
    // con probabilidad GIFT_INHERITANCE_PROB. Los dones son acumulativos
    // en el efecto pero no dobles: `applyGifts` bakea stats/traits y evita
    // duplicar ids.
    const candidateGifts = Array.from(
      new Set([...npc.gifts, ...partner.gifts]),
    );
    const inherited: string[] = [];
    for (const g of candidateGifts) {
      const r = next(prng);
      prng = r.next;
      if (r.value < GIFT_INHERITANCE_PROB) inherited.push(g);
    }
    const newborn = inherited.length > 0 ? applyGifts(babyBase, inherited) : babyBase;
    events.push({ type: 'birth', newborn });

    if (parentsAreHoly) {
      events.push({
        type: 'faith_gained',
        amount: FAITH_PER_HOLY_BIRTH,
        reason: 'descendencia',
      });
    }
  }

  // Pase 5 — atracción por aura de carisma (§A2 — Pillar 1)
  for (const npc of state.npcs) {
    if (!isAlive(npc)) continue;
    if (npc.follower_of) continue; // ya sigue a alguien
    if (npc.traits.ambicion > FOLLOWER_AMBICION_THRESHOLD) continue;
    const y = npc.age_days / 365;
    if (y < ADULT_MIN_AGE_YEARS) continue;

    const roll = next(prng);
    prng = roll.next;
    if (roll.value >= FOLLOWER_PROB_PER_TICK) continue;

    const radSq = FOLLOWER_PROX_RADIUS * FOLLOWER_PROX_RADIUS;
    const leaders = state.npcs.filter((o) => {
      if (o.id === npc.id) return false;
      if (!isAlive(o)) return false;
      if (o.group_id !== npc.group_id) return false;
      if (o.traits.carisma < LEADER_CARISMA_THRESHOLD) return false;
      if (o.traits.ambicion < LEADER_AMBICION_THRESHOLD) return false;
      return distSq(o.position, npc.position) <= radSq;
    });
    if (leaders.length === 0) continue;

    const pick = nextChoice(prng, leaders);
    prng = pick.next;
    const leader = pick.value;
    events.push({ type: 'follower_formed', follower_id: npc.id, leader_id: leader.id });
  }

  // Pase 6 — Fe pasiva por rezar (§A1). Cada sagrado vivo que no haya
  // muerto este tick aporta una pequeña cantidad. Determinista; no usa PRNG.
  let passive = 0;
  for (const npc of state.npcs) {
    if (!isAlive(npc)) continue;
    if (!isHoly(npc)) continue;
    passive += FAITH_PER_TICK_PER_HOLY;
  }
  if (passive > 0) {
    events.push({ type: 'faith_gained', amount: passive, reason: 'rezar' });
  }

  // Pase 6.5 — Fe pasiva de los dioses rivales. Cada rival acumula Fe
  // por sus Elegidos + descendientes, simétrico al jugador.
  for (const rival of state.rival_gods) {
    const rivalChosen = new Set(rival.chosen_ones);
    let rivalPassive = 0;
    for (const npc of state.npcs) {
      if (!isAlive(npc)) continue;
      if (rivalChosen.has(npc.id)) {
        rivalPassive += FAITH_PER_TICK_PER_HOLY;
      } else if (
        npc.descends_from_chosen &&
        npc.group_id === rival.group_id
      ) {
        // Aproximación: descendientes del grupo rival también producen
        // Fe para ese rival (modelo simplificado hasta S11 cross-group).
        rivalPassive += FAITH_PER_TICK_PER_HOLY;
      }
    }
    if (rivalPassive > 0) {
      events.push({
        type: 'rival_faith_gained',
        rival_group_id: rival.group_id,
        amount: rivalPassive,
        reason: 'rezar',
      });
    }
  }

  // Pase 7 — descubrimiento tecnológico. Probabilidad proporcional a
  // inteligencia media del pueblo vivo. Solo si hay pool pendiente.
  const pending = pendingTechs(state);
  if (pending.length > 0) {
    let intelSum = 0;
    let aliveCount = 0;
    for (const npc of state.npcs) {
      if (!isAlive(npc)) continue;
      intelSum += npc.stats.inteligencia;
      aliveCount++;
    }
    if (aliveCount > 0) {
      const avgIntel = intelSum / aliveCount; // ~50
      const p =
        TECH_DISCOVERY_BASE_PROB +
        (avgIntel / 100) * TECH_DISCOVERY_INTEL_WEIGHT;
      const roll = next(prng);
      prng = roll.next;
      if (roll.value < p) {
        const pick = nextChoice(prng, pending);
        prng = pick.next;
        events.push({ type: 'tech_discovered', tech_id: pick.value.id });
      }
    }
  }

  // Pase 8 — transición de era (§A4 escalabilidad). Requiere que el pool
  // de la era actual quede completo — anticipamos que el event de tech
  // recién emitido también cuenta porque aplicaremos todos juntos.
  const projectedTechs = new Set(state.technologies);
  for (const ev of events) {
    if (ev.type === 'tech_discovered') projectedTechs.add(ev.tech_id);
  }
  const projectedState: WorldState = {
    ...state,
    technologies: Array.from(projectedTechs),
  };
  if (shouldAdvanceEra(projectedState)) {
    const to = nextEra(state.era);
    if (to && TECH_POOLS[to].length > 0) {
      events.push({ type: 'era_transition', from: state.era, to });
    }
  }

  // Pase 9 — IA de dioses rivales (Sprint 10). Ciclo de decisión con
  // rítmico anti-presión; puede emitir `rival_anoint`.
  const rivalResult = decideRivalActions({ ...state, prng_cursor: prng.cursor });
  if (rivalResult.events.length > 0) {
    events.push(...rivalResult.events);
  }
  prng = { seed: state.seed, cursor: rivalResult.prng_cursor };
  // Marcar que los rivales han evaluado el ciclo (actúen o no). Esto
  // respeta el anti-presión del Pillar 4: no pueden reconsiderar antes
  // del siguiente intervalo.
  for (const gid of rivalResult.rivalsActed) {
    events.push({ type: 'rival_decision_tick', rival_group_id: gid });
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
      const a = out.npcs.find((n) => n.id === ev.a_id);
      const b = out.npcs.find((n) => n.id === ev.b_id);
      out = {
        ...out,
        npcs: out.npcs.map((n) => {
          if (n.id === ev.a_id) return { ...n, partner_id: ev.b_id };
          if (n.id === ev.b_id) return { ...n, partner_id: ev.a_id };
          return n;
        }),
      };
      // Crónica solo para pairings cross-grupo — notorios, dramáticos.
      if (a && b && a.group_id !== b.group_id) {
        const gA = out.groups.find((g) => g.id === a.group_id)?.name ?? a.group_id;
        const gB = out.groups.find((g) => g.id === b.group_id)?.name ?? b.group_id;
        out = appendChronicle(out, {
          day: out.day,
          text: `Año ${Math.floor(out.day / 365)}, día ${(out.day % 365) + 1}. ${a.name} (${gA}) y ${b.name} (${gB}) se casaron cruzando la frontera. Las viejas dividen la sangre nueva con dedos inquietos.`,
        });
      }
    } else if (ev.type === 'follower_formed') {
      out = {
        ...out,
        npcs: out.npcs.map((n) =>
          n.id === ev.follower_id ? { ...n, follower_of: ev.leader_id } : n,
        ),
      };
    } else if (ev.type === 'faith_gained') {
      out = {
        ...out,
        player_god: {
          ...out.player_god,
          faith_points: out.player_god.faith_points + ev.amount,
        },
      };
    } else if (ev.type === 'tutorial_end') {
      if (out.tutorial_active) out = { ...out, tutorial_active: false };
    } else if (ev.type === 'tech_discovered') {
      if (!out.technologies.includes(ev.tech_id)) {
        out = { ...out, technologies: [...out.technologies, ev.tech_id] };
        const def = TECH_POOLS[out.era].find((t) => t.id === ev.tech_id);
        const label = def?.name ?? ev.tech_id;
        out = appendChronicle(out, {
          day: out.day,
          text: `Año ${Math.floor(out.day / 365)}, día ${(out.day % 365) + 1}. Los nuestros han descubierto ${label}.`,
        });
      }
    } else if (ev.type === 'rival_anoint') {
      const rival = out.rival_gods.find((r) => r.group_id === ev.rival_group_id);
      const npc = out.npcs.find((n) => n.id === ev.npc_id);
      if (!rival || !npc || !npc.alive) continue;
      if (rival.chosen_ones.includes(ev.npc_id)) continue;
      out = {
        ...out,
        rival_gods: out.rival_gods.map((r) =>
          r.group_id === ev.rival_group_id
            ? { ...r, chosen_ones: [...r.chosen_ones, ev.npc_id] }
            : r,
        ),
      };
      out = appendChronicle(out, {
        day: out.day,
        text: `Año ${Math.floor(out.day / 365)}, día ${(out.day % 365) + 1}. Los hijos de ${out.groups.find((g) => g.id === ev.rival_group_id)?.name ?? ev.rival_group_id} vieron un halo descender sobre ${npc.name}. Su dios lo ha marcado.`,
      });
    } else if (ev.type === 'rival_faith_gained') {
      if (ev.amount <= 0) continue;
      out = {
        ...out,
        rival_gods: out.rival_gods.map((r) =>
          r.group_id === ev.rival_group_id
            ? { ...r, faith_points: r.faith_points + ev.amount }
            : r,
        ),
      };
    } else if (ev.type === 'rival_decision_tick') {
      out = {
        ...out,
        rival_gods: out.rival_gods.map((r) =>
          r.group_id === ev.rival_group_id
            ? { ...r, last_decision_day: out.day }
            : r,
        ),
      };
    } else if (ev.type === 'era_transition') {
      out = { ...out, era: ev.to as WorldState['era'] };
      out = appendChronicle(out, {
        day: out.day,
        text: `Año ${Math.floor(out.day / 365)}, día ${(out.day % 365) + 1}. Una era nueva llega: cae la era ${ev.from} y asciende la era ${ev.to}.`,
      });
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
      if (n.id === victim_id) {
        return { ...n, alive: false, partner_id: null, follower_of: null };
      }
      let updated = n;
      if (updated.partner_id === victim_id) {
        updated = { ...updated, partner_id: null };
      }
      if (updated.follower_of === victim_id) {
        updated = { ...updated, follower_of: null };
      }
      return updated;
    }),
  };
}

function parseNpcSuffix(id: string): number {
  const n = parseInt(id.slice('npc_'.length), 10);
  return Number.isFinite(n) ? n : 0;
}
