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
import { isFoodResource } from './resources';

/** Las 9 flags del contrato, todas OFF. El núcleo no tiene flag. */
export const LABORATORIO_FEATURES: FeatureFlags = {
  climate: false,
  animals: false,
  reproduction: false,
  items: false,
  legends: false,
  miracles: false,
  influence: false,
  fractures: false,
  tech: false,
};

/** Draft fijo del laboratorio: 3+3+2+2 = 10 = presupuesto exacto, 2M+2F. */
const LABORATORIO_PICKS: ReadonlyArray<{ archetype: Archetype; sex: Sex }> = [
  { archetype: ARCHETYPE.CAZADOR, sex: SEX.M },
  { archetype: ARCHETYPE.ARTESANO, sex: SEX.F },
  { archetype: ARCHETYPE.RECOLECTOR, sex: SEX.M },
  { archetype: ARCHETYPE.SCOUT, sex: SEX.F },
];

/** Escasez de comida del laboratorio (auditoría de riesgo, 11-06-2026): a
 *  abundancia natural (×1) el clan no puede sufrir jamás — 190 de comida para
 *  4 NPCs son ~6 días de despensa gratis y "dirigir mal" no cuesta nada. A
 *  ×0.25 el hambre asoma el día 2-3 sin matar: el mordisco que hace que los
 *  designios importen. Entero en centésimas para mantener §A4. */
const ESCASEZ_COMIDA_PCT = 25;

/** Partida de laboratorio lista: mundo 32×32 pangea (jugable a ese tamaño),
 *  4 elegidos drafteados desde el seed (patrón handleQuickStart, sin bloque B),
 *  spawn en tierra firme, phasedMode, las 8 flags OFF y comida escasa.
 *  Pura y determinista. */
export function makeLaboratorioState(seed: number): GameState {
  const generated = generateWorld(seed, { width: 32, height: 32, type: 'pangea' });
  const world = {
    ...generated,
    resources: generated.resources.map((r) => {
      if (!isFoodResource(r.id)) return r;
      const quantity = Math.max(1, Math.floor((r.quantity * ESCASEZ_COMIDA_PCT) / 100));
      const initialQuantity = Math.max(1, Math.floor((r.initialQuantity * ESCASEZ_COMIDA_PCT) / 100));
      return { ...r, quantity, initialQuantity };
    }),
  };

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
