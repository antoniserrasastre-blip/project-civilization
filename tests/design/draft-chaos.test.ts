/**
 * Tests de Rotura — clanes mal diseñados.
 *
 * Verifica que la mecánica de rasgos + escenarios produce diferencias
 * cualitativas reales: un clan con todos negativos es objetivamente
 * más frágil que uno optimizado. El motor no debe permitir builds
 * «gratis» ni ignorar los maluses.
 *
 * Nota: estos tests usan la lógica de drafting + traits + scenarios;
 * no arrancan el motor completo (tick) — miden el shape del estado
 * de spawn, no la simulación posterior.
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
import {
  SCENARIO,
  applyScenario,
  getScenarioDef,
} from '@/lib/scenarios';
import { makeTestNPC } from '@/lib/npcs';

// ─── helpers locales ──────────────────────────────────────────────────

/** Devuelve todos los ids con coste positivo ordenados de más barato a más caro. */
function positivosPorCoste(): TraitId[] {
  return (Object.values(TRAIT) as TraitId[])
    .filter((id) => TRAIT_CATALOG[id].cost > 0)
    .sort((a, b) => TRAIT_CATALOG[a].cost - TRAIT_CATALOG[b].cost);
}

/** Devuelve todos los ids con coste negativo. */
function negativosTodos(): TraitId[] {
  return (Object.values(TRAIT) as TraitId[]).filter(
    (id) => TRAIT_CATALOG[id].cost < 0,
  );
}

/** Construye la selección máxima de rasgos positivos dentro del budget. */
function mejorSeleccion(): TraitId[] {
  const out: TraitId[] = [];
  let acumulado = 0;
  for (const id of positivosPorCoste().reverse()) {
    if (acumulado + TRAIT_CATALOG[id].cost <= TRAIT_BUDGET) {
      out.push(id);
      acumulado += TRAIT_CATALOG[id].cost;
    }
  }
  return out;
}

// ─── describe 1: Budget y validación ─────────────────────────────────

describe('Budget de rasgos — contratos duros', () => {
  it('una selección con coste neto > 15 lanza', () => {
    const caros = positivosPorCoste().reverse();
    const sobre: TraitId[] = [];
    let acc = 0;
    for (const id of caros) {
      acc += TRAIT_CATALOG[id].cost;
      sobre.push(id);
      if (acc > TRAIT_BUDGET) break;
    }
    expect(traitBudgetCost(sobre)).toBeGreaterThan(TRAIT_BUDGET);
    expect(() => validateTraitSelection(sobre)).toThrow(/presupuesto/i);
  });

  it('combinar negativos con positivos no supera el budget si la suma neta ≤ 15', () => {
    const negativos = negativosTodos();
    const refund = negativos.reduce((s, id) => s + TRAIT_CATALOG[id].cost, 0); // suma negativa
    const budgetExtra = TRAIT_BUDGET - refund; // presupuesto ampliado
    // Coger positivos hasta llenar el presupuesto ampliado
    const seleccion: TraitId[] = [...negativos];
    let acc = refund;
    for (const id of positivosPorCoste().reverse()) {
      if (acc + TRAIT_CATALOG[id].cost <= TRAIT_BUDGET) {
        seleccion.push(id);
        acc += TRAIT_CATALOG[id].cost;
      }
    }
    expect(traitBudgetCost(seleccion)).toBeLessThanOrEqual(TRAIT_BUDGET);
    expect(() => validateTraitSelection(seleccion)).not.toThrow();
    // La amplitud de positivos ≥ la que cabe sin negativos
    expect(seleccion.filter((id) => TRAIT_CATALOG[id].cost > 0).length)
      .toBeGreaterThanOrEqual(mejorSeleccion().length);
  });
});

// ─── describe 2: Clan todo-negativo ──────────────────────────────────

describe('Clan con todos los rasgos negativos', () => {
  it('tiene stats de supervivencia menores que un clan sin rasgos', () => {
    const npc = makeTestNPC({ id: 'chaos-1', stats: { supervivencia: 70, socializacion: 70 } });
    const sinRasgos = npc;
    const conNegativos = applyTraits(npc, negativosTodos());
    expect(conNegativos.stats.supervivencia).toBeLessThan(
      sinRasgos.stats.supervivencia,
    );
  });

  it('tiene stats de supervivencia menores que un clan con rasgos positivos', () => {
    const npc = makeTestNPC({ id: 'chaos-2', stats: { supervivencia: 70, socializacion: 70 } });
    const conNegativos = applyTraits(npc, negativosTodos());
    const conPositivos = applyTraits(npc, mejorSeleccion());
    expect(conNegativos.stats.supervivencia).toBeLessThan(
      conPositivos.stats.supervivencia,
    );
  });

  it('los rasgos negativos reducen al menos una skill de combate o recolección', () => {
    const npc = makeTestNPC({ id: 'chaos-3' });
    const conNegativos = applyTraits(npc, negativosTodos());
    const skillsBase =
      npc.skills.hunting + npc.skills.gathering + npc.skills.crafting;
    const skillsFinal =
      conNegativos.skills.hunting +
      conNegativos.skills.gathering +
      conNegativos.skills.crafting;
    expect(skillsFinal).toBeLessThan(skillsBase);
  });
});

// ─── describe 3: Escenario Náufragos penaliza más que Éxodo ──────────

describe('Escenario Náufragos vs Éxodo', () => {
  it('un clan en naufragos tiene supervivencia media menor que en exodo', () => {
    const npcs = Array.from({ length: 4 }, (_, i) =>
      makeTestNPC({ id: `sc-${i}`, stats: { supervivencia: 80, socializacion: 70 } }),
    );
    const mediaStats = (arr: ReturnType<typeof makeTestNPC>[], escenario: typeof SCENARIO[keyof typeof SCENARIO]) => {
      return arr.reduce((s, npc) => s + applyScenario(npc, escenario).stats.supervivencia, 0) / arr.length;
    };
    const mediaNaufragos = mediaStats(npcs, SCENARIO.NAUFRAGOS);
    const mediaExodo = mediaStats(npcs, SCENARIO.EXODO);
    expect(mediaNaufragos).toBeLessThanOrEqual(mediaExodo);
  });

  it('naufragos arranca en zona costera (necesita pesca para sobrevivir)', () => {
    const def = getScenarioDef(SCENARIO.NAUFRAGOS);
    expect(def.preferredSpawnZone).toBe('coast');
  });

  it('exodo arranca con recursos superiores a naufragos', () => {
    const defN = getScenarioDef(SCENARIO.NAUFRAGOS);
    const defE = getScenarioDef(SCENARIO.EXODO);
    const totalN = Object.values(defN.startingResources).reduce((s, v) => s + (v ?? 0), 0);
    const totalE = Object.values(defE.startingResources).reduce((s, v) => s + (v ?? 0), 0);
    expect(totalE).toBeGreaterThan(totalN);
  });
});

// ─── describe 4: Combo peor caso ─────────────────────────────────────

describe('Combo peor caso — todo negativo + naufragos', () => {
  it('supervivencia media del clan es < 50 (zona de colapso potencial)', () => {
    const npcs = Array.from({ length: 4 }, (_, i) =>
      makeTestNPC({ id: `worst-${i}`, stats: { supervivencia: 70, socializacion: 70 } }),
    );
    const stats = npcs.map((npc) => {
      const conRasgos = applyTraits(npc, negativosTodos());
      const conEscenario = applyScenario(conRasgos, SCENARIO.NAUFRAGOS);
      return conEscenario.stats.supervivencia;
    });
    const media = stats.reduce((s, v) => s + v, 0) / stats.length;
    expect(media).toBeLessThan(50);
  });

  it('no hay undefined ni NaN en los stats del NPC resultante', () => {
    const npc = makeTestNPC({ id: 'worst-check' });
    const conRasgos = applyTraits(npc, negativosTodos());
    const final = applyScenario(conRasgos, SCENARIO.NAUFRAGOS);
    expect(final.stats.supervivencia).not.toBeNaN();
    expect(final.stats.socializacion).not.toBeNaN();
    expect(final.stats.supervivencia).toBeDefined();
    expect(final.stats.socializacion).toBeDefined();
  });

  it('round-trip JSON del NPC en peor caso', () => {
    const npc = makeTestNPC({ id: 'worst-json' });
    const conRasgos = applyTraits(npc, negativosTodos());
    const final = applyScenario(conRasgos, SCENARIO.NAUFRAGOS);
    expect(JSON.parse(JSON.stringify(final))).toEqual(final);
  });
});
