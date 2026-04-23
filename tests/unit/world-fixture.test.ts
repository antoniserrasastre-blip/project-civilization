/**
 * Tests de la fixture del mapa canónico.
 *
 * La fixture vive en `lib/fixtures/world-map.v1.json` y debe
 * coincidir byte-a-byte con `generateWorld(CANONICAL_SEED)`. Si
 * diverge, alguien tocó el generador sin recompilar — o alguien
 * editó la fixture a mano. Ambas cosas son un fail de gate.
 *
 * El script que compila la fixture vive en
 * `scripts/compile-world.ts` y se ejecuta con `pnpm compile:world`.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import fixture from '@/lib/fixtures/world-map.v1.json';
import { generateWorld, CANONICAL_SEED } from '@/lib/world-gen';
import type { WorldMap } from '@/lib/world-state';

function sha(w: WorldMap): string {
  return createHash('sha256').update(JSON.stringify(w)).digest('hex');
}

describe('lib/fixtures/world-map.v1.json — coherencia con el generador', () => {
  it('shaHash de la fixture coincide con generateWorld(CANONICAL_SEED)', () => {
    const live = generateWorld(CANONICAL_SEED);
    expect((fixture as WorldMap).meta.shaHash).toBe(live.meta.shaHash);
  });

  it('fixture es byte-idéntica al generado (no basta con shaHash)', () => {
    const live = generateWorld(CANONICAL_SEED);
    expect(sha(fixture as WorldMap)).toBe(sha(live));
  });

  it('fixture declara generatorVersion 2 (biomas bioclimáticos)', () => {
    expect((fixture as WorldMap).meta.generatorVersion).toBe(2);
  });

  it('fixture tiene 512×512 tiles', () => {
    const w = fixture as WorldMap;
    expect(w.width).toBe(512);
    expect(w.height).toBe(512);
    expect(w.tiles.length).toBe(512 * 512);
  });
});
