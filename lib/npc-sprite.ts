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
  // Animales (Sprint 14.5)
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
  // Dioses (Sprint 14.5)
  GOD_SEA:   'GOD_SEA',
  GOD_STONE: 'GOD_STONE',
  GOD_WIND:  'GOD_WIND',
  // UI y Feedback (Sprint 14.8)
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
  ITEM_CLUB:      'weapon_club',
  ITEM_SHIELD:    'weapon_shield',
  ITEM_SLING:     'weapon_sling',
  // Estructuras (Sprint 15)
  STRUCT_FIRE_PIT:       'struct_fire_pit',
  STRUCT_SHELTER:        'struct_shelter_wood',
  STRUCT_PANTRY:         'struct_shaman_hut_2',
  STRUCT_STOCKPILE_WOOD: 'struct_stockpile_wood',
  STRUCT_STOCKPILE_STONE: 'struct_stockpile_stone',
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
  // Dioses
  GOD_SEA:   '/ui/god_portrait_sea.svg',
  GOD_STONE: '/ui/god_portrait_stone.svg',
  GOD_WIND:  '/ui/god_portrait_wind.svg',
  // UI y Feedback
  crown_leader:   '/ui/crown_leader.svg',
  bubble_hunger:  '/ui/bubble_hunger.svg',
  bubble_social:  '/ui/bubble_sleep.svg', // usando sleep como proxy de social por ahora
  bubble_fear:    '/ui/bubble_fear.svg',
  bubble_work:    '/ui/bubble_work.svg',
  // Herramientas y Armas
  basket:         '/resources/berry.svg',       // Proxy: berry (recolector)
  spear:          '/resources/weapon_club.svg', // Proxy: club (caza)
  hand_axe:       '/resources/weapon_club.svg', // Proxy: club (artesanía)
  bone_needle:    '/resources/resource_flint.svg', // Proxy: flint (costura)
  relic_charm:    '/resources/resource_obsidian.svg', // Proxy: obsidian (fe)
  weapon_club:    '/resources/weapon_club.svg',
  weapon_shield:  '/resources/weapon_shield.svg',
  weapon_sling:   '/resources/weapon_sling.svg',
  // Estructuras
  struct_fire_pit:       '/structures/struct_fire_pit.svg',
  struct_shelter_wood:   '/structures/struct_shelter_wood.svg',
  struct_shaman_hut_2:   '/structures/struct_shaman_hut_2.svg',
  struct_stockpile_wood:  '/structures/struct_stockpile_wood.svg',
  struct_stockpile_stone: '/structures/struct_stockpile_stone.svg',
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
