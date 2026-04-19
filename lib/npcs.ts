/**
 * NPCs de la Edad Primigenia — shape canónico.
 *
 * Este módulo declara tipos y helpers puros; el drafting inicial que
 * popula 14 NPCs vive en `lib/drafting.ts` (Sprint 2.2/2.3). El
 * comportamiento (movimiento, decisiones) se inyecta en sprints
 * posteriores sin cambiar este shape.
 *
 * Contrato §A4: todo lo que va en el estado es entero o string
 * estable — nada de funciones, Map, Set, ni undefined.
 */

/** Castas sociales — §3.2 vision-primigenia, decisión #4. */
export const CASTA = {
  ELEGIDO: 'elegido',
  CIUDADANO: 'ciudadano',
  ESCLAVO: 'esclavo',
} as const;

export type Casta = (typeof CASTA)[keyof typeof CASTA];

/** Sexo biológico — decisión v1.0.1 #4 preservada (pairing hetero
 *  obligatorio en primigenia por simplicidad del modelo). */
export const SEX = {
  M: 'M',
  F: 'F',
} as const;

export type Sex = (typeof SEX)[keyof typeof SEX];

/** Los 8 vientos/linajes — §3.9 vision-primigenia, decisión #14. */
export const LINAJE = {
  TRAMUNTANA: 'tramuntana',
  LLEVANT: 'llevant',
  MIGJORN: 'migjorn',
  PONENT: 'ponent',
  XALOC: 'xaloc',
  MESTRAL: 'mestral',
  GREGAL: 'gregal',
  GARBI: 'garbi',
} as const;

export type Linaje = (typeof LINAJE)[keyof typeof LINAJE];

/** 8 arquetipos del drafting de Elegidos — decisión #2. */
export const ARCHETYPE = {
  CAZADOR: 'cazador',
  RECOLECTOR: 'recolector',
  CURANDERO: 'curandero',
  ARTESANO: 'artesano',
  LIDER: 'lider',
  SCOUT: 'scout',
  TEJEDOR: 'tejedor',
  PESCADOR: 'pescador',
} as const;

export type Archetype = (typeof ARCHETYPE)[keyof typeof ARCHETYPE];

/** Stats individuales 0-100 — §3.3 vision-primigenia. La economía
 *  relacional (tercera dimensión) vive fuera del NPC, en el grafo
 *  `state.relations` (Sprint 4.4). */
export interface NPCStats {
  supervivencia: number;
  socializacion: number;
}

/** Skills individuales (decisión #11: herencia 50%). */
export interface NPCSkills {
  hunting: number;
  gathering: number;
  crafting: number;
  fishing: number;
  healing: number;
}

export interface Position {
  x: number;
  y: number;
}

/** Inventario personal del NPC. Enteros; cap por tipo en
 *  INVENTORY_CAP_PER_TYPE (constante viva en lib/harvest.ts).
 *  Agua no se guarda — se consume on-the-spot (recovery vía
 *  tickNeeds). */
export interface NPCInventory {
  wood: number;
  stone: number;
  berry: number;
  game: number;
  fish: number;
}

/** NPC = entero individual del clan. Incluye Elegidos, Ciudadanos y
 *  Esclavos (si los hubiera — en drafting inicial no aparecen). */
export interface NPC {
  id: string;
  sex: Sex;
  casta: Casta;
  linaje: Linaje;
  /** Arquetipo solo para Elegidos drafteados. Ciudadanos / Esclavos
   *  heredan stats del drafting sin arquetipo nominal. */
  archetype: Archetype | null;
  /** Estado actual. Se actualiza tick a tick. */
  stats: NPCStats;
  skills: NPCSkills;
  position: Position;
  visionRadius: number;
  /** ids de los padres (orden canónico: el menor primero). null si
   *  fundador del drafting inicial. */
  parents: [string, string] | null;
  /** Rasgos activos — máx 3 simultáneos (§3.8 milagros). Orden
   *  canónico: más antiguo primero. */
  traits: string[];
  /** Tick en que nació el NPC (0 si fundador). */
  birthTick: number;
  /** Si está vivo. Cuando muere se marca false y el NPC deja de
   *  consumirse en ticks, pero permanece en `state.npcs` para que
   *  crónica / verdict / grafo de relaciones puedan referenciarlo. */
  alive: boolean;
  /** Inventario — Sprint 4.2. Agua no se guarda. */
  inventory: NPCInventory;
}

/** Helper para tests — construye un NPC con defaults razonables y
 *  overrides por nombre. No se usa en producción. */
export function makeTestNPC(overrides: Partial<NPC> & { id: string }): NPC {
  return {
    sex: SEX.M,
    casta: CASTA.CIUDADANO,
    linaje: LINAJE.TRAMUNTANA,
    archetype: null,
    stats: { supervivencia: 80, socializacion: 60 },
    skills: {
      hunting: 20,
      gathering: 20,
      crafting: 20,
      fishing: 20,
      healing: 20,
    },
    position: { x: 0, y: 0 },
    visionRadius: 6,
    parents: null,
    traits: [],
    birthTick: 0,
    alive: true,
    inventory: { wood: 0, stone: 0, berry: 0, game: 0, fish: 0 },
    ...overrides,
  };
}
