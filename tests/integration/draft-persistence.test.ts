/**
 * Integración: rasgos y escenario persisten tras finalizeBlockA/B
 * y sobreviven al round-trip de persistencia (JSON stringify/parse).
 *
 * Verifica que el pipeline completo Draft → NPC → JSON → NPC preserva
 * el contrato §A4 con traits y scenarios activos.
 */

import { describe, it, expect } from 'vitest';
import {
  startDraft,
  pickArchetype,
  setSex,
  finalizeBlockA,
  startFollowerDraft,
  pickFollower,
  finalizeBlockB,
  generateCandidates,
  pickScenario,
  addTrait,
} from '@/lib/drafting';
import { ARCHETYPE, SEX } from '@/lib/npcs';
import { SCENARIO } from '@/lib/scenarios';
import { TRAIT } from '@/lib/traits';

const SEED = 1234;

function buildFullDraft() {
  let d = startDraft(SEED);
  // CAZADOR(3)+CURANDERO(3)+RECOLECTOR(2)+PESCADOR(2) = 10 exacto.
  d = pickArchetype(d, 0, ARCHETYPE.CAZADOR);   d = setSex(d, 0, SEX.M);
  d = pickArchetype(d, 1, ARCHETYPE.CURANDERO); d = setSex(d, 1, SEX.F);
  d = pickArchetype(d, 2, ARCHETYPE.RECOLECTOR); d = setSex(d, 2, SEX.M);
  d = pickArchetype(d, 3, ARCHETYPE.PESCADOR);  d = setSex(d, 3, SEX.F);
  d = addTrait(d, 0, TRAIT.FUERTE);
  d = addTrait(d, 1, TRAIT.CURANDERO_NATO);
  d = addTrait(d, 2, TRAIT.FRAGIL);
  d = pickScenario(d, SCENARIO.EXODO);
  return d;
}

describe('draft-persistence — Bloque A', () => {
  it('traits persisten en NPC.traits tras finalizeBlockA', () => {
    const npcs = finalizeBlockA(buildFullDraft());
    expect(npcs[0].traits).toContain(TRAIT.FUERTE);
    expect(npcs[1].traits).toContain(TRAIT.CURANDERO_NATO);
    expect(npcs[2].traits).toContain(TRAIT.FRAGIL);
    expect(npcs[3].traits).toHaveLength(0);
  });

  it('los stats reflejan los modificadores de rasgos + escenario', () => {
    const npcs = finalizeBlockA(buildFullDraft());
    // NPC 0: FUERTE (+15 supervivencia) + EXODO (+5 supervivencia) → ≥ base + 20
    const sinNada = finalizeBlockA((() => {
      let d = startDraft(SEED);
      d = pickArchetype(d, 0, ARCHETYPE.CAZADOR);   d = setSex(d, 0, SEX.M);
      d = pickArchetype(d, 1, ARCHETYPE.CURANDERO); d = setSex(d, 1, SEX.F);
      d = pickArchetype(d, 2, ARCHETYPE.RECOLECTOR); d = setSex(d, 2, SEX.M);
      d = pickArchetype(d, 3, ARCHETYPE.PESCADOR);  d = setSex(d, 3, SEX.F);
      return d;
    })());
    expect(npcs[0].stats.supervivencia).toBeGreaterThan(
      sinNada[0].stats.supervivencia,
    );
    // NPC 2: FRAGIL (-18 supervivencia) + EXODO (+5) → neto -13
    expect(npcs[2].stats.supervivencia).toBeLessThan(
      sinNada[2].stats.supervivencia,
    );
  });

  it('round-trip JSON conserva traits y stats', () => {
    const npcs = finalizeBlockA(buildFullDraft());
    const roundtrip = JSON.parse(JSON.stringify(npcs));
    expect(roundtrip).toEqual(npcs);
    expect(roundtrip[0].traits).toContain(TRAIT.FUERTE);
  });

  it('determinismo: misma seed → mismos NPCs byte-idénticos', () => {
    const a = finalizeBlockA(buildFullDraft());
    const b = finalizeBlockA(buildFullDraft());
    expect(a).toEqual(b);
  });
});

describe('draft-persistence — Bloque B', () => {
  it('finalizeBlockB produce NPCs serializables con traits vacíos', () => {
    const names = new Set(
      finalizeBlockA(buildFullDraft()).map((n) => n.name),
    );
    const cands = generateCandidates(SEED, 'bueno', 0);
    let fd = startFollowerDraft(SEED);
    for (const c of cands.slice(0, 10)) fd = pickFollower(fd, c);
    const npcs = finalizeBlockB(fd, names);
    expect(npcs).toHaveLength(10);
    for (const npc of npcs) {
      // Ciudadanos arrancan sin rasgos — se asignarán en sprints futuros
      expect(npc.traits).toHaveLength(0);
      expect(JSON.parse(JSON.stringify(npc))).toEqual(npc);
    }
  });
});
