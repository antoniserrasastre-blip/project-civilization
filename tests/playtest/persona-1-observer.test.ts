/**
 * Playtest Persona 1 — "El observador".
 *
 * Arquetipo: jugador que carga la partida, pulsa 100×, y NO hace nada.
 * Nunca unge, nunca concede don, nunca maldice. Solo mira.
 *
 * Pregunta que responde: ¿el juego sostiene 10k ticks (~1h a 1×, ~20s
 * a 100×) sin intervención? ¿El mundo cambia (Pillar 2)? ¿La partida
 * llega a algún estado terminal o se estanca?
 */

import { describe, it, expect } from 'vitest';
import { initialState } from '@/lib/world-state';
import { runPersona, type PersonaRun } from './harness';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Playtest · Persona 1 — El observador', () => {
  it(
    'corre 10k ticks sin intervención y deja telemetría',
    () => {
      const seed = 42;
      const run: PersonaRun = {
        name: 'observador',
        seed,
        group: 'tramuntana',
        ticks: 10_000,
        checkpointDays: [100, 500, 1000, 2500, 5000, 7500],
        actions: [],
      };
      const s0 = initialState(seed, { playerGroupId: run.group });
      const result = runPersona(run, s0);

      // Contratos suaves: la partida no debe extinguirse a 10k ticks.
      expect(result.checkpoints[result.checkpoints.length - 1].alive).toBeGreaterThan(0);
      // Pillar 2: el mundo cambia (alguna crónica).
      expect(
        result.checkpoints[result.checkpoints.length - 1].chronicleLen,
      ).toBeGreaterThan(0);

      // Volcar resultado a disco para el reporte agregado.
      const dir = path.resolve(process.cwd(), 'tests/playtest/.out');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'persona-1.json'),
        JSON.stringify(result, null, 2),
      );
    },
    60_000,
  );
});
