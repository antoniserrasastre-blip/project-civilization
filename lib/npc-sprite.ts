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
} as const;

export type SpriteKey = (typeof SPRITE_KEY)[keyof typeof SPRITE_KEY];

export const SPRITE_URLS: Record<SpriteKey, string> = {
  ELEGIDO:    '/units/unit-elegido.svg',
  GUERRERO:   '/units/unit-guerrero.svg',
  CAZADOR:    '/units/unit-cazador.svg',
  RECOLECTOR: '/units/unit-recolector.svg',
  ARTESANO:   '/units/unit-artesano.svg',
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
