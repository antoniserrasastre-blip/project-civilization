/**
 * Tests de nombres catalano-baleares — Sprint #4 Fase 5 NPC-NAMES.
 *
 * El pool respeta §9 vision-godgame: nada de "John Smith". Pool
 * por sexo, helper determinista, suficiente tamaño para garantizar
 * unicidad sobre los 14 NPCs del drafting inicial.
 */

import { describe, it, expect } from 'vitest';
import {
  FEMALE_NAMES,
  MALE_NAMES,
  pickName,
  pickUniqueName,
} from '@/lib/names';
import { SEX } from '@/lib/npcs';

describe('Pool catalano-balear', () => {
  it('al menos 30 nombres masculinos', () => {
    expect(MALE_NAMES.length).toBeGreaterThanOrEqual(30);
  });

  it('al menos 30 nombres femeninos', () => {
    expect(FEMALE_NAMES.length).toBeGreaterThanOrEqual(30);
  });

  it('nombres canónicos del pool catalano-balear están presentes', () => {
    // Validación cultural — pocos nombres que SI o SI deben estar.
    for (const n of ['Joan', 'Miquel', 'Bartomeu', 'Tomeu']) {
      expect(MALE_NAMES).toContain(n);
    }
    for (const n of ['Antònia', 'Margalida', 'Francina']) {
      expect(FEMALE_NAMES).toContain(n);
    }
  });

  it('sin duplicados internos por sexo', () => {
    expect(new Set(MALE_NAMES).size).toBe(MALE_NAMES.length);
    expect(new Set(FEMALE_NAMES).size).toBe(FEMALE_NAMES.length);
  });

  it('no mezcla "John Smith" y compañía', () => {
    const forbidden = ['John', 'Mary', 'Smith', 'Jones', 'Maria'];
    const all = [...MALE_NAMES, ...FEMALE_NAMES];
    for (const f of forbidden) {
      expect(all).not.toContain(f);
    }
  });
});

describe('pickName — determinista', () => {
  it('mismo seed + sex + cursor → mismo nombre, byte-idéntico', () => {
    for (const cursor of [0, 1, 7, 42, 100]) {
      const a = pickName(1234, SEX.M, cursor);
      const b = pickName(1234, SEX.M, cursor);
      expect(a).toBe(b);
    }
  });

  it('devuelve nombre del pool del sexo correcto', () => {
    for (let c = 0; c < 30; c++) {
      const mName = pickName(42, SEX.M, c);
      const fName = pickName(42, SEX.F, c);
      expect(MALE_NAMES).toContain(mName);
      expect(FEMALE_NAMES).toContain(fName);
    }
  });

  it('seeds distintos dan distribuciones distintas', () => {
    const samplesA = Array.from({ length: 30 }, (_, c) =>
      pickName(1, SEX.M, c),
    );
    const samplesB = Array.from({ length: 30 }, (_, c) =>
      pickName(2, SEX.M, c),
    );
    // Al menos algunas posiciones deben diferir.
    const diffs = samplesA.filter((n, i) => n !== samplesB[i]).length;
    expect(diffs).toBeGreaterThan(0);
  });
});

describe('pickUniqueName — garantía de no-colisión', () => {
  it('evita nombres en `exclude`', () => {
    const exclude = new Set(MALE_NAMES.slice(0, 5));
    const r = pickUniqueName(42, SEX.M, 0, exclude);
    expect(exclude.has(r.name)).toBe(false);
    expect(MALE_NAMES).toContain(r.name);
  });

  it('devuelve cursor avanzado más allá del usado', () => {
    const r = pickUniqueName(42, SEX.M, 5, new Set());
    expect(r.nextCursor).toBeGreaterThanOrEqual(5);
  });

  it('14 NPCs (mix 7M + 7F) sobre un seed no colisionan entre sí', () => {
    const used = new Set<string>();
    let cursor = 0;
    for (let i = 0; i < 7; i++) {
      const r = pickUniqueName(777, SEX.M, cursor, used);
      used.add(r.name);
      cursor = r.nextCursor;
    }
    for (let i = 0; i < 7; i++) {
      const r = pickUniqueName(777, SEX.F, cursor, used);
      used.add(r.name);
      cursor = r.nextCursor;
    }
    expect(used.size).toBe(14);
  });

  it('tira si no hay nombres disponibles', () => {
    const excludeAll = new Set(MALE_NAMES);
    expect(() =>
      pickUniqueName(42, SEX.M, 0, excludeAll),
    ).toThrow(/sin nombres/i);
  });
});
