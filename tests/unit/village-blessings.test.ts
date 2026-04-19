/**
 * Tests de bendiciones de aldea — Sprint 6.3 (decisiones #24, #25).
 */

import { describe, it, expect } from 'vitest';
import {
  VILLAGE_BLESSING,
  VILLAGE_BLESSINGS_CATALOG,
  canSelectBlessing,
  selectBlessing,
  availableForPrimigenia,
} from '@/lib/village-blessings';
import { initialVillageState } from '@/lib/village';

describe('Catálogo (decisión #24)', () => {
  it('tiene las 4 bendiciones primigenia', () => {
    const ids = Object.values(VILLAGE_BLESSING).sort();
    expect(ids).toEqual(['fertilidad', 'recolecta', 'reconocimiento', 'salud']);
    expect(Object.keys(VILLAGE_BLESSINGS_CATALOG)).toHaveLength(4);
  });

  it('cada entrada tiene name, effectPrimigenia, compoundingTribal', () => {
    for (const def of Object.values(VILLAGE_BLESSINGS_CATALOG)) {
      expect(def.nameCastellano.length).toBeGreaterThan(0);
      expect(def.effectPrimigenia.length).toBeGreaterThan(0);
      expect(def.compoundingTribal.length).toBeGreaterThan(0);
    }
  });
});

describe('canSelectBlessing — sin reelección (decisión #25)', () => {
  it('true si no elegida', () => {
    const v = initialVillageState();
    expect(canSelectBlessing(v, VILLAGE_BLESSING.RECOLECTA)).toBe(true);
  });

  it('false si ya está en blessings', () => {
    const v = { ...initialVillageState(), blessings: ['recolecta'] };
    expect(canSelectBlessing(v, VILLAGE_BLESSING.RECOLECTA)).toBe(false);
  });
});

describe('selectBlessing', () => {
  it('añade al array', () => {
    const v = initialVillageState();
    const after = selectBlessing(v, VILLAGE_BLESSING.FERTILIDAD);
    expect(after.blessings).toEqual(['fertilidad']);
  });

  it('permite varias en eras distintas (sin duplicar)', () => {
    let v = initialVillageState();
    v = selectBlessing(v, VILLAGE_BLESSING.RECOLECTA);
    v = selectBlessing(v, VILLAGE_BLESSING.SALUD);
    expect(v.blessings).toEqual(['recolecta', 'salud']);
  });

  it('tira si ya elegida antes (no reelección)', () => {
    let v = initialVillageState();
    v = selectBlessing(v, VILLAGE_BLESSING.RECOLECTA);
    expect(() => selectBlessing(v, VILLAGE_BLESSING.RECOLECTA)).toThrow(
      /ya elegida/i,
    );
  });

  it('tira si blessing inválida', () => {
    const v = initialVillageState();
    expect(() => selectBlessing(v, 'comercio' as never)).toThrow(
      /inválida/i,
    );
  });
});

describe('availableForPrimigenia', () => {
  it('inicial: las 4', () => {
    expect(availableForPrimigenia(initialVillageState())).toHaveLength(4);
  });

  it('tras elegir 1, quedan 3', () => {
    const v = selectBlessing(initialVillageState(), VILLAGE_BLESSING.SALUD);
    expect(availableForPrimigenia(v)).toHaveLength(3);
    expect(availableForPrimigenia(v)).not.toContain('salud');
  });
});
