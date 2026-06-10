/**
 * Suite de diseño TDD — Sprint 03: XP por actividad.
 *
 * Contrato (spec 03_xp-actividad):
 *  - `NPC.skillXP` (centésimas ENTERAS) acumula práctica intra-día; las skills
 *    almacenadas NO cambian durante el día (coherente con memoria v2).
 *  - Al amanecer, el paso 'consolidar-xp' del DAWN_PIPELINE consolida:
 *    skills += floor(skillXP/100) (clamp 0..100); el resto se conserva.
 *  - Designio = foco: ×1.5 de XP en las skills de su dominio
 *    (recoleccion→gathering+fishing · construccion→crafting · exploracion→hunting).
 *  - Muerte social NO instantánea: requiere 3 amaneceres consecutivos con
 *    media social < 20 (mitigable como siempre).
 */

import { describe, it, expect } from 'vitest';
import { tickHarvests } from '@/lib/harvest';
import { dawn } from '@/lib/dawn';
import { tickFractures } from '@/lib/events';
import { initialGameState } from '@/lib/game-state';
import { makeTestNPC, makeFullInventory } from '../helpers/npc-fixtures';
import { RESOURCE, TILE, type ResourceSpawn, type WorldMap } from '@/lib/world-state';

function spawn(over: Partial<ResourceSpawn> & { id: ResourceSpawn['id'] }): ResourceSpawn {
  return { x: 5, y: 5, quantity: 100000, initialQuantity: 100000, regime: 'regenerable', depletedAtTick: null, ...over };
}

function mkFlatWorld(w = 16, h = 16): WorldMap {
  return {
    seed: 0, width: w, height: h, tiles: new Array(w * h).fill(TILE.GRASS),
    resources: [], meta: { generatorVersion: 1, shaHash: '', islandCount: 1 }, influence: [],
  };
}

const recolector = (designio?: 'recoleccion') =>
  ({ ...makeTestNPC({ id: 'a', position: { x: 5, y: 5 } }), ...(designio ? { designio } : {}) });

describe('Sprint 03 — XP por actividad', () => {
  it('la práctica de harvest acumula skillXP entero SIN tocar las skills almacenadas', () => {
    const npc = recolector();
    const skillsBefore = { ...npc.skills };
    const r = tickHarvests([npc], [spawn({ id: RESOURCE.BERRY })], 0);
    const after = r.npcs[0];
    expect(after.skills).toEqual(skillsBefore); // intra-día: skills intactas
    expect((after.skillXP?.gathering ?? 0)).toBeGreaterThan(0);
    expect(Number.isInteger(after.skillXP?.gathering)).toBe(true);
  });

  it('designio = foco: ×1.5 de XP en su dominio (entero, determinista)', () => {
    const sin = tickHarvests([recolector()], [spawn({ id: RESOURCE.BERRY })], 0).npcs[0];
    const con = tickHarvests([recolector('recoleccion')], [spawn({ id: RESOURCE.BERRY })], 0).npcs[0];
    const base = sin.skillXP?.gathering ?? 0;
    const focused = con.skillXP?.gathering ?? 0;
    expect(focused).toBe(Math.round((base * 3) / 2));
    expect(focused).toBeGreaterThan(base);
  });

  it('el amanecer consolida: floor(xp/100) a skills, el resto se conserva, clamp 100, entero', () => {
    const npc = { ...makeTestNPC({ id: 'a', position: { x: 5, y: 5 } }), skillXP: { gathering: 230, crafting: 99, hunting: 25000 } };
    const base = initialGameState(5, [npc], mkFlatWorld(), 'stone', { skipSpawning: true });
    const skills = base.npcs[0].skills;
    const s = { ...base, tick: 479, phase: 'preparation' as const, phasedMode: true };

    const out = dawn(s);
    const after = out.npcs[0];
    expect(after.skills.gathering).toBe(Math.min(100, skills.gathering + 2));
    expect(after.skillXP?.gathering).toBe(30); // resto
    expect(after.skills.crafting).toBe(skills.crafting); // 99 < 100: no consolida aún
    expect(after.skillXP?.crafting).toBe(99);
    expect(after.skills.hunting).toBe(100); // clamp
    for (const v of Object.values(after.skills)) expect(Number.isInteger(v)).toBe(true);
    expect(JSON.parse(JSON.stringify(out))).toEqual(out); // round-trip
  });

  it('5 días de práctica: el NPC con designio acaba con más skill que sin él (mismo seed)', () => {
    const run = (designio?: 'recoleccion') => {
      let npcs = [recolector(designio)];
      let resources = [spawn({ id: RESOURCE.BERRY })];
      const base = initialGameState(9, npcs, mkFlatWorld(), 'stone', { skipSpawning: true });
      let s = { ...base, npcs };
      for (let day = 0; day < 5; day++) {
        for (let t = 0; t < 480; t++) {
          const r = tickHarvests(s.npcs, resources, day * 480 + t);
          s = { ...s, npcs: r.npcs };
          resources = r.resources;
        }
        s = dawn({ ...s, tick: (day + 1) * 480 - 1, phase: 'preparation' });
      }
      return s.npcs[0].skills.gathering;
    };
    const conDesignio = run('recoleccion');
    const sinDesignio = run();
    expect(conDesignio).toBeGreaterThan(sinDesignio);
    expect(Number.isInteger(conDesignio)).toBe(true);
  });

  it('muerte social NO instantánea: 1 amanecer con media <20 no mata; el 3º consecutivo sí', () => {
    const mkSocialState = (consec: number) => {
      const npcs = [
        makeTestNPC({ id: 'a1', position: { x: 1, y: 1 }, stats: { supervivencia: 90, socializacion: 10, proposito: 50, miedo: 10 }, inventory: makeFullInventory({ berry: 60 }) }),
        makeTestNPC({ id: 'a2', position: { x: 5, y: 5 }, stats: { supervivencia: 90, socializacion: 14, proposito: 50, miedo: 10 }, inventory: makeFullInventory({ berry: 60 }) }),
      ];
      const base = initialGameState(13, npcs, mkFlatWorld(), 'stone', { skipSpawning: true });
      return {
        ...base,
        tick: 479,
        village: { ...base.village, consecutiveLowSocialDays: consec },
      };
    };

    // Primer amanecer con media baja (consec previo 0): tensión, no muerte.
    const r1 = tickFractures(mkSocialState(0));
    expect(r1.fractures.some((f) => f.type === 'social_conflict')).toBe(false);
    expect(r1.state.npcs.every((n) => n.alive)).toBe(true);
    expect(r1.state.village.consecutiveLowSocialDays).toBe(1);

    // Tercer amanecer consecutivo: el conflicto estalla.
    const r3 = tickFractures(mkSocialState(2));
    expect(r3.fractures.some((f) => f.type === 'social_conflict' && !f.mitigated)).toBe(true);
    expect(r3.state.npcs.filter((n) => !n.alive)).toHaveLength(1);
  });
});
