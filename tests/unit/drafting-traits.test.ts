/**
 * Tests de integración de rasgos y escenarios en el DraftState.
 *
 * Contrato:
 *   - DraftState incluye selección de rasgos por slot y scenarioId.
 *   - Presupuesto unificado de 15 pts para todos los slots de Bloque A.
 *   - pickScenario / addTrait / removeTrait son puras (no mutan input).
 *   - finalizeBlockA produce NPCs con traits y stats de escenario aplicados.
 */

import { describe, it, expect } from 'vitest';
import {
  startDraft,
  pickArchetype,
  setSex,
  finalizeBlockA,
  pickScenario,
  addTrait,
  removeTrait,
  traitsBudgetUsed,
  TRAIT_BUDGET_DRAFT,
} from '@/lib/drafting';
import { ARCHETYPE, SEX } from '@/lib/npcs';
import { SCENARIO } from '@/lib/scenarios';
import { TRAIT, TRAIT_CATALOG, type TraitId } from '@/lib/traits';

// ── helpers ────────────────────────────────────────────────────────────

/** Draft con los 4 slots rellenos (válido para finalize).
 *  Presupuesto: CAZADOR(3)+CURANDERO(3)+RECOLECTOR(2)+PESCADOR(2) = 10. */
function draftCompleto(seed = 42) {
  let d = startDraft(seed);
  d = pickArchetype(d, 0, ARCHETYPE.CAZADOR);
  d = setSex(d, 0, SEX.M);
  d = pickArchetype(d, 1, ARCHETYPE.CURANDERO);
  d = setSex(d, 1, SEX.F);
  d = pickArchetype(d, 2, ARCHETYPE.RECOLECTOR);
  d = setSex(d, 2, SEX.M);
  d = pickArchetype(d, 3, ARCHETYPE.PESCADOR);
  d = setSex(d, 3, SEX.F);
  return d;
}

// ── Constantes ─────────────────────────────────────────────────────────

describe('TRAIT_BUDGET_DRAFT', () => {
  it('vale 15', () => {
    expect(TRAIT_BUDGET_DRAFT).toBe(15);
  });
});

// ── pickScenario ────────────────────────────────────────────────────────

describe('pickScenario', () => {
  it('registra el escenario en el draft', () => {
    const d = pickScenario(startDraft(1), SCENARIO.EXODO);
    expect(d.scenarioId).toBe(SCENARIO.EXODO);
  });

  it('no muta el draft original', () => {
    const d = startDraft(1);
    pickScenario(d, SCENARIO.NAUFRAGOS);
    expect(d.scenarioId).toBeNull();
  });

  it('se puede cambiar el escenario', () => {
    let d = pickScenario(startDraft(1), SCENARIO.NAUFRAGOS);
    d = pickScenario(d, SCENARIO.EXODO);
    expect(d.scenarioId).toBe(SCENARIO.EXODO);
  });
});

// ── traitsBudgetUsed ────────────────────────────────────────────────────

describe('traitsBudgetUsed', () => {
  it('es 0 en draft vacío', () => {
    expect(traitsBudgetUsed(startDraft(1))).toBe(0);
  });

  it('suma el coste de todos los rasgos de todos los slots', () => {
    let d = startDraft(1);
    d = addTrait(d, 0, TRAIT.FUERTE);     // cost 3
    d = addTrait(d, 1, TRAIT.AGILIDAD);   // cost 2
    expect(traitsBudgetUsed(d)).toBe(5);
  });

  it('un rasgo negativo reduce el total', () => {
    let d = startDraft(1);
    d = addTrait(d, 0, TRAIT.FUERTE);     // +3
    d = addTrait(d, 0, TRAIT.FRAGIL);     // -2
    expect(traitsBudgetUsed(d)).toBe(1);
  });
});

// ── addTrait ────────────────────────────────────────────────────────────

describe('addTrait', () => {
  it('añade el rasgo al slot indicado', () => {
    const d = addTrait(startDraft(1), 0, TRAIT.FUERTE);
    expect(d.traitSelections[0]).toContain(TRAIT.FUERTE);
  });

  it('no muta el draft original', () => {
    const d = startDraft(1);
    addTrait(d, 0, TRAIT.FUERTE);
    expect(d.traitSelections[0]).toHaveLength(0);
  });

  it('lanza si se supera el presupuesto unificado', () => {
    let d = startDraft(1);
    // Añadir rasgos hasta superar 15
    const caros = (Object.values(TRAIT) as TraitId[])
      .filter((id) => TRAIT_CATALOG[id].cost > 0)
      .sort((a, b) => TRAIT_CATALOG[b].cost - TRAIT_CATALOG[a].cost);
    let acc = 0;
    for (const id of caros) {
      acc += TRAIT_CATALOG[id].cost;
      if (acc > TRAIT_BUDGET_DRAFT) {
        expect(() => addTrait(d, 0, id)).toThrow(/presupuesto/i);
        break;
      }
      d = addTrait(d, 0, id);
    }
  });

  it('lanza si el rasgo ya está en el slot', () => {
    const d = addTrait(startDraft(1), 0, TRAIT.FUERTE);
    expect(() => addTrait(d, 0, TRAIT.FUERTE)).toThrow(/duplicado/i);
  });

  it('rasgos negativos permiten añadir más positivos sin lanzar', () => {
    let d = startDraft(1);
    d = addTrait(d, 0, TRAIT.FRAGIL);   // -2 pts
    d = addTrait(d, 0, TRAIT.COBARDE);  // -2 pts → budget negativo: queda 15+4=19 efectivos
    // Ahora caben rasgos positivos que sin negativos no cabrían
    expect(() => {
      addTrait(
        addTrait(
          addTrait(
            addTrait(d, 1, TRAIT.FUERTE),         // 3
            1, TRAIT.RESISTENTE,                   // 3
          ),
          2, TRAIT.CURANDERO_NATO,                 // 3
        ),
        2, TRAIT.CAZADOR_NATO,                     // 3 → total positivo 12, neto 12-4=8 ≤ 15
      );
    }).not.toThrow();
  });
});

// ── removeTrait ─────────────────────────────────────────────────────────

describe('removeTrait', () => {
  it('elimina el rasgo del slot', () => {
    let d = addTrait(startDraft(1), 0, TRAIT.FUERTE);
    d = removeTrait(d, 0, TRAIT.FUERTE);
    expect(d.traitSelections[0]).not.toContain(TRAIT.FUERTE);
  });

  it('no muta el draft original', () => {
    let d = addTrait(startDraft(1), 0, TRAIT.FUERTE);
    removeTrait(d, 0, TRAIT.FUERTE);
    expect(d.traitSelections[0]).toContain(TRAIT.FUERTE);
  });

  it('lanza si el rasgo no está en el slot', () => {
    expect(() => removeTrait(startDraft(1), 0, TRAIT.FUERTE)).toThrow();
  });
});

// ── finalizeBlockA con rasgos y escenario ──────────────────────────────

describe('finalizeBlockA — traits y escenario persistentes', () => {
  it('los NPCs llevan los traitIds del slot correspondiente', () => {
    let d = draftCompleto();
    d = addTrait(d, 0, TRAIT.FUERTE);
    d = addTrait(d, 1, TRAIT.CURANDERO_NATO);
    const npcs = finalizeBlockA(d);
    expect(npcs[0].traits).toContain(TRAIT.FUERTE);
    expect(npcs[1].traits).toContain(TRAIT.CURANDERO_NATO);
    expect(npcs[2].traits).toHaveLength(0);
  });

  it('los modificadores de rasgos se aplican a los stats del NPC', () => {
    let d = draftCompleto();
    d = addTrait(d, 0, TRAIT.FUERTE); // +15 supervivencia
    const npcs = finalizeBlockA(d);
    // El NPC 0 debe tener supervivencia base + 15
    expect(npcs[0].stats.supervivencia).toBeGreaterThan(85);
  });

  it('el escenario modifica todos los NPCs al finalizar', () => {
    let d = draftCompleto();
    d = pickScenario(d, SCENARIO.NAUFRAGOS); // -12 supervivencia
    const npcs = finalizeBlockA(d);
    // Todos los NPCs deben tener supervivencia reducida respecto a sin escenario
    const sinEscenario = finalizeBlockA(draftCompleto());
    for (let i = 0; i < npcs.length; i++) {
      expect(npcs[i].stats.supervivencia).toBeLessThan(
        sinEscenario[i].stats.supervivencia,
      );
    }
  });

  it('round-trip JSON de los NPCs con traits y escenario', () => {
    let d = draftCompleto();
    d = addTrait(d, 0, TRAIT.RESISTENTE);
    d = pickScenario(d, SCENARIO.EXODO);
    const npcs = finalizeBlockA(d);
    expect(JSON.parse(JSON.stringify(npcs))).toEqual(npcs);
  });

  it('determinismo: mismo draft → mismos NPCs', () => {
    const buildDraft = () => {
      let d = draftCompleto();
      d = addTrait(d, 0, TRAIT.FUERTE);
      d = addTrait(d, 1, TRAIT.FRAGIL);
      d = pickScenario(d, SCENARIO.EXODO);
      return d;
    };
    expect(finalizeBlockA(buildDraft())).toEqual(finalizeBlockA(buildDraft()));
  });
});
