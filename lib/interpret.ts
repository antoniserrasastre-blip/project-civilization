/**
 * Interpretación emergente del mensaje diario — Sprint 5.2.
 *
 * Cada NPC lee la intención del día según sus niveles individuales
 * (supervivencia + socialización) y su linaje. La salida es un
 * `NPCBehaviorBias` que modula posteriores decideDestination /
 * harvest / social (Sprint 5.3 los integra).
 *
 * Este módulo define la tabla declarativa (INTERPRETATION_RULES) y
 * la función pura que la evalúa. Sin PRNG — determinista puro por
 * inputs.
 */

import type { NPC } from './npcs';
import type { MessageChoice } from './messages';
import { MESSAGE_INTENTS, SILENCE } from './messages';

export interface NPCBehaviorBias {
  /** Peso de priorizar comida (0-1). */
  hungerFocus: number;
  /** Voluntad de acción arriesgada, p.ej. cazar alejado (0-1). */
  riskAppetite: number;
  /** Gravedad hacia el clan — búsqueda activa de compañía (0-1). */
  socialGravity: number;
  /** Impulso explorador — descubrir mapa (0-1). */
  explorationPush: number;
  /** Reserva — mantener el statu quo, no agitar (0-1). */
  restraint: number;
}

const ZERO: NPCBehaviorBias = {
  hungerFocus: 0,
  riskAppetite: 0,
  socialGravity: 0,
  explorationPush: 0,
  restraint: 0,
};

/** Base bias por intención. Modificado por el perfil individual.
 *  Auditable, revalidar en playtest Fase 5. */
const BASE_BY_INTENT: Record<MessageChoice, NPCBehaviorBias> = {
  [MESSAGE_INTENTS.AUXILIO]: {
    hungerFocus: 0.8,
    riskAppetite: 0.2,
    socialGravity: 0.6,
    explorationPush: 0.1,
    restraint: 0.2,
  },
  [MESSAGE_INTENTS.CORAJE]: {
    hungerFocus: 0.3,
    riskAppetite: 0.9,
    socialGravity: 0.1,
    explorationPush: 0.7,
    restraint: 0.0,
  },
  [MESSAGE_INTENTS.PACIENCIA]: {
    hungerFocus: 0.3,
    riskAppetite: 0.1,
    socialGravity: 0.4,
    explorationPush: 0.1,
    restraint: 0.9,
  },
  [MESSAGE_INTENTS.ENCUENTRO]: {
    hungerFocus: 0.2,
    riskAppetite: 0.2,
    socialGravity: 0.9,
    explorationPush: 0.3,
    restraint: 0.2,
  },
  [MESSAGE_INTENTS.RENUNCIA]: {
    hungerFocus: 0.2,
    riskAppetite: 0.3,
    socialGravity: 0.2,
    explorationPush: 0.8,
    restraint: 0.4,
  },
  [MESSAGE_INTENTS.ESPERANZA]: {
    hungerFocus: 0.3,
    riskAppetite: 0.4,
    socialGravity: 0.5,
    explorationPush: 0.4,
    restraint: 0.2,
  },
  [SILENCE]: ZERO,
};

function scaleByLevels(base: NPCBehaviorBias, npc: NPC): NPCBehaviorBias {
  // Supervivencia baja amplifica hungerFocus y frena riskAppetite.
  const svFactor = npc.stats.supervivencia / 100;
  const soFactor = npc.stats.socializacion / 100;

  return {
    hungerFocus: clamp01(base.hungerFocus + (1 - svFactor) * 0.3),
    riskAppetite: clamp01(base.riskAppetite * (0.5 + svFactor * 0.5)),
    socialGravity: clamp01(base.socialGravity + (1 - soFactor) * 0.3),
    explorationPush: clamp01(base.explorationPush * (0.5 + svFactor * 0.5)),
    restraint: clamp01(base.restraint * (0.5 + (1 - svFactor) * 0.5)),
  };
}

function scaleByLinaje(
  bias: NPCBehaviorBias,
  linaje: NPC['linaje'],
): NPCBehaviorBias {
  // Linajes aportan un ligero sesgo narrativo. Gregal (inestable)
  // sube risk; Garbi (contemplativos) sube restraint; Mestral
  // (supervivencia alta) sube explorationPush. Resto neutro.
  const out = { ...bias };
  if (linaje === 'gregal') out.riskAppetite = clamp01(out.riskAppetite + 0.1);
  if (linaje === 'garbi') out.restraint = clamp01(out.restraint + 0.1);
  if (linaje === 'mestral')
    out.explorationPush = clamp01(out.explorationPush + 0.1);
  return out;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function interpretIntent(
  choice: MessageChoice | null,
  npc: NPC,
): NPCBehaviorBias {
  if (choice === null || choice === SILENCE) return { ...ZERO };
  const base = BASE_BY_INTENT[choice];
  return scaleByLinaje(scaleByLevels(base, npc), npc.linaje);
}
