/**
 * Visual Evolution Registry — Arquitectura de Feedback Visual.
 * 
 * Mapea entidades del juego (estructuras, ítems) a sus representaciones
 * visuales dinámicas según el progreso tecnológico o cultural.
 */

import { CRAFTABLE, type CraftableId } from './crafting';
import { ITEM_KIND, type ItemKind } from './items';

export interface VisualAsset {
  default: string;
  /** Fases de construcción (opcional). */
  stages?: {
    foundation: string;
    construction: string;
  };
  /** Variantes culturales (opcional). */
  cultures?: Record<string, string>;
}

export const STRUCTURE_VISUALS: Record<CraftableId, VisualAsset> = {
  [CRAFTABLE.FOGATA_PERMANENTE]: {
    default: '/structures/struct_fire_pit.svg',
  },
  [CRAFTABLE.REFUGIO]: {
    default: '/structures/struct_shelter_wood.svg',
    cultures: {
      'marinero': '/structures/struct_shelter_thatch.svg',
    }
  },
  [CRAFTABLE.DESPENSA]: {
    default: '/structures/struct_shaman_hut_2.svg',
  },
  [CRAFTABLE.STOCKPILE_WOOD]: {
    default: '/structures/struct_stockpile_wood.svg',
  },
  [CRAFTABLE.STOCKPILE_STONE]: {
    default: '/structures/struct_stockpile_stone.svg',
  },
  [CRAFTABLE.SHAMAN_HUT]: {
    default: '/structures/struct_shaman_hut_1.svg',
  },
  [CRAFTABLE.MUELLE]: {
    default: '/structures/struct_dock_primitive.svg',
    stages: {
      foundation: '/structures/struct_dock_foundation.svg',
      construction: '/structures/struct_dock_construction.svg',
    }
  },
  [CRAFTABLE.HUERTO]: {
    default: '/structures/struct_huerto_mature.svg',
    stages: {
      foundation: '/structures/struct_huerto_sprout.svg',
      construction: '/structures/struct_huerto_growing.svg',
    }
  },
  [CRAFTABLE.AHUMADERO]: {
    default: '/structures/struct_ahumadero.svg',
  },
  [CRAFTABLE.OLLA_BARRO]: {
    default: '/structures/struct_olla_barro.svg',
  },
  [CRAFTABLE.MESA_SALAZON]: {
    default: '/structures/struct_mesa_salazon.svg',
  },
  [CRAFTABLE.PIEL_ROPA]: {
    default: '/ui/icon_legacy_tomb.svg', // Placeholder
  }
};

export const ITEM_VISUALS: Record<ItemKind, VisualAsset> = {
  [ITEM_KIND.BASKET]: { default: '/resources/resource_mushroom.svg' }, // Proxy
  [ITEM_KIND.SPEAR]: { default: '/resources/weapon_club.svg' }, // Proxy
  [ITEM_KIND.HAND_AXE]: { default: '/resources/resource_flint.svg' }, // Proxy
  [ITEM_KIND.BONE_NEEDLE]: { default: '/resources/resource_shell.svg' }, // Proxy
  [ITEM_KIND.RELIC_CHARM]: { default: '/resources/resource_obsidian.svg' }, // Proxy
  [ITEM_KIND.CANOE]: { default: '/units/unit_canoe.svg' },
};

/**
 * Devuelve la URL del sprite del ítem.
 */
export function getItemSprite(kind: ItemKind): string {
  return ITEM_VISUALS[kind]?.default || '';
}

/**
 * Devuelve la URL del asset correcto según el estado de construcción.
 */
export function getStructureSprite(
  kind: CraftableId, 
  progress: number = 1, 
  culture?: string
): string {
  const visual = STRUCTURE_VISUALS[kind];
  if (!visual) return '';

  // 1. Si está en construcción y tiene fases
  if (progress < 1 && visual.stages) {
    if (progress < 0.3) return visual.stages.foundation;
    return visual.stages.construction;
  }

  // 2. Si tiene variante cultural
  if (culture && visual.cultures?.[culture]) {
    return visual.cultures[culture];
  }

  // 3. Fallback a default
  return visual.default;
}
