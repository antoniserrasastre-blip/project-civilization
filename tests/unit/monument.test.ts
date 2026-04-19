/**
 * Tests del desbloqueo del monumento — Sprint 6.1.
 */

import { describe, it, expect } from 'vitest';
import {
  isMonumentUnlocked,
  monumentUnlockStatus,
  MIN_CONSECUTIVE_NIGHTS,
} from '@/lib/monument';
import { addStructure } from '@/lib/structures';
import { CRAFTABLE } from '@/lib/crafting';
import { makeTestNPC, LINAJE } from '@/lib/npcs';
import { initialVillageState } from '@/lib/village';

function all5Built() {
  let s: ReturnType<typeof addStructure> = [];
  let pos = { x: 0, y: 0 };
  for (const k of [
    CRAFTABLE.REFUGIO,
    CRAFTABLE.FOGATA_PERMANENTE,
    CRAFTABLE.PIEL_ROPA,
    CRAFTABLE.HERRAMIENTA_SILEX,
    CRAFTABLE.DESPENSA,
  ]) {
    s = addStructure(s, k, pos, 0, s.length);
    pos = { x: pos.x + 1, y: pos.y };
  }
  return s;
}

function fullClan() {
  return [
    makeTestNPC({ id: 'e0', linaje: LINAJE.TRAMUNTANA }),
    makeTestNPC({ id: 'e1', linaje: LINAJE.TRAMUNTANA }),
    makeTestNPC({ id: 'c0', linaje: LINAJE.MIGJORN }),
    makeTestNPC({ id: 'c1', linaje: LINAJE.PONENT }),
  ];
}

describe('isMonumentUnlocked — 3 condiciones', () => {
  it('true cuando se cumplen todas', () => {
    const s = all5Built();
    const v = { ...initialVillageState(), consecutiveNightsAtFire: MIN_CONSECUTIVE_NIGHTS };
    expect(isMonumentUnlocked(s, fullClan(), v)).toBe(true);
  });

  it('false sin los 5 crafteables', () => {
    const s = addStructure([], CRAFTABLE.FOGATA_PERMANENTE, { x: 0, y: 0 }, 0);
    const v = { ...initialVillageState(), consecutiveNightsAtFire: MIN_CONSECUTIVE_NIGHTS };
    expect(isMonumentUnlocked(s, fullClan(), v)).toBe(false);
  });

  it('false con noches < 10', () => {
    const s = all5Built();
    const v = { ...initialVillageState(), consecutiveNightsAtFire: 9 };
    expect(isMonumentUnlocked(s, fullClan(), v)).toBe(false);
  });

  it('false si un linaje sin creyente vivo', () => {
    const s = all5Built();
    const v = { ...initialVillageState(), consecutiveNightsAtFire: MIN_CONSECUTIVE_NIGHTS };
    const clan = fullClan();
    clan[2] = { ...clan[2], alive: false }; // muere el único Migjorn
    expect(isMonumentUnlocked(s, clan, v)).toBe(false);
  });
});

describe('monumentUnlockStatus — reasons explícitas', () => {
  it('lista lo que falta', () => {
    const r = monumentUnlockStatus([], fullClan(), initialVillageState());
    expect(r.unlocked).toBe(false);
    // Falta los 5 crafteables + 10 noches.
    expect(r.reasons.some((x) => x.includes('falta'))).toBe(true);
    expect(r.reasons.some((x) => x.includes('noches'))).toBe(true);
  });

  it('vacío cuando todo OK', () => {
    const s = all5Built();
    const v = { ...initialVillageState(), consecutiveNightsAtFire: MIN_CONSECUTIVE_NIGHTS };
    const r = monumentUnlockStatus(s, fullClan(), v);
    expect(r.unlocked).toBe(true);
    expect(r.reasons).toEqual([]);
  });
});
