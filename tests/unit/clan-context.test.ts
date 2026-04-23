/**
 * Tests de ClanContext — Sprint #2 Fase 5 LEGIBILIDAD-MVP.
 *
 * Helper puro que resume el estado del clan en unas métricas que
 * el panel de contexto enseña junto al selector de susurro:
 *
 *   - Hambre media: inversa de supervivencia media de NPCs vivos.
 *   - En apuros: count de NPCs vivos con supervivencia < threshold
 *     (proxy de "hambriento / herido / cansado" §3.7 Auxilio).
 *   - Días desde último nacimiento: distancia en días entre el
 *     nacimiento más reciente y el tick actual.
 *
 * Puro §A4 — no toca DOM, localStorage, ni LLMs.
 */

import { describe, it, expect } from 'vitest';
import { summarizeClanState, DISTRESS_THRESHOLD } from '@/lib/clan-context';
import { makeTestNPC } from '@/lib/npcs';
import { TICKS_PER_DAY } from '@/lib/resources';

describe('summarizeClanState — hambre media', () => {
  it('0 NPCs vivos → hambre 0%', () => {
    const s = summarizeClanState([], 0);
    expect(s.hungerMeanPct).toBe(0);
    expect(s.aliveCount).toBe(0);
  });

  it('todos al 100% → hambre 0%', () => {
    const npcs = [
      makeTestNPC({ id: 'a', stats: { supervivencia: 100, socializacion: 50 } }),
      makeTestNPC({ id: 'b', stats: { supervivencia: 100, socializacion: 50 } }),
    ];
    expect(summarizeClanState(npcs, 0).hungerMeanPct).toBe(0);
  });

  it('todos al 0% → hambre 100% (pero todos muertos → 0 vivos)', () => {
    const npcs = [
      makeTestNPC({
        id: 'a',
        alive: false,
        stats: { supervivencia: 0, socializacion: 0 },
      }),
    ];
    const s = summarizeClanState(npcs, 0);
    expect(s.aliveCount).toBe(0);
    expect(s.hungerMeanPct).toBe(0);
  });

  it('media sobre vivos: muertos no cuentan', () => {
    const npcs = [
      makeTestNPC({ id: 'a', stats: { supervivencia: 80, socializacion: 50 } }),
      makeTestNPC({ id: 'b', stats: { supervivencia: 40, socializacion: 50 } }),
      makeTestNPC({
        id: 'dead',
        alive: false,
        stats: { supervivencia: 10, socializacion: 10 },
      }),
    ];
    const s = summarizeClanState(npcs, 0);
    expect(s.aliveCount).toBe(2);
    expect(s.hungerMeanPct).toBe(40); // 100 - (80+40)/2 = 40
  });

  it('redondea a entero', () => {
    const npcs = [
      makeTestNPC({ id: 'a', stats: { supervivencia: 77, socializacion: 50 } }),
      makeTestNPC({ id: 'b', stats: { supervivencia: 78, socializacion: 50 } }),
      makeTestNPC({ id: 'c', stats: { supervivencia: 79, socializacion: 50 } }),
    ];
    const s = summarizeClanState(npcs, 0);
    // 100 - (77+78+79)/3 = 100 - 78 = 22
    expect(Number.isInteger(s.hungerMeanPct)).toBe(true);
    expect(s.hungerMeanPct).toBe(22);
  });
});

describe('summarizeClanState — en apuros (proxy herido/cansado)', () => {
  it('DISTRESS_THRESHOLD es un valor sensato (< thrivingThreshold)', () => {
    expect(DISTRESS_THRESHOLD).toBeLessThan(50);
    expect(DISTRESS_THRESHOLD).toBeGreaterThan(0);
  });

  it('cuenta NPCs vivos con supervivencia < DISTRESS_THRESHOLD', () => {
    const npcs = [
      makeTestNPC({
        id: 'a',
        stats: { supervivencia: DISTRESS_THRESHOLD - 1, socializacion: 50 },
      }),
      makeTestNPC({
        id: 'b',
        stats: { supervivencia: DISTRESS_THRESHOLD, socializacion: 50 },
      }),
      makeTestNPC({
        id: 'c',
        stats: { supervivencia: DISTRESS_THRESHOLD + 10, socializacion: 50 },
      }),
    ];
    const s = summarizeClanState(npcs, 0);
    expect(s.inDistressCount).toBe(1);
  });

  it('muertos nunca cuentan como apurados', () => {
    const npcs = [
      makeTestNPC({
        id: 'dead',
        alive: false,
        stats: { supervivencia: 5, socializacion: 5 },
      }),
    ];
    expect(summarizeClanState(npcs, 0).inDistressCount).toBe(0);
  });
});

describe('summarizeClanState — días desde último nacimiento', () => {
  it('sin nacimientos: usa tick actual como días desde día 0', () => {
    const npcs = [
      makeTestNPC({ id: 'a', birthTick: 0 }),
      makeTestNPC({ id: 'b', birthTick: 0 }),
    ];
    const s = summarizeClanState(npcs, TICKS_PER_DAY * 5);
    expect(s.daysSinceLastBirth).toBe(5);
  });

  it('con un nacimiento en el día 3, currentTick día 7 → 4 días', () => {
    const npcs = [
      makeTestNPC({ id: 'a', birthTick: 0 }),
      makeTestNPC({ id: 'newborn', birthTick: TICKS_PER_DAY * 3 }),
    ];
    const s = summarizeClanState(npcs, TICKS_PER_DAY * 7);
    expect(s.daysSinceLastBirth).toBe(4);
  });

  it('multiple nacimientos: usa el más reciente', () => {
    const npcs = [
      makeTestNPC({ id: 'a', birthTick: 0 }),
      makeTestNPC({ id: 'b', birthTick: TICKS_PER_DAY * 2 }),
      makeTestNPC({ id: 'c', birthTick: TICKS_PER_DAY * 10 }),
    ];
    const s = summarizeClanState(npcs, TICKS_PER_DAY * 10);
    expect(s.daysSinceLastBirth).toBe(0);
  });

  it('tick actual sobre un nacimiento ya pasado: no puede ser negativo', () => {
    const npcs = [
      makeTestNPC({ id: 'a', birthTick: TICKS_PER_DAY * 3 }),
    ];
    const s = summarizeClanState(npcs, TICKS_PER_DAY * 2);
    // El tick actual < birthTick (no debería pasar en producción pero
    // el helper ha de tolerarlo — clamp a 0).
    expect(s.daysSinceLastBirth).toBeGreaterThanOrEqual(0);
  });
});

describe('summarizeClanState — §A4 pureza', () => {
  it('no muta el array de NPCs ni sus items', () => {
    const npcs = [
      makeTestNPC({ id: 'a', stats: { supervivencia: 50, socializacion: 50 } }),
    ];
    const snap = JSON.stringify(npcs);
    summarizeClanState(npcs, 100);
    expect(JSON.stringify(npcs)).toBe(snap);
  });

  it('round-trip JSON del resultado', () => {
    const npcs = [
      makeTestNPC({ id: 'a', stats: { supervivencia: 50, socializacion: 50 } }),
    ];
    const s = summarizeClanState(npcs, 100);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
