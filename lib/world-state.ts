/**
 * Esqueleto del estado del mundo — GODGAME v0.1 (MVP).
 *
 * Este fichero define los tipos + el constructor de `initialState`.
 * Regla de oro (§A4 de la Visión): el estado es JSON puro, plano, sin
 * clases ni métodos ni referencias circulares. `JSON.stringify(state)` y
 * `JSON.parse()` deben ser round-trip perfectos.
 *
 * El MVP tiene UN solo grupo activo (`tramuntana`). `rival_gods` existe
 * como array vacío desde día uno para que en v0.3 los dioses rivales se
 * añadan sin refactor.
 */

import { nextChoice, nextInt, nextRange, seedState, type PRNGState } from './prng';

export type Era =
  | 'tribal'
  | 'bronce'
  | 'clasica'
  | 'medieval'
  | 'industrial'
  | 'atomica';

export interface Position {
  x: number;
  y: number;
}

export interface Stats {
  fuerza: number;
  inteligencia: number;
  agilidad: number;
}

export interface Traits {
  ambicion: number;
  lealtad: number;
  paranoia: number;
  carisma: number;
}

export interface NPC {
  id: string;
  group_id: string;
  name: string;
  age_days: number;
  position: Position;
  stats: Stats;
  traits: Traits;
  /** Ids de dones recibidos (p.ej. 'fuerza_sobrehumana'). Vacío si no es Elegido. */
  gifts: string[];
  /** Ids de los padres; vacío si es de la generación inicial. */
  parents: string[];
  alive: boolean;
}

export interface Group {
  id: string;
  name: string;
}

export interface PlayerGod {
  group_id: string;
  faith_points: number;
  /** Ids de NPCs marcados como Elegido. */
  chosen_ones: string[];
}

export interface RivalGod {
  group_id: string;
  /** Placeholder para v0.3 — perfil de comportamiento del dios-IA. */
  profile: 'passive' | 'aggressive' | 'opportunistic';
  faith_points: number;
  chosen_ones: string[];
}

export interface ChronicleEntry {
  day: number;
  text: string;
}

export interface WorldState {
  seed: number;
  prng_cursor: number;
  day: number;
  era: Era;
  tutorial_active: boolean;
  player_god: PlayerGod;
  rival_gods: RivalGod[];
  groups: Group[];
  npcs: NPC[];
  chronicle: ChronicleEntry[];
}

// ---------------------------------------------------------------------------
// Pools de nombres y apellidos catalano-baleares (§9 del Vision Document).
// Mantener en este fichero para que un solo `state.seed` reproduzca todo.
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Joan', 'Mateu', 'Aina', 'Elionor', 'Tomeu', 'Miquel', 'Catalina',
  'Jaume', 'Clara', 'Pere', 'Maria', 'Guillem', 'Antònia', 'Bernat',
  'Margalida', 'Bartomeu', 'Coloma', 'Ferran', 'Joana', 'Esteve',
  'Magdalena', 'Arnau', 'Francina', 'Sebastià', 'Isabel',
] as const;

const LAST_NAMES = [
  'Ferrer', 'Riera', 'Coll', 'Bauzà', 'Moll', 'Roig', 'Mas', 'Pons',
  'Vidal', 'Oliver', 'Torres', 'Ramis', 'Serra', 'Amengual',
  'Estelrich', 'Tous', 'Sastre', 'Barceló',
] as const;

const DEFAULT_GROUP: Group = { id: 'tramuntana', name: 'Hijos de Tramuntana' };

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function generateStat(prng: PRNGState): { value: number; next: PRNGState } {
  // Stats iniciales en [20, 80] para dejar margen a dones (+50, clamp 150)
  // y a mutaciones negativas futuras.
  return nextInt(prng, 20, 81);
}

function generateTrait(prng: PRNGState): { value: number; next: PRNGState } {
  // Rasgos mentales [0, 100] uniformes — la variedad es lo que importa.
  return nextInt(prng, 0, 101);
}

function generateNpc(
  prng: PRNGState,
  id: string,
  group_id: string,
  mapSize: number,
): { npc: NPC; next: PRNGState } {
  let s = prng;

  const firstName = nextChoice(s, FIRST_NAMES);
  s = firstName.next;
  const lastName = nextChoice(s, LAST_NAMES);
  s = lastName.next;

  const px = nextRange(s, 0, mapSize);
  s = px.next;
  const py = nextRange(s, 0, mapSize);
  s = py.next;

  const fuerza = generateStat(s);
  s = fuerza.next;
  const inteligencia = generateStat(s);
  s = inteligencia.next;
  const agilidad = generateStat(s);
  s = agilidad.next;

  const ambicion = generateTrait(s);
  s = ambicion.next;
  const lealtad = generateTrait(s);
  s = lealtad.next;
  const paranoia = generateTrait(s);
  s = paranoia.next;
  const carisma = generateTrait(s);
  s = carisma.next;

  const startingAge = nextInt(s, 15 * 365, 40 * 365);
  s = startingAge.next;

  return {
    npc: {
      id,
      group_id,
      name: `${firstName.value} ${lastName.value}`,
      age_days: startingAge.value,
      position: { x: px.value, y: py.value },
      stats: {
        fuerza: fuerza.value,
        inteligencia: inteligencia.value,
        agilidad: agilidad.value,
      },
      traits: {
        ambicion: ambicion.value,
        lealtad: lealtad.value,
        paranoia: paranoia.value,
        carisma: carisma.value,
      },
      gifts: [],
      parents: [],
      alive: true,
    },
    next: s,
  };
}

// ---------------------------------------------------------------------------
// Constructor principal
// ---------------------------------------------------------------------------

export interface InitialStateOptions {
  /** Número de NPCs a sembrar. MVP usa 50. */
  npcCount?: number;
  /** Tamaño del mapa cuadrado (unidades arbitrarias). MVP usa 100. */
  mapSize?: number;
  /** Empezar con el tutorial activo. Default true. */
  tutorial?: boolean;
}

/**
 * Construye un estado inicial determinista dado una semilla.
 *
 * Contrato duro:
 *   - Misma semilla + mismas opciones ⇒ MISMO output byte-a-byte.
 *   - El estado es JSON puro (ver test de round-trip en world-state.test.ts).
 *   - Todos los NPCs pertenecen al grupo del jugador. El MVP NO siembra
 *     NPCs en grupos rivales; eso es scope de v0.3.
 */
export function initialState(
  seed: number,
  options: InitialStateOptions = {},
): WorldState {
  const npcCount = options.npcCount ?? 50;
  const mapSize = options.mapSize ?? 100;
  const tutorial = options.tutorial ?? true;

  let prng = seedState(seed);

  const npcs: NPC[] = [];
  for (let i = 0; i < npcCount; i++) {
    const { npc, next: n } = generateNpc(
      prng,
      `npc_${i.toString().padStart(4, '0')}`,
      DEFAULT_GROUP.id,
      mapSize,
    );
    npcs.push(npc);
    prng = n;
  }

  return {
    seed,
    prng_cursor: prng.cursor,
    day: 0,
    era: 'tribal',
    tutorial_active: tutorial,
    player_god: {
      group_id: DEFAULT_GROUP.id,
      faith_points: 0, // el primer Elegido es gratis (§A1)
      chosen_ones: [],
    },
    rival_gods: [], // MVP no tiene rivales; v0.3 los poblará aquí
    groups: [DEFAULT_GROUP],
    npcs,
    chronicle: [],
  };
}
