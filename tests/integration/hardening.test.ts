/**
 * Hardening — Sprint 7.
 *
 * Verificación dura de los dos Pilares que el MVP debe sostener:
 *
 *   Pillar 1 (§A2): Mismo don sobre NPCs con traits opuestos produce
 *     outcomes distintos. Lo verificamos sobre varios seeds para
 *     asegurarnos que no es un accidente de una semilla concreta.
 *
 *   Pillar 2: Sin intervención del jugador, el mundo cambia si le das
 *     tiempo. "1 hora de simulación" ≈ 18_000 ticks a la cadencia
 *     canónica (5 ticks/s). A esa escala:
 *       - han muerto NPCs de la generación fundacional
 *       - han nacido NPCs nuevos
 *       - la crónica tiene historia
 *     y sigue siendo reproducible a partir de la semilla.
 *
 * Los tests son más lentos que los unit tests — cada uno ejecuta miles
 * de ticks. Llevan timeout generoso y cubren escenarios clave del MVP.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { anoint } from '@/lib/anoint';
import { grantGift } from '@/lib/gifts';
import { runTicks } from '@/lib/simulation';

function buildPillar1Case(seed: number): WorldState {
  let s = initialState(seed);
  s = {
    ...s,
    npcs: s.npcs.map((n, i) => {
      if (i === 0) {
        return {
          ...n,
          age_days: 30 * 365,
          position: { x: 20, y: 50 },
          traits: { ...n.traits, ambicion: 95, carisma: 50 },
        };
      }
      if (i === 1) {
        return {
          ...n,
          age_days: 30 * 365,
          position: { x: 80, y: 50 },
          traits: { ...n.traits, ambicion: 5, carisma: 50 },
        };
      }
      if (i < 10) {
        return {
          ...n,
          position: { x: i % 2 === 0 ? 22 + i : 78 - i, y: 50 },
          age_days: 25 * 365,
          traits: { ...n.traits, ambicion: 10 },
        };
      }
      return { ...n, position: { x: 150, y: 150 }, age_days: 10 * 365 };
    }),
  };
  s = anoint(s, 'npc_0000');
  s = anoint(s, 'npc_0001');
  s = grantGift(s, 'npc_0000', 'aura_de_carisma');
  s = grantGift(s, 'npc_0001', 'aura_de_carisma');
  return s;
}

describe('Pillar 1 — robusto a múltiples semillas', () => {
  for (const seed of [123, 789, 2024]) {
    it(
      `seed ${seed}: ambicioso acaba con más seguidores que tímido`,
      () => {
        const final = runTicks(buildPillar1Case(seed), 5000);
        const ambitiousFollowers = final.npcs.filter(
          (n) => n.follower_of === 'npc_0000',
        ).length;
        const shyFollowers = final.npcs.filter(
          (n) => n.follower_of === 'npc_0001',
        ).length;
        // El ambicioso debe tener estrictamente más; el tímido puede o no
        // atraer cero (la simulación es estocástica y esa es la señal).
        expect(ambitiousFollowers).toBeGreaterThan(shyFollowers);
        expect(ambitiousFollowers).toBeGreaterThan(0);
      },
      20_000,
    );
  }
});

describe('Pillar 2 — 1 hora de simulación sin tocar nada', () => {
  it(
    '18.000 ticks cambian el mundo y la crónica lo registra',
    () => {
      const s0 = initialState(42);
      const s = runTicks(s0, 18_000);

      // Población: al menos una muerte y un nacimiento.
      const originalIds = new Set(s0.npcs.map((n) => n.id));
      const deadOriginals = s.npcs.filter(
        (n) => originalIds.has(n.id) && !n.alive,
      ).length;
      const newborns = s.npcs.filter((n) => !originalIds.has(n.id)).length;
      expect(deadOriginals).toBeGreaterThan(0);
      expect(newborns).toBeGreaterThan(0);

      // Crónica acumulada.
      expect(s.chronicle.length).toBeGreaterThan(5);
    },
    45_000,
  );

  it(
    'determinismo: dos corridas de 18k ticks idénticas byte a byte',
    () => {
      const a = runTicks(initialState(42), 18_000);
      const b = runTicks(initialState(42), 18_000);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    },
    60_000,
  );
});

describe('balance — sanity checks del MVP', () => {
  it('la población no explota ni colapsa a 0 tras 10k ticks', () => {
    const s = runTicks(initialState(42), 10_000);
    const alive = s.npcs.filter((n) => n.alive).length;
    // Rango razonable: ni se extingue ni se dispara por encima de 500.
    expect(alive).toBeGreaterThan(5);
    expect(alive).toBeLessThan(500);
  });

  it(
    'la Fe no crece exponencialmente sin Elegidos',
    () => {
      const s = runTicks(initialState(42), 18_000);
      expect(s.player_god.faith_points).toBe(0);
    },
    30_000,
  );

  it('los partners son siempre simétricos en NPCs vivos', () => {
    const s = runTicks(initialState(42), 10_000);
    for (const n of s.npcs) {
      if (!n.alive || !n.partner_id) continue;
      const partner = s.npcs.find((o) => o.id === n.partner_id);
      expect(partner?.partner_id).toBe(n.id);
      expect(partner?.alive).toBe(true);
    }
  });

  it('un follower_of apunta siempre a un NPC vivo', () => {
    const s = runTicks(initialState(42), 10_000);
    for (const n of s.npcs) {
      if (!n.alive || !n.follower_of) continue;
      const leader = s.npcs.find((o) => o.id === n.follower_of);
      expect(leader).toBeDefined();
      expect(leader?.alive).toBe(true);
    }
  });
});
