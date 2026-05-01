/**
 * Árbol Tecnológico Emergente — Ejes de Cultura (§3.10).
 *
 * Las tecnologías surgen del comportamiento del clan, no de una
 * elección activa del jugador. Cada tech aporta puntos a un eje cultural.
 * Cuando un eje domina, el clan adquiere un Rasgo Cultural pasivo.
 *
 * Tres ejes de tensión:
 *   Cuerpo ↔ Fuerza   (sustento vs combate)
 *   Tierra ↔ Mar      (agricultura vs exploración)
 *   Mano  ↔ Mercado   (artesanía vs comercio)
 */

import type { CraftableId } from './crafting';
import type { ItemKind } from './items';

// ─── IDs ──────────────────────────────────────────────────────────────────────

export const TECH_ID = {
  // Legado (tier 0 — backwards compat)
  HUNTING_WEAPONS: 'hunting_weapons',
  FOOD_PRESERVATION: 'food_preservation',
  BASIC_AGRICULTURE: 'basic_agriculture',
  MASONRY: 'masonry',
  CARPENTRY: 'carpentry',
  MYSTICISM: 'mysticism',

  // CUERPO (sustento)
  AHUMAR: 'ahumar',
  ESTOFADO: 'estofado',
  SALAR: 'salar',
  REFUGIO_ROBUSTO: 'refugio_robusto',

  // FUERZA (combate)
  CAZA_MAYOR: 'caza_mayor',
  HONDA: 'honda',
  ARCO: 'arco',
  GARROTE: 'garrote',

  // TIERRA (agricultura)
  DOMESTICACION: 'domesticacion',
  ROTACION: 'rotacion_cultivos',
  CALENDARIO: 'calendario_siembra',

  // MAR (exploración)
  PESCA_PROFUNDA: 'pesca_profunda',
  PIRAGUA: 'piragua',
  REDES: 'redes_pesca',

  // MANO (artesanía)
  ALFARERIA: 'alfareria',
  TELAR: 'telar',
  HERRERIA: 'herreria',

  // MERCADO (comercio)
  INTERCAMBIO: 'intercambio',
  CONTABILIDAD: 'contabilidad',
  INFLUENCIA: 'influencia_territorial',
} as const;

export type TechId = (typeof TECH_ID)[keyof typeof TECH_ID];

export const TRAIT_ID = {
  RESILIENTE:  'resiliente',   // CUERPO dominante
  GUERRERO:    'guerrero',     // FUERZA dominante
  GRANJERO:    'granjero',     // TIERRA dominante
  MARINERO:    'marinero',     // MAR dominante
  ARTESANO:    'artesano',     // MANO dominante
  COMERCIANTE: 'comerciante',  // MERCADO dominante
} as const;

export type TraitId = (typeof TRAIT_ID)[keyof typeof TRAIT_ID];

export type CulturePole = 'cuerpo' | 'fuerza' | 'tierra' | 'mar' | 'mano' | 'mercado';

export interface CultureAxis {
  cuerpo:   number;
  fuerza:   number;
  tierra:   number;
  mar:      number;
  mano:     number;
  mercado:  number;
}

export const EMPTY_CULTURE: CultureAxis = {
  cuerpo: 0, fuerza: 0, tierra: 0, mar: 0, mano: 0, mercado: 0,
};

// ─── Unlock context ───────────────────────────────────────────────────────────

/**
 * Snapshot mínimo que las condiciones de desbloqueo necesitan.
 * Se construye en `tickTech` sin dependencias circulares.
 */
export interface TechUnlockCtx {
  tick: number;
  ticksPerDay: number;
  /** Kinds de estructuras construidas. */
  builtStructures: string[];
  /** Kinds de items que existen (fabricados). */
  existingItems: string[];
  /** Tradiciones: acumulado de ticks por rol activo. */
  traditions: Record<string, number>;
  /** IDs de techs ya desbloqueadas. */
  unlockedTechs: string[];
  /** IDs de recursos presentes en el mundo (al menos 1 nodo). */
  resourcesPresent: string[];
  /** Número de NPCs vivos. */
  aliveCount: number;
}

type UnlockFn = (ctx: TechUnlockCtx) => boolean;

// ─── Effect types ─────────────────────────────────────────────────────────────

export interface TechEffect {
  unlocks?: Array<CraftableId | ItemKind>;
  bonus?: {
    gathering_speed?:  number; // multiplicador (+0.1 = +10%)
    crafting_speed?:   number;
    building_speed?:   number;
    food_nutrition?:   number;
    hunt_yield?:       number;
    fish_yield?:       number;
    item_durability?:  number;
    faith_per_tick?:   number;
    decay_reduction?:  number; // reduce supervivenciaDecay
  };
}

// ─── Technology definition ────────────────────────────────────────────────────

export interface Technology {
  id: TechId;
  name: string;
  description: string;
  pole: CulturePole;
  cultureWeight: number;
  /** Condición de emergencia: se evalúa cada X ticks. */
  unlockCondition: UnlockFn;
  /** Hint legible para el jugador. */
  unlockHint: string;
  effects: TechEffect;
  /** Para el árbol visual — columna horizontal de precedencia. */
  tier: 1 | 2 | 3;
}

// ─── Cultural Traits ──────────────────────────────────────────────────────────

export interface CulturalTrait {
  id: TraitId;
  name: string;
  description: string;
  pole: CulturePole;
  /** Umbral de puntos culturales para activarse. */
  threshold: number;
  effects: TechEffect['bonus'];
}

export const TRAIT_DEFS: Record<TraitId, CulturalTrait> = {
  [TRAIT_ID.RESILIENTE]: {
    id: TRAIT_ID.RESILIENTE, name: 'Pueblo Resiliente', pole: 'cuerpo',
    description: 'La maestría en preservar y cocinar los alimentos fortalece al clan.',
    threshold: 2,
    effects: { food_nutrition: 0.2, decay_reduction: 0.25 },
  },
  [TRAIT_ID.GUERRERO]: {
    id: TRAIT_ID.GUERRERO, name: 'Pueblo Guerrero', pole: 'fuerza',
    description: 'El arte de la caza y el combate corre por la sangre del clan.',
    threshold: 2,
    effects: { hunt_yield: 0.5 },
  },
  [TRAIT_ID.GRANJERO]: {
    id: TRAIT_ID.GRANJERO, name: 'Pueblo Granjero', pole: 'tierra',
    description: 'La tierra obedece a quienes la trabajan con paciencia.',
    threshold: 2,
    effects: { gathering_speed: 0.3 },
  },
  [TRAIT_ID.MARINERO]: {
    id: TRAIT_ID.MARINERO, name: 'Pueblo Marinero', pole: 'mar',
    description: 'El clan lee las corrientes como un libro y el mar es su hogar.',
    threshold: 2,
    effects: { fish_yield: 0.5 },
  },
  [TRAIT_ID.ARTESANO]: {
    id: TRAIT_ID.ARTESANO, name: 'Pueblo Artesano', pole: 'mano',
    description: 'Las manos de este clan convierten piedra y madera en obras de arte.',
    threshold: 2,
    effects: { item_durability: 0.25, crafting_speed: 0.3 },
  },
  [TRAIT_ID.COMERCIANTE]: {
    id: TRAIT_ID.COMERCIANTE, name: 'Pueblo Comerciante', pole: 'mercado',
    description: 'El intercambio justo y el registro fiel crean riqueza donde antes había escasez.',
    threshold: 2,
    effects: { faith_per_tick: 0.3 },
  },
};

// ─── Tech tree ────────────────────────────────────────────────────────────────

const has = (items: string[], kind: string) => items.includes(kind);
const traditionsMin = (t: Record<string, number>, role: string, min: number) =>
  (t[role] ?? 0) >= min;
const daysAlive = (tick: number, tpd: number) => Math.floor(tick / tpd);

export const TECH_DEFS: Record<TechId, Technology> = {
  // ── Legado (tier 0, sin polo) ─────────────────────────────────────────────
  // Mantenemos compatibilidad pero los redirigimos a polos existentes.
  [TECH_ID.HUNTING_WEAPONS]: {
    id: TECH_ID.HUNTING_WEAPONS, pole: 'fuerza', cultureWeight: 20, tier: 1,
    name: 'Armas de Caza', unlockHint: 'Un cazador hábil descubre cómo atar piedra a madera.',
    description: 'La piedra tallada atada a un palo cambia las posibilidades de caza para siempre.',
    unlockCondition: ctx => traditionsMin(ctx.traditions, 'cazador', 15),
    effects: { unlocks: ['spear'] },
  },
  [TECH_ID.FOOD_PRESERVATION]: {
    id: TECH_ID.FOOD_PRESERVATION, pole: 'cuerpo', cultureWeight: 20, tier: 1,
    name: 'Preservación de Alimentos',
    unlockHint: 'El clan almacena más de lo que come en un día.',
    description: 'Guardar la comida de los elementos y los animales permite sobrevivir la escasez.',
    unlockCondition: ctx => daysAlive(ctx.tick, ctx.ticksPerDay) >= 3,
    effects: { unlocks: ['despensa'] },
  },
  [TECH_ID.BASIC_AGRICULTURE]: {
    id: TECH_ID.BASIC_AGRICULTURE, pole: 'tierra', cultureWeight: 20, tier: 1,
    name: 'Recolección Eficiente',
    unlockHint: 'Los recolectores aprenden los ciclos de las plantas.',
    description: 'Observar cuándo maduran los frutos y usar cestas multiplica la cosecha.',
    unlockCondition: ctx => traditionsMin(ctx.traditions, 'recolector', 30),
    effects: { unlocks: ['basket'], bonus: { gathering_speed: 0.1 } },
  },
  [TECH_ID.MASONRY]: {
    id: TECH_ID.MASONRY, pole: 'mano', cultureWeight: 20, tier: 1,
    name: 'Albañilería Primitiva',
    unlockHint: 'El tallador aprende a apilar piedras de forma ordenada.',
    description: 'Apilar piedras con precisión crea estructuras más resistentes.',
    unlockCondition: ctx => traditionsMin(ctx.traditions, 'tallador', 20),
    effects: { unlocks: ['stockpile_stone'], bonus: { building_speed: 0.1 } },
  },
  [TECH_ID.CARPENTRY]: {
    id: TECH_ID.CARPENTRY, pole: 'mano', cultureWeight: 20, tier: 1,
    name: 'Carpintería Básica',
    unlockHint: 'Un NPC pasa tiempo en el bosque y aprende a ensamblar vigas.',
    description: 'Ensamblar madera permite construir refugios más sólidos.',
    unlockCondition: ctx => traditionsMin(ctx.traditions, 'recolector', 50) && ctx.resourcesPresent.includes('wood'),
    effects: { unlocks: ['stockpile_wood', 'refugio'], bonus: { building_speed: 0.1 } },
  },
  [TECH_ID.MYSTICISM]: {
    id: TECH_ID.MYSTICISM, pole: 'mercado', cultureWeight: 20, tier: 1,
    name: 'Misticismo',
    unlockHint: 'El clan sobrevive suficientes noches para observar las estrellas.',
    description: 'Observar los astros abre la puerta a un conocimiento profundo del mundo.',
    unlockCondition: ctx => daysAlive(ctx.tick, ctx.ticksPerDay) >= 7,
    effects: { unlocks: ['shaman_hut'] },
  },

  // ── CUERPO ────────────────────────────────────────────────────────────────
  [TECH_ID.AHUMAR]: {
    id: TECH_ID.AHUMAR, pole: 'cuerpo', cultureWeight: 30, tier: 1,
    name: 'Técnica del Ahumado',
    unlockHint: 'Construye una fogata permanente y caza regularmente.',
    description: 'Exponer carne y pescado al humo los conserva días sin que se pudran.',
    unlockCondition: ctx =>
      has(ctx.builtStructures, 'fogata_permanente') &&
      traditionsMin(ctx.traditions, 'cazador', 20),
    effects: { unlocks: ['ahumadero'], bonus: { food_nutrition: 0.1 } },
  },
  [TECH_ID.ESTOFADO]: {
    id: TECH_ID.ESTOFADO, pole: 'cuerpo', cultureWeight: 40, tier: 2,
    name: 'Arte del Estofado',
    unlockHint: 'Domina el ahumado y encuentra arcilla en el mundo.',
    description: 'Cocer en vasijas de barro mezcla sabores y aumenta el valor nutritivo.',
    unlockCondition: ctx =>
      has(ctx.unlockedTechs, TECH_ID.AHUMAR) &&
      ctx.resourcesPresent.includes('clay'),
    effects: { unlocks: ['olla_barro'], bonus: { food_nutrition: 0.15 } },
  },
  [TECH_ID.SALAR]: {
    id: TECH_ID.SALAR, pole: 'cuerpo', cultureWeight: 40, tier: 2,
    name: 'Conservación por Sal',
    unlockHint: 'Domina el ahumado y recolecta conchas regularmente.',
    description: 'La sal extraída de las conchas prolonga la vida de la carne y el pescado.',
    unlockCondition: ctx =>
      has(ctx.unlockedTechs, TECH_ID.AHUMAR) &&
      traditionsMin(ctx.traditions, 'recolector', 40) &&
      ctx.resourcesPresent.includes('shell'),
    effects: { unlocks: ['mesa_salazon'], bonus: { decay_reduction: 0.2 } },
  },
  [TECH_ID.REFUGIO_ROBUSTO]: {
    id: TECH_ID.REFUGIO_ROBUSTO, pole: 'cuerpo', cultureWeight: 35, tier: 2,
    name: 'Refugio Robusto',
    unlockHint: 'Construye un refugio y acumula piedra.',
    description: 'Reforzar el refugio con piedra lo hace resistente al viento y la lluvia.',
    unlockCondition: ctx =>
      has(ctx.builtStructures, 'refugio') &&
      has(ctx.builtStructures, 'stockpile_stone'),
    effects: { bonus: { building_speed: 0.15, decay_reduction: 0.1 } },
  },

  // ── FUERZA ────────────────────────────────────────────────────────────────
  [TECH_ID.CAZA_MAYOR]: {
    id: TECH_ID.CAZA_MAYOR, pole: 'fuerza', cultureWeight: 35, tier: 1,
    name: 'Caza Mayor',
    unlockHint: 'Un cazador fabrica una lanza y caza durante varios días.',
    description: 'Coordinar el ataque en grupo permite derribar presas grandes y peligrosas.',
    unlockCondition: ctx =>
      has(ctx.existingItems, 'spear') &&
      traditionsMin(ctx.traditions, 'cazador', 40),
    effects: { bonus: { hunt_yield: 0.25 } },
  },
  [TECH_ID.HONDA]: {
    id: TECH_ID.HONDA, pole: 'fuerza', cultureWeight: 25, tier: 1,
    name: 'Honda',
    unlockHint: 'El tallador trabaja la piedra con regularidad.',
    description: 'Una honda simple lanza proyectiles con precisión letal a distancia.',
    unlockCondition: ctx => traditionsMin(ctx.traditions, 'tallador', 30),
    effects: { unlocks: ['sling'], bonus: { hunt_yield: 0.15 } },
  },
  [TECH_ID.ARCO]: {
    id: TECH_ID.ARCO, pole: 'fuerza', cultureWeight: 50, tier: 3,
    name: 'Arco Primitivo',
    unlockHint: 'Domina la caza mayor y la carpintería.',
    description: 'La tensión de cuerdas sobre madera curvada lanza flechas más lejos que cualquier honda.',
    unlockCondition: ctx =>
      has(ctx.unlockedTechs, TECH_ID.CAZA_MAYOR) &&
      has(ctx.unlockedTechs, TECH_ID.CARPENTRY),
    effects: { unlocks: ['bow'], bonus: { hunt_yield: 0.35 } },
  },
  [TECH_ID.GARROTE]: {
    id: TECH_ID.GARROTE, pole: 'fuerza', cultureWeight: 25, tier: 2,
    name: 'Garrote de Guerra',
    unlockHint: 'El clan sobrevive suficientes días y tiene cazadores activos.',
    description: 'Un tronco con la forma correcta es un arma temible en manos experimentadas.',
    unlockCondition: ctx =>
      daysAlive(ctx.tick, ctx.ticksPerDay) >= 5 &&
      traditionsMin(ctx.traditions, 'cazador', 25),
    effects: { unlocks: ['club'], bonus: { hunt_yield: 0.1 } },
  },

  // ── TIERRA ────────────────────────────────────────────────────────────────
  [TECH_ID.DOMESTICACION]: {
    id: TECH_ID.DOMESTICACION, pole: 'tierra', cultureWeight: 40, tier: 2,
    name: 'Domesticación Básica',
    unlockHint: 'Los recolectores trabajan muchos días seguidos.',
    description: 'Observar el comportamiento animal y ofrecer comida crea los primeros vínculos de domesticación.',
    unlockCondition: ctx =>
      traditionsMin(ctx.traditions, 'recolector', 80) &&
      has(ctx.unlockedTechs, TECH_ID.BASIC_AGRICULTURE),
    effects: { unlocks: ['huerto'], bonus: { gathering_speed: 0.15 } },
  },
  [TECH_ID.ROTACION]: {
    id: TECH_ID.ROTACION, pole: 'tierra', cultureWeight: 45, tier: 2,
    name: 'Rotación de Cultivos',
    unlockHint: 'Domina la domesticación y recolecta durante 10+ días.',
    description: 'Dejar descansar un terreno y alternar cultivos evita el agotamiento del suelo.',
    unlockCondition: ctx =>
      has(ctx.unlockedTechs, TECH_ID.DOMESTICACION) &&
      daysAlive(ctx.tick, ctx.ticksPerDay) >= 10,
    effects: { bonus: { gathering_speed: 0.25 } },
  },
  [TECH_ID.CALENDARIO]: {
    id: TECH_ID.CALENDARIO, pole: 'tierra', cultureWeight: 50, tier: 3,
    name: 'Calendario de Siembras',
    unlockHint: 'Domina la rotación de cultivos y sobrevive 15+ días.',
    description: 'Registrar en piedra los ciclos de la luna y el sol para planificar la siembra y la cosecha.',
    unlockCondition: ctx =>
      has(ctx.unlockedTechs, TECH_ID.ROTACION) &&
      daysAlive(ctx.tick, ctx.ticksPerDay) >= 15,
    effects: { bonus: { gathering_speed: 0.4, decay_reduction: 0.1 } },
  },

  // ── MAR ───────────────────────────────────────────────────────────────────
  [TECH_ID.PESCA_PROFUNDA]: {
    id: TECH_ID.PESCA_PROFUNDA, pole: 'mar', cultureWeight: 35, tier: 1,
    name: 'Pesca de Profundidad',
    unlockHint: 'Los pescadores trabajan durante varios días seguidos.',
    description: 'Usar pesos para hundir el anzuelo más profundo alcanza bancos de peces que otros no ven.',
    unlockCondition: ctx => traditionsMin(ctx.traditions, 'pescador', 40),
    effects: { bonus: { fish_yield: 0.25 } },
  },
  [TECH_ID.PIRAGUA]: {
    id: TECH_ID.PIRAGUA, pole: 'mar', cultureWeight: 50, tier: 2,
    name: 'Piragua',
    unlockHint: 'Domina la pesca de profundidad y la carpintería básica.',
    description: 'Vaciar un tronco grueso crea la primera embarcación. El horizonte se expande.',
    unlockCondition: ctx =>
      has(ctx.unlockedTechs, TECH_ID.PESCA_PROFUNDA) &&
      has(ctx.unlockedTechs, TECH_ID.CARPENTRY) &&
      traditionsMin(ctx.traditions, 'pescador', 60),
    effects: { unlocks: ['muelle', 'canoe'], bonus: { fish_yield: 0.4 } },
  },
  [TECH_ID.REDES]: {
    id: TECH_ID.REDES, pole: 'mar', cultureWeight: 45, tier: 3,
    name: 'Redes de Pesca',
    unlockHint: 'Construye la piragua y encuentra conchas en el mundo.',
    description: 'Trenzar cuerdas de fibra vegetal en una red multiplica la captura por jornada.',
    unlockCondition: ctx =>
      has(ctx.unlockedTechs, TECH_ID.PIRAGUA) &&
      ctx.resourcesPresent.includes('shell'),
    effects: { bonus: { fish_yield: 0.6 } },
  },

  // ── MANO ──────────────────────────────────────────────────────────────────
  [TECH_ID.ALFARERIA]: {
    id: TECH_ID.ALFARERIA, pole: 'mano', cultureWeight: 35, tier: 1,
    name: 'Alfarería',
    unlockHint: 'Encuentra arcilla en el mundo y trabaja la piedra con regularidad.',
    description: 'Moldear arcilla húmeda y endurecerla al fuego crea vasijas que almacenan y conservan.',
    unlockCondition: ctx =>
      ctx.resourcesPresent.includes('clay') &&
      traditionsMin(ctx.traditions, 'tallador', 25),
    effects: { bonus: { building_speed: 0.1, food_nutrition: 0.05 } },
  },
  [TECH_ID.TELAR]: {
    id: TECH_ID.TELAR, pole: 'mano', cultureWeight: 40, tier: 2,
    name: 'Telar Primitivo',
    unlockHint: 'Un artesano fabrica una aguja de hueso.',
    description: 'Entrelazar fibras sobre un marco crea telas que abrigan mejor que las pieles sin curtir.',
    unlockCondition: ctx => has(ctx.existingItems, 'bone_needle'),
    effects: { bonus: { item_durability: 0.15, crafting_speed: 0.15 } },
  },
  [TECH_ID.HERRERIA]: {
    id: TECH_ID.HERRERIA, pole: 'mano', cultureWeight: 55, tier: 3,
    name: 'Herrería Primitiva',
    unlockHint: 'Domina el telar y encuentra obsidiana en el mundo.',
    description: 'Dar forma a la obsidiana con piedra de percusión crea filos que duran generaciones.',
    unlockCondition: ctx =>
      has(ctx.unlockedTechs, TECH_ID.TELAR) &&
      ctx.resourcesPresent.includes('obsidian'),
    effects: { bonus: { item_durability: 0.3, crafting_speed: 0.2 } },
  },

  // ── MERCADO ───────────────────────────────────────────────────────────────
  [TECH_ID.INTERCAMBIO]: {
    id: TECH_ID.INTERCAMBIO, pole: 'mercado', cultureWeight: 30, tier: 1,
    name: 'Intercambio de Excedentes',
    unlockHint: 'El clan fabrica dos tipos distintos de herramientas.',
    description: 'Dar lo que sobra y recibir lo que falta crea el primer circuito económico del clan.',
    unlockCondition: ctx => {
      const kinds = new Set(ctx.existingItems);
      return kinds.size >= 2;
    },
    effects: { bonus: { faith_per_tick: 0.1 } },
  },
  [TECH_ID.CONTABILIDAD]: {
    id: TECH_ID.CONTABILIDAD, pole: 'mercado', cultureWeight: 40, tier: 2,
    name: 'Registro de Cosechas',
    unlockHint: 'Domina el intercambio y construye una despensa.',
    description: 'Hacer marcas en piedra para registrar cuánto se guarda y cuánto se consume es la base de toda economía.',
    unlockCondition: ctx =>
      has(ctx.unlockedTechs, TECH_ID.INTERCAMBIO) &&
      has(ctx.builtStructures, 'despensa'),
    effects: { bonus: { faith_per_tick: 0.2 } },
  },
  [TECH_ID.INFLUENCIA]: {
    id: TECH_ID.INFLUENCIA, pole: 'mercado', cultureWeight: 55, tier: 3,
    name: 'Influencia Territorial',
    unlockHint: 'Domina el registro de cosechas y erige un monumento.',
    description: 'Un monumento visible declara al mundo quién trabaja y protege esta tierra.',
    unlockCondition: ctx =>
      has(ctx.unlockedTechs, TECH_ID.CONTABILIDAD) &&
      has(ctx.builtStructures, 'shaman_hut'),
    effects: { bonus: { faith_per_tick: 0.3 } },
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Puntos culturales totales por polo, dados los techs desbloqueados. */
export function computeCultureAxis(unlocked: string[]): CultureAxis {
  const axis = { ...EMPTY_CULTURE };
  for (const id of unlocked) {
    const def = TECH_DEFS[id as TechId];
    if (def) axis[def.pole] = (axis[def.pole] || 0) + def.cultureWeight;
  }
  return axis;
}

/** Rasgo activo de un polo si supera el umbral de techs desbloqueadas en ese polo. */
export function computeActiveTraits(unlocked: string[]): TraitId[] {
  const countByPole: Partial<Record<CulturePole, number>> = {};
  for (const id of unlocked) {
    const def = TECH_DEFS[id as TechId];
    if (def) countByPole[def.pole] = (countByPole[def.pole] ?? 0) + 1;
  }
  const active: TraitId[] = [];
  for (const trait of Object.values(TRAIT_DEFS)) {
    if ((countByPole[trait.pole] ?? 0) >= trait.threshold) active.push(trait.id);
  }
  return active;
}

/** Suma de todos los bonus de los rasgos activos. */
export function aggregateBonuses(activeTraits: TraitId[]): NonNullable<TechEffect['bonus']> {
  const out: NonNullable<TechEffect['bonus']> = {};
  for (const tid of activeTraits) {
    const fx = TRAIT_DEFS[tid]?.effects ?? {};
    for (const [k, v] of Object.entries(fx) as [string, number][]) {
      (out as Record<string, number>)[k] = ((out as Record<string, number>)[k] ?? 0) + v;
    }
  }
  return out;
}

/** Estado inicial del sistema tecnológico. */
export function initialTechState(): TechState {
  return {
    wisdom: 0,
    unlocked: [],
    researching: null,
    researchProgress: 0,
    culture: { ...EMPTY_CULTURE },
    activeTraits: [],
  };
}

// TechState re-exported here to avoid circular dep with game-state.ts
export interface TechState {
  wisdom: number;
  unlocked: TechId[];
  researching: TechId | null;
  researchProgress: number;
  culture: CultureAxis;
  activeTraits: TraitId[];
}
