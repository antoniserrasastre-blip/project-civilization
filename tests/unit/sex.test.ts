/**
 * Tests del atributo sexo — v1.0.1 decisión #2.
 *
 * Contrato (DECISIONS-PENDING.md bloque 2, opción A):
 *   - Cada NPC tiene `sex: 'M' | 'F'` asignado determinísticamente al
 *     generarse (vía PRNG — misma seed ⇒ misma distribución).
 *   - Pairing scheduler pase 3 requiere un M y una F (hetero mandatory
 *     para reproducción en v1.0.1; modelos no-reproductivos quedan
 *     para v1.1+ si aparece demanda).
 *   - Ratio ≈ 50/50 sobre muestra grande (±10% de tolerancia).
 *   - Herencia: newborn.sex se determina por PRNG (50/50).
 *   - Backwards compat: round-trip JSON preservado.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState, type NPC } from '@/lib/world-state';
import { scheduleEvents, applyEvents } from '@/lib/scheduler';
import { runTicks } from '@/lib/simulation';

describe('initialState — atributo sex', () => {
  it('cada NPC tiene sex "M" o "F"', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    for (const n of s.npcs) {
      expect(['M', 'F']).toContain(n.sex);
    }
  });

  it('ratio sex ≈ 50/50 en muestra grande (±10%)', () => {
    const s = initialState(42, { npcCount: 200 });
    const males = s.npcs.filter((n) => n.sex === 'M').length;
    const females = s.npcs.filter((n) => n.sex === 'F').length;
    // 100 esperados cada, tolerancia ±10%.
    expect(males).toBeGreaterThan(80);
    expect(males).toBeLessThan(120);
    expect(females).toBeGreaterThan(80);
    expect(females).toBeLessThan(120);
  });

  it('determinismo: misma seed ⇒ misma distribución de sexo', () => {
    const a = initialState(42, { npcCount: 50 });
    const b = initialState(42, { npcCount: 50 });
    expect(a.npcs.map((n) => n.sex)).toEqual(b.npcs.map((n) => n.sex));
  });

  it('round-trip JSON preserva sex', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    const rt = JSON.parse(JSON.stringify(s));
    expect(rt.npcs[0].sex).toBe(s.npcs[0].sex);
  });
});

describe('pairing — requiere M + F (hetero)', () => {
  it('dos NPCs del mismo sexo próximos no se emparejan', () => {
    // Forzamos: tramuntana tiene un cluster de 3 machos adultos adyacentes.
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = {
      ...s,
      npcs: s.npcs.map((n, i) => {
        if (i < 3) {
          return {
            ...n,
            sex: 'M' as const,
            age_days: 25 * 365,
            position: { x: 50, y: 50 + i * 0.3 },
            partner_id: null,
          };
        }
        return { ...n, position: { x: 500, y: 500 } };
      }),
    };
    // 5000 ticks: ninguno de los 3 primeros debería emparejarse entre sí.
    s = runTicks(s, 5000);
    const first = s.npcs[0];
    if (first.partner_id) {
      const partner = s.npcs.find((n) => n.id === first.partner_id);
      expect(partner?.sex).toBe('F');
    }
  }, 20_000);

  it('un NPC M cerca de NPCs F puede emparejarse', () => {
    let s = initialState(77, { playerGroupId: 'tramuntana' });
    s = {
      ...s,
      npcs: s.npcs.map((n, i) => {
        if (i === 0)
          return {
            ...n,
            sex: 'M' as const,
            age_days: 25 * 365,
            position: { x: 50, y: 50 },
            partner_id: null,
          };
        if (i >= 1 && i <= 5)
          return {
            ...n,
            sex: 'F' as const,
            age_days: 25 * 365,
            position: { x: 50 + i * 0.2, y: 50 },
            partner_id: null,
          };
        return { ...n, position: { x: 500, y: 500 } };
      }),
    };
    let sawPairing = false;
    for (let i = 0; i < 5000 && !sawPairing; i++) {
      const { events, prng_cursor } = scheduleEvents(s);
      for (const ev of events) {
        if (
          ev.type === 'pairing' &&
          (ev.a_id === s.npcs[0].id || ev.b_id === s.npcs[0].id)
        ) {
          sawPairing = true;
        }
      }
      s = applyEvents({ ...s, prng_cursor }, events);
    }
    expect(sawPairing).toBe(true);
  }, 20_000);
});

describe('birth — newborn tiene sex', () => {
  it('el recién nacido tiene sex "M" o "F" (PRNG 50/50)', () => {
    // Forzamos una pareja hetero fértil y esperamos el nacimiento.
    let s = initialState(99, { playerGroupId: 'tramuntana' });
    const malePos = s.npcs.findIndex((n) => n.sex === 'M');
    const femalePos = s.npcs.findIndex((n) => n.sex === 'F');
    expect(malePos).toBeGreaterThan(-1);
    expect(femalePos).toBeGreaterThan(-1);
    const maleId = s.npcs[malePos].id;
    const femaleId = s.npcs[femalePos].id;
    s = {
      ...s,
      npcs: s.npcs.map((n) => {
        if (n.id === maleId || n.id === femaleId) {
          return {
            ...n,
            age_days: 25 * 365,
            position: { x: 50, y: 50 },
            partner_id: n.id === maleId ? femaleId : maleId,
          };
        }
        return { ...n, position: { x: 500, y: 500 } };
      }),
    };
    let newborn: NPC | null = null;
    for (let i = 0; i < 5000 && !newborn; i++) {
      const { events, prng_cursor } = scheduleEvents(s);
      for (const ev of events) {
        if (
          ev.type === 'birth' &&
          ev.newborn.parents.includes(maleId) &&
          ev.newborn.parents.includes(femaleId)
        ) {
          newborn = ev.newborn;
        }
      }
      s = applyEvents({ ...s, prng_cursor }, events);
    }
    expect(newborn).not.toBeNull();
    expect(['M', 'F']).toContain(newborn!.sex);
  }, 20_000);
});
