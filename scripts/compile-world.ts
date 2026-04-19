/**
 * Compila la fixture canónica del mundo primigenia.
 *
 * Lee `generateWorld(CANONICAL_SEED)` y escribe el resultado en
 * `lib/fixtures/world-map.v1.json`. La fixture es la fuente de verdad
 * del mapa en producción — `initialState()` la importa estáticamente
 * en vez de regenerar en runtime.
 *
 * Uso:
 *   pnpm compile:world
 *
 * Cuando se bump el CANONICAL_SEED o el generador cambia de shape,
 * re-ejecutar este script Y bumpear STORAGE_KEY en persistence para
 * invalidar saves antiguos.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { generateWorld, CANONICAL_SEED } from '../lib/world-gen';

const OUT = 'lib/fixtures/world-map.v1.json';

function main() {
  const world = generateWorld(CANONICAL_SEED);
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(world), 'utf8');
  const kb = (JSON.stringify(world).length / 1024).toFixed(1);
  console.log(
    `[compile-world] fixture escrita en ${OUT} (${kb} KB, ` +
      `${world.meta.islandCount} islas, ${world.resources.length} ` +
      `spawns, sha=${world.meta.shaHash.slice(0, 12)}…)`,
  );
}

main();
