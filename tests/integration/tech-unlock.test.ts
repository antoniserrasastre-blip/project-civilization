/**
 * Sprint 04b — reemplaza al e2e de wisdom TAUTOLÓGICO (assertaba sobre un
 * objeto construido a mano; borrado). Este test conduce el MOTOR REAL:
 * el sistema de tech desbloquea por condición (daysAlive >= 3) durante una
 * simulación de verdad, y lo anuncia con una entrada 'wisdom' en la crónica.
 *
 * Hallazgo documentado: `tech.wisdom` (el contador) es estado MUERTO — nada
 * lo incrementa en lib/. La generación de sabiduría (SHAMAN_HUT/curanderos)
 * no existe aún; queda como deuda explícita en el ROADMAP, no como test falso.
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { initialGameState } from '@/lib/game-state';
import { TICKS_PER_DAY } from '@/lib/resources';
import { makeTestNPC, makeFullInventory } from '../helpers/npc-fixtures';
import { TILE, type WorldMap } from '@/lib/world-state';

function mkFlatWorld(w = 16, h = 16): WorldMap {
  return {
    seed: 0, width: w, height: h, tiles: new Array(w * h).fill(TILE.GRASS),
    resources: [], meta: { generatorVersion: 1, shaHash: '', islandCount: 1 }, influence: [],
  };
}

describe('Tech — desbloqueo real por condición (no tautológico)', () => {
  it('tras 3+ días de sim real, la tech por daysAlive se desbloquea y la crónica lo anuncia', () => {
    const npcs = [
      makeTestNPC({ id: 'a', position: { x: 8, y: 8 }, stats: { supervivencia: 95, socializacion: 80, proposito: 90, miedo: 0 }, inventory: makeFullInventory({ berry: 5000 }) }),
      makeTestNPC({ id: 'b', position: { x: 9, y: 9 }, stats: { supervivencia: 95, socializacion: 80, proposito: 90, miedo: 0 }, inventory: makeFullInventory({ berry: 5000 }) }),
    ];
    let s = initialGameState(21, npcs, mkFlatWorld(), 'stone', { skipSpawning: true });
    expect(s.tech.unlocked).toHaveLength(0);

    for (let i = 0; i < TICKS_PER_DAY * 3 + 10; i++) s = tick(s);

    expect(s.tech.unlocked.length).toBeGreaterThan(0); // el motor real desbloqueó
    expect(s.chronicle.some((e) => e.type === 'wisdom' && /DESCUBRIMIENTO/.test(e.text))).toBe(true);
    expect(JSON.parse(JSON.stringify(s.tech))).toEqual(s.tech); // round-trip
  });
});
