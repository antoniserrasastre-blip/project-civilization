
import { describe, it, expect } from 'vitest';
import { decideDestination } from '@/lib/needs';
import { makeTestNPC, ARCHETYPE } from '@/lib/npcs';
import { RESOURCE, TILE, type WorldMap } from '@/lib/world-state';

function mkWorld(w = 20, h = 20): WorldMap {
  return {
    seed: 0,
    width: w,
    height: h,
    tiles: new Array(w * h).fill(TILE.GRASS),
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
    influence: [],
    reserves: [],
  };
}

describe('Impulso de Trabajo (Work Impulse)', () => {
  it('un NPC saciado (stats > 60) decide trabajar en lugar de quedarse en IDLE', () => {
    const world = mkWorld();
    // Colocamos un recurso de su rol lejos
    world.resources.push({
      id: RESOURCE.GAME,
      x: 10,
      y: 10,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });

    const npc = makeTestNPC({
      id: 'n1',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 80, socializacion: 80 },
      archetype: ARCHETYPE.CAZADOR,
      vocation: 'guerrero', // GUERRERO tiene afinidad con GAME
    });

    const result = decideDestination(npc, { world, npcs: [npc] });
    const destination = 'position' in result ? result.position : result;

    // Debería dirigirse al recurso de su rol (GAME)
    expect(destination).toEqual({ x: 10, y: 10 });
  });

  it('un NPC con urgencias (< 40 supervivencia) ignora el rol y busca comida básica', () => {
    const world = mkWorld();
    // Recurso de rol lejos
    world.resources.push({
      id: RESOURCE.GAME,
      x: 10,
      y: 10,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    // Bayas cerca (comida básica)
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 1,
      y: 1,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });

    const npc = makeTestNPC({
      id: 'n1',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 30, socializacion: 80 },
      archetype: ARCHETYPE.CAZADOR,
    });

    const result = decideDestination(npc, { world, npcs: [npc] });
    const destination = 'position' in result ? result.position : result;

    // Debería ir a las bayas por urgencia
    expect(destination).toEqual({ x: 1, y: 1 });
  });
});
