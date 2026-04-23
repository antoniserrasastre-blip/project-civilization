/**
 * Tests Red — Sprint 8 MODULO-SOCIAL.
 *
 * Contrato de `lib/reproduction.ts`:
 *   - findEligiblePairs: pares M+F vivos, stats mínimas, sin cooldown.
 *   - birthNPC: hijo con herencia correcta.
 *   - tickReproduction: determinista, respeta cooldown y cap.
 *
 * Contrato de efectos de casta en simulación:
 *   - Elegido vivo aporta faith bonus extra.
 *   - Esclavo drena supervivencia pasivamente.
 */

import { describe, it, expect } from 'vitest';
import {
  findEligiblePairs,
  birthNPC,
  tickReproduction,
  MIN_SURVIV_TO_REPRODUCE,
  REPRODUCTION_COOLDOWN_TICKS,
  MAX_POPULATION,
} from '../../lib/reproduction';
import { makeTestNPC } from '../../lib/npcs';
import { CASTA, SEX, LINAJE } from '../../lib/npcs';
import { seedState } from '../../lib/prng';
import {
  elegidoFaithBonusPerTick,
  esclavoSurvivDrainPerTick,
} from '../../lib/casta-effects';

const SEED = 42;
const prng0 = seedState(SEED);

// ── helpers ──────────────────────────────────────────────────────────────────

function makeM(id: string, overrides = {}) {
  return makeTestNPC({
    id,
    sex: SEX.M,
    stats: { supervivencia: MIN_SURVIV_TO_REPRODUCE + 10, socializacion: 60 },
    lastReproducedTick: null,
    ...overrides,
  });
}

function makeF(id: string, overrides = {}) {
  return makeTestNPC({
    id,
    sex: SEX.F,
    stats: { supervivencia: MIN_SURVIV_TO_REPRODUCE + 10, socializacion: 60 },
    lastReproducedTick: null,
    ...overrides,
  });
}

// ── findEligiblePairs ────────────────────────────────────────────────────────

describe('findEligiblePairs', () => {
  it('devuelve vacío si no hay NPCs de sexo opuesto', () => {
    const npcs = [makeM('m1'), makeM('m2')];
    expect(findEligiblePairs(npcs, 100)).toHaveLength(0);
  });

  it('devuelve vacío si la hembra tiene supervivencia < mínima', () => {
    const npcs = [
      makeM('m1'),
      makeF('f1', { stats: { supervivencia: MIN_SURVIV_TO_REPRODUCE - 1, socializacion: 60 } }),
    ];
    expect(findEligiblePairs(npcs, 100)).toHaveLength(0);
  });

  it('devuelve vacío si el macho tiene supervivencia < mínima', () => {
    const npcs = [
      makeM('m1', { stats: { supervivencia: MIN_SURVIV_TO_REPRODUCE - 1, socializacion: 60 } }),
      makeF('f1'),
    ];
    expect(findEligiblePairs(npcs, 100)).toHaveLength(0);
  });

  it('devuelve vacío si ambos están en cooldown', () => {
    const tick = 500;
    const npcs = [
      makeM('m1', { lastReproducedTick: tick - REPRODUCTION_COOLDOWN_TICKS + 1 }),
      makeF('f1', { lastReproducedTick: tick - REPRODUCTION_COOLDOWN_TICKS + 1 }),
    ];
    expect(findEligiblePairs(npcs, tick)).toHaveLength(0);
  });

  it('devuelve vacío si uno de los dos está muerto', () => {
    const npcs = [makeM('m1', { alive: false }), makeF('f1')];
    expect(findEligiblePairs(npcs, 100)).toHaveLength(0);
  });

  it('encuentra el par cuando ambos son elegibles', () => {
    const npcs = [makeM('m1'), makeF('f1')];
    const pairs = findEligiblePairs(npcs, 100);
    expect(pairs).toHaveLength(1);
    const [a, b] = pairs[0];
    expect([a.id, b.id].sort()).toEqual(['f1', 'm1'].sort());
  });

  it('produce pares únicos (sin duplicados por orden)', () => {
    const npcs = [makeM('m1'), makeF('f1'), makeF('f2')];
    const pairs = findEligiblePairs(npcs, 100);
    // m1 puede emparejar con f1 o f2, pero cada m solo aparece una vez
    expect(pairs.length).toBeLessThanOrEqual(2);
    const seenM = pairs.map(([a, b]) => (a.sex === SEX.M ? a.id : b.id));
    const uniqueM = new Set(seenM);
    expect(uniqueM.size).toBe(seenM.length);
  });
});

// ── birthNPC ─────────────────────────────────────────────────────────────────

describe('birthNPC', () => {
  const father = makeM('father', { linaje: LINAJE.TRAMUNTANA, casta: CASTA.CIUDADANO });
  const mother = makeF('mother', { linaje: LINAJE.LLEVANT, casta: CASTA.CIUDADANO });

  it('produce un NPC con parents correctos', () => {
    const { npc } = birthNPC(father, mother, 100, prng0, new Set());
    expect(npc.parents).toEqual(['father', 'mother']);
  });

  it('birthTick refleja el tick actual', () => {
    const { npc } = birthNPC(father, mother, 250, prng0, new Set());
    expect(npc.birthTick).toBe(250);
  });

  it('hereda el linaje del padre', () => {
    const { npc } = birthNPC(father, mother, 100, prng0, new Set());
    expect(npc.linaje).toBe(LINAJE.TRAMUNTANA);
  });

  it('hereda la casta de los padres (misma casta)', () => {
    const { npc } = birthNPC(father, mother, 100, prng0, new Set());
    expect(npc.casta).toBe(CASTA.CIUDADANO);
  });

  it('hijo de Elegido × Ciudadano nace como Ciudadano', () => {
    const elegido = makeM('e1', { casta: CASTA.ELEGIDO });
    const ciudadana = makeF('c1', { casta: CASTA.CIUDADANO });
    const { npc } = birthNPC(elegido, ciudadana, 100, prng0, new Set());
    expect(npc.casta).toBe(CASTA.CIUDADANO);
  });

  it('skills del hijo están entre [padre - 5, padre + 5] (heurística herencia)', () => {
    const p1 = makeM('p1', { skills: { hunting: 40, gathering: 40, crafting: 40, fishing: 40, healing: 40 } });
    const p2 = makeF('p2', { skills: { hunting: 60, gathering: 60, crafting: 60, fishing: 60, healing: 60 } });
    const { npc } = birthNPC(p1, p2, 100, prng0, new Set());
    for (const k of ['hunting', 'gathering', 'crafting', 'fishing', 'healing'] as const) {
      expect(npc.skills[k]).toBeGreaterThanOrEqual(45);
      expect(npc.skills[k]).toBeLessThanOrEqual(55);
    }
  });

  it('supervivencia inicial del recién nacido es baja (≤ 60)', () => {
    const { npc } = birthNPC(father, mother, 100, prng0, new Set());
    expect(npc.stats.supervivencia).toBeLessThanOrEqual(60);
  });

  it('produce id único si nombre ya usado', () => {
    const used = new Set<string>();
    const r1 = birthNPC(father, mother, 100, prng0, used);
    used.add(r1.npc.name);
    const r2 = birthNPC(father, mother, 101, r1.prng, used);
    expect(r2.npc.name).not.toBe(r1.npc.name);
  });

  it('es determinista: mismo PRNG → mismo hijo', () => {
    const r1 = birthNPC(father, mother, 100, prng0, new Set());
    const r2 = birthNPC(father, mother, 100, prng0, new Set());
    expect(r1.npc.id).toBe(r2.npc.id);
    expect(r1.npc.name).toBe(r2.npc.name);
    expect(r1.npc.sex).toBe(r2.npc.sex);
  });
});

// ── tickReproduction ─────────────────────────────────────────────────────────

describe('tickReproduction', () => {
  it('no produce hijos si no hay pares elegibles', () => {
    const npcs = [makeM('m1'), makeM('m2')];
    const { newBorns } = tickReproduction(npcs, 100, prng0, new Set());
    expect(newBorns).toHaveLength(0);
  });

  it('actualiza lastReproducedTick en los padres que se reproducen', () => {
    const npcs = [makeM('m1'), makeF('f1')];
    const { npcs: next } = tickReproduction(npcs, 100, prng0, new Set());
    // Si hubo nacimiento, los padres tienen lastReproducedTick = 100
    const newBorns = next.filter((n) => n.birthTick === 100);
    if (newBorns.length > 0) {
      const dad = next.find((n) => n.id === 'm1')!;
      const mom = next.find((n) => n.id === 'f1')!;
      expect(dad.lastReproducedTick).toBe(100);
      expect(mom.lastReproducedTick).toBe(100);
    }
  });

  it('respeta MAX_POPULATION — no añade hijos si cap alcanzado', () => {
    const npcs = Array.from({ length: MAX_POPULATION }, (_, i) =>
      i % 2 === 0 ? makeM(`m${i}`) : makeF(`f${i}`),
    );
    const { newBorns } = tickReproduction(npcs, 100, prng0, new Set());
    expect(newBorns).toHaveLength(0);
  });

  it('es determinista: mismos inputs → mismos outputs', () => {
    const npcs = [makeM('m1'), makeF('f1')];
    const r1 = tickReproduction(npcs, 100, prng0, new Set());
    const r2 = tickReproduction(npcs, 100, prng0, new Set());
    expect(r1.newBorns.length).toBe(r2.newBorns.length);
    if (r1.newBorns.length > 0) {
      expect(r1.newBorns[0].id).toBe(r2.newBorns[0].id);
    }
  });
});

// ── casta-effects ────────────────────────────────────────────────────────────

describe('casta-effects', () => {
  describe('elegidoFaithBonusPerTick', () => {
    it('devuelve 0 si no hay Elegidos vivos', () => {
      const npcs = [makeTestNPC({ id: 'c1', casta: CASTA.CIUDADANO })];
      expect(elegidoFaithBonusPerTick(npcs)).toBe(0);
    });

    it('devuelve > 0 con 1 Elegido vivo', () => {
      const npcs = [makeTestNPC({ id: 'e1', casta: CASTA.ELEGIDO })];
      expect(elegidoFaithBonusPerTick(npcs)).toBeGreaterThan(0);
    });

    it('NPC muerto Elegido no contribuye', () => {
      const npcs = [makeTestNPC({ id: 'e1', casta: CASTA.ELEGIDO, alive: false })];
      expect(elegidoFaithBonusPerTick(npcs)).toBe(0);
    });

    it('más Elegidos vivos → más bonus', () => {
      const one = [makeTestNPC({ id: 'e1', casta: CASTA.ELEGIDO })];
      const two = [
        makeTestNPC({ id: 'e1', casta: CASTA.ELEGIDO }),
        makeTestNPC({ id: 'e2', casta: CASTA.ELEGIDO }),
      ];
      expect(elegidoFaithBonusPerTick(two)).toBeGreaterThan(elegidoFaithBonusPerTick(one));
    });
  });

  describe('esclavoSurvivDrainPerTick', () => {
    it('devuelve 0 para Ciudadano', () => {
      const npc = makeTestNPC({ id: 'c1', casta: CASTA.CIUDADANO });
      expect(esclavoSurvivDrainPerTick(npc)).toBe(0);
    });

    it('devuelve 0 para Elegido', () => {
      const npc = makeTestNPC({ id: 'e1', casta: CASTA.ELEGIDO });
      expect(esclavoSurvivDrainPerTick(npc)).toBe(0);
    });

    it('devuelve > 0 para Esclavo vivo', () => {
      const npc = makeTestNPC({ id: 's1', casta: CASTA.ESCLAVO });
      expect(esclavoSurvivDrainPerTick(npc)).toBeGreaterThan(0);
    });

    it('devuelve 0 para Esclavo muerto', () => {
      const npc = makeTestNPC({ id: 's1', casta: CASTA.ESCLAVO, alive: false });
      expect(esclavoSurvivDrainPerTick(npc)).toBe(0);
    });
  });
});
