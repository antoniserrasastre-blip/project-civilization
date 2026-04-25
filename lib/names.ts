/**
 * Pool de nombres catalano-baleares — Sprint #4 Fase 5 NPC-NAMES.
 *
 * Respeta §9 vision-godgame: voz partisana con nombres propios del
 * dominio. Nada de "John Smith". Selección determinista vía PRNG
 * seedable (§A4): `pickName(seed, sex, cursor)` es función pura.
 *
 * Los tamaños de cada pool (≥ 30) son holgados para que los 14 NPCs
 * del drafting inicial (típicamente ~7 de cada sexo) no colisionen
 * entre sí con `pickUniqueName`.
 */

import { nextInt, type PRNGState } from './prng';
import { SEX, type Sex } from './npcs';
import { faker } from '@faker-js/faker';

/** Nombres masculinos baleares — Joan/Miquel son arquetipos; Tomeu
 *  = diminutivo canónico de Bartomeu; se mantienen ambos porque
 *  conviven culturalmente. */
export const MALE_NAMES: readonly string[] = [
  'Joan',
  'Miquel',
  'Bartomeu',
  'Tomeu',
  'Antoni',
  'Toni',
  'Pere',
  'Jaume',
  'Bernat',
  'Guillem',
  'Francesc',
  'Xesc',
  'Sebastià',
  'Rafel',
  'Llorenç',
  'Andreu',
  'Martí',
  'Climent',
  'Damià',
  'Esteve',
  'Arnau',
  'Bernadí',
  'Vicenç',
  'Simó',
  'Gabriel',
  'Biel',
  'Nofre',
  'Ramon',
  'Gaspar',
  'Macià',
  'Salvador',
  'Cristòfol',
  'Mateu',
  'Baltasar',
];

/** Nombres femeninos baleares — Antònia/Margalida/Francina son los
 *  nombres canónicos del §9. */
export const FEMALE_NAMES: readonly string[] = [
  'Antònia',
  'Margalida',
  'Francina',
  'Catalina',
  'Apol·lònia',
  'Magdalena',
  'Joana',
  'Aina',
  'Bàrbara',
  'Coloma',
  'Esperança',
  'Esperanzina',
  'Elionor',
  'Isabel',
  'Beatriu',
  'Praxedis',
  'Úrsula',
  'Tonina',
  'Xisca',
  'Miquela',
  'Bel',
  'Jerònia',
  'Damiana',
  'Àgueda',
  'Bernarda',
  'Llucia',
  'Vicençó',
  'Pereta',
  'Rosa',
  'Clara',
  'Magina',
  'Paula',
  'Marina',
  'Sebastiana',
];

function poolFor(sex: Sex): readonly string[] {
  return sex === SEX.M ? MALE_NAMES : FEMALE_NAMES;
}

/** Elige un nombre determinista a partir de (seed, sex, cursor).
 *  No garantiza unicidad; para eso usa `pickUniqueName`. */
export function pickName(seed: number, sex: Sex, cursor: number): string {
  const pool = poolFor(sex);
  const prng: PRNGState = { seed: seed | 0, cursor };
  const { value } = nextInt(prng, 0, pool.length);
  
  // Faker seed para determinismo
  faker.seed(seed + cursor);
  const baseName = pool[value];
  
  // 15% de probabilidad de apodo job-based
  if (faker.number.int(100) < 15) {
    return `${baseName} ${faker.person.jobDescriptor()}`;
  }
  
  return baseName;
}

/** Elige un nombre determinista que no esté en `exclude`, avanzando
 *  el cursor hasta encontrar uno libre. Devuelve también el siguiente
 *  cursor utilizable por el caller. Tira si el pool se agota. */
export function pickUniqueName(
  seed: number,
  sex: Sex,
  cursor: number,
  exclude: ReadonlySet<string>,
): { name: string; nextCursor: number } {
  const pool = poolFor(sex);
  const maxAttempts = pool.length * 4;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const c = cursor + attempt;
    const name = pickName(seed, sex, c);
    if (!exclude.has(name)) {
      return { name, nextCursor: c + 1 };
    }
  }
  throw new Error(
    `sin nombres disponibles: pool ${sex} agotado tras ${maxAttempts} intentos`,
  );
}
