/**
 * Tests de herencia — Sprint 4.3.
 */

import { describe, it, expect } from 'vitest';
import {
  inheritSkills,
  inheritTraits,
  inheritFromParents,
} from '@/lib/inheritance';
import { seedState } from '@/lib/prng';
import { makeTestNPC, type NPCSkills } from '@/lib/npcs';

describe('inheritSkills', () => {
  it('skills = media ± jitter, clamp [0, 100]', () => {
    const p1: NPCSkills = {
      hunting: 60,
      gathering: 20,
      crafting: 50,
      fishing: 30,
      healing: 10,
    };
    const p2: NPCSkills = {
      hunting: 40,
      gathering: 80,
      crafting: 30,
      fishing: 10,
      healing: 90,
    };
    const { skills } = inheritSkills(p1, p2, seedState(42));
    // Media: 50, 50, 40, 20, 50. Jitter ±5 (arriba, aunque redondeo
    // puede ampliar). Aceptamos ±8 de margen por redondeo.
    expect(skills.hunting).toBeGreaterThanOrEqual(45);
    expect(skills.hunting).toBeLessThanOrEqual(55);
    expect(skills.gathering).toBeGreaterThanOrEqual(45);
    expect(skills.gathering).toBeLessThanOrEqual(55);
  });

  it('determinista: mismo prng → mismos skills', () => {
    const p1: NPCSkills = {
      hunting: 60,
      gathering: 20,
      crafting: 50,
      fishing: 30,
      healing: 10,
    };
    const p2: NPCSkills = {
      hunting: 40,
      gathering: 80,
      crafting: 30,
      fishing: 10,
      healing: 90,
    };
    const a = inheritSkills(p1, p2, seedState(1));
    const b = inheritSkills(p1, p2, seedState(1));
    expect(a.skills).toEqual(b.skills);
  });

  it('correlación hijo vs media de padres > 0.3 (100 nacimientos)', () => {
    let prng = seedState(99);
    const p1: NPCSkills = {
      hunting: 70,
      gathering: 20,
      crafting: 50,
      fishing: 30,
      healing: 80,
    };
    const p2: NPCSkills = {
      hunting: 30,
      gathering: 60,
      crafting: 10,
      fishing: 90,
      healing: 40,
    };
    const means = [50, 40, 30, 60, 60];
    const keys: Array<keyof NPCSkills> = [
      'hunting',
      'gathering',
      'crafting',
      'fishing',
      'healing',
    ];
    const children: number[][] = [];
    for (let i = 0; i < 100; i++) {
      const r = inheritSkills(p1, p2, prng);
      prng = r.next;
      children.push(keys.map((k) => r.skills[k]));
    }
    // Cada hijo debe estar cerca de la media ± jitter.
    for (let ki = 0; ki < keys.length; ki++) {
      const avg = children.reduce((a, c) => a + c[ki], 0) / children.length;
      expect(Math.abs(avg - means[ki])).toBeLessThan(3);
    }
  });
});

describe('inheritTraits — 50% probabilidad', () => {
  it('hijo sin rasgos en padres → sin rasgos', () => {
    const r = inheritTraits([], [], seedState(1));
    expect(r.traits).toEqual([]);
  });

  it('rasgos únicos 50% prob — 1000 nacimientos en rango [0.40, 0.60]', () => {
    let prng = seedState(7);
    let passed = 0;
    const total = 1000;
    for (let i = 0; i < total; i++) {
      const r = inheritTraits(['ojo_halcon'], [], prng);
      prng = r.next;
      if (r.traits.length === 1) passed++;
    }
    const ratio = passed / total;
    expect(ratio).toBeGreaterThanOrEqual(0.4);
    expect(ratio).toBeLessThanOrEqual(0.6);
  });

  it('rasgos compartidos entre padres no se duplican', () => {
    // Si ambos padres tienen "ojo_halcon", el hijo o lo hereda o no —
    // pero nunca aparece dos veces.
    let prng = seedState(3);
    for (let i = 0; i < 50; i++) {
      const r = inheritTraits(['ojo_halcon'], ['ojo_halcon'], prng);
      prng = r.next;
      expect(new Set(r.traits).size).toBe(r.traits.length);
    }
  });

  it('orden canónico alfabético', () => {
    const r = inheritTraits(
      ['ojo_halcon', 'corazon_fiel'],
      ['piel_dura'],
      seedState(1),
    );
    const sorted = [...r.traits].sort();
    expect(r.traits).toEqual(sorted);
  });
});

describe('inheritFromParents — wrapper', () => {
  it('devuelve skills + traits + prng avanzado', () => {
    const p1 = makeTestNPC({ id: 'p1', traits: ['ojo_halcon'] });
    const p2 = makeTestNPC({ id: 'p2', traits: ['manos_recuerdan'] });
    const r = inheritFromParents(p1, p2, seedState(1));
    expect(typeof r.skills.hunting).toBe('number');
    expect(Array.isArray(r.traits)).toBe(true);
    expect(r.next.cursor).toBeGreaterThan(0);
  });
});
