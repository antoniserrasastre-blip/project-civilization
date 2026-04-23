/**
 * Tests de transición de era — Sprint 6.4.
 */

import { describe, it, expect } from 'vitest';
import {
  initialGameState,
  canTransitionToTribal,
  transitionToTribal,
} from '@/lib/game-state';
import { makeTestNPC } from '@/lib/npcs';
import { TILE, type WorldMap } from '@/lib/world-state';

function mkWorld(): WorldMap {
  return {
    seed: 0,
    width: 16,
    height: 16,
    tiles: new Array(256).fill(TILE.GRASS),
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
    influence: [],
  };
}

function base() {
  return initialGameState(1, [makeTestNPC({ id: 'a' })], mkWorld());
}

describe('canTransitionToTribal', () => {
  it('false en estado inicial', () => {
    expect(canTransitionToTribal(base())).toBe(false);
  });

  it('false si monument no built', () => {
    const s = base();
    expect(canTransitionToTribal(s)).toBe(false);
  });

  it('false si monument built pero sin bendición de aldea', () => {
    const s = base();
    const s2 = {
      ...s,
      monument: { ...s.monument, phase: 'built' as const },
      village: { ...s.village, blessings: [] },
    };
    expect(canTransitionToTribal(s2)).toBe(false);
  });

  it('true si monument built + ≥1 bendición de aldea', () => {
    const s = base();
    const s2 = {
      ...s,
      monument: { ...s.monument, phase: 'built' as const },
      village: { ...s.village, blessings: ['recolecta'] as ['recolecta'] },
    };
    expect(canTransitionToTribal(s2)).toBe(true);
  });
});

describe('transitionToTribal', () => {
  it('cambia era', () => {
    const s = base();
    const ready = {
      ...s,
      monument: { ...s.monument, phase: 'built' as const },
      village: { ...s.village, blessings: ['fertilidad'] as ['fertilidad'] },
    };
    const next = transitionToTribal(ready);
    expect(next.era).toBe('tribal');
  });

  it('tira si no se cumple canTransitionToTribal', () => {
    const s = base();
    expect(() => transitionToTribal(s)).toThrow(/no se puede transicionar/i);
  });

  it('preserva el resto del state', () => {
    const s = base();
    const ready = {
      ...s,
      monument: { ...s.monument, phase: 'built' as const },
      village: { ...s.village, blessings: ['salud'] as ['salud'] },
    };
    const next = transitionToTribal(ready);
    expect(next.npcs).toEqual(ready.npcs);
    expect(next.world).toEqual(ready.world);
    expect(next.village.blessings).toEqual(ready.village.blessings);
  });
});
