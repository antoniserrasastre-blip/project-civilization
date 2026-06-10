/**
 * Suite de diseño TDD — Memoria Mecánica v2 (contrato transitorio).
 *
 * NUEVO CONTRATO (decidido por el dueño):
 *   - Las skills ALMACENADAS en `npc.skills` jamás incluyen bonos de memoria.
 *   - `computeMemorySkillBonuses(chronicle, tick)` queda igual (puro).
 *   - Los bonos se aplican de forma TRANSITORIA en el punto de uso vía un
 *     helper puro `effectiveSkill` (entero, clamp 0..100) que vivirá en
 *     `lib/chronicle.ts` (dominio de la memoria; evita ciclo runtime con npcs).
 *     Contrato propuesto:
 *       effectiveSkill(base: number, skill: keyof NPCSkills,
 *                      chronicle: readonly ChronicleEntry[], currentTick: number): number
 *   - `applyMemoryBonusesToSkills` deja de escribirse en el estado del tick.
 *
 * BUG HOY (B2): lib/simulation.ts aplica applyMemoryBonusesToSkills a TODOS
 * los NPCs en CADA tick → las skills almacenadas derivan ±1..3 por tick y
 * saturan a 0/100 en segundos de juego. Estos tests están en ROJO hoy.
 *
 * Determinista (seed fija), enteros, sin sleeps. §A4.
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { initialGameState, type ChronicleEntry } from '@/lib/game-state';
import { computeMemorySkillBonuses } from '@/lib/chronicle';
import { makeTestNPC, makeFullInventory } from '../helpers/npc-fixtures';
import { TILE, type WorldMap } from '@/lib/world-state';

function mkFlatWorld(w = 32, h = 32): WorldMap {
  return {
    seed: 0,
    width: w,
    height: h,
    tiles: new Array(w * h).fill(TILE.GRASS),
    resources: [], // sin recursos → cero práctica → cero progresión legítima de skills
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
    influence: [],
  };
}

/** Entrada de crónica activa de impacto fuerte (bonus de memoria = +3). */
function strongMemoryEntry(): ChronicleEntry {
  return {
    day: 0,
    tick: 0,
    text: 'Día 0: Gran victoria de los nuestros; la memoria del clan arde fuerte.',
    type: 'system',
    impact: 50, // floor(50/5)=10 → clamp +3
    expiresAtTick: 1_000_000, // activa durante todo el test
  };
}

function mkStateWithActiveMemory() {
  const npc = makeTestNPC({
    id: 'a',
    position: { x: 5, y: 5 },
    stats: { supervivencia: 90, socializacion: 80, proposito: 90, miedo: 10 },
    inventory: makeFullInventory({ berry: 5000 }), // sobrevive sin recolectar (comer no da skill)
  });
  const s = initialGameState(1, [npc], mkFlatWorld(), 'stone', { skipSpawning: true });
  return { ...s, chronicle: [strongMemoryEntry()] };
}

describe('Memoria Mecánica v2 — las skills almacenadas no incluyen bonos de memoria', () => {
  it('contrato v2 (ancla): computeMemorySkillBonuses sigue puro, determinista y con clamp ±3', () => {
    const chron = [strongMemoryEntry()];
    const snap = JSON.stringify(chron);
    const b1 = computeMemorySkillBonuses(chron, 10);
    const b2 = computeMemorySkillBonuses(chron, 10);
    expect(b1).toEqual(b2); // determinismo
    expect(JSON.stringify(chron)).toBe(snap); // pureza
    expect(b1.hunting).toBe(3);
    for (const v of Object.values(b1)) {
      expect(Number.isInteger(v)).toBe(true);
      expect(Math.abs(v as number)).toBeLessThanOrEqual(3);
    }
    expect(computeMemorySkillBonuses([], 10)).toEqual({}); // sin memoria activa → sin bonus
  });

  it('B2: un tick sin práctica NO cambia las skills almacenadas aunque haya memoria activa fuerte', () => {
    const s = mkStateWithActiveMemory();
    // sanity: la memoria activa produce bonus != 0 — el bonus existe, pero es transitorio
    expect(computeMemorySkillBonuses(s.chronicle, s.tick).hunting).toBe(3);

    const skillsBefore = { ...s.npcs[0].skills };
    const s1 = tick(s);

    // BUG HOY: applyMemoryBonusesToSkills escribe +3 en cada skill, cada tick.
    expect(s1.npcs[0].skills).toEqual(skillsBefore);
  });

  it('B2: estabilidad — 1000 ticks (≈2 días) sin actividad: sin deriva per-tick y sin saturación a 0/100', () => {
    let s = mkStateWithActiveMemory();
    const before = { ...s.npcs[0].skills };

    for (let i = 0; i < 1000; i++) {
      s = tick(s);
    }
    const after = s.npcs[0].skills;

    // Sin actividad (mundo sin recursos) no hay progresión ganada legítima:
    // cualquier cambio por encima de un umbral mínimo es deriva de memoria.
    // BUG HOY: +3/tick → hunting satura a 100 en ~27 ticks.
    for (const key of Object.keys(before) as (keyof typeof before)[]) {
      expect(Math.abs(after[key] - before[key])).toBeLessThanOrEqual(3);
      expect(Number.isInteger(after[key])).toBe(true);
    }
    expect(after.hunting).toBeLessThan(100); // no saturación alta
    expect(after.hunting).toBeGreaterThan(0); // no saturación baja
  });

  it('B2: helper puro effectiveSkill — bonus transitorio en el punto de uso, entero, clamp 0..100', async () => {
    // El helper aún no existe: este test (y SOLO este) falla por import/undefined.
    // Contrato propuesto — vive en lib/chronicle.ts:
    //   effectiveSkill(base, skill, chronicle, currentTick): number
    const mod: any = await import('@/lib/chronicle');
    expect(typeof mod.effectiveSkill).toBe('function');

    const chron = [strongMemoryEntry()]; // bonus +3
    expect(mod.effectiveSkill(50, 'hunting', chron, 0)).toBe(53);
    expect(Number.isInteger(mod.effectiveSkill(50, 'hunting', chron, 0))).toBe(true);

    // clamp superior e inferior
    expect(mod.effectiveSkill(99, 'hunting', chron, 0)).toBe(100);
    const negChron = [{ ...strongMemoryEntry(), impact: -50 }]; // bonus -3
    expect(mod.effectiveSkill(1, 'hunting', negChron, 0)).toBe(0);

    // sin memoria activa → identidad; crónica expirada → identidad
    expect(mod.effectiveSkill(40, 'hunting', [], 0)).toBe(40);
    const expired = [{ ...strongMemoryEntry(), expiresAtTick: 5 }];
    expect(mod.effectiveSkill(40, 'hunting', expired, 10)).toBe(40);

    // pureza: no muta la crónica ni nada del input
    const snap = JSON.stringify(chron);
    mod.effectiveSkill(50, 'hunting', chron, 0);
    expect(JSON.stringify(chron)).toBe(snap);
  });
});
