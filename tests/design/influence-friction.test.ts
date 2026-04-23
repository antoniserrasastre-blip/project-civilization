/**
 * Tests de Diseño — fricción de recursos por influencia.
 *
 * Verifica que zonas con alta influencia (presencia prolongada del clan)
 * tienen recursos que tardan más en regenerar. La tierra sobre-explotada
 * se recupera más lento — señal al jugador de que debe explorar.
 */

import { describe, it, expect } from 'vitest';
import { tickResources, TICKS_PER_DAY, REGEN_DAYS } from '@/lib/resources';
import { RESOURCE, type ResourceSpawn } from '@/lib/world-state';
import { emptyInfluenceGrid, INFLUENCE_MAX } from '@/lib/influence';

const W = 20;
const H = 20;

function makeWoodSpawn(x: number, y: number, depletedAtTick = 0): ResourceSpawn {
  return {
    id: RESOURCE.WOOD,
    x,
    y,
    quantity: 0,
    initialQuantity: 100,
    regime: 'regenerable',
    depletedAtTick,
  };
}

describe('tickResources con influencia — fricción territorial', () => {
  it('recurso en tile de alta influencia tarda más en regenerar que en tile vacío', () => {
    const regenTicks = (REGEN_DAYS[RESOURCE.WOOD]! * TICKS_PER_DAY);

    // Grid vacío (sin influencia) → regen normal
    const gridEmpty = emptyInfluenceGrid(W, H);
    const spawnEmpty = makeWoodSpawn(5, 5, 0);
    const atRegenTick = tickResources([spawnEmpty], regenTicks, gridEmpty, W);
    expect(atRegenTick[0].quantity).toBe(100); // regeneró

    // Grid saturado (influencia máxima) → NO regenera en el mismo tick
    const gridFull = new Array(W * H).fill(INFLUENCE_MAX);
    const spawnFull = makeWoodSpawn(5, 5, 0);
    const atRegenTickFull = tickResources([spawnFull], regenTicks, gridFull, W);
    expect(atRegenTickFull[0].quantity).toBe(0); // NO regeneró aún
  });

  it('el multiplicador de fricción es continuo (influencia media → regen medio)', () => {
    const regenTicks = (REGEN_DAYS[RESOURCE.WOOD]! * TICKS_PER_DAY);
    const halfInfluence = Math.floor(INFLUENCE_MAX / 2);

    const gridHalf = new Array(W * H).fill(halfInfluence);
    const spawnHalf = makeWoodSpawn(5, 5, 0);

    // A tiempo normal no regenera con influencia media alta
    const atNormal = tickResources([spawnHalf], regenTicks, gridHalf, W);
    // A tiempo * 2 sí regenera (en algún punto entre regenTicks y regenTicks*2)
    const atDouble = tickResources([spawnHalf], regenTicks * 2, gridHalf, W);
    expect(atDouble[0].quantity).toBeGreaterThan(atNormal[0].quantity);
  });

  it('recursos depletables o continuous no se ven afectados por influencia', () => {
    const gridFull = new Array(W * H).fill(INFLUENCE_MAX);
    // Obsidiana es depletable — ya no regen sea cual sea la influencia
    const obsidiana: ResourceSpawn = {
      id: RESOURCE.OBSIDIAN,
      x: 5, y: 5,
      quantity: 0,
      initialQuantity: 50,
      regime: 'depletable',
      depletedAtTick: 0,
    };
    const result = tickResources([obsidiana], 99999, gridFull, W);
    expect(result[0].quantity).toBe(0); // depletable nunca regen
  });

  it('sin grid de influencia el comportamiento es idéntico al original', () => {
    const regenTicks = REGEN_DAYS[RESOURCE.WOOD]! * TICKS_PER_DAY;
    const spawn = makeWoodSpawn(5, 5, 0);
    const sinGrid = tickResources([spawn], regenTicks);
    const conGridVacio = tickResources([spawn], regenTicks, emptyInfluenceGrid(W, H), W);
    expect(sinGrid).toEqual(conGridVacio);
  });
});

describe('state.world.influence — integración en el shape del estado', () => {
  it('initialGameState produce world.influence como number[] de tamaño correcto', async () => {
    const { initialGameState } = await import('@/lib/game-state');
    const { makeTestNPC } = await import('@/lib/npcs');
    const state = initialGameState(1, [makeTestNPC({ id: 'n1' })]);
    expect(Array.isArray(state.world.influence)).toBe(true);
    expect(state.world.influence!.length).toBe(state.world.width * state.world.height);
    expect(state.world.influence!.every((v: number) => v === 0)).toBe(true);
  });

  it('round-trip JSON del GameState con influence', async () => {
    const { initialGameState } = await import('@/lib/game-state');
    const { makeTestNPC } = await import('@/lib/npcs');
    const state = initialGameState(1, [makeTestNPC({ id: 'n1' })]);
    expect(JSON.parse(JSON.stringify(state.world))).toEqual(state.world);
  });
});
