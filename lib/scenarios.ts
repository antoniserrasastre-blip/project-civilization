/**
 * Escenarios de spawn — perfiles de arranque estilo Kenshi.
 *
 * Cada escenario define las condiciones de partida sobre el mismo
 * archipiélago balear-ficticio: modificadores de stats iniciales,
 * recursos de partida y zona preferida de spawn.
 *
 * Contrato §A4: puro, determinista, round-trip JSON.
 */

import type { NPC } from './npcs';
import type { ResourceId } from './world-state';

export const SCENARIO = {
  NAUFRAGOS: 'naufragos',
  EXODO: 'exodo',
} as const;

export type ScenarioId = (typeof SCENARIO)[keyof typeof SCENARIO];

export type SpawnZone = 'coast' | 'forest' | 'highland' | 'any';

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  description: string;
  /** Modificadores aditivos que se aplican a todos los NPCs al spawn. */
  npcStatMods: { supervivencia?: number; socializacion?: number };
  /** Recursos extra con los que arranca el clan (van al primer NPC
   *  del Bloque A como inventario colectivo — distribución en Sprint 12). */
  startingResources: Partial<Record<ResourceId, number>>;
  preferredSpawnZone: SpawnZone;
}

export const SCENARIO_CATALOG: Record<ScenarioId, ScenarioDef> = {
  [SCENARIO.NAUFRAGOS]: {
    id: SCENARIO.NAUFRAGOS,
    name: 'Náufragos',
    description:
      'El clan llega a las islas sin nada. Mar hostil, playa desconocida. ' +
      'Solo la costa ofrece pesca inmediata — sin ella, el hambre llega pronto.',
    npcStatMods: { supervivencia: -12, socializacion: -5 },
    startingResources: { berry: 3, fish: 5 },
    preferredSpawnZone: 'coast',
  },
  [SCENARIO.EXODO]: {
    id: SCENARIO.EXODO,
    name: 'Éxodo',
    description:
      'Migración organizada. El clan llegó con herramientas y provisiones. ' +
      'La cohesión social está alta; los bosques interiores ofrecen madera y caza.',
    npcStatMods: { supervivencia: 5, socializacion: 8 },
    startingResources: { wood: 12, stone: 8, berry: 10, game: 5 },
    preferredSpawnZone: 'forest',
  },
};

/** Devuelve la definición de un escenario. Lanza si el id es inválido. */
export function getScenarioDef(scenarioId: ScenarioId): ScenarioDef {
  const def = SCENARIO_CATALOG[scenarioId];
  if (!def) {
    throw new Error(`escenario desconocido: ${scenarioId}`);
  }
  return def;
}

/** Aplica los modificadores del escenario a un NPC. Pura — no muta el input.
 *  Stats se clamean a [0, 100]. */
export function applyScenario(npc: NPC, scenarioId: ScenarioId): NPC {
  const def = getScenarioDef(scenarioId);
  const sv = Math.max(
    0,
    Math.min(100, npc.stats.supervivencia + (def.npcStatMods.supervivencia ?? 0)),
  );
  const so = Math.max(
    0,
    Math.min(100, npc.stats.socializacion + (def.npcStatMods.socializacion ?? 0)),
  );
  return {
    ...npc,
    stats: { supervivencia: sv, socializacion: so },
  };
}
