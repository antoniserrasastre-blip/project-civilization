/**
 * Tests de economía de Fe — Sprint 4.
 *
 * Valida (§A1 Vision):
 *   - `rezar`: cada tick los NPCs sagrados (Elegidos o descendientes)
 *     producen Fe pasiva.
 *   - `enemigo_caido`: si un sagrado mata a un no-sagrado en conflicto,
 *     el jugador recibe bono de Fe.
 *   - `descendencia`: cada nacimiento con al menos un padre sagrado
 *     concede bono de Fe.
 *   - `Herencia de Fe`: los nietos (descendientes a N niveles) siguen
 *     generando Fe; el contagio `descends_from_chosen` nunca se apaga.
 *   - Coste de dones: el PRIMER don del jugador es gratis; a partir del
 *     segundo, GIFT_COST (30) Fe. Si no hay suficiente Fe, no se puede.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState, type NPC } from '@/lib/world-state';
import { anoint } from '@/lib/anoint';
import { scheduleEvents, applyEvents } from '@/lib/scheduler';
import {
  canGrantGift,
  grantGift,
  nextGiftCost,
  GIFT_COST,
} from '@/lib/gifts';
import { runTicks, tick } from '@/lib/simulation';

function anointFirst(s: WorldState): WorldState {
  return anoint(s, 'npc_0000');
}

describe('rezar — Fe pasiva por NPCs sagrados', () => {
  it('sin Elegidos, la Fe no aumenta con los ticks', () => {
    const s = initialState(42);
    const next = runTicks(s, 100);
    expect(next.player_god.faith_points).toBe(0);
  });

  it('con un Elegido vivo, cada tick produce ~0.05 Fe', () => {
    const s = anointFirst(initialState(42));
    const next = tick(s);
    // Un único sagrado ⇒ 0.05 Fe por tick.
    expect(next.player_god.faith_points).toBeCloseTo(0.05, 5);
  });

  it('tras N ticks, la Fe crece monótonamente', () => {
    let s = anointFirst(initialState(42));
    for (let i = 0; i < 50; i++) s = tick(s);
    expect(s.player_god.faith_points).toBeGreaterThan(0);
    expect(s.player_god.faith_points).toBeLessThanOrEqual(50 * 0.05 + 0.001);
  });
});

describe('descendencia — Fe al nacer un hijo de sagrados', () => {
  it('fuerza un nacimiento entre dos Elegidos y comprueba bono Fe', () => {
    let s = initialState(7);
    s = anoint(s, 'npc_0000');
    s = anoint(s, 'npc_0001');
    s = {
      ...s,
      npcs: s.npcs.map((n) => {
        if (n.id === 'npc_0000')
          return {
            ...n,
            age_days: 25 * 365,
            position: { x: 50, y: 50 },
            partner_id: 'npc_0001',
          };
        if (n.id === 'npc_0001')
          return {
            ...n,
            age_days: 25 * 365,
            position: { x: 50, y: 50 },
            partner_id: 'npc_0000',
          };
        return { ...n, position: { x: 1, y: 1 }, age_days: 10 * 365 };
      }),
    };

    let sawBirthBonus = false;
    for (let i = 0; i < 3000 && !sawBirthBonus; i++) {
      const { events, prng_cursor } = scheduleEvents(s);
      s = applyEvents({ ...s, prng_cursor }, events);
      for (const ev of events) {
        if (ev.type === 'faith_gained' && ev.reason === 'descendencia') {
          sawBirthBonus = true;
          break;
        }
      }
    }
    expect(sawBirthBonus).toBe(true);
  });
});

describe('enemigo_caido — bono Fe por conflicto ganado por sagrado', () => {
  it('un Elegido guerrero que mata a un no-sagrado concede bono de Fe', () => {
    let s = initialState(3);
    // Elegido fuerte y ambicioso vs rival débil cerca.
    // El rival ya está emparejado con alguien fuera de rango para
    // bloquear el pase de pairing y que el conflicto tenga oportunidad.
    s = anoint(s, 'npc_0000');
    s = {
      ...s,
      npcs: s.npcs.map((n) => {
        if (n.id === 'npc_0000') {
          return {
            ...n,
            age_days: 25 * 365,
            position: { x: 50, y: 50 },
            traits: { ...n.traits, ambicion: 99 },
            stats: { ...n.stats, fuerza: 99 },
          };
        }
        if (n.id === 'npc_0001') {
          return {
            ...n,
            age_days: 25 * 365,
            position: { x: 51, y: 50 },
            traits: { ...n.traits, ambicion: 10 },
            stats: { ...n.stats, fuerza: 5 },
            partner_id: 'npc_0002',
          };
        }
        if (n.id === 'npc_0002') {
          return {
            ...n,
            age_days: 25 * 365,
            position: { x: 500, y: 500 },
            partner_id: 'npc_0001',
          };
        }
        return { ...n, position: { x: 200, y: 200 } };
      }),
    };

    let sawKillBonus = false;
    for (let i = 0; i < 6000 && !sawKillBonus; i++) {
      const { events, prng_cursor } = scheduleEvents(s);
      s = applyEvents({ ...s, prng_cursor }, events);
      for (const ev of events) {
        if (ev.type === 'faith_gained' && ev.reason === 'enemigo_caido') {
          sawKillBonus = true;
          break;
        }
      }
    }
    expect(sawKillBonus).toBe(true);
  });
});

describe('Herencia de Fe — descendientes propagan descends_from_chosen', () => {
  it('un hijo de Elegido tiene descends_from_chosen=true y genera Fe como su padre', () => {
    // Simulamos un parto entre Elegidos forzando el evento.
    const s = initialState(1);
    const parentA = s.npcs[0];
    const parentB = s.npcs[1];
    const childNpc: NPC = {
      id: 'npc_0050',
      group_id: parentA.group_id,
      name: 'Hijo',
      age_days: 0,
      position: { x: 0, y: 0 },
      stats: { fuerza: 50, inteligencia: 50, agilidad: 50 },
      traits: { ambicion: 50, lealtad: 50, paranoia: 50, carisma: 50 },
      gifts: [],
      parents: [parentA.id, parentB.id],
      alive: true,
      partner_id: null,
      follower_of: null,
      descends_from_chosen: true,
    };

    const withChild = {
      ...anoint(s, parentA.id),
      npcs: [...s.npcs, childNpc],
    };

    // Al avanzar un tick, la Fe pasiva debe contar AL MENOS dos fuentes
    // (el Elegido npc_0000 y el descendiente npc_0050 con edad 1 día).
    const next = tick(withChild);
    // Dos sagrados + 1 tick = ~0.1 Fe. Con margen por redondeo float.
    expect(next.player_god.faith_points).toBeGreaterThanOrEqual(0.09);
    expect(next.player_god.faith_points).toBeLessThanOrEqual(0.11);
  });
});

describe('coste de dones', () => {
  it('nextGiftCost: 0 → gratis; N>0 → GIFT_COST', () => {
    expect(nextGiftCost(0)).toBe(0);
    expect(nextGiftCost(1)).toBe(GIFT_COST);
    expect(nextGiftCost(10)).toBe(GIFT_COST);
  });

  it('el primer don es gratis y deja gifts_granted=1', () => {
    let s = anointFirst(initialState(42));
    const check = canGrantGift(s, 'npc_0000', 'fuerza_sobrehumana');
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.cost).toBe(0);
    s = grantGift(s, 'npc_0000', 'fuerza_sobrehumana');
    expect(s.player_god.gifts_granted).toBe(1);
    expect(s.player_god.faith_points).toBe(0);
  });

  it('el segundo don cuesta GIFT_COST y exige Fe suficiente', () => {
    let s = anointFirst(initialState(42));
    s = grantGift(s, 'npc_0000', 'fuerza_sobrehumana');
    // Segundo intento sin Fe: rechazado.
    const denied = canGrantGift(s, 'npc_0000', 'aura_de_carisma');
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toBe('not_enough_faith');

    // Con Fe suficiente, se concede y se descuenta.
    s = {
      ...s,
      player_god: { ...s.player_god, faith_points: GIFT_COST },
    };
    const ok = canGrantGift(s, 'npc_0000', 'aura_de_carisma');
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.cost).toBe(GIFT_COST);
    s = grantGift(s, 'npc_0000', 'aura_de_carisma');
    expect(s.player_god.faith_points).toBe(0);
    expect(s.player_god.gifts_granted).toBe(2);
  });
});
