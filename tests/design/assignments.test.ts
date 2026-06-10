/**
 * Suite de diseño TDD — Sprint 02: designios (applyAssignments).
 *
 * Contrato (spec 02_maquina-de-fases):
 *  - `applyAssignments(state, assignments)` pura: registra designios por NPC
 *    (3 dominios PoC: recoleccion | exploracion | construccion), guarda el
 *    historial {day, assignments} en el estado, corre el amanecer (dawn) y
 *    arranca el día: phase 'day', tick avanzado más allá del anochecer.
 *  - Designio inválido (NPC muerto/inexistente, dominio desconocido) →
 *    se descarta en silencio (no-op explícito), jamás throw.
 *  - Fuera de 'preparation' → no-op (devuelve el estado tal cual).
 *  - Round-trip JSON con historial incluido.
 *  - La modulación de comportamiento por designio es del sprint 03 — aquí
 *    solo almacenamiento, validación, historial y arranque del día.
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { applyAssignments } from '@/lib/dawn';
import { initialGameState } from '@/lib/game-state';
import { TICKS_PER_DAY } from '@/lib/resources';
import { makeTestNPC, makeFullInventory } from '../helpers/npc-fixtures';
import { TILE, type WorldMap } from '@/lib/world-state';

function mkFlatWorld(w = 32, h = 32): WorldMap {
  return {
    seed: 0,
    width: w,
    height: h,
    tiles: new Array(w * h).fill(TILE.GRASS),
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
    influence: [],
  };
}

function mkPreparationState() {
  const npcs = [
    makeTestNPC({ id: 'ana', position: { x: 5, y: 5 }, stats: { supervivencia: 90, socializacion: 80, proposito: 90, miedo: 10 }, inventory: makeFullInventory({ berry: 300 }) }),
    makeTestNPC({ id: 'bru', position: { x: 6, y: 6 }, stats: { supervivencia: 90, socializacion: 80, proposito: 90, miedo: 10 }, inventory: makeFullInventory({ berry: 300 }) }),
    { ...makeTestNPC({ id: 'caido', position: { x: 7, y: 7 }, stats: { supervivencia: 90, socializacion: 80, proposito: 90, miedo: 10 } }), alive: false },
  ];
  const base = initialGameState(11, npcs, mkFlatWorld(), 'stone', { skipSpawning: true });
  const dusk = { ...base, phasedMode: true, tick: TICKS_PER_DAY - 1 };
  return tick(dusk); // → phase 'preparation', congelado en el anochecer
}

describe('Sprint 02 — applyAssignments (designios)', () => {
  it('registra designios válidos, corre el amanecer y arranca el día siguiente', () => {
    const prep = mkPreparationState();
    expect(prep.phase).toBe('preparation');

    const out = applyAssignments(prep, { ana: 'exploracion', bru: 'recoleccion' });
    expect(out.phase).toBe('day');
    expect(out.tick).toBe(TICKS_PER_DAY); // cruzó el anochecer
    expect(out.npcs.find((n) => n.id === 'ana')?.designio).toBe('exploracion');
    expect(out.npcs.find((n) => n.id === 'bru')?.designio).toBe('recoleccion');
    expect(out.village.gratitudeEarnedToday).toBe(0); // dawn corrió
  });

  it('guarda el historial {day, assignments} y round-trippea por JSON', () => {
    const prep = mkPreparationState();
    const out = applyAssignments(prep, { ana: 'construccion' });
    expect(out.assignmentsHistory).toEqual([
      { day: 1, assignments: { ana: 'construccion' } },
    ]);
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });

  it('designios inválidos se descartan en silencio: NPC muerto, NPC inexistente, dominio desconocido', () => {
    const prep = mkPreparationState();
    const out = applyAssignments(prep, {
      caido: 'exploracion', // muerto
      fantasma: 'recoleccion', // no existe
      // @ts-expect-error — dominio desconocido a propósito (contrato: no throw)
      ana: 'guerra', // dominio fuera del PoC
    });
    expect(out.phase).toBe('day'); // el amanecer corre igual
    expect(out.npcs.find((n) => n.id === 'caido')?.designio ?? null).toBeNull();
    expect(out.npcs.find((n) => n.id === 'ana')?.designio ?? null).toBeNull();
    expect(out.assignmentsHistory[0].assignments).toEqual({}); // nada válido que registrar
  });

  it('fuera de preparation es no-op explícito (devuelve el estado tal cual)', () => {
    const prep = mkPreparationState();
    const day = applyAssignments(prep, {}); // arranca el día
    const noop = applyAssignments(day, { ana: 'exploracion' });
    expect(JSON.stringify(noop)).toBe(JSON.stringify(day));
  });

  it('es pura: no muta el estado de entrada ni el objeto assignments', () => {
    const prep = mkPreparationState();
    const assignments = { ana: 'exploracion' as const };
    const preState = JSON.stringify(prep);
    const preAssign = JSON.stringify(assignments);
    applyAssignments(prep, assignments);
    expect(JSON.stringify(prep)).toBe(preState);
    expect(JSON.stringify(assignments)).toBe(preAssign);
  });
});
