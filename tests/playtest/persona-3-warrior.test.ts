/**
 * Playtest Persona 3 — "El guerrero".
 *
 * Arquetipo: unge al señalado, le concede Fuerza Sobrehumana (gratis,
 * 1er don), acumula Fe y concede Aura de Carisma (30 Fe) cuando pueda.
 * Cuando tenga 150 Fe acumulada (tras varias generaciones), lanza
 * curse_fatal sobre el Elegido rival más amenazante.
 *
 * Preguntas:
 *   - ¿El Elegido buffeado entra al top-3?
 *   - ¿Cuántos descendientes acumula?
 *   - ¿Sirve el curse_fatal para desnivelar contra los rivales?
 *   - Final verdict?
 */

import { describe, it, expect } from 'vitest';
import { initialState } from '@/lib/world-state';
import { anoint } from '@/lib/anoint';
import { grantGift } from '@/lib/gifts';
import { curseNpc } from '@/lib/curses';
import { runPersona, type PersonaRun } from './harness';
import type { WorldState } from '@/lib/world-state';
import * as fs from 'node:fs';
import * as path from 'node:path';

function curseMostInfluentialRival(s: WorldState): WorldState {
  // Picks the most influential rival-chosen and casts curse_fatal if fe≥150.
  if (s.player_god.faith_points < 150) return s;
  const rivalChosenIds = new Set(
    s.rival_gods.flatMap((r) => r.chosen_ones),
  );
  const candidates = s.npcs.filter((n) => n.alive && rivalChosenIds.has(n.id));
  if (candidates.length === 0) return s;
  // Max por stats.fuerza + traits.carisma como proxy de influencia.
  let target = candidates[0];
  for (const c of candidates) {
    if (
      c.stats.fuerza + c.traits.carisma >
      target.stats.fuerza + target.traits.carisma
    ) {
      target = c;
    }
  }
  return curseNpc(s, target.id, 'curse_fatal');
}

describe('Playtest · Persona 3 — El guerrero', () => {
  it(
    'ungir, dones, y curse_fatal cuando la Fe lo permite',
    () => {
      const seed = 42;
      const s0 = initialState(seed, { playerGroupId: 'tramuntana' });
      const highlightId = s0.tutorial_highlight_id!;

      const run: PersonaRun = {
        name: 'guerrero',
        seed,
        group: 'tramuntana',
        ticks: 10_000,
        checkpointDays: [50, 500, 2000, 5000, 7500],
        actions: [
          {
            onDay: 10,
            label: `ungir al señalado (${highlightId})`,
            apply: (s) => anoint(s, highlightId),
          },
          {
            onDay: 20,
            label: 'conceder Fuerza Sobrehumana (primer don, gratis)',
            apply: (s) => grantGift(s, highlightId, 'fuerza_sobrehumana'),
          },
          {
            onDay: 1500,
            label: 'intentar conceder Aura de Carisma (30 Fe)',
            apply: (s) => {
              if (
                s.player_god.faith_points < 30 ||
                s.npcs.find((n) => n.id === highlightId)?.alive !== true
              ) {
                return s;
              }
              return grantGift(s, highlightId, 'aura_de_carisma');
            },
          },
          // Curses periódicos cuando Fe ≥ 150.
          ...[3000, 5000, 7000, 9000].map((day) => ({
            onDay: day,
            label: `intentar curse_fatal al rival más influyente`,
            apply: curseMostInfluentialRival,
          })),
        ],
      };

      const result = runPersona(run, s0);

      const dir = path.resolve(process.cwd(), 'tests/playtest/.out');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'persona-3.json'),
        JSON.stringify(result, null, 2),
      );

      expect(result.actionsExecuted.length).toBeGreaterThanOrEqual(2);
    },
    60_000,
  );
});
