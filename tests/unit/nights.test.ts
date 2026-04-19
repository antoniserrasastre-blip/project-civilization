/**
 * Tests de la comprobación de noche — Sprint 4.6.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateNight,
  isNightCheckTick,
  MIN_NPCS_AT_FIRE,
  SLEEP_RADIUS,
} from '@/lib/nights';
import { TICKS_PER_DAY } from '@/lib/resources';
import { addStructure } from '@/lib/structures';
import { CRAFTABLE } from '@/lib/crafting';
import { makeTestNPC } from '@/lib/npcs';

describe('isNightCheckTick', () => {
  it('true en múltiplos de TICKS_PER_DAY', () => {
    expect(isNightCheckTick(0)).toBe(false); // arranque de partida
    expect(isNightCheckTick(TICKS_PER_DAY)).toBe(true);
    expect(isNightCheckTick(TICKS_PER_DAY * 5)).toBe(true);
    expect(isNightCheckTick(TICKS_PER_DAY - 1)).toBe(false);
    expect(isNightCheckTick(TICKS_PER_DAY + 1)).toBe(false);
  });
});

describe('evaluateNight — sin fogata', () => {
  it('contador se mantiene en 0', () => {
    expect(evaluateNight([], [], 0)).toBe(0);
    // Incluso si prevCount era alto, sin fogata vuelve a 0.
    expect(evaluateNight([], [], 5)).toBe(0);
  });
});

describe('evaluateNight — con fogata', () => {
  function npcsAtFire(n: number, position = { x: 10, y: 10 }) {
    return Array.from({ length: n }, (_, i) =>
      makeTestNPC({ id: `npc-${i}`, position }),
    );
  }

  it(`${MIN_NPCS_AT_FIRE} NPCs en radio → contador +1`, () => {
    const fires = addStructure([], CRAFTABLE.FOGATA_PERMANENTE, { x: 10, y: 10 }, 0);
    const npcs = npcsAtFire(MIN_NPCS_AT_FIRE);
    expect(evaluateNight(fires, npcs, 0)).toBe(1);
    expect(evaluateNight(fires, npcs, 9)).toBe(10);
  });

  it(`${MIN_NPCS_AT_FIRE - 1} NPCs en radio → contador a 0`, () => {
    const fires = addStructure([], CRAFTABLE.FOGATA_PERMANENTE, { x: 10, y: 10 }, 0);
    const npcs = npcsAtFire(MIN_NPCS_AT_FIRE - 1);
    expect(evaluateNight(fires, npcs, 5)).toBe(0);
  });

  it('NPCs fuera del radio no cuentan', () => {
    const fires = addStructure([], CRAFTABLE.FOGATA_PERMANENTE, { x: 10, y: 10 }, 0);
    const farAway = Array.from({ length: MIN_NPCS_AT_FIRE }, (_, i) =>
      makeTestNPC({ id: `far-${i}`, position: { x: 100, y: 100 } }),
    );
    expect(evaluateNight(fires, farAway, 2)).toBe(0);
  });

  it('muertos no cuentan', () => {
    const fires = addStructure([], CRAFTABLE.FOGATA_PERMANENTE, { x: 10, y: 10 }, 0);
    const npcs = Array.from({ length: MIN_NPCS_AT_FIRE }, (_, i) =>
      makeTestNPC({
        id: `npc-${i}`,
        position: { x: 10, y: 10 },
        alive: i !== 0, // uno muerto
      }),
    );
    // Solo 9 vivos < 10 → contador a 0.
    expect(evaluateNight(fires, npcs, 4)).toBe(0);
  });

  it('radio Chebyshev SLEEP_RADIUS inclusive', () => {
    const fires = addStructure([], CRAFTABLE.FOGATA_PERMANENTE, { x: 10, y: 10 }, 0);
    const atEdge = Array.from({ length: MIN_NPCS_AT_FIRE }, (_, i) =>
      makeTestNPC({
        id: `npc-${i}`,
        position: { x: 10 + SLEEP_RADIUS, y: 10 },
      }),
    );
    expect(evaluateNight(fires, atEdge, 0)).toBe(1);

    const justOutside = Array.from({ length: MIN_NPCS_AT_FIRE }, (_, i) =>
      makeTestNPC({
        id: `npc-${i}`,
        position: { x: 10 + SLEEP_RADIUS + 1, y: 10 },
      }),
    );
    expect(evaluateNight(fires, justOutside, 2)).toBe(0);
  });
});
