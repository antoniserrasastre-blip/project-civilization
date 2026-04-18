/**
 * Playtest Persona 2 — "El minimalista".
 *
 * Arquetipo: juega el tutorial, unge al señalado (el más ambicioso del
 * grupo) en día 10, y luego NO hace nada más. Clásico arquetipo de
 * jugador idle: interviene una sola vez y deja que el mundo fluya.
 *
 * Preguntas que responde:
 *   - ¿Cuánta Fe acumula un solo Elegido en 10k ticks (y llega al cap)?
 *   - ¿El Elegido engendra? ¿Cuántos descendientes vivos tiene al final?
 *   - ¿El rival responde (también unge)?
 *   - ¿El veredicto final es reign/pyrrhic/defeat?
 */

import { describe, it, expect } from 'vitest';
import { initialState } from '@/lib/world-state';
import { anoint } from '@/lib/anoint';
import { runPersona, type PersonaRun } from './harness';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Playtest · Persona 2 — El minimalista', () => {
  it(
    'unge el día 10 y observa durante 10k ticks',
    () => {
      const seed = 42;
      const s0 = initialState(seed, { playerGroupId: 'tramuntana' });
      // El tutorial señala al NPC más ambicioso del grupo.
      const highlightId = s0.tutorial_highlight_id!;

      const run: PersonaRun = {
        name: 'minimalista',
        seed,
        group: 'tramuntana',
        ticks: 10_000,
        checkpointDays: [50, 200, 1000, 2500, 5000, 7500],
        actions: [
          {
            onDay: 10,
            label: `ungir al señalado (${highlightId})`,
            apply: (s) => anoint(s, highlightId),
          },
        ],
      };

      const result = runPersona(run, s0);

      // Esperamos haber ungido.
      expect(result.actionsExecuted).toHaveLength(1);

      const final = result.checkpoints[result.checkpoints.length - 1];
      // Si el Elegido sigue vivo y tiene descendientes, debería haber
      // acumulado Fe. Si murió en el camino, al menos hubo Fe.
      expect(final.chronicleLen).toBeGreaterThan(5);

      const dir = path.resolve(process.cwd(), 'tests/playtest/.out');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'persona-2.json'),
        JSON.stringify(result, null, 2),
      );
    },
    60_000,
  );
});
