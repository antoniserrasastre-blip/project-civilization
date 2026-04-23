/**
 * Tests de lib/synergies.ts — sinergias de composición de clan (estilo TFT).
 *
 * Contrato:
 *   - computeActiveSynergies es pura y determinista (§A4).
 *   - Cada sinergia se activa exactamente al umbral definido.
 *   - Con 0 NPCs vivos no hay sinergias activas.
 *   - Los npcIds de cada sinergia activa son correctos.
 *   - Round-trip JSON del resultado.
 */

import { describe, it, expect } from 'vitest';
import {
  SYNERGY,
  SYNERGY_CATALOG,
  computeActiveSynergies,
  type SynergyId,
} from '@/lib/synergies';
import { makeTestNPC } from '@/lib/npcs';
import { ARCHETYPE, LINAJE, CASTA } from '@/lib/npcs';

// ── helpers ────────────────────────────────────────────────────────────

/** NPC pescador en rol activo. */
const pescador = (id: string) =>
  makeTestNPC({
    id,
    archetype: ARCHETYPE.PESCADOR,
    skills: { hunting: 5, gathering: 5, crafting: 5, fishing: 50, healing: 5 },
  });

const cazador = (id: string) =>
  makeTestNPC({
    id,
    archetype: ARCHETYPE.CAZADOR,
    skills: { hunting: 50, gathering: 5, crafting: 5, fishing: 5, healing: 5 },
  });

const curandero = (id: string) =>
  makeTestNPC({
    id,
    archetype: ARCHETYPE.CURANDERO,
    skills: { hunting: 5, gathering: 5, crafting: 5, fishing: 5, healing: 50 },
  });

const artesano = (id: string) =>
  makeTestNPC({
    id,
    archetype: ARCHETYPE.ARTESANO,
    skills: { hunting: 5, gathering: 5, crafting: 50, fishing: 5, healing: 5 },
  });

// ── Catálogo ────────────────────────────────────────────────────────────

describe('SYNERGY_CATALOG', () => {
  it('tiene al menos 5 sinergias definidas', () => {
    expect(Object.keys(SYNERGY_CATALOG).length).toBeGreaterThanOrEqual(5);
  });

  it('cada sinergia tiene umbral ≥ 2', () => {
    for (const def of Object.values(SYNERGY_CATALOG)) {
      expect(def.threshold).toBeGreaterThanOrEqual(2);
    }
  });

  it('round-trip JSON del catálogo completo', () => {
    expect(JSON.parse(JSON.stringify(SYNERGY_CATALOG))).toEqual(SYNERGY_CATALOG);
  });

  it('todos los SYNERGY ids están en el catálogo', () => {
    for (const id of Object.values(SYNERGY)) {
      expect(SYNERGY_CATALOG[id as SynergyId]).toBeDefined();
    }
  });
});

// ── computeActiveSynergies — base ────────────────────────────────────

describe('computeActiveSynergies — base', () => {
  it('sin NPCs devuelve array vacío', () => {
    expect(computeActiveSynergies([])).toEqual([]);
  });

  it('con un solo NPC no activa ninguna sinergia (umbral mín = 2)', () => {
    expect(computeActiveSynergies([pescador('p1')])).toHaveLength(0);
  });

  it('es pura: no muta el array de entrada', () => {
    const npcs = [pescador('p1'), pescador('p2'), pescador('p3')];
    const original = npcs.map((n) => n.id);
    computeActiveSynergies(npcs);
    expect(npcs.map((n) => n.id)).toEqual(original);
  });

  it('determinismo: mismo input → mismo output', () => {
    const npcs = [pescador('p1'), pescador('p2'), pescador('p3')];
    expect(computeActiveSynergies(npcs)).toEqual(computeActiveSynergies(npcs));
  });

  it('NPCs muertos no cuentan para sinergias', () => {
    const npcs = [
      pescador('p1'),
      pescador('p2'),
      { ...pescador('p3'), alive: false },
    ];
    // Solo 2 vivos — puede o no activar según umbral de pescadores
    const result = computeActiveSynergies(npcs);
    // Los ids del resultado no deben incluir p3
    for (const s of result) {
      expect(s.npcIds).not.toContain('p3');
    }
  });

  it('round-trip JSON del resultado', () => {
    const npcs = [pescador('p1'), pescador('p2'), pescador('p3')];
    const result = computeActiveSynergies(npcs);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});

// ── Sinergia: Tripulació Pesquera ────────────────────────────────────

describe('SYNERGY.TRIPULACIO_PESQUERA (≥3 pescadores)', () => {
  it('no se activa con 2 pescadores', () => {
    const result = computeActiveSynergies([pescador('p1'), pescador('p2')]);
    expect(result.some((s) => s.id === SYNERGY.TRIPULACIO_PESQUERA)).toBe(false);
  });

  it('se activa con exactamente 3 pescadores', () => {
    const result = computeActiveSynergies([pescador('p1'), pescador('p2'), pescador('p3')]);
    expect(result.some((s) => s.id === SYNERGY.TRIPULACIO_PESQUERA)).toBe(true);
  });

  it('los npcIds de la sinergia son los 3 pescadores', () => {
    const npcs = [pescador('p1'), pescador('p2'), pescador('p3')];
    const result = computeActiveSynergies(npcs);
    const s = result.find((x) => x.id === SYNERGY.TRIPULACIO_PESQUERA)!;
    expect(s.npcIds.sort()).toEqual(['p1', 'p2', 'p3']);
  });
});

// ── Sinergia: Clan de Caçadors ────────────────────────────────────────

describe('SYNERGY.CLAN_CACADORS (≥3 cazadores)', () => {
  it('no se activa con 2 cazadores', () => {
    const result = computeActiveSynergies([cazador('c1'), cazador('c2')]);
    expect(result.some((s) => s.id === SYNERGY.CLAN_CACADORS)).toBe(false);
  });

  it('se activa con 3 cazadores', () => {
    const result = computeActiveSynergies([cazador('c1'), cazador('c2'), cazador('c3')]);
    expect(result.some((s) => s.id === SYNERGY.CLAN_CACADORS)).toBe(true);
  });
});

// ── Sinergia: Cercle de Sanació ────────────────────────────────────────

describe('SYNERGY.CERCLE_SANACIO (≥2 curanderos)', () => {
  it('no se activa con 1 curandero', () => {
    const result = computeActiveSynergies([curandero('cu1')]);
    expect(result.some((s) => s.id === SYNERGY.CERCLE_SANACIO)).toBe(false);
  });

  it('se activa con 2 curanderos', () => {
    const result = computeActiveSynergies([curandero('cu1'), curandero('cu2')]);
    expect(result.some((s) => s.id === SYNERGY.CERCLE_SANACIO)).toBe(true);
  });
});

// ── Sinergia: Taller Collectiu ────────────────────────────────────────

describe('SYNERGY.TALLER_COLLECTIU (≥2 artesanos)', () => {
  it('se activa con 2 artesanos', () => {
    const result = computeActiveSynergies([artesano('a1'), artesano('a2')]);
    expect(result.some((s) => s.id === SYNERGY.TALLER_COLLECTIU)).toBe(true);
  });
});

// ── Sinergia: Clan Mixt (linajes diversos) ────────────────────────────

describe('SYNERGY.CLAN_MIXT (≥4 linajes distintos)', () => {
  it('no se activa con 3 linajes distintos', () => {
    const npcs = [
      makeTestNPC({ id: 'n1', linaje: LINAJE.TRAMUNTANA }),
      makeTestNPC({ id: 'n2', linaje: LINAJE.LLEVANT }),
      makeTestNPC({ id: 'n3', linaje: LINAJE.MIGJORN }),
    ];
    expect(computeActiveSynergies(npcs).some((s) => s.id === SYNERGY.CLAN_MIXT)).toBe(false);
  });

  it('se activa con ≥4 linajes distintos', () => {
    const npcs = [
      makeTestNPC({ id: 'n1', linaje: LINAJE.TRAMUNTANA }),
      makeTestNPC({ id: 'n2', linaje: LINAJE.LLEVANT }),
      makeTestNPC({ id: 'n3', linaje: LINAJE.MIGJORN }),
      makeTestNPC({ id: 'n4', linaje: LINAJE.PONENT }),
    ];
    expect(computeActiveSynergies(npcs).some((s) => s.id === SYNERGY.CLAN_MIXT)).toBe(true);
  });
});

// ── Sinergias múltiples simultáneas ──────────────────────────────────

describe('Múltiples sinergias activas simultáneamente', () => {
  it('clan mixto puede activar varias sinergias a la vez', () => {
    const npcs = [
      pescador('p1'), pescador('p2'), pescador('p3'),
      cazador('c1'), cazador('c2'), cazador('c3'),
    ];
    const result = computeActiveSynergies(npcs);
    expect(result.some((s) => s.id === SYNERGY.TRIPULACIO_PESQUERA)).toBe(true);
    expect(result.some((s) => s.id === SYNERGY.CLAN_CACADORS)).toBe(true);
  });
});

// ── Modificadores ────────────────────────────────────────────────────

describe('Modificadores de sinergia', () => {
  it('TRIPULACIO_PESQUERA tiene modificador fishing > 0', () => {
    const def = SYNERGY_CATALOG[SYNERGY.TRIPULACIO_PESQUERA];
    expect((def.modifiers.fishing ?? 0)).toBeGreaterThan(0);
  });

  it('CLAN_CACADORS tiene modificador hunting > 0', () => {
    const def = SYNERGY_CATALOG[SYNERGY.CLAN_CACADORS];
    expect((def.modifiers.hunting ?? 0)).toBeGreaterThan(0);
  });

  it('CERCLE_SANACIO tiene modificador supervivencia > 0', () => {
    const def = SYNERGY_CATALOG[SYNERGY.CERCLE_SANACIO];
    expect((def.modifiers.supervivencia ?? 0)).toBeGreaterThan(0);
  });
});
