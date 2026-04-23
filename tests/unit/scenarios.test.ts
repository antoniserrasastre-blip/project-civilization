/**
 * Tests de lib/scenarios.ts — perfiles de arranque estilo Kenshi.
 *
 * Contrato:
 *   - Dos escenarios canónicos: 'naufragos' y 'exodo'.
 *   - applyScenario() es pura y determinista.
 *   - Los modificadores de cada escenario producen diferencias
 *     estadísticamente distintas entre sí.
 *   - Round-trip JSON del catálogo completo.
 */

import { describe, it, expect } from 'vitest';
import {
  SCENARIO,
  SCENARIO_CATALOG,
  getScenarioDef,
  applyScenario,
  type ScenarioId,
} from '@/lib/scenarios';
import { makeTestNPC } from '@/lib/npcs';

describe('Catálogo de escenarios', () => {
  it('existen los escenarios canónicos naufragos y exodo', () => {
    expect(SCENARIO.NAUFRAGOS).toBe('naufragos');
    expect(SCENARIO.EXODO).toBe('exodo');
  });

  it('todos los ScenarioId están en el catálogo', () => {
    for (const id of Object.values(SCENARIO)) {
      expect(SCENARIO_CATALOG[id as ScenarioId]).toBeDefined();
    }
  });

  it('cada escenario tiene nombre, descripción y zona de spawn', () => {
    for (const def of Object.values(SCENARIO_CATALOG)) {
      expect(typeof def.name).toBe('string');
      expect(def.name.length).toBeGreaterThan(0);
      expect(typeof def.description).toBe('string');
      expect(['coast', 'forest', 'highland', 'any']).toContain(
        def.preferredSpawnZone,
      );
    }
  });

  it('round-trip JSON del catálogo', () => {
    const roundtrip = JSON.parse(JSON.stringify(SCENARIO_CATALOG));
    expect(roundtrip).toEqual(SCENARIO_CATALOG);
  });
});

describe('getScenarioDef', () => {
  it('devuelve la definición para un id válido', () => {
    const def = getScenarioDef(SCENARIO.NAUFRAGOS);
    expect(def.id).toBe(SCENARIO.NAUFRAGOS);
  });

  it('lanza para un id no existente', () => {
    expect(() => getScenarioDef('inexistente' as ScenarioId)).toThrow();
  });
});

describe('applyScenario — pureza', () => {
  it('devuelve un NPC nuevo — no muta el original', () => {
    const npc = makeTestNPC({ id: 'sc-1' });
    const original = npc.stats.supervivencia;
    const resultado = applyScenario(npc, SCENARIO.NAUFRAGOS);
    expect(resultado).not.toBe(npc);
    expect(npc.stats.supervivencia).toBe(original);
  });

  it('determinismo: mismo NPC + mismo escenario → mismo output', () => {
    const npc = makeTestNPC({ id: 'sc-2' });
    const r1 = applyScenario(npc, SCENARIO.EXODO);
    const r2 = applyScenario(npc, SCENARIO.EXODO);
    expect(r1).toEqual(r2);
  });

  it('round-trip JSON del NPC tras aplicar escenario', () => {
    const npc = makeTestNPC({ id: 'sc-3' });
    const resultado = applyScenario(npc, SCENARIO.NAUFRAGOS);
    expect(JSON.parse(JSON.stringify(resultado))).toEqual(resultado);
  });
});

describe('applyScenario — diferencias entre escenarios', () => {
  it('naufragos penaliza la supervivencia respecto a exodo', () => {
    const npc = makeTestNPC({ id: 'sc-4', stats: { supervivencia: 80, socializacion: 70 } });
    const enNaufragos = applyScenario(npc, SCENARIO.NAUFRAGOS);
    const enExodo = applyScenario(npc, SCENARIO.EXODO);
    // Náufragos es más duro — supervivencia menor o igual
    expect(enNaufragos.stats.supervivencia).toBeLessThanOrEqual(
      enExodo.stats.supervivencia,
    );
  });

  it('exodo no es idéntico a naufragos (escenarios distintos)', () => {
    const npc = makeTestNPC({ id: 'sc-5' });
    const enNaufragos = applyScenario(npc, SCENARIO.NAUFRAGOS);
    const enExodo = applyScenario(npc, SCENARIO.EXODO);
    expect(enNaufragos.stats).not.toEqual(enExodo.stats);
  });

  it('naufragos spawn en costa (acceso al mar = recurso crítico)', () => {
    const def = getScenarioDef(SCENARIO.NAUFRAGOS);
    expect(def.preferredSpawnZone).toBe('coast');
  });
});

describe('ScenarioDef.startingResources', () => {
  it('exodo tiene recursos iniciales definidos (no vacíos)', () => {
    const def = getScenarioDef(SCENARIO.EXODO);
    const totalRecursos = Object.values(def.startingResources).reduce(
      (s, v) => s + (v ?? 0),
      0,
    );
    expect(totalRecursos).toBeGreaterThan(0);
  });

  it('todos los valores de startingResources son enteros no negativos', () => {
    for (const def of Object.values(SCENARIO_CATALOG)) {
      for (const v of Object.values(def.startingResources)) {
        if (v !== undefined) {
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});
