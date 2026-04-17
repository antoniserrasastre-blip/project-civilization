/**
 * Plantillas de la Crónica — voz partisana del cronista (§9).
 *
 * El cronista NO es neutral: narra desde el pueblo del jugador. Habla
 * de "los nuestros", "los hijos de [nombre del grupo]". Cuando un
 * Elegido del jugador logra algo, el tono es épico; cuando un rival
 * logra algo (v0.3), es trágico o sombrío.
 *
 * El MVP usa solo plantillas deterministas. La IA generativa (Gemini,
 * Claude) se deja para v0.4+ en la capa de post-procesado opcional.
 */

import type { NPC, WorldState, ChronicleEntry } from './world-state';

/**
 * Formatea el día como "Año X, día Y" asumiendo un año tribal de 365 días.
 * Real enough para el MVP; si el calendario se refina después (estaciones,
 * meses baleares), esta función se reescribe sin tocar nada más.
 */
export function formatDate(day: number): string {
  const year = Math.floor(day / 365);
  const dayOfYear = day % 365 + 1; // día 1-365, humano-legible
  return `Año ${year}, día ${dayOfYear}`;
}

function groupName(state: WorldState, group_id: string): string {
  return state.groups.find((g) => g.id === group_id)?.name ?? group_id;
}

/**
 * ¿El NPC es "de los nuestros" desde la perspectiva del jugador?
 * En v0.3 esto también considerará descendientes de Elegidos del jugador
 * aunque estén físicamente integrados en otro grupo (ver fronteras en
 * Notas del Director Creativo).
 */
function isOurs(state: WorldState, npc: NPC): boolean {
  return npc.group_id === state.player_god.group_id;
}

// ---------------------------------------------------------------------------
// Plantillas de eventos
// ---------------------------------------------------------------------------

export function narrateBirth(state: WorldState, newborn: NPC): ChronicleEntry {
  const text = isOurs(state, newborn)
    ? `${formatDate(state.day)}. Nació ${newborn.name}, una nueva alma entre los nuestros.`
    : `${formatDate(state.day)}. Se dice que nació ${newborn.name} entre los hijos de ${groupName(state, newborn.group_id)}.`;
  return { day: state.day, text };
}

export function narrateDeath(state: WorldState, fallen: NPC): ChronicleEntry {
  const years = Math.floor(fallen.age_days / 365);
  const text = isOurs(state, fallen)
    ? `${formatDate(state.day)}. Cayó ${fallen.name}, de los nuestros. Vivió ${years} inviernos.`
    : `${formatDate(state.day)}. Murió ${fallen.name} de los hijos de ${groupName(state, fallen.group_id)}. Tuvo ${years} inviernos.`;
  return { day: state.day, text };
}

export function narrateConflict(
  state: WorldState,
  killer: NPC,
  victim: NPC,
  reason: string,
): ChronicleEntry {
  const ours = isOurs(state, killer);
  const theirs = isOurs(state, victim);

  let text: string;
  if (ours && theirs) {
    // Fratricidio — siempre trágico.
    text = `${formatDate(state.day)}. ${killer.name}, uno de los nuestros, dio muerte a ${victim.name}, también de los nuestros, en disputa por ${reason}. La sangre mancha la primera página.`;
  } else if (ours && !theirs) {
    // Victoria propia — épica pero mesurada.
    text = `${formatDate(state.day)}. ${killer.name}, de los nuestros, se impuso sobre ${victim.name} de ${groupName(state, victim.group_id)}. Disputaban por ${reason}.`;
  } else if (!ours && theirs) {
    // Caída de un nuestro — lamento.
    text = `${formatDate(state.day)}. ${victim.name}, uno de los nuestros, cayó a manos de ${killer.name} de ${groupName(state, killer.group_id)}. La disputa fue por ${reason}. No olvidaremos.`;
  } else {
    // Entre terceros — narración distante.
    text = `${formatDate(state.day)}. Corren noticias: ${killer.name} de ${groupName(state, killer.group_id)} mató a ${victim.name} de ${groupName(state, victim.group_id)} por ${reason}.`;
  }

  return { day: state.day, text };
}

export function narrateAnointment(state: WorldState, chosen: NPC): ChronicleEntry {
  return {
    day: state.day,
    text: `${formatDate(state.day)}. El dios posó su mirada sobre ${chosen.name}, de los nuestros. Desde este día, su destino pesa más que el de sus hermanos.`,
  };
}

export function narrateGift(
  state: WorldState,
  receiver: NPC,
  giftName: string,
): ChronicleEntry {
  return {
    day: state.day,
    text: `${formatDate(state.day)}. Un don descendió sobre ${receiver.name}: ${giftName}. ¿Sabrá honrarlo o desperdiciarlo?`,
  };
}

/**
 * Añade una entrada a la crónica del estado. Función pura: devuelve
 * un estado nuevo con la entrada al final.
 */
export function appendChronicle(
  state: WorldState,
  entry: ChronicleEntry,
): WorldState {
  return {
    ...state,
    chronicle: [...state.chronicle, entry],
  };
}
