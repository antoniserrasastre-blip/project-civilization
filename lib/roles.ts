/**
 * Roles activos del clan — Sprint 10 ARQUETIPOS-ACTIVOS (Pilar 1).
 *
 * Un **rol** es la especialización que un NPC ejerce *este tick*,
 * emergente de sus skills y la herramienta que lleva equipada. No
 * se persiste en el NPC (no se cambia el shape §A4): `computeRole`
 * es una función pura que se calcula al vuelo cuando hace falta.
 *
 * "Filtro de intención" (`intentFilter`): cada rol expresa un sesgo
 * aditivo pequeño (peso ≤ 5) sobre la distancia Manhattan en
 * `decideDestination`. Mueve desempates y compensa pequeñas
 * diferencias de distancia, nunca viajes de medio mapa.
 *
 * Los 7 roles iniciales (§3.1 arquetipos del drafting se traducen a
 * 7 roles activos, fusionando Líder/Scout en Rastreador por la
 * carencia de IA-rival en primigenia y por economía del modelo):
 *   - CAZADOR    → hunting + lanza/hacha
 *   - RASTREADOR → hunting sin herramienta de caza
 *   - PESCADOR   → fishing dominante
 *   - RECOLECTOR → gathering dominante o fallback
 *   - TALLADOR   → crafting + hacha de sílex (materiales duros)
 *   - TEJEDOR    → crafting + aguja de hueso (pieles/ropa)
 *   - CURANDEDRO → healing + reliquia (casta Elegido)
 */

import type { NPC, NPCSkills } from './npcs';
import { ARCHETYPE } from './npcs';
import type { EquippableItem } from './items';
import { ITEM_KIND } from './items';
import { RESOURCE, type ResourceId } from './world-state';

export const ROLE = {
  CAZADOR: 'cazador',
  RASTREADOR: 'rastreador',
  PESCADOR: 'pescador',
  RECOLECTOR: 'recolector',
  TALLADOR: 'tallador',
  TEJEDOR: 'tejedor',
  CURANDERO: 'curandero',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

const LABELS: Record<Role, string> = {
  [ROLE.CAZADOR]: 'Cazador',
  [ROLE.RASTREADOR]: 'Rastreador',
  [ROLE.PESCADOR]: 'Pescador',
  [ROLE.RECOLECTOR]: 'Recolector',
  [ROLE.TALLADOR]: 'Tallador',
  [ROLE.TEJEDOR]: 'Tejedor',
  [ROLE.CURANDERO]: 'Curandero',
};

export function roleLabel(role: Role): string {
  return LABELS[role];
}

/** Paleta de oficios — un color estable por rol activo. Consumida por
 *  `MapView` para el píxel de oficio (Sprint 11). Tonos lo bastante
 *  separados entre sí para ser distinguibles a zoom mínimo. */
const COLORS: Record<Role, string> = {
  [ROLE.CAZADOR]: '#c0482f',
  [ROLE.RASTREADOR]: '#3a8ca8',
  [ROLE.PESCADOR]: '#2d7faa',
  [ROLE.RECOLECTOR]: '#3f8a40',
  [ROLE.TALLADOR]: '#b7802d',
  [ROLE.TEJEDOR]: '#c66b9a',
  [ROLE.CURANDERO]: '#7a5ea8',
};

export function roleColor(role: Role): string {
  return COLORS[role];
}

/** Umbral a partir del cual un skill se considera "dominante".
 *  Calibrado contra drafting (Elegidos arrancan ~40-70 en su
 *  skill fuerte; Ciudadanos 15-25). */
const SKILL_DOMINANT_THRESHOLD = 40;

function dominantSkill(skills: NPCSkills): keyof NPCSkills {
  const keys: Array<keyof NPCSkills> = [
    'hunting',
    'gathering',
    'crafting',
    'fishing',
    'healing',
  ];
  let bestKey: keyof NPCSkills = 'gathering';
  let bestVal = -1;
  for (const k of keys) {
    const v = skills[k];
    if (v > bestVal) {
      bestVal = v;
      bestKey = k;
    }
  }
  return bestKey;
}

/** Devuelve el rol activo de un NPC este tick. La herramienta
 *  equipada prevalece sobre el skill nominal cuando la afinidad
 *  de la herramienta coincide con un rol claro (hacha → tallador,
 *  aguja → tejedor, lanza → cazador, reliquia → curandero). */
export function computeRole(
  npc: NPC,
  item: EquippableItem | null,
): Role {
  if (item) {
    switch (item.kind) {
      case ITEM_KIND.SPEAR:
        return ROLE.CAZADOR;
      case ITEM_KIND.HAND_AXE:
        return ROLE.TALLADOR;
      case ITEM_KIND.BONE_NEEDLE:
        return ROLE.TEJEDOR;
      case ITEM_KIND.RELIC_CHARM:
        return ROLE.CURANDERO;
    }
  }

  const { hunting, fishing, healing, crafting, gathering } = npc.skills;
  const dom = dominantSkill(npc.skills);

  if (dom === 'hunting' && hunting >= SKILL_DOMINANT_THRESHOLD) {
    return ROLE.RASTREADOR;
  }
  if (dom === 'fishing' && fishing >= SKILL_DOMINANT_THRESHOLD) {
    return ROLE.PESCADOR;
  }
  if (dom === 'healing' && healing >= SKILL_DOMINANT_THRESHOLD) {
    return ROLE.CURANDERO;
  }
  if (dom === 'crafting' && crafting >= SKILL_DOMINANT_THRESHOLD) {
    return ROLE.TALLADOR;
  }
  if (dom === 'gathering' && gathering >= SKILL_DOMINANT_THRESHOLD) {
    return ROLE.RECOLECTOR;
  }

  // Fallback: si ningún skill supera el umbral, usar el ARQUETIPO de
  // nacimiento del NPC. Un Cazador novato sigue prefiriendo la caza
  // sobre las bayas aunque sus skills sean bajas.
  if (npc.archetype) {
    switch (npc.archetype) {
      case ARCHETYPE.CAZADOR:   return ROLE.CAZADOR;
      case ARCHETYPE.SCOUT:     return ROLE.RASTREADOR;
      case ARCHETYPE.PESCADOR:  return ROLE.PESCADOR;
      case ARCHETYPE.CURANDERO: return ROLE.CURANDERO;
      case ARCHETYPE.ARTESANO:
      case ARCHETYPE.TEJEDOR:   return ROLE.TALLADOR;
      case ARCHETYPE.RECOLECTOR:
      case ARCHETYPE.LIDER:     return ROLE.RECOLECTOR;
    }
  }

  return ROLE.RECOLECTOR;
}

export type ResourceWeightMap = Partial<Record<ResourceId, number>>;

const FILTERS: Record<Role, ResourceWeightMap> = {
  [ROLE.CAZADOR]: {
    [RESOURCE.GAME]: 3,
    [RESOURCE.BERRY]: 0,
    [RESOURCE.FISH]: 0,
  },
  [ROLE.RASTREADOR]: {
    [RESOURCE.GAME]: 2,
    [RESOURCE.BERRY]: 0,
    [RESOURCE.FISH]: 0,
  },
  [ROLE.PESCADOR]: {
    [RESOURCE.FISH]: 3,
    [RESOURCE.BERRY]: 0,
    [RESOURCE.GAME]: 0,
  },
  [ROLE.RECOLECTOR]: {
    [RESOURCE.BERRY]: 2,
    [RESOURCE.WOOD]: 1,
    [RESOURCE.GAME]: 0,
    [RESOURCE.FISH]: 0,
  },
  [ROLE.TALLADOR]: {
    [RESOURCE.STONE]: 3,
    [RESOURCE.WOOD]: 2,
  },
  [ROLE.TEJEDOR]: {
    [RESOURCE.GAME]: 2,
    [RESOURCE.BERRY]: 0,
  },
  [ROLE.CURANDERO]: {},
};

/** Pesos aditivos sobre distancia Manhattan. Peso w significa que
 *  el recurso se trata como si estuviera `w` tiles más cerca. No
 *  debe superar ~5 para no convertir rol en "teletransporte". */
export function intentFilter(role: Role): ResourceWeightMap {
  return FILTERS[role];
}
