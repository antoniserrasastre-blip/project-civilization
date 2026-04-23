/**
 * Tests de biografía — derivación pura de datos del NPC para la ficha.
 */

import { describe, it, expect } from 'vitest';
import { buildNpcBiography } from '@/lib/biography';
import { makeTestNPC } from '@/lib/npcs';
import { TICKS_PER_DAY } from '@/lib/resources';

describe('buildNpcBiography', () => {
  it('fundador (parents=null) reporta parentNames=null y día 1', () => {
    const founder = makeTestNPC({ id: 'f1', birthTick: 0 });
    const bio = buildNpcBiography(founder, [founder], 0);
    expect(bio.bornDay).toBe(1);
    expect(bio.ageDays).toBe(0);
    expect(bio.parentNames).toBeNull();
    expect(bio.childrenCount).toBe(0);
  });

  it('ageDays crece con el tick actual', () => {
    const n = makeTestNPC({ id: 'x', birthTick: 0 });
    const bio = buildNpcBiography(n, [n], TICKS_PER_DAY * 3);
    expect(bio.ageDays).toBe(3);
  });

  it('nacido al final del día 2 aparece como bornDay=3 (1-indexado)', () => {
    const n = makeTestNPC({ id: 'x', birthTick: TICKS_PER_DAY * 2 });
    const bio = buildNpcBiography(n, [n], TICKS_PER_DAY * 2);
    expect(bio.bornDay).toBe(3);
    expect(bio.ageDays).toBe(0);
  });

  it('parentNames resuelve ids a nombres usando el pool de NPCs', () => {
    const pa = makeTestNPC({ id: 'pa', name: 'Tomeu' });
    const pb = makeTestNPC({ id: 'pb', name: 'Aina' });
    const child = makeTestNPC({
      id: 'c',
      birthTick: TICKS_PER_DAY,
      parents: ['pa', 'pb'],
    });
    const bio = buildNpcBiography(child, [pa, pb, child], TICKS_PER_DAY);
    expect(bio.parentNames).toEqual(['Tomeu', 'Aina']);
  });

  it('parentNames cae a ids si el NPC padre no está en el pool', () => {
    const child = makeTestNPC({
      id: 'c',
      parents: ['ghost-a', 'ghost-b'],
    });
    const bio = buildNpcBiography(child, [child], 0);
    expect(bio.parentNames).toEqual(['ghost-a', 'ghost-b']);
  });

  it('childrenCount cuenta NPCs cuyos parents incluyen al referido', () => {
    const parent = makeTestNPC({ id: 'p' });
    const other = makeTestNPC({ id: 'other' });
    const c1 = makeTestNPC({ id: 'c1', parents: ['p', 'other'] });
    const c2 = makeTestNPC({ id: 'c2', parents: ['p', 'other'] });
    const c3 = makeTestNPC({ id: 'c3', parents: ['other', 'z'] });
    const npcs = [parent, other, c1, c2, c3];
    expect(buildNpcBiography(parent, npcs, 0).childrenCount).toBe(2);
    expect(buildNpcBiography(other, npcs, 0).childrenCount).toBe(3);
  });

  it('determinista: misma entrada → mismo output', () => {
    const pa = makeTestNPC({ id: 'pa', name: 'A' });
    const pb = makeTestNPC({ id: 'pb', name: 'B' });
    const c = makeTestNPC({ id: 'c', parents: ['pa', 'pb'], birthTick: 10 });
    const a = buildNpcBiography(c, [pa, pb, c], 100);
    const b = buildNpcBiography(c, [pa, pb, c], 100);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
