/**
 * Sinergias de composición de clan — Sprint 13 (estilo TFT).
 *
 * Una sinergia se activa cuando el clan tiene ≥ N miembros vivos que
 * cumplen el requisito (archetype / linaje). Cuando está activa, sus
 * modificadores son visibles en el HUD y aplicables al tick.
 *
 * Contrato §A4: puro, determinista, round-trip JSON.
 */

import type { NPC } from './npcs';
import { ARCHETYPE, LINAJE } from './npcs';

export const SYNERGY = {
  TRIPULACIO_PESQUERA: 'tripulacio_pesquera',
  CLAN_CACADORS:       'clan_cacadors',
  CERCLE_SANACIO:      'cercle_sanacio',
  TALLER_COLLECTIU:    'taller_collectiu',
  CLAN_MIXT:           'clan_mixt',
  TRAMUNTANA_PURA:     'tramuntana_pura',
} as const;

export type SynergyId = (typeof SYNERGY)[keyof typeof SYNERGY];

export interface SynergyModifiers {
  supervivencia?: number;
  socializacion?: number;
  hunting?: number;
  gathering?: number;
  crafting?: number;
  fishing?: number;
  healing?: number;
}

/** Tipo de requisito de la sinergia. */
export type SynergyRequirement =
  | { kind: 'archetype'; value: string }
  | { kind: 'linaje';    value: string }
  | { kind: 'linajes_distinct'; minCount: number };

export interface SynergyDef {
  id: SynergyId;
  name: string;
  description: string;
  threshold: number;
  requirement: SynergyRequirement;
  modifiers: SynergyModifiers;
}

export const SYNERGY_CATALOG: Record<SynergyId, SynergyDef> = {
  [SYNERGY.TRIPULACIO_PESQUERA]: {
    id: SYNERGY.TRIPULACIO_PESQUERA,
    name: 'Tripulació Pesquera',
    description: '≥3 pescadors: +20 pesca a tot el clan.',
    threshold: 3,
    requirement: { kind: 'archetype', value: ARCHETYPE.PESCADOR },
    modifiers: { fishing: 20 },
  },
  [SYNERGY.CLAN_CACADORS]: {
    id: SYNERGY.CLAN_CACADORS,
    name: 'Clan de Caçadors',
    description: '≥3 caçadors: +15 caça a tot el clan.',
    threshold: 3,
    requirement: { kind: 'archetype', value: ARCHETYPE.CAZADOR },
    modifiers: { hunting: 15 },
  },
  [SYNERGY.CERCLE_SANACIO]: {
    id: SYNERGY.CERCLE_SANACIO,
    name: 'Cercle de Sanació',
    description: '≥2 curanderos: +10 supervivència a tot el clan.',
    threshold: 2,
    requirement: { kind: 'archetype', value: ARCHETYPE.CURANDERO },
    modifiers: { supervivencia: 10 },
  },
  [SYNERGY.TALLER_COLLECTIU]: {
    id: SYNERGY.TALLER_COLLECTIU,
    name: 'Taller Col·lectiu',
    description: '≥2 artesans: +20 artesania a tot el clan.',
    threshold: 2,
    requirement: { kind: 'archetype', value: ARCHETYPE.ARTESANO },
    modifiers: { crafting: 20 },
  },
  [SYNERGY.CLAN_MIXT]: {
    id: SYNERGY.CLAN_MIXT,
    name: 'Clan Mixt',
    description: '≥4 llinatges distints: +8 socialització a tot el clan.',
    threshold: 4,
    requirement: { kind: 'linajes_distinct', minCount: 4 },
    modifiers: { socializacion: 8 },
  },
  [SYNERGY.TRAMUNTANA_PURA]: {
    id: SYNERGY.TRAMUNTANA_PURA,
    name: 'Tramuntana Pura',
    description: '≥3 del llinatge Tramuntana: +12 supervivència als Elegits.',
    threshold: 3,
    requirement: { kind: 'linaje', value: LINAJE.TRAMUNTANA },
    modifiers: { supervivencia: 12 },
  },
};

export interface ActiveSynergy {
  id: SynergyId;
  /** IDs de los NPCs vivos que activan la sinergia. */
  npcIds: string[];
}

/** Devuelve las sinergias activas para la composición actual del clan.
 *  Solo cuenta NPCs vivos. Pura y determinista. */
export function computeActiveSynergies(npcs: readonly NPC[]): ActiveSynergy[] {
  const alive = npcs.filter((n) => n.alive);
  const result: ActiveSynergy[] = [];

  for (const def of Object.values(SYNERGY_CATALOG)) {
    const contributing = matchingNpcs(alive, def.requirement);
    if (contributing.length >= def.threshold) {
      result.push({ id: def.id, npcIds: contributing.map((n) => n.id) });
    }
  }

  return result;
}

function matchingNpcs(alive: readonly NPC[], req: SynergyRequirement): NPC[] {
  switch (req.kind) {
    case 'archetype':
      return alive.filter((n) => n.archetype === req.value);
    case 'linaje':
      return alive.filter((n) => n.linaje === req.value);
    case 'linajes_distinct': {
      const distinct = new Set(alive.map((n) => n.linaje)).size;
      // Si hay suficientes linajes distintos, todos los NPCs son contribuyentes
      return distinct >= req.minCount ? [...alive] : [];
    }
  }
}
