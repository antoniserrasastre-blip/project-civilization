/**
 * Suite de diseño TDD — Sprint 04a: informe del amanecer + designios en el mapa.
 *
 * Contrato (spec 04a):
 *  - Skill `exploration` propia (muere el hack exploracion→hunting).
 *  - `NPC.dailyActivity` {harvested, built, discovered} enteros, reset al amanecer.
 *  - `state.dawnReport` (DawnReport | null): generado por el paso 'informe-amanecer'
 *    sobre el día que cierra — clan + por-NPC (designio asignado vs hecho).
 *    Determinista y round-trip JSON. null antes del primer amanecer.
 *  - Movimiento = bias del TIEMPO LIBRE: saciado + designio exploracion → el NPC
 *    se mueve, descubre frontera y gana exploration XP. Las urgencias mandan.
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { dawn } from '@/lib/dawn';
import { tickHarvests } from '@/lib/harvest';
import { initialGameState } from '@/lib/game-state';
import { makeTestNPC, makeFullInventory } from '../helpers/npc-fixtures';
import { RESOURCE, TILE, type ResourceSpawn, type WorldMap } from '@/lib/world-state';

function mkFlatWorld(w = 24, h = 24): WorldMap {
  return {
    seed: 0, width: w, height: h, tiles: new Array(w * h).fill(TILE.GRASS),
    resources: [], meta: { generatorVersion: 1, shaHash: '', islandCount: 1 }, influence: [],
  };
}

const saciado = { supervivencia: 90, socializacion: 80, proposito: 90, miedo: 10 };

describe('Sprint 04a — exploración, actividad diaria e informe', () => {
  it('exploration es skill de primera: existe, entera, y consolida XP en el amanecer', () => {
    const npc = { ...makeTestNPC({ id: 'a', position: { x: 12, y: 12 }, stats: saciado }), skillXP: { exploration: 150 } };
    const base = initialGameState(3, [npc], mkFlatWorld(), 'stone', { skipSpawning: true });
    expect(Number.isInteger(base.npcs[0].skills.exploration)).toBe(true);
    const out = dawn({ ...base, tick: 479, phase: 'preparation' });
    expect(out.npcs[0].skills.exploration).toBe(base.npcs[0].skills.exploration + 1);
    expect(out.npcs[0].skillXP?.exploration).toBe(50);
  });

  it('dailyActivity.harvested cuenta lo recolectado hoy (entero)', () => {
    const npc = makeTestNPC({ id: 'a', position: { x: 5, y: 5 } });
    const s: ResourceSpawn = { id: RESOURCE.BERRY, x: 5, y: 5, quantity: 50, initialQuantity: 50, regime: 'regenerable', depletedAtTick: null };
    const r = tickHarvests([npc], [s], 0);
    expect(r.npcs[0].dailyActivity?.harvested).toBeGreaterThan(0);
    expect(Number.isInteger(r.npcs[0].dailyActivity?.harvested)).toBe(true);
  });

  it('el amanecer genera dawnReport (clan + por-NPC, asignado vs hecho) y resetea dailyActivity', () => {
    const npc = {
      ...makeTestNPC({ id: 'ana', position: { x: 12, y: 12 }, stats: saciado, inventory: makeFullInventory({ berry: 100 }) }),
      designio: 'recoleccion' as const,
      dailyActivity: { harvested: 7, built: 0, discovered: 3 },
    };
    const base = initialGameState(5, [npc], mkFlatWorld(), 'stone', { skipSpawning: true });
    expect(base.dawnReport ?? null).toBeNull(); // antes del primer amanecer

    const out = dawn({ ...base, tick: 479, phase: 'preparation' });
    const rep = out.dawnReport!;
    expect(rep.day).toBe(0);
    expect(rep.clan.harvested).toBe(7);
    expect(rep.clan.discovered).toBe(3);
    // `cumplido` llegó en sprint 05 (conexión); en 05b el ✓ ganó precio:
    // harvested 7 < UMBRAL_CUMPLIDO.recoleccion (15) → fallido, con su porqué.
    expect(rep.npcs).toEqual([
      { id: 'ana', name: npc.name, designio: 'recoleccion', harvested: 7, built: 0, discovered: 3, cumplido: 'fallido', motivo: 'corto' },
    ]);
    expect(out.npcs[0].dailyActivity).toBeUndefined(); // reset diario
    expect(JSON.parse(JSON.stringify(out))).toEqual(out); // round-trip

    const out2 = dawn({ ...base, tick: 479, phase: 'preparation' });
    expect(JSON.stringify(out2.dawnReport)).toBe(JSON.stringify(rep)); // determinista
  });

  it('bias del tiempo libre: el explorador saciado se mueve, descubre frontera y gana exploration XP', () => {
    const explorer = {
      ...makeTestNPC({ id: 'exp', position: { x: 12, y: 12 }, stats: saciado, inventory: makeFullInventory({ berry: 200 }) }),
      designio: 'exploracion' as const,
    };
    let s = initialGameState(7, [explorer], mkFlatWorld(), 'stone', { skipSpawning: true });
    const startPos = { ...s.npcs[0].position };
    for (let i = 0; i < 60; i++) s = tick(s);
    const n = s.npcs[0];
    expect(n.position).not.toEqual(startPos); // se movió
    expect((n.dailyActivity?.discovered ?? 0) + 0).toBeGreaterThan(0); // descubrió
    expect((n.skillXP?.exploration ?? 0) + 0).toBeGreaterThan(0); // y aprendió
  });
});
