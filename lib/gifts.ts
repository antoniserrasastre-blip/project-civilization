/**
 * Dones — Sprint 3.
 *
 * Cada don es una función pura que modifica el NPC al concederle el don:
 * bakea el efecto (stat/trait boost) dentro de los campos normales. Esto
 * mantiene el resto del motor ignorante de los dones: el scheduler solo
 * ve "fuerza=130" y resuelve conflictos igual que antes. Si el Elegido
 * tiene fuerza sobrehumana pero ambicion baja, la simulación no le hará
 * iniciar peleas — el stat queda sin usar (§A2 del Vision Document).
 *
 * Pillar 1 descansa sobre esta separación: mismo don + traits distintos ⇒
 * resultados distintos, porque el comportamiento sigue siendo función de
 * los traits mentales, no de los stats físicos.
 *
 * Las acciones del dios (anoint, grantGift) NO consumen `prng_cursor`.
 * Solo los procesos estocásticos del scheduler lo hacen. Esto permite que
 * el jugador interactúe sin "robar" entropía al mundo.
 */

import type { NPC, WorldState } from './world-state';

export type GiftId = 'fuerza_sobrehumana' | 'aura_de_carisma';

export interface GiftDef {
  id: GiftId;
  name: string;
  description: string;
  /**
   * Aplica el efecto del don sobre el NPC y devuelve el NPC nuevo. Pura.
   */
  apply(npc: NPC): NPC;
}

/**
 * Bonus de stat/trait que da el don. Sube por encima del techo normal de
 * 100 para diferenciar claramente a un Elegido de un mortal. El cap duro
 * está en 200 (evita que herencias repetidas saturen con infinitos).
 */
const GIFT_BONUS = 50;
const STAT_CAP = 200;

function bumpStat(n: number): number {
  return Math.min(STAT_CAP, n + GIFT_BONUS);
}

export const GIFTS: Record<GiftId, GiftDef> = {
  fuerza_sobrehumana: {
    id: 'fuerza_sobrehumana',
    name: 'Fuerza Sobrehumana',
    description:
      'Puede arrancar árboles y derribar a un hombre de un empellón. ' +
      'Útil solo si algo la empuja a usarla.',
    apply(npc) {
      if (npc.gifts.includes('fuerza_sobrehumana')) return npc;
      return {
        ...npc,
        gifts: [...npc.gifts, 'fuerza_sobrehumana'],
        stats: { ...npc.stats, fuerza: bumpStat(npc.stats.fuerza) },
      };
    },
  },
  aura_de_carisma: {
    id: 'aura_de_carisma',
    name: 'Aura de Carisma',
    description:
      'Quien la oye hablar no olvida su voz. Atrae seguidores cuando ' +
      'además hay ambición detrás.',
    apply(npc) {
      if (npc.gifts.includes('aura_de_carisma')) return npc;
      return {
        ...npc,
        gifts: [...npc.gifts, 'aura_de_carisma'],
        traits: { ...npc.traits, carisma: bumpStat(npc.traits.carisma) },
      };
    },
  },
};

export type GrantResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'unknown_npc'
        | 'unknown_gift'
        | 'dead_npc'
        | 'not_chosen'
        | 'already_has_gift';
    };

export function canGrantGift(
  state: WorldState,
  npc_id: string,
  gift_id: GiftId,
): GrantResult {
  if (!(gift_id in GIFTS)) return { ok: false, reason: 'unknown_gift' };
  const npc = state.npcs.find((n) => n.id === npc_id);
  if (!npc) return { ok: false, reason: 'unknown_npc' };
  if (!npc.alive) return { ok: false, reason: 'dead_npc' };
  if (!state.player_god.chosen_ones.includes(npc_id)) {
    return { ok: false, reason: 'not_chosen' };
  }
  if (npc.gifts.includes(gift_id)) {
    return { ok: false, reason: 'already_has_gift' };
  }
  return { ok: true };
}

/**
 * Concede el don y devuelve un estado nuevo. El caller debe haber
 * validado con `canGrantGift` antes (esto hace que la función sea
 * determinista y sin ramas de error que rompan la pureza).
 */
export function grantGift(
  state: WorldState,
  npc_id: string,
  gift_id: GiftId,
): WorldState {
  const def = GIFTS[gift_id];
  return {
    ...state,
    npcs: state.npcs.map((n) => (n.id === npc_id ? def.apply(n) : n)),
  };
}

/**
 * Aplica una lista de dones al NPC en cadena. Útil para propagar herencia
 * en `generateNewborn` sin que ese módulo tenga que conocer el catálogo.
 */
export function applyGifts(npc: NPC, giftIds: readonly string[]): NPC {
  let out = npc;
  for (const gid of giftIds) {
    if (gid in GIFTS) out = GIFTS[gid as GiftId].apply(out);
  }
  return out;
}
