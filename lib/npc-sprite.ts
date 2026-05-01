/**
 * Mapeo NPC → sprite visual. Fuente de verdad compartida entre el
 * canvas del mapa y los componentes React (ficha de NPC, retrato).
 *
 * Reglas de identidad:
 *   - Elegidos usan el sprite de su ARQUETIPO (no todos el mismo oro).
 *     El Líder conserva el sprite dorado exclusivo; el resto usa el
 *     sprite del rol más el overlay de corona.
 *   - Ciudadanos usan el sprite de su ROL activo (skills + ítem).
 *   - `shouldShowCrown` es true para cualquier Elegido — permite al
 *     canvas superponer la corona sin importar el sprite base.
 *
 * Contrato: puro, sin DOM, importable en lib/ y en components/.
 */

import { CASTA, ARCHETYPE, type NPC } from './npcs';
import { computeRole, ROLE } from './roles';
import type { EquippableItem } from './items';
import { itemForNpc } from './items';

export const SPRITE_KEY = {
  ELEGIDO:    'ELEGIDO',
  GUERRERO:   'GUERRERO',
  CAZADOR:    'CAZADOR',
  RECOLECTOR: 'RECOLECTOR',
  ARTESANO:   'ARTESANO',
  // Animales
  ANIMAL_BOAR:    'ANIMAL_BOAR',
  ANIMAL_CRAB:    'ANIMAL_CRAB',
  ANIMAL_DEER:    'ANIMAL_DEER',
  ANIMAL_EAGLE:   'ANIMAL_EAGLE',
  ANIMAL_GOAT:    'ANIMAL_GOAT',
  ANIMAL_MONKEY:  'ANIMAL_MONKEY',
  ANIMAL_PANTHER: 'ANIMAL_PANTHER',
  ANIMAL_TURTLE:  'ANIMAL_TURTLE',
  ANIMAL_WOLF:    'ANIMAL_WOLF',
  ANIMAL_BEAR:    'ANIMAL_BEAR',
  ANIMAL_SHEEP:   'ANIMAL_SHEEP',
  ANIMAL_HORSE:   'ANIMAL_HORSE',
  ANIMAL_CHICKEN: 'ANIMAL_CHICKEN',
  ANIMAL_COW:     'ANIMAL_COW',
  // Dioses
  GOD_SEA:   'GOD_SEA',
  GOD_STONE: 'GOD_STONE',
  GOD_WIND:  'GOD_WIND',
  // UI y Feedback
  CROWN_LEADER:   'crown_leader',
  BUBBLE_HUNGER:  'bubble_hunger',
  BUBBLE_SOCIAL:  'bubble_social',
  BUBBLE_FEAR:    'bubble_fear',
  BUBBLE_WORK:    'bubble_work',
  // Herramientas y Armas
  ITEM_BASKET:    'basket',
  ITEM_SPEAR:     'spear',
  ITEM_HAND_AXE:  'hand_axe',
  ITEM_BONE_NEEDLE: 'bone_needle',
  ITEM_RELIC:     'relic_charm',
  ITEM_CLUB:      'club',
  ITEM_SHIELD:    'weapon_shield',
  ITEM_SLING:     'sling',
  ITEM_BOW:       'bow',
  // Estructuras
  STRUCT_FIRE_PIT:       'struct_fire_pit',
  STRUCT_SHELTER:        'struct_shelter_wood',
  STRUCT_PANTRY:         'struct_shaman_hut_2',
  STRUCT_STOCKPILE_WOOD: 'struct_stockpile_wood',
  STRUCT_STOCKPILE_STONE: 'struct_stockpile_stone',
  STRUCT_MUELLE:         'struct_dock_primitive',
  STRUCT_MUELLE_FOUND:   'struct_dock_foundation',
  STRUCT_MUELLE_CONST:   'struct_dock_construction',
  STRUCT_HUERTO_MATURE:  'struct_huerto_mature',
  STRUCT_HUERTO_SPROUT:  'struct_huerto_sprout',
  STRUCT_HUERTO_GROWING: 'struct_huerto_growing',
  // Unidades especiales
  ITEM_CANOE:            'unit_canoe',
} as const;

export type SpriteKey = (typeof SPRITE_KEY)[keyof typeof SPRITE_KEY] | string;

export const SPRITE_URLS: Record<string, string> = {
  ELEGIDO:    '/units/unit-elegido.svg',
  GUERRERO:   '/units/unit-guerrero.svg',
  CAZADOR:    '/units/unit-cazador.svg',
  RECOLECTOR: '/units/unit-recolector.svg',
  ARTESANO:   '/units/unit-artesano.svg',
  // Animales
  ANIMAL_BOAR:    '/units/animal_boar.svg',
  ANIMAL_CRAB:    '/units/animal_crab.svg',
  ANIMAL_DEER:    '/units/animal_deer.svg',
  ANIMAL_EAGLE:   '/units/animal_eagle.svg',
  ANIMAL_GOAT:    '/units/animal_goat.svg',
  ANIMAL_MONKEY:  '/units/animal_monkey.svg',
  ANIMAL_PANTHER: '/units/animal_panther.svg',
  ANIMAL_TURTLE:  '/units/animal_turtle.svg',
  ANIMAL_WOLF:    '/units/animal_wolf.svg',
  ANIMAL_BEAR:    '/units/animal_bear.svg',
  ANIMAL_SHEEP:   '/units/animal_sheep.svg',
  ANIMAL_HORSE:   '/units/animal_horse.svg',
  ANIMAL_CHICKEN: '/units/animal_chicken.svg',
  ANIMAL_COW:     '/units/animal_cow.svg',
  // Dioses
  GOD_SEA:   '/ui/god_portrait_sea.svg',
  GOD_STONE: '/ui/god_portrait_stone.svg',
  GOD_WIND:  '/ui/god_portrait_wind.svg',
  // UI y Feedback
  crown_leader:   '/ui/crown_leader.svg',
  bubble_hunger:  '/ui/bubble_hunger.svg',
  bubble_social:  '/ui/bubble_sleep.svg',
  bubble_fear:    '/ui/bubble_fear.svg',
  bubble_work:    '/ui/bubble_work.svg',
  // Herramientas y Armas
  basket:         '/resources/resource_mushroom.svg',
  spear:          '/resources/weapon_spear.svg',
  hand_axe:       '/resources/weapon_club.svg',
  bone_needle:    '/resources/resource_flint.svg', 
  relic_charm:    '/resources/resource_obsidian.svg', 
  club:           '/resources/weapon_club.svg',
  weapon_shield:  '/resources/weapon_shield.svg',
  sling:          '/resources/weapon_sling.svg',
  bow:            '/resources/weapon_bow.svg',
  // Estructuras
  struct_fire_pit:       '/structures/struct_fire_pit.svg',
  struct_shelter_wood:   '/structures/struct_shelter_wood.svg',
  struct_shaman_hut_2:   '/structures/struct_shaman_hut_2.svg',
  struct_stockpile_wood:  '/structures/struct_stockpile_wood.svg',
  struct_stockpile_stone: '/structures/struct_stockpile_stone.svg',
  struct_dock_primitive:    '/structures/struct_dock_primitive.svg',
  struct_dock_foundation:   '/structures/struct_dock_foundation.svg',
  struct_dock_construction: '/structures/struct_dock_construction.svg',
  struct_huerto_mature:     '/structures/struct_huerto_mature.svg',
  struct_huerto_sprout:     '/structures/struct_huerto_sprout.svg',
  struct_huerto_growing:    '/structures/struct_huerto_growing.svg',
  // Unidades especiales
  unit_canoe:               '/units/unit_canoe.svg',
};

function archetypeToKey(archetype: string | null): SpriteKey {
  switch (archetype) {
    case ARCHETYPE.LIDER:                                    return 'ELEGIDO';
    case ARCHETYPE.CAZADOR:
    case ARCHETYPE.SCOUT:                                    return 'CAZADOR';
    case ARCHETYPE.PESCADOR:
    case ARCHETYPE.RECOLECTOR:                               return 'RECOLECTOR';
    case ARCHETYPE.ARTESANO:
    case ARCHETYPE.TEJEDOR:
    case ARCHETYPE.CURANDERO:                                return 'ARTESANO';
    default:                                                 return 'GUERRERO';
  }
}

/** Devuelve la clave de sprite para un NPC dado. */
export function spriteKeyFor(npc: NPC, items: readonly EquippableItem[]): SpriteKey {
  if (npc.casta === CASTA.ELEGIDO) {
    return archetypeToKey(npc.archetype);
  }
  const role = computeRole(npc, itemForNpc(npc, items));
  switch (role) {
    case ROLE.CAZADOR:
    case ROLE.RASTREADOR:  return 'CAZADOR';
    case ROLE.RECOLECTOR:
    case ROLE.PESCADOR:    return 'RECOLECTOR';
    case ROLE.TALLADOR:
    case ROLE.TEJEDOR:
    case ROLE.CURANDERO:   return 'ARTESANO';
    default:               return 'GUERRERO';
  }
}

/** URL del sprite SVG para usar en <img> o preload de canvas. */
export function spriteUrlFor(npc: NPC, items: readonly EquippableItem[]): string {
  return SPRITE_URLS[spriteKeyFor(npc, items)];
}

/** True si el NPC debe mostrar corona (es Elegido). */
export function shouldShowCrown(npc: NPC): boolean {
  return npc.casta === CASTA.ELEGIDO;
}

/** Estado de acción visual del NPC para animar en el mapa. */
export type NpcActionState =
  | 'idle'
  | 'moving'
  | 'harvesting'
  | 'building'
  | 'swimming'
  | 'critical';

/** Deriva el estado de acción a partir de badges y posición. */
export function actionStateFor(
  npc: NPC,
  badges: readonly string[],
  isMoving: boolean,
  isOnResourceTile: boolean,
): NpcActionState {
  if (!npc.alive) return 'idle';
  if (badges.includes('critical')) return 'critical';
  if (badges.includes('swimming')) return 'swimming';
  if (isMoving) return 'moving';
  if (isOnResourceTile) return 'harvesting';
  return 'idle';
}
