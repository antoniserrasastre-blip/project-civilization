/**
 * Tests de dones — Sprint 3.
 *
 * Valida:
 *   - Catálogo cerrado (Fuerza Sobrehumana, Aura de Carisma).
 *   - `grantGift` aplica el efecto al stat/trait correspondiente, con clamp
 *     hacia arriba (los dones sobrepasan el techo normal de 100, pero no
 *     explotan a infinito).
 *   - No se puede conceder el mismo don dos veces al mismo NPC.
 *   - Solo los Elegidos pueden recibir dones (contrato §A5 del Vision).
 *   - El don no tiene efectos secundarios: el estado es inmutable y el PRNG
 *     cursor no se consume (el don es una ACCIÓN del dios, no parte de la
 *     simulación estocástica).
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { anoint } from '@/lib/anoint';
import { GIFTS, grantGift, canGrantGift } from '@/lib/gifts';

function withChosen(seed: number, npc_id = 'npc_0000'): WorldState {
  return anoint(initialState(seed), npc_id);
}

describe('catálogo de dones', () => {
  it('expone exactamente los dones del MVP (Fuerza Sobrehumana, Aura de Carisma)', () => {
    const ids = Object.keys(GIFTS).sort();
    expect(ids).toEqual(['aura_de_carisma', 'fuerza_sobrehumana']);
  });

  it('cada entrada del catálogo tiene nombre, descripción y apply()', () => {
    for (const def of Object.values(GIFTS)) {
      expect(def.id).toBeTypeOf('string');
      expect(def.name).toBeTypeOf('string');
      expect(def.description).toBeTypeOf('string');
      expect(typeof def.apply).toBe('function');
    }
  });
});

describe('grantGift — efectos', () => {
  it('Fuerza Sobrehumana eleva fuerza del NPC por encima de 100', () => {
    const s = withChosen(42);
    const before = s.npcs[0].stats.fuerza;
    const after = grantGift(s, 'npc_0000', 'fuerza_sobrehumana');
    const npc = after.npcs.find((n) => n.id === 'npc_0000')!;
    expect(npc.stats.fuerza).toBeGreaterThan(before);
    expect(npc.stats.fuerza).toBeGreaterThanOrEqual(100);
    expect(npc.gifts).toContain('fuerza_sobrehumana');
  });

  it('Aura de Carisma eleva carisma del NPC por encima de 100', () => {
    const s = withChosen(42);
    const before = s.npcs[0].traits.carisma;
    const after = grantGift(s, 'npc_0000', 'aura_de_carisma');
    const npc = after.npcs.find((n) => n.id === 'npc_0000')!;
    expect(npc.traits.carisma).toBeGreaterThan(before);
    expect(npc.traits.carisma).toBeGreaterThanOrEqual(100);
    expect(npc.gifts).toContain('aura_de_carisma');
  });

  it('no consume PRNG cursor (el don es una acción del dios, no estocástica)', () => {
    const s = withChosen(42);
    const after = grantGift(s, 'npc_0000', 'fuerza_sobrehumana');
    expect(after.prng_cursor).toBe(s.prng_cursor);
  });

  it('no muta el estado de entrada', () => {
    const s = withChosen(42);
    const snap = JSON.stringify(s);
    grantGift(s, 'npc_0000', 'fuerza_sobrehumana');
    expect(JSON.stringify(s)).toBe(snap);
  });
});

describe('canGrantGift — reglas', () => {
  it('ok para un Elegido vivo que no tiene ya el don', () => {
    const s = withChosen(42);
    expect(canGrantGift(s, 'npc_0000', 'fuerza_sobrehumana').ok).toBe(true);
  });

  it('rechaza si el NPC no es Elegido', () => {
    const s = initialState(42);
    const r = canGrantGift(s, 'npc_0000', 'fuerza_sobrehumana');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_chosen');
  });

  it('rechaza si el NPC ya tiene ese don', () => {
    let s = withChosen(42);
    s = grantGift(s, 'npc_0000', 'fuerza_sobrehumana');
    const r = canGrantGift(s, 'npc_0000', 'fuerza_sobrehumana');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('already_has_gift');
  });

  it('rechaza si el NPC está muerto', () => {
    const s = withChosen(42);
    const dead: WorldState = {
      ...s,
      npcs: s.npcs.map((n) =>
        n.id === 'npc_0000' ? { ...n, alive: false } : n,
      ),
    };
    const r = canGrantGift(dead, 'npc_0000', 'fuerza_sobrehumana');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('dead_npc');
  });

  it('rechaza si el NPC no existe', () => {
    const s = withChosen(42);
    const r = canGrantGift(s, 'npc_9999', 'fuerza_sobrehumana');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('unknown_npc');
  });
});

describe('dones y lifecycle', () => {
  it('un recién nacido puede heredar dones de los padres', async () => {
    const { scheduleEvents, applyEvents } = await import('@/lib/scheduler');
    // Seed un estado con dos adultos emparejados, fértiles, dotados.
    let s = initialState(11);
    s = anoint(s, 'npc_0000');
    s = anoint(s, 'npc_0001');
    s = grantGift(s, 'npc_0000', 'fuerza_sobrehumana');
    s = grantGift(s, 'npc_0001', 'aura_de_carisma');
    s = {
      ...s,
      npcs: s.npcs.map((n) => {
        if (n.id === 'npc_0000') {
          return {
            ...n,
            age_days: 25 * 365,
            position: { x: 50, y: 50 },
            partner_id: 'npc_0001',
          };
        }
        if (n.id === 'npc_0001') {
          return {
            ...n,
            age_days: 25 * 365,
            position: { x: 50, y: 50 },
            partner_id: 'npc_0000',
          };
        }
        // Alejamos al resto para que no compitan como candidatos.
        return { ...n, position: { x: 1, y: 1 }, age_days: 15 * 365 };
      }),
    };

    let sawInheritedGift = false;
    for (let i = 0; i < 3000 && !sawInheritedGift; i++) {
      const { events, prng_cursor } = scheduleEvents(s);
      s = applyEvents({ ...s, prng_cursor }, events);
      for (const ev of events) {
        if (ev.type === 'birth' && ev.newborn.gifts.length > 0) {
          sawInheritedGift = true;
          break;
        }
      }
    }
    expect(sawInheritedGift).toBe(true);
  });
});
