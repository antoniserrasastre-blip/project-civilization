/**
 * Quickstart "🔬 Laboratorio" — Sprint 05.
 *
 * Mundo 32×32 + 4 NPCs + núcleo del loop. Todos los subsistemas
 * con flag van apagados para que la partida sea debuggeable.
 */

import { initialGameState, type FeatureFlags, type GameState } from './game-state';
import { generateWorld } from './world-gen';
import { startDraft, pickArchetype, setSex, finalizeBlockA } from './drafting';
import { ARCHETYPE, SEX, type Archetype, type Sex } from './npcs';

/** Las 8 flags del contrato, todas OFF. El núcleo no tiene flag. */
export const LABORATORIO_FEATURES: FeatureFlags = {
  climate: false,
  animals: false,
  reproduction: false,
  items: false,
  legends: false,
  miracles: false,
  influence: false,
  fractures: false,
};

/** Draft fijo del laboratorio: 3+3+2+2 = 10 = presupuesto exacto, 2M+2F. */
const LABORATORIO_PICKS: ReadonlyArray<{ archetype: Archetype; sex: Sex }> = [
  { archetype: ARCHETYPE.CAZADOR, sex: SEX.M },
  { archetype: ARCHETYPE.ARTESANO, sex: SEX.F },
  { archetype: ARCHETYPE.RECOLECTOR, sex: SEX.M },
  { archetype: ARCHETYPE.SCOUT, sex: SEX.F },
];

/** Partida de laboratorio lista: mundo 32×32 pangea (jugable a ese tamaño),
 *  4 elegidos drafteados desde el seed (patrón handleQuickStart, sin bloque B),
 *  spawn en tierra firme, phasedMode y las 8 flags OFF. Pura y determinista. */
export function makeLaboratorioState(seed: number): GameState {
  const world = generateWorld(seed, { width: 32, height: 32, type: 'pangea' });

  let draft = startDraft(seed);
  LABORATORIO_PICKS.forEach((p, i) => {
    draft = pickArchetype(draft, i, p.archetype);
    draft = setSex(draft, i, p.sex);
  });
  const elegidos = finalizeBlockA(draft);

  // skipSpawning: false fuerza el posicionamiento real (findIslands +
  // pickClanSpawn + pickLandCells) aunque pasemos worldOverride.
  const base = initialGameState(seed, elegidos, world, 'stone', { skipSpawning: false });

  return {
    ...base,
    phasedMode: true,
    features: { ...LABORATORIO_FEATURES },
  };
}
