/**
 * Esqueleto del estado del mundo — GODGAME v0.1 → v0.3.
 *
 * Este fichero define los tipos + el constructor de `initialState`.
 * Regla de oro (§A4 de la Visión): el estado es JSON puro, plano, sin
 * clases ni métodos ni referencias circulares. `JSON.stringify(state)` y
 * `JSON.parse()` deben ser round-trip perfectos.
 *
 * v0.3 añade multi-grupo: pasando `playerGroupId` en opciones se activan
 * los 3 pueblos baleares y se pueblan los `rival_gods` con perfiles IA.
 * Sin ese option el estado queda en compat v0.1 (1 grupo, 50 NPCs).
 */

import { next, nextChoice, nextInt, nextRange, seedState, type PRNGState } from './prng';

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

export type Sex = 'M' | 'F';

export interface NPC {
  id: string;
  group_id: string;
  name: string;
  age_days: number;
  /**
   * Sexo binario M|F (v1.0.1 decisión #2 opción A). Requerido para
   * pairing heterosexual reproductivo. Modelos no-binarios o roles
   * no-reproductivos quedan para v1.1+ si aparece demanda.
   */
  sex: Sex;
  position: Position;
  stats: Stats;
  traits: Traits;
  /** Ids de dones recibidos (p.ej. 'fuerza_sobrehumana'). Vacío si no es Elegido. */
  gifts: string[];
  /** Ids de los padres; vacío si es de la generación inicial. */
  parents: string[];
  alive: boolean;
  /**
   * Id de la pareja vinculada. `null` si soltero/a. Invariante: si a.partner_id = b.id,
   * entonces b.partner_id = a.id. Si uno de los dos muere, el otro vuelve a null.
   */
  partner_id: string | null;
  /**
   * Id del líder al que este NPC sigue. `null` si no es seguidor. El bono
   * del liderazgo (Pillar 1) se evalúa en función de los traits del líder,
   * no de los del seguidor. Al morir el líder, el seguidor vuelve a null.
   */
  follower_of: string | null;
  /**
   * `true` si alguno de sus padres era Elegido del jugador o a su vez
   * descendiente de un Elegido. Propagación hereditaria — nunca se apaga.
   * Relevante para la economía de Fe (Sprint 4): los descendientes generan
   * Fe igual que los Elegidos directos.
   */
  descends_from_chosen: boolean;
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
  /**
   * Contador monotónico de dones concedidos por el jugador. Determina el
   * coste del siguiente don (§A1: el primero es gratis; a partir del
   * segundo, GIFT_COST Fe).
   */
  gifts_granted: number;
}

export interface RivalGod {
  group_id: string;
  /** Perfil de comportamiento del dios-IA (Sprint 10). */
  profile: 'passive' | 'aggressive' | 'opportunistic';
  faith_points: number;
  chosen_ones: string[];
  /**
   * Día del último ciclo de decisión. El scheduler solo evalúa un nuevo
   * ciclo tras `RIVAL_DECISION_INTERVAL` días. Regla anti-presión del
   * Pillar 4: el jugador nunca ve al rival decidiendo en ráfaga.
   */
  last_decision_day: number;
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
  /**
   * Id del NPC señalado por el onboarding coreografiado (§A1, Sprint 5a).
   * Fijado en `initialState` al NPC con mayor ambición. Desempate por id
   * más bajo — determinista. `null` si la partida arranca sin tutorial.
   */
  tutorial_highlight_id: string | null;
  player_god: PlayerGod;
  rival_gods: RivalGod[];
  groups: Group[];
  npcs: NPC[];
  chronicle: ChronicleEntry[];
  /**
   * Id numérico que recibirá el próximo NPC generado (nacimiento). Monotónico.
   * Los NPCs se identifican como `npc_XXXX` con padding a 4 dígitos. Cuando se
   * supere `npc_9999` el padding se ensancha (mientras tanto trivial-correcto).
   */
  next_npc_id: number;
  /**
   * Tecnologías descubiertas hasta ahora. En tribal arranca con ['fuego'].
   * Las siguientes se obtienen mediante el pase de descubrimiento del
   * scheduler (probabilidad proporcional a población viva + intelig.).
   * El pool de cada era está definido en `lib/tech.ts`.
   */
  technologies: string[];
  /**
   * Decisión del dilema nuclear (v1.0.1 #5). `null` hasta que el
   * player elige; luego `'given'` (concede la bomba — sombra) o
   * `'withheld'` (mantiene el secreto). Decisión irrevocable.
   */
  nuclear_decision: 'given' | 'withheld' | null;
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

/**
 * Catálogo de grupos disponibles en v0.3 (§A5 — "Menú selector de grupos").
 * Cada uno lleva nombres de vientos baleares y un cluster territorial en
 * el mapa. Mismo conteo de NPCs por grupo → partida balanceada al arrancar;
 * la personalidad la aportan los traits generados por el PRNG.
 */
export const GROUPS: ReadonlyArray<Group & { center: Position; color: string }> = [
  { id: 'tramuntana', name: 'Hijos de Tramuntana', center: { x: 28, y: 28 }, color: '#1e3a8a' },
  { id: 'llevant', name: 'Hijos de Llevant', center: { x: 72, y: 28 }, color: '#7c2d12' },
  { id: 'migjorn', name: 'Hijos de Migjorn', center: { x: 50, y: 72 }, color: '#065f46' },
] as const;

export const DEFAULT_GROUP_ID = GROUPS[0].id;

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

  const sexRoll = next(s);
  s = sexRoll.next;
  const sex: Sex = sexRoll.value < 0.5 ? 'M' : 'F';

  return {
    npc: {
      id,
      group_id,
      name: `${firstName.value} ${lastName.value}`,
      age_days: startingAge.value,
      sex,
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
      partner_id: null,
      follower_of: null,
      descends_from_chosen: false,
    },
    next: s,
  };
}

// ---------------------------------------------------------------------------
// Constructor principal
// ---------------------------------------------------------------------------

export interface InitialStateOptions {
  /** Número de NPCs a sembrar. MVP v0.1 usaba 50; v0.3 reparte entre grupos. */
  npcCount?: number;
  /** Tamaño del mapa cuadrado (unidades arbitrarias). MVP usa 100. */
  mapSize?: number;
  /** Empezar con el tutorial activo. Default true. */
  tutorial?: boolean;
  /**
   * Id del grupo del jugador (v0.3). Si está presente y existe en `GROUPS`,
   * se poblan dioses rivales para los demás grupos y los NPCs se reparten
   * en clusters territoriales. Si es undefined, partida compat. v0.1 (1 grupo).
   */
  playerGroupId?: string;
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
  const mapSize = options.mapSize ?? 100;
  const tutorial = options.tutorial ?? true;
  const playerGroupId = options.playerGroupId;

  // Modo multi-grupo si el caller pide playerGroupId y existe en el catálogo.
  const multiGroup =
    playerGroupId !== undefined &&
    GROUPS.some((g) => g.id === playerGroupId);

  const activeGroups: ReadonlyArray<Group & { center: Position }> = multiGroup
    ? GROUPS
    : [{ ...DEFAULT_GROUP, center: { x: mapSize / 2, y: mapSize / 2 } }];

  const totalNpcCount =
    options.npcCount ?? (multiGroup ? activeGroups.length * 12 : 50);

  let prng = seedState(seed);

  const npcs: NPC[] = [];
  let npcIdx = 0;
  const perGroup = Math.floor(totalNpcCount / activeGroups.length);
  const remainder = totalNpcCount - perGroup * activeGroups.length;
  for (let g = 0; g < activeGroups.length; g++) {
    const group = activeGroups[g];
    const count = perGroup + (g === 0 ? remainder : 0);
    for (let i = 0; i < count; i++) {
      const { npc, next: n } = generateNpc(
        prng,
        npcIdString(npcIdx++),
        group.id,
        mapSize,
      );
      prng = n;
      if (multiGroup) {
        // Clustering territorial: posicionar cerca del centro del grupo
        // reutilizando la entropía del generador (el jitter viene del
        // position.x/y ya generado, mapeado a ±jitterSize/2).
        const jitterSize = 18;
        const cx = group.center.x;
        const cy = group.center.y;
        const x = Math.max(
          0,
          Math.min(
            mapSize,
            cx - jitterSize / 2 + (npc.position.x / mapSize) * jitterSize,
          ),
        );
        const y = Math.max(
          0,
          Math.min(
            mapSize,
            cy - jitterSize / 2 + (npc.position.y / mapSize) * jitterSize,
          ),
        );
        npcs.push({ ...npc, position: { x, y } });
      } else {
        npcs.push(npc);
      }
    }
  }

  // Señalamiento del NPC más ambicioso del grupo del jugador (§A1).
  // En multi-grupo, el halo apunta solo a un candidato de los nuestros.
  let highlight: NPC | null = null;
  if (tutorial) {
    const playerId = playerGroupId ?? DEFAULT_GROUP.id;
    for (const n of npcs) {
      if (n.group_id !== playerId) continue;
      if (!highlight || n.traits.ambicion > highlight.traits.ambicion) {
        highlight = n;
      }
    }
  }

  return {
    seed,
    prng_cursor: prng.cursor,
    day: 0,
    era: 'tribal',
    tutorial_active: tutorial,
    tutorial_highlight_id: highlight?.id ?? null,
    player_god: {
      group_id: playerGroupId ?? DEFAULT_GROUP.id,
      faith_points: 0, // el primer Elegido es gratis (§A1)
      chosen_ones: [],
      gifts_granted: 0,
    },
    rival_gods: multiGroup
      ? activeGroups
          .filter((g) => g.id !== playerGroupId)
          .map((g, i): RivalGod => ({
            group_id: g.id,
            // Alternamos perfiles para que una partida tenga variedad.
            profile: i === 0 ? 'aggressive' : 'opportunistic',
            faith_points: 0,
            chosen_ones: [],
            last_decision_day: 0,
          }))
      : [],
    groups: activeGroups.map(({ id, name }) => ({ id, name })),
    npcs,
    chronicle: [],
    next_npc_id: npcs.length,
    technologies: ['fuego'],
    nuclear_decision: null,
  };
}

// ---------------------------------------------------------------------------
// Generador de NPCs en tiempo de ejecución (nacimientos en el scheduler).
// ---------------------------------------------------------------------------

/**
 * Genera un NPC recién nacido como hijo de dos padres. Pura — consume PRNG
 * y devuelve el nuevo cursor. El cursor debe venir del scheduler.
 *
 * El recién nacido empieza con:
 *   - age_days: 0
 *   - stats: media de los padres ± pequeña variación determinista
 *   - traits: uniformes en [0,100] (la cultura aún no influye en genética)
 *   - position: la de uno de los padres (elegido del PRNG)
 *   - alive: true, sin dones, sin pareja
 */
export function generateNewborn(
  prng: PRNGState,
  id: string,
  parentA: NPC,
  parentB: NPC,
  parentsAreHoly: boolean = false,
): { npc: NPC; next: PRNGState } {
  let s = prng;

  const firstName = nextChoice(s, FIRST_NAMES);
  s = firstName.next;
  // El apellido se hereda del primer padre (convención catalano-balear
  // simplificada). Si el padre no tiene apellido detectable, usar pool.
  const inheritedLast = parentA.name.split(' ').slice(-1)[0] ?? null;
  let lastNameValue: string;
  if (inheritedLast && (LAST_NAMES as readonly string[]).includes(inheritedLast)) {
    lastNameValue = inheritedLast;
  } else {
    const lastName = nextChoice(s, LAST_NAMES);
    s = lastName.next;
    lastNameValue = lastName.value;
  }

  const nearParent = nextChoice(s, [parentA, parentB] as const);
  s = nearParent.next;

  const ambicion = nextInt(s, 0, 101);
  s = ambicion.next;
  const lealtad = nextInt(s, 0, 101);
  s = lealtad.next;
  const paranoia = nextInt(s, 0, 101);
  s = paranoia.next;
  const carisma = nextInt(s, 0, 101);
  s = carisma.next;

  const sexRoll = next(s);
  s = sexRoll.next;
  const sex: Sex = sexRoll.value < 0.5 ? 'M' : 'F';

  const clamp = (n: number) => Math.max(1, Math.min(99, n));

  return {
    npc: {
      id,
      group_id: parentA.group_id,
      name: `${firstName.value} ${lastNameValue}`,
      age_days: 0,
      sex,
      position: { ...nearParent.value.position },
      stats: {
        fuerza: clamp(Math.round((parentA.stats.fuerza + parentB.stats.fuerza) / 2)),
        inteligencia: clamp(
          Math.round((parentA.stats.inteligencia + parentB.stats.inteligencia) / 2),
        ),
        agilidad: clamp(
          Math.round((parentA.stats.agilidad + parentB.stats.agilidad) / 2),
        ),
      },
      traits: {
        ambicion: ambicion.value,
        lealtad: lealtad.value,
        paranoia: paranoia.value,
        carisma: carisma.value,
      },
      gifts: [],
      parents: [parentA.id, parentB.id],
      alive: true,
      partner_id: null,
      follower_of: null,
      // Herencia de Fe: si algún padre es Elegido o desciende de uno,
      // el bebé hereda la condición de linaje sagrado.
      descends_from_chosen:
        parentsAreHoly ||
        parentA.descends_from_chosen ||
        parentB.descends_from_chosen,
    },
    next: s,
  };
}

/** Formatea un id numérico como `npc_XXXX` con padding a 4 dígitos. */
export function npcIdString(n: number): string {
  return `npc_${n.toString().padStart(4, '0')}`;
}
