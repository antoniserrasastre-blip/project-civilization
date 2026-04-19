/**
 * Bendiciones de aldea primigenia — Sprint 6.3 (decisiones #16, #24, #25).
 *
 * Al completar el monumento, el jugador elige 1 bendición de 4
 * disponibles en primigenia (las otras 3 del catálogo §6 quedan
 * reservadas para tribal+). Sin reelección (decisión #25).
 *
 * Efecto primigenia aplicado al tick siguiente. El compounding
 * (efecto mejorado al pasar de era) se activa cuando la era
 * tribal exista.
 */

import type { VillageState } from './village';

export const VILLAGE_BLESSING = {
  RECOLECTA: 'recolecta',
  FERTILIDAD: 'fertilidad',
  SALUD: 'salud',
  RECONOCIMIENTO: 'reconocimiento',
} as const;

export type VillageBlessingId =
  (typeof VILLAGE_BLESSING)[keyof typeof VILLAGE_BLESSING];

export interface VillageBlessingDef {
  id: VillageBlessingId;
  nameCastellano: string;
  effectPrimigenia: string;
  compoundingTribal: string;
}

/** Decisión #24: subset de 4 disponibles en primigenia. Las otras
 *  3 (comercio, producción, longevidad) llegan en tribal. */
export const VILLAGE_BLESSINGS_CATALOG: Record<
  VillageBlessingId,
  VillageBlessingDef
> = {
  [VILLAGE_BLESSING.RECOLECTA]: {
    id: VILLAGE_BLESSING.RECOLECTA,
    nameCastellano: 'Bendición de la recolecta',
    effectPrimigenia: 'Regeneración de recursos +20%',
    compoundingTribal: 'Granja primitiva, domesticación',
  },
  [VILLAGE_BLESSING.FERTILIDAD]: {
    id: VILLAGE_BLESSING.FERTILIDAD,
    nameCastellano: 'Bendición de la fertilidad',
    effectPrimigenia: 'Partos +30%, menos mortalidad infantil',
    compoundingTribal: 'Explosión demográfica, primera ciudad',
  },
  [VILLAGE_BLESSING.SALUD]: {
    id: VILLAGE_BLESSING.SALUD,
    nameCastellano: 'Bendición de la salud',
    effectPrimigenia: 'Supervivencia pasiva +10',
    compoundingTribal: 'Medicina emergente, menos muertes por enfermedad',
  },
  [VILLAGE_BLESSING.RECONOCIMIENTO]: {
    id: VILLAGE_BLESSING.RECONOCIMIENTO,
    nameCastellano: 'Bendición del reconocimiento',
    effectPrimigenia: 'Otros clanes reconocen al culto como legítimo',
    compoundingTribal: 'Diplomacia, alianzas, tratados',
  },
};

/** Devuelve true si el jugador aún no ha elegido esta bendición
 *  en cualquier era. Decisión #25: sin reelección. */
export function canSelectBlessing(
  village: VillageState,
  blessingId: VillageBlessingId,
): boolean {
  return !village.blessings.includes(blessingId);
}

/** Añade la bendición al village. Tira si ya elegida antes
 *  (decisión #25) o si el id no existe. */
export function selectBlessing(
  village: VillageState,
  blessingId: VillageBlessingId,
): VillageState {
  if (!VILLAGE_BLESSINGS_CATALOG[blessingId]) {
    throw new Error(`bendición de aldea inválida: ${blessingId}`);
  }
  if (!canSelectBlessing(village, blessingId)) {
    throw new Error(`bendición ya elegida previamente: ${blessingId}`);
  }
  return {
    ...village,
    blessings: [...village.blessings, blessingId],
  };
}

/** Lista las bendiciones de aldea disponibles para elegir AHORA
 *  (primigenia). */
export function availableForPrimigenia(
  village: VillageState,
): VillageBlessingId[] {
  return Object.values(VILLAGE_BLESSING).filter((id) =>
    canSelectBlessing(village, id),
  );
}
