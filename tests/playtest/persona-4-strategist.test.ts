/**
 * Playtest Persona 4 — "El estratega".
 *
 * Arquetipo: no concede dones. Acumula Fe pasiva tras ungir. Reserva
 * el arsenal para curse_fatal contra los Elegidos rivales en ráfaga
 * cuando llega al cap.
 *
 * Preguntas:
 *   - ¿Un player sin dones puede ganar solo con maldiciones?
 *   - ¿Cuántos chosen rivales puede derribar antes del día 10000?
 *   - ¿Los rivales compensan con más anoints?
 */

import { describe, it, expect } from 'vitest';
import { initialState } from '@/lib/world-state';
import { anoint } from '@/lib/anoint';
import { curseNpc } from '@/lib/curses';
import { runPersona, type PersonaRun } from './harness';
import type { WorldState } from '@/lib/world-state';
import * as fs from 'node:fs';
import * as path from 'node:path';

function curseAnyRivalChosen(s: WorldState): WorldState {
  if (s.player_god.faith_points < 150) return s;
  const rivalChosenIds = new Set(
    s.rival_gods.flatMap((r) => r.chosen_ones),
  );
  const target = s.npcs.find((n) => n.alive && rivalChosenIds.has(n.id));
  if (!target) return s;
  return curseNpc(s, target.id, 'curse_fatal');
}

describe('Playtest · Persona 4 — El estratega', () => {
  it(
    'ungir una vez y maldecir sistemáticamente',
    () => {
      const seed = 42;
      const s0 = initialState(seed, { playerGroupId: 'tramuntana' });
      const highlightId = s0.tutorial_highlight_id!;

      const run: PersonaRun = {
        name: 'estratega',
        seed,
        group: 'tramuntana',
        ticks: 10_000,
        checkpointDays: [500, 2000, 4000, 6000, 8000],
        actions: [
          {
            onDay: 10,
            label: `ungir al señalado (${highlightId})`,
            apply: (s) => anoint(s, highlightId),
          },
          // Curse cada 1500 días si se tiene Fe (y en barrido al final).
          ...[1500, 3000, 4500, 6000, 7500, 9000].map((day) => ({
            onDay: day,
            label: 'intentar curse_fatal a un rival chosen',
            apply: curseAnyRivalChosen,
          })),
        ],
      };

      const result = runPersona(run, s0);

      const dir = path.resolve(process.cwd(), 'tests/playtest/.out');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'persona-4.json'),
        JSON.stringify(result, null, 2),
      );

      expect(result.actionsExecuted.length).toBeGreaterThanOrEqual(1);
    },
    60_000,
  );
});
