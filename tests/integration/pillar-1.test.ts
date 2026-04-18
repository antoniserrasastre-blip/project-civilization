/**
 * Pillar 1 — integración (Sprint 3).
 *
 * Visión §A2 + §A5: el mismo don sobre dos NPCs con traits distintos produce
 * resultados distintos. Lo verificamos empíricamente: tomamos dos NPCs con
 * idéntica `aura_de_carisma` pero ambición contrapuesta (líder vs tímido).
 * Colocamos a ambos rodeados del mismo pool de potenciales seguidores, y
 * corremos un tramo razonable de simulación. Solo el ambicioso debe acabar
 * con seguidores.
 *
 * Este test es el criterio objetivo de éxito del Pillar 1 — si falla, es
 * que el gift mecánicamente no importa.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { anoint } from '@/lib/anoint';
import { grantGift } from '@/lib/gifts';
import { runTicks } from '@/lib/simulation';

function setUpContrast(): WorldState {
  let s = initialState(123);
  // Fijamos traits y posiciones de forma controlada:
  //   - npc_0000: líder ambicioso (ambicion=95) con aura_de_carisma.
  //   - npc_0001: mismo don, pero tímido (ambicion=5).
  //   - npc_0002..npc_0009: potenciales seguidores — adultos, tímidos,
  //     a mitad de camino entre ambos líderes (mismo sabor para los dos).
  s = {
    ...s,
    npcs: s.npcs.map((n, i) => {
      if (i === 0) {
        return {
          ...n,
          position: { x: 20, y: 50 },
          age_days: 30 * 365,
          traits: { ...n.traits, ambicion: 95, carisma: 50 },
        };
      }
      if (i === 1) {
        return {
          ...n,
          position: { x: 80, y: 50 },
          age_days: 30 * 365,
          traits: { ...n.traits, ambicion: 5, carisma: 50 },
        };
      }
      if (i < 10) {
        // Ocho potenciales seguidores: cuatro cerca de cada líder.
        const nearAmbitious = i % 2 === 0;
        const x = nearAmbitious ? 22 + i : 78 - i;
        return {
          ...n,
          position: { x, y: 50 },
          age_days: 25 * 365,
          traits: { ...n.traits, ambicion: 10 },
        };
      }
      return { ...n, position: { x: 150, y: 150 }, age_days: 10 * 365 };
    }),
  };

  // Los dos candidatos son Elegidos con el mismo don.
  s = anoint(s, 'npc_0000');
  s = anoint(s, 'npc_0001');
  s = grantGift(s, 'npc_0000', 'aura_de_carisma');
  s = grantGift(s, 'npc_0001', 'aura_de_carisma');
  return s;
}

describe('Pillar 1 — mismo don, distintos traits, distintos resultados', () => {
  it(
    'tras 3000 ticks, el ambicioso tiene más seguidores que el tímido',
    () => {
      const s0 = setUpContrast();
      const s = runTicks(s0, 3000);

      const followersOfAmbitious = s.npcs.filter(
        (n) => n.follower_of === 'npc_0000',
      ).length;
      const followersOfShy = s.npcs.filter(
        (n) => n.follower_of === 'npc_0001',
      ).length;

      expect(followersOfAmbitious).toBeGreaterThan(followersOfShy);
      // Asimetría clara: el ambicioso tiene al menos un seguidor.
      expect(followersOfAmbitious).toBeGreaterThan(0);
    },
    30_000,
  );
});
