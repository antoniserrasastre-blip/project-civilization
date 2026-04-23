/**
 * Tests de los 5 milagros — Sprint 5.4 (decisión #32).
 */

import { describe, it, expect } from 'vitest';
import {
  MIRACLES_CATALOG,
  MIRACLE,
  MAX_TRAITS_PER_NPC,
  grantMiracle,
  canGrantMiracle,
} from '@/lib/miracles';
import { makeTestNPC } from '@/lib/npcs';
import { initialGameState } from '@/lib/game-state';
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

function setupState(overrides: Partial<{ gratitude: number }> = {}) {
  const npcs = [
    makeTestNPC({ id: 'a' }),
    makeTestNPC({ id: 'b' }),
  ];
  const s = initialGameState(1, npcs, mkWorld());
  return {
    ...s,
    village: { ...s.village, gratitude: overrides.gratitude ?? 100 },
  };
}

describe('MIRACLES_CATALOG — decisión #32', () => {
  it('lista los 5 con costes exactos', () => {
    expect(Object.keys(MIRACLES_CATALOG)).toHaveLength(5);
    expect(MIRACLES_CATALOG[MIRACLE.HAMBRE_SAGRADA].cost).toBe(30);
    expect(MIRACLES_CATALOG[MIRACLE.OJO_DE_HALCON].cost).toBe(40);
    expect(MIRACLES_CATALOG[MIRACLE.VOZ_DE_TODOS].cost).toBe(50);
    expect(MIRACLES_CATALOG[MIRACLE.MANOS_QUE_RECUERDAN].cost).toBe(60);
    expect(MIRACLES_CATALOG[MIRACLE.CORAZON_FIEL].cost).toBe(80);
  });
});

describe('grantMiracle — happy path', () => {
  it('añade rasgo al NPC y resta del pool', () => {
    const s = setupState({ gratitude: 100 });
    const after = grantMiracle(s, 'a', MIRACLE.OJO_DE_HALCON);
    expect(after.village.gratitude).toBe(100 - 40);
    expect(after.npcs.find((n) => n.id === 'a')!.traits).toContain(
      'ojo_de_halcon',
    );
  });

  it('no muta el state original', () => {
    const s = setupState({ gratitude: 100 });
    const snap = JSON.stringify(s);
    grantMiracle(s, 'a', MIRACLE.OJO_DE_HALCON);
    expect(JSON.stringify(s)).toBe(snap);
  });
});

describe('grantMiracle — validaciones', () => {
  it('tira si NPC no existe', () => {
    const s = setupState({ gratitude: 100 });
    expect(() => grantMiracle(s, 'nope', MIRACLE.OJO_DE_HALCON)).toThrow(
      /no encontrado/i,
    );
  });

  it('tira si NPC muerto', () => {
    const s = setupState({ gratitude: 100 });
    s.npcs[0] = { ...s.npcs[0], alive: false };
    expect(() => grantMiracle(s, 'a', MIRACLE.OJO_DE_HALCON)).toThrow(
      /muerto/i,
    );
  });

  it('tira si pool insuficiente', () => {
    const s = setupState({ gratitude: 20 });
    expect(() => grantMiracle(s, 'a', MIRACLE.OJO_DE_HALCON)).toThrow(
      /insuficiente/i,
    );
  });

  it('tira si NPC ya tiene ese rasgo', () => {
    const s = setupState({ gratitude: 100 });
    s.npcs[0] = { ...s.npcs[0], traits: ['ojo_de_halcon'] };
    expect(() => grantMiracle(s, 'a', MIRACLE.OJO_DE_HALCON)).toThrow(
      /ya tiene/i,
    );
  });
});

describe('grantMiracle — cap de rasgos', () => {
  it(`al superar ${MAX_TRAITS_PER_NPC} rasgos, el más antiguo se reemplaza`, () => {
    const s = setupState({ gratitude: 300 });
    s.npcs[0] = {
      ...s.npcs[0],
      traits: ['viejo', 'medio', 'reciente'],
    };
    const after = grantMiracle(s, 'a', MIRACLE.CORAZON_FIEL);
    const t = after.npcs.find((n) => n.id === 'a')!.traits;
    expect(t).toHaveLength(MAX_TRAITS_PER_NPC);
    expect(t).not.toContain('viejo'); // más antiguo fuera
    expect(t).toContain('corazon_fiel');
    expect(t).toContain('medio');
    expect(t).toContain('reciente');
  });

  it('3 milagros consecutivos dejan exactamente 3 rasgos', () => {
    let s = setupState({ gratitude: 200 });
    s = grantMiracle(s, 'a', MIRACLE.HAMBRE_SAGRADA);
    s = grantMiracle(s, 'a', MIRACLE.OJO_DE_HALCON);
    s = grantMiracle(s, 'a', MIRACLE.VOZ_DE_TODOS);
    const t = s.npcs.find((n) => n.id === 'a')!.traits;
    expect(t).toHaveLength(3);
    expect(t).toEqual(['hambre_sagrada', 'ojo_de_halcon', 'voz_de_todos']);
  });
});

describe('canGrantMiracle', () => {
  it('true si todo OK', () => {
    const s = setupState({ gratitude: 100 });
    expect(canGrantMiracle(s, 'a', MIRACLE.OJO_DE_HALCON)).toBe(true);
  });

  it('false si sin gratitud', () => {
    const s = setupState({ gratitude: 10 });
    expect(canGrantMiracle(s, 'a', MIRACLE.OJO_DE_HALCON)).toBe(false);
  });

  it('false si NPC muerto', () => {
    const s = setupState({ gratitude: 100 });
    s.npcs[0] = { ...s.npcs[0], alive: false };
    expect(canGrantMiracle(s, 'a', MIRACLE.OJO_DE_HALCON)).toBe(false);
  });

  it('false si ya tiene rasgo', () => {
    const s = setupState({ gratitude: 100 });
    s.npcs[0] = { ...s.npcs[0], traits: ['ojo_de_halcon'] };
    expect(canGrantMiracle(s, 'a', MIRACLE.OJO_DE_HALCON)).toBe(false);
  });
});
