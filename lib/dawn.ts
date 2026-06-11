/**
 * Pipeline del amanecer — Sprint 02 (línea C, "El Loop primero").
 *
 * El amanecer es la columna vertebral del loop: aquí se cierra el día que
 * termina y arranca el siguiente. Su orden fue fuente de bugs (gratitud
 * post-reset), así que queda blindado como DATO exportado (`DAWN_PIPELINE`):
 * nunca más orden implícito repartido por el tick.
 *
 * §A4: todo puro, determinista, enteros, round-trip JSON.
 *
 * Orden (acordado en la spec 02 + enmienda Memoria Mecánica v2):
 *   1. gratitud-amanecer — pulso del día que cierra + drain de silencio + gracia
 *   2. noches-fogata     — ¿contó la noche para el monumento?
 *   3. friccion-divina   — tickFractures lee contadores PRE-reset; sus grants
 *                          de gratitud cuentan contra el cap del día que cierra
 *   4. consolidar-xp     — stub (Sprint 03: XP por actividad → skills)
 *   5. informe-amanecer  — stub (Sprint 04: plan vs resultado para la UI)
 *   6. reset-diario      — contadores diarios a cero (SIEMPRE tras fricción)
 *   7. clima             — transición climática del nuevo día (consume PRNG)
 */

import type { DawnReport, FeatureFlags, GameState, MotivoFallo } from './game-state';
import { isFeatureOn } from './game-state';
import type { NPC, AssignmentDomain } from './npcs';
import { ASSIGNMENT_DOMAINS } from './npcs';
import { TICKS_PER_DAY } from './resources';
import {
  applyGratitudeDelta,
  computeSilenceDrainPerDay,
  evaluateDawnGratitude,
  resetGratitudeDailyTracking,
} from './gratitude';
import { evaluateNight } from './nights';
import { tickFractures } from './events';
import { tickClimate } from './climate';
import { firstStructureOfKind } from './structures';
import { CRAFTABLE } from './crafting';
import { decodeFogBitmap } from './fog';

/** Designios de un anochecer: npcId → dominio (asigna) o null (LIMPIA — vuelta a libre). */
export type Assignments = Readonly<Record<string, AssignmentDomain | null>>;

/** Conexión (Sprint 05): dominio del designio → actividad diaria que lo cumple. */
const DOMINIO_ACTIVIDAD: Record<AssignmentDomain, 'harvested' | 'built' | 'discovered'> = {
  recoleccion: 'harvested',
  construccion: 'built',
  exploracion: 'discovered',
};

/** El ✓ tiene precio (Sprint 05b): cumplido ⟺ actividad-del-dominio ≥ umbral.
 *  Sondeados en el laboratorio escaso (seeds 1/3/5/7, 11-06-2026): separan al
 *  rozador drive-by (0-14 / ≤46 / 56-72) del trabajador real (19+ / 100+ / 246+). */
export const UMBRAL_CUMPLIDO: Record<AssignmentDomain, number> = {
  recoleccion: 15,
  construccion: 100,
  exploracion: 50,
};

/** ¿Queda al menos un tile oculto? Early-exit sobre el bitmap (barato). */
function quedaNiebla(state: GameState): boolean {
  const bytes = decodeFogBitmap(state.fog.bitmap);
  const total = state.fog.width * state.fog.height;
  for (let i = 0; i < total; i++) {
    if ((bytes[i >> 3] & (1 << (i & 7))) === 0) return true;
  }
  return false;
}

/** El fallo dice por qué (Sprint 05b). Solo se llama con cumplido === 'fallido'. */
function motivoDelFallo(
  state: GameState,
  designio: AssignmentDomain,
  hecho: { harvested: number; built: number; discovered: number },
  hayNiebla: () => boolean,
): MotivoFallo {
  if (designio === 'construccion' && state.buildProject === null && hecho.built === 0) {
    return 'sin-obra-pendiente'; // el designio no tenía objeto
  }
  if (designio === 'exploracion' && !hayNiebla()) {
    return 'sin-frontera'; // mapa 100% descubierto: no quedaba tierra
  }
  return 'corto'; // hubo donde trabajar, no llegó al umbral
}

/** Informe del día que cierra (clan + por-NPC + cumplimiento de designios).
 *  Puro; lee dailyActivity, así que debe correr ANTES de reset-diario. Lo usan
 *  el paso 'informe-amanecer' y el boundary del anochecer en tick() (phasedMode):
 *  la pantalla de preparación habla del día que ACABA de cerrar, no del anterior. */
export function computeDawnReport(state: GameState): DawnReport {
  const day = Math.floor(state.tick / TICKS_PER_DAY);
  const alive = state.npcs.filter((n) => n.alive);
  // Popcount del fog: lazy + memo — solo si algún explorador falló.
  let niebla: boolean | null = null;
  const hayNiebla = () => (niebla ??= quedaNiebla(state));
  const npcs = alive.map((n) => {
    const designio = n.designio ?? null;
    const hecho = {
      harvested: n.dailyActivity?.harvested ?? 0,
      built: n.dailyActivity?.built ?? 0,
      discovered: n.dailyActivity?.discovered ?? 0,
    };
    // Conexión (Sprint 05): ¿cumplió el designio? Solo cuenta la actividad
    // en SU dominio, y desde 05b el ✓ exige el umbral (no el roce > 0);
    // sin designio → null (no 'fallido').
    const cumplido =
      designio === null
        ? null
        : hecho[DOMINIO_ACTIVIDAD[designio]] >= UMBRAL_CUMPLIDO[designio]
          ? ('cumplido' as const)
          : ('fallido' as const);
    // motivo SOLO en fallidos — clave AUSENTE en el resto (round-trip limpio).
    return {
      id: n.id,
      name: n.name,
      designio,
      cumplido,
      ...hecho,
      ...(cumplido === 'fallido'
        ? { motivo: motivoDelFallo(state, designio!, hecho, hayNiebla) }
        : {}),
    };
  });
  const clan = npcs.reduce(
    (acc, n) => ({
      harvested: acc.harvested + n.harvested,
      built: acc.built + n.built,
      discovered: acc.discovered + n.discovered,
      deaths: acc.deaths,
      designiosCumplidos: acc.designiosCumplidos + (n.cumplido === 'cumplido' ? 1 : 0),
      designiosDados: acc.designiosDados + (n.designio !== null ? 1 : 0),
    }),
    {
      harvested: 0,
      built: 0,
      discovered: 0,
      deaths: state.village.dailyDeaths || 0,
      designiosCumplidos: 0,
      designiosDados: 0,
    },
  );
  return { day, clan, npcs };
}

export interface DawnStep {
  name: string;
  /** Flag que gobierna el paso (Sprint 05). OFF → el paso NO corre (se salta
   *  entero, ni avanza prng). Sin flag = paso núcleo, corre siempre. */
  feature?: keyof FeatureFlags;
  run(state: GameState): GameState;
}

export const DAWN_PIPELINE: readonly DawnStep[] = [
  {
    name: 'gratitud-amanecer',
    run(state) {
      let v = evaluateDawnGratitude(state.village, state.village.activeMessage);
      const drain = computeSilenceDrainPerDay(v);
      if (drain > 0) v = applyGratitudeDelta(v, -drain);
      if (v.silenceGraceDaysRemaining > 0 && v.activeMessage === null) {
        v = { ...v, silenceGraceDaysRemaining: v.silenceGraceDaysRemaining - 1 };
      }
      return { ...state, village: v };
    },
  },
  {
    name: 'noches-fogata',
    run(state) {
      const nights = evaluateNight(state.structures, state.npcs, state.village.consecutiveNightsAtFire);
      return { ...state, village: { ...state.village, consecutiveNightsAtFire: nights } };
    },
  },
  {
    name: 'friccion-divina',
    feature: 'fractures',
    run(state) {
      return tickFractures(state).state;
    },
  },
  {
    name: 'consolidar-xp',
    // Sprint 03: la XP de actividad del día (centésimas enteras) se consolida
    // en las skills almacenadas; el resto (<100) se conserva para mañana.
    // skill_efectiva = base(+xp consolidada) ± memoria(transitoria, v2).
    run(state) {
      const npcs = state.npcs.map((n) => {
        if (!n.alive || !n.skillXP) return n;
        const skills = { ...n.skills };
        const rest: Partial<typeof n.skills> = {};
        let changed = false;
        for (const key of Object.keys(n.skillXP) as (keyof typeof n.skills)[]) {
          const xp = n.skillXP[key] ?? 0;
          const whole = Math.floor(xp / 100);
          if (whole > 0) {
            skills[key] = Math.max(0, Math.min(100, skills[key] + whole));
            changed = true;
          }
          rest[key] = xp % 100;
        }
        return changed || Object.keys(rest).length > 0 ? { ...n, skills, skillXP: rest } : n;
      });
      return { ...state, npcs };
    },
  },
  {
    name: 'informe-amanecer',
    // Sprint 04a: el espejo del hook "ver que se cumple". Informe del día que
    // cierra (clan + por-NPC: designio asignado vs hecho). Es ESTADO — la UI
    // (04b) solo lo pinta. Corre ANTES de reset-diario (lee dailyActivity).
    run(state) {
      return { ...state, dawnReport: computeDawnReport(state) };
    },
  },
  {
    name: 'reset-diario',
    run(state) {
      // Limpia contadores diarios de aldea y de NPCs (dailyActivity se borra
      // como clave — round-trip JSON limpio, no undefined almacenado).
      const npcs = state.npcs.map((n) => {
        if (!n.dailyActivity) return n;
        const { dailyActivity: _drop, ...rest } = n;
        return rest;
      });
      return { ...state, npcs, village: resetGratitudeDailyTracking(state.village) };
    },
  },
  {
    name: 'clima',
    feature: 'climate',
    run(state) {
      const { state: climate, next: prng } = tickClimate(state.climate, state.prng);
      return { ...state, climate, prng };
    },
  },
];

/** Aplica el pipeline completo del amanecer y deja la fase en 'day'.
 *  Puro: state -> new_state. El caller decide cuándo (boundary de día). */
export function dawn(state: GameState): GameState {
  let s = state;
  for (const step of DAWN_PIPELINE) {
    if (step.feature && !isFeatureOn(s, step.feature)) continue;
    s = step.run(s);
  }
  return { ...s, phase: 'day' };
}

/**
 * Arranca el día siguiente desde la fase de preparación (línea C).
 * Registra los designios válidos (NPC vivo + dominio del PoC, o null explícito
 * = LIMPIEZA; lo demás se descarta en silencio — no-op explícito, jamás throw),
 * guarda el historial, corre el amanecer y cruza el anochecer (tick+1).
 * Fuera de 'preparation' es un no-op que devuelve el estado tal cual.
 */
export function applyAssignments(state: GameState, assignments: Assignments): GameState {
  if (state.phase !== 'preparation') return state;

  const aliveIds = new Set(state.npcs.filter((n) => n.alive).map((n) => n.id));
  const valid: Record<string, AssignmentDomain | null> = {};
  // Orden estable por id (nunca por orden de inserción del objeto).
  for (const npcId of Object.keys(assignments).sort()) {
    const domain = assignments[npcId];
    if (!aliveIds.has(npcId)) continue;
    // null explícito = LIMPIEZA (vuelta a libre); dominio válido = asignación.
    if (domain !== null && !(ASSIGNMENT_DOMAINS as readonly string[]).includes(domain)) continue;
    valid[npcId] = domain;
  }

  // El amanecer corre ANTES de sobreescribir designios: el informe del día
  // que cierra lee los designios que estuvieron ACTIVOS ese día, no los de
  // mañana (Conexión, Sprint 05). Consume el tick del anochecer.
  const dawned = dawn(state);

  const npcs: NPC[] = dawned.npcs.map((n) => {
    if (!Object.prototype.hasOwnProperty.call(valid, n.id)) return n;
    const domain = valid[n.id];
    if (domain === null) {
      // Limpieza: el designio se borra como clave (patrón reset-diario —
      // round-trip JSON limpio, no null almacenado).
      const { designio: _drop, ...rest } = n;
      return rest;
    }
    return { ...n, designio: domain };
  });

  const day = Math.floor((state.tick + 1) / TICKS_PER_DAY);
  return {
    ...dawned,
    npcs,
    // `?? []`: saves anteriores al Sprint 02 no traen historial (compat).
    assignmentsHistory: [...(dawned.assignmentsHistory ?? []), { day, assignments: valid }],
    tick: state.tick + 1,
  };
}

/**
 * Punto de reunión del clan al anochecer. Hoy es la fogata permanente;
 * mañana será el centro de la ciudad (decisión modelo-espacial 10-06-2026:
 * no hardcodear "fogata" en el loop). null si aún no existe.
 */
export function gatherPoint(state: GameState): { x: number; y: number } | null {
  const fire = firstStructureOfKind(state.structures, CRAFTABLE.FOGATA_PERMANENTE);
  return fire ? { x: fire.position.x, y: fire.position.y } : null;
}
