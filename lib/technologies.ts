/**
 * Árbol Tecnológico Emergente — Sprint 16 (Sabiduría).
 *
 * El clan acumula "Sabiduría" y la invierte en tecnologías que
 * otorgan bonus pasivos o desbloquean recetas y estructuras.
 */

import type { CraftableId } from './crafting';
import type { ItemKind } from './items';

export const TECH_ID = {
  // Tier 0 (primigenia)
  HUNTING_WEAPONS: 'hunting_weapons',      // Lanza
  FOOD_PRESERVATION: 'food_preservation',  // Despensa
  BASIC_AGRICULTURE: 'basic_agriculture',  // Cesta
  MASONRY: 'masonry',                      // Almacén de Piedra
  CARPENTRY: 'carpentry',                  // Almacén de Madera, Refugio
  MYSTICISM: 'mysticism',                  // Choza del Chamán
} as const;

export type TechId = (typeof TECH_ID)[keyof typeof TECH_ID];

export interface TechEffect {
  /** Recetas de crafteo (edificios o items) desbloqueadas. */
  unlocks?: Array<CraftableId | ItemKind>;
  /** Bonus pasivos aplicados a todo el clan. */
  bonus?: {
    gathering_speed?: number; // % extra (0.1 = +10%)
    crafting_speed?: number;
    building_speed?: number;
  };
}

export interface Technology {
  id: TechId;
  name: string;
  description: string;
  /** Coste en puntos de Sabiduría. */
  cost: number;
  /** Tecnologías que deben investigarse antes. */
  requires: TechId[];
  effects: TechEffect;
}

export const TECH_DEFS: Record<TechId, Technology> = {
  [TECH_ID.HUNTING_WEAPONS]: {
    id: TECH_ID.HUNTING_WEAPONS,
    name: 'Armas de Caza',
    description: 'La necesidad agudiza el ingenio. Una piedra afilada atada a un palo puede derribar presas mayores.',
    cost: 100,
    requires: [],
    effects: { unlocks: ['spear'] },
  },
  [TECH_ID.FOOD_PRESERVATION]: {
    id: TECH_ID.FOOD_PRESERVATION,
    name: 'Preservación de Alimentos',
    description: 'Proteger la comida de los elementos y los animales permite guardarla para tiempos de escasez.',
    cost: 150,
    requires: [],
    effects: { unlocks: ['despensa'] },
  },
  [TECH_ID.BASIC_AGRICULTURE]: {
    id: TECH_ID.BASIC_AGRICULTURE,
    name: 'Recolección Eficiente',
    description: 'Observar los ciclos de las plantas y usar cestas permite recolectar más bayas y frutos con menos esfuerzo.',
    cost: 120,
    requires: [],
    effects: {
      unlocks: ['basket'],
      bonus: { gathering_speed: 0.1 },
    },
  },
  [TECH_ID.MASONRY]: {
    id: TECH_ID.MASONRY,
    name: 'Albañilería Primitiva',
    description: 'Apilar piedras de forma ordenada crea estructuras más resistentes y almacenes para guardar los minerales.',
    cost: 200,
    requires: [],
    effects: {
      unlocks: ['stockpile_stone'],
      bonus: { building_speed: 0.1 },
    },
  },
  [TECH_ID.CARPENTRY]: {
    id: TECH_ID.CARPENTRY,
    name: 'Carpintería Básica',
    description: 'Ensamblar madera permite construir refugios más sólidos y lugares donde guardar los troncos.',
    cost: 200,
    requires: [],
    effects: {
      unlocks: ['stockpile_wood', 'refugio'],
      bonus: { building_speed: 0.1 },
    },
  },
  [TECH_ID.MYSTICISM]: {
    id: TECH_ID.MYSTICISM,
    name: 'Misticismo',
    description: 'Observar las estrellas y los susurros del viento abre la puerta a un conocimiento más profundo del mundo.',
    cost: 250,
    requires: [],
    effects: { unlocks: ['shaman_hut'] },
  },
};

/** Inicializa el estado de tecnología del juego. */
export function initialTechState(): TechState {
  return {
    wisdom: 0,
    unlocked: [],
    researching: null,
    researchProgress: 0,
  };
}
