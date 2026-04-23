/**
 * Tests de lib/traits.ts — catálogo de rasgos estilo Zomboid.
 *
 * Contrato:
 *   - TRAIT_BUDGET = 15 pts unificado para todos los fundadores.
 *   - Rasgos positivos cuestan pts; negativos devuelven pts.
 *   - applyTraits() es pura: no muta el NPC input.
 *   - Round-trip JSON del catálogo completo.
 *   - Determinismo: mismo input → mismo NPC output.
 */

import { describe, it, expect } from 'vitest';
import {
  TRAIT,
  TRAIT_BUDGET,
  TRAIT_CATALOG,
  traitBudgetCost,
  validateTraitSelection,
  applyTraits,
  type TraitId,
} from '@/lib/traits';
import { makeTestNPC } from '@/lib/npcs';

describe('Constantes de traits', () => {
  it('TRAIT_BUDGET = 15', () => {
    expect(TRAIT_BUDGET).toBe(15);
  });

  it('el catálogo tiene al menos 8 rasgos positivos y 4 negativos', () => {
    const defs = Object.values(TRAIT_CATALOG);
    const positivos = defs.filter((d) => d.cost > 0);
    const negativos = defs.filter((d) => d.cost < 0);
    expect(positivos.length).toBeGreaterThanOrEqual(8);
    expect(negativos.length).toBeGreaterThanOrEqual(4);
  });

  it('ningún rasgo tiene coste 0', () => {
    for (const def of Object.values(TRAIT_CATALOG)) {
      expect(def.cost).not.toBe(0);
    }
  });

  it('los rasgos positivos cuestan entre 1 y 5', () => {
    for (const def of Object.values(TRAIT_CATALOG)) {
      if (def.cost > 0) {
        expect(def.cost).toBeGreaterThanOrEqual(1);
        expect(def.cost).toBeLessThanOrEqual(5);
      }
    }
  });

  it('los rasgos negativos devuelven entre 1 y 3 pts', () => {
    for (const def of Object.values(TRAIT_CATALOG)) {
      if (def.cost < 0) {
        expect(def.cost).toBeGreaterThanOrEqual(-3);
        expect(def.cost).toBeLessThan(0);
      }
    }
  });

  it('todos los TraitId del enum existen en el catálogo', () => {
    for (const id of Object.values(TRAIT)) {
      expect(TRAIT_CATALOG[id as TraitId]).toBeDefined();
    }
  });

  it('round-trip JSON del catálogo', () => {
    const roundtrip = JSON.parse(JSON.stringify(TRAIT_CATALOG));
    expect(roundtrip).toEqual(TRAIT_CATALOG);
  });
});

describe('traitBudgetCost', () => {
  it('sin rasgos cuesta 0', () => {
    expect(traitBudgetCost([])).toBe(0);
  });

  it('suma correctamente rasgos positivos', () => {
    const positivos = (Object.values(TRAIT) as TraitId[]).filter(
      (id) => TRAIT_CATALOG[id].cost > 0,
    );
    const seleccion = positivos.slice(0, 2);
    const esperado = seleccion.reduce((s, id) => s + TRAIT_CATALOG[id].cost, 0);
    expect(traitBudgetCost(seleccion)).toBe(esperado);
  });

  it('un rasgo negativo reduce el coste total', () => {
    const negativo = (Object.values(TRAIT) as TraitId[]).find(
      (id) => TRAIT_CATALOG[id].cost < 0,
    )!;
    const positivo = (Object.values(TRAIT) as TraitId[]).find(
      (id) => TRAIT_CATALOG[id].cost > 0,
    )!;
    const costeNeto = traitBudgetCost([positivo, negativo]);
    const costePositivo = traitBudgetCost([positivo]);
    expect(costeNeto).toBeLessThan(costePositivo);
  });
});

describe('validateTraitSelection', () => {
  it('no lanza con selección vacía', () => {
    expect(() => validateTraitSelection([])).not.toThrow();
  });

  it('no lanza si el coste neto está dentro del budget', () => {
    const baratos = (Object.values(TRAIT) as TraitId[])
      .filter((id) => TRAIT_CATALOG[id].cost > 0)
      .sort((a, b) => TRAIT_CATALOG[a].cost - TRAIT_CATALOG[b].cost)
      .slice(0, 2);
    const coste = traitBudgetCost(baratos);
    expect(coste).toBeLessThanOrEqual(TRAIT_BUDGET);
    expect(() => validateTraitSelection(baratos)).not.toThrow();
  });

  it('lanza si el coste neto excede TRAIT_BUDGET', () => {
    // Construir una selección que supere 15 pts
    const todos = (Object.values(TRAIT) as TraitId[])
      .filter((id) => TRAIT_CATALOG[id].cost > 0)
      .sort((a, b) => TRAIT_CATALOG[b].cost - TRAIT_CATALOG[a].cost);
    const sobreDraft: TraitId[] = [];
    let acumulado = 0;
    for (const id of todos) {
      acumulado += TRAIT_CATALOG[id].cost;
      sobreDraft.push(id);
      if (acumulado > TRAIT_BUDGET) break;
    }
    expect(() => validateTraitSelection(sobreDraft)).toThrow(/presupuesto/i);
  });

  it('rasgos negativos permiten ampliar la selección positiva', () => {
    const negativo = (Object.values(TRAIT) as TraitId[]).find(
      (id) => TRAIT_CATALOG[id].cost < 0,
    )!;
    const positivos = (Object.values(TRAIT) as TraitId[])
      .filter((id) => TRAIT_CATALOG[id].cost > 0)
      .sort((a, b) => TRAIT_CATALOG[a].cost - TRAIT_CATALOG[b].cost);
    // Seleccionar rasgos hasta llegar justo al límite con ayuda del negativo
    const seleccion: TraitId[] = [negativo];
    let acumulado = TRAIT_CATALOG[negativo].cost; // negativo
    for (const id of positivos) {
      if (acumulado + TRAIT_CATALOG[id].cost <= TRAIT_BUDGET) {
        seleccion.push(id);
        acumulado += TRAIT_CATALOG[id].cost;
      }
    }
    expect(() => validateTraitSelection(seleccion)).not.toThrow();
  });
});

describe('applyTraits', () => {
  it('devuelve un NPC nuevo — no muta el original', () => {
    const npc = makeTestNPC({ id: 'test-1' });
    const positivo = (Object.values(TRAIT) as TraitId[]).find(
      (id) => TRAIT_CATALOG[id].cost > 0,
    )!;
    const resultado = applyTraits(npc, [positivo]);
    expect(resultado).not.toBe(npc);
    expect(npc.traits).toHaveLength(0);
  });

  it('los traitIds quedan registrados en npc.traits (orden canónico)', () => {
    const npc = makeTestNPC({ id: 'test-2' });
    const ids = (Object.values(TRAIT) as TraitId[])
      .filter((id) => TRAIT_CATALOG[id].cost > 0)
      .slice(0, 2);
    const resultado = applyTraits(npc, ids);
    expect(resultado.traits).toEqual(ids);
  });

  it('un rasgo con modificador de supervivencia lo aplica al NPC', () => {
    const npc = makeTestNPC({ id: 'test-3', stats: { supervivencia: 50, socializacion: 50 } });
    const conModSuperv = (Object.values(TRAIT) as TraitId[]).find(
      (id) =>
        TRAIT_CATALOG[id].modifiers.supervivencia !== undefined &&
        TRAIT_CATALOG[id].modifiers.supervivencia! > 0,
    )!;
    const resultado = applyTraits(npc, [conModSuperv]);
    expect(resultado.stats.supervivencia).toBeGreaterThan(50);
  });

  it('un rasgo con modificador negativo reduce el stat correspondiente', () => {
    const npc = makeTestNPC({ id: 'test-4', stats: { supervivencia: 80, socializacion: 80 } });
    const negativo = (Object.values(TRAIT) as TraitId[]).find(
      (id) =>
        TRAIT_CATALOG[id].cost < 0 &&
        (TRAIT_CATALOG[id].modifiers.supervivencia ?? 0) < 0,
    )!;
    const resultado = applyTraits(npc, [negativo]);
    expect(resultado.stats.supervivencia).toBeLessThan(80);
  });

  it('round-trip JSON del NPC tras aplicar rasgos', () => {
    const npc = makeTestNPC({ id: 'test-5' });
    const id = Object.values(TRAIT)[0] as TraitId;
    const resultado = applyTraits(npc, [id]);
    expect(JSON.parse(JSON.stringify(resultado))).toEqual(resultado);
  });

  it('determinismo: mismo NPC + mismos rasgos → mismo output', () => {
    const npc = makeTestNPC({ id: 'test-6' });
    const ids = (Object.values(TRAIT) as TraitId[]).slice(0, 2);
    const r1 = applyTraits(npc, ids);
    const r2 = applyTraits(npc, ids);
    expect(r1).toEqual(r2);
  });
});
