/**
 * Tests de lib/influence.ts — heatmap de presencia territorial.
 *
 * Contrato:
 *   - emptyInfluenceGrid devuelve array de ceros de tamaño correcto.
 *   - tickInfluence es pura y determinista (§A4).
 *   - Los NPCs vivos dejan huella en su posición y alrededores.
 *   - Los NPCs muertos no contribuyen.
 *   - La influencia decae cada tick (sin NPCs → converge a 0).
 *   - Elegidos aportan más influencia que Ciudadanos.
 *   - Round-trip JSON del grid.
 */

import { describe, it, expect } from 'vitest';
import {
  emptyInfluenceGrid,
  tickInfluence,
  INFLUENCE_MAX,
  INFLUENCE_DECAY_RATE,
  INFLUENCE_CASTA_WEIGHT,
  INFLUENCE_RADIUS,
} from '@/lib/influence';
import { makeTestNPC } from '@/lib/npcs';
import { CASTA } from '@/lib/npcs';

const W = 20;
const H = 20;

describe('emptyInfluenceGrid', () => {
  it('tiene tamaño width * height', () => {
    const g = emptyInfluenceGrid(W, H);
    expect(g).toHaveLength(W * H);
  });

  it('todos los valores son 0', () => {
    const g = emptyInfluenceGrid(W, H);
    expect(g.every((v) => v === 0)).toBe(true);
  });

  it('round-trip JSON', () => {
    const g = emptyInfluenceGrid(W, H);
    expect(JSON.parse(JSON.stringify(g))).toEqual(g);
  });
});

describe('tickInfluence — pureza y determinismo', () => {
  it('no muta el grid de entrada', () => {
    const grid = emptyInfluenceGrid(W, H);
    const npc = makeTestNPC({ id: 'n1', position: { x: 5, y: 5 } });
    tickInfluence(grid, [npc], W, H);
    expect(grid.every((v) => v === 0)).toBe(true);
  });

  it('devuelve un array nuevo de igual longitud', () => {
    const grid = emptyInfluenceGrid(W, H);
    const npc = makeTestNPC({ id: 'n1', position: { x: 5, y: 5 } });
    const next = tickInfluence(grid, [npc], W, H);
    expect(next).not.toBe(grid);
    expect(next).toHaveLength(W * H);
  });

  it('determinismo: mismo input → mismo output', () => {
    const grid = emptyInfluenceGrid(W, H);
    const npc = makeTestNPC({ id: 'n1', position: { x: 5, y: 5 } });
    const a = tickInfluence(grid, [npc], W, H);
    const b = tickInfluence(grid, [npc], W, H);
    expect(a).toEqual(b);
  });

  it('round-trip JSON del grid resultante', () => {
    const grid = emptyInfluenceGrid(W, H);
    const npc = makeTestNPC({ id: 'n1', position: { x: 5, y: 5 } });
    const next = tickInfluence(grid, [npc], W, H);
    expect(JSON.parse(JSON.stringify(next))).toEqual(next);
  });

  it('todos los valores son enteros', () => {
    const grid = emptyInfluenceGrid(W, H);
    const npc = makeTestNPC({ id: 'n1', position: { x: 5, y: 5 } });
    const next = tickInfluence(grid, [npc], W, H);
    expect(next.every((v) => Number.isInteger(v))).toBe(true);
  });

  it('todos los valores están en [0, INFLUENCE_MAX]', () => {
    // Saturar el grid con muchos ticks
    let grid = emptyInfluenceGrid(W, H);
    const npc = makeTestNPC({ id: 'n1', position: { x: 5, y: 5 } });
    for (let i = 0; i < 500; i++) {
      grid = tickInfluence(grid, [npc], W, H);
    }
    expect(grid.every((v) => v >= 0 && v <= INFLUENCE_MAX)).toBe(true);
  });
});

describe('tickInfluence — presencia NPC', () => {
  it('un NPC vivo incrementa la influencia en su posición', () => {
    const grid = emptyInfluenceGrid(W, H);
    const npc = makeTestNPC({ id: 'n1', position: { x: 5, y: 5 } });
    const next = tickInfluence(grid, [npc], W, H);
    const idx = 5 * W + 5;
    expect(next[idx]).toBeGreaterThan(0);
  });

  it('un NPC vivo incrementa tiles dentro de INFLUENCE_RADIUS', () => {
    const grid = emptyInfluenceGrid(W, H);
    const npc = makeTestNPC({ id: 'n1', position: { x: 10, y: 10 } });
    const next = tickInfluence(grid, [npc], W, H);
    // Tiles a distancia ≤ INFLUENCE_RADIUS deben tener influencia > 0
    for (let dy = -INFLUENCE_RADIUS; dy <= INFLUENCE_RADIUS; dy++) {
      for (let dx = -INFLUENCE_RADIUS; dx <= INFLUENCE_RADIUS; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > INFLUENCE_RADIUS) continue;
        const idx = (10 + dy) * W + (10 + dx);
        expect(next[idx]).toBeGreaterThan(0);
      }
    }
  });

  it('un NPC muerto NO incrementa la influencia', () => {
    const grid = emptyInfluenceGrid(W, H);
    const npc = makeTestNPC({ id: 'n1', position: { x: 5, y: 5 }, alive: false });
    const next = tickInfluence(grid, [npc], W, H);
    expect(next.every((v) => v === 0)).toBe(true);
  });

  it('la influencia en el tile del NPC es mayor que en los bordes del radio', () => {
    const grid = emptyInfluenceGrid(W, H);
    const npc = makeTestNPC({ id: 'n1', position: { x: 10, y: 10 } });
    const next = tickInfluence(grid, [npc], W, H);
    const center = next[10 * W + 10];
    const edge = next[10 * W + (10 + INFLUENCE_RADIUS)];
    expect(center).toBeGreaterThan(edge);
  });
});

describe('tickInfluence — decaimiento', () => {
  it('sin NPCs la influencia decae hacia 0', () => {
    let grid = emptyInfluenceGrid(W, H);
    // Poner influencia inicial
    const npc = makeTestNPC({ id: 'n1', position: { x: 5, y: 5 } });
    for (let i = 0; i < 10; i++) {
      grid = tickInfluence(grid, [npc], W, H);
    }
    const peakSum = grid.reduce((s, v) => s + v, 0);
    // Dejar decaer sin NPCs
    for (let i = 0; i < 200; i++) {
      grid = tickInfluence(grid, [], W, H);
    }
    const decayedSum = grid.reduce((s, v) => s + v, 0);
    expect(decayedSum).toBeLessThan(peakSum);
    expect(decayedSum).toBe(0);
  });

  it('la tasa de decay es INFLUENCE_DECAY_RATE / 1000 por tick', () => {
    // Grid con un solo tile a 1000
    const grid = new Array(W * H).fill(0);
    grid[0] = 1000;
    const next = tickInfluence(grid, [], W, H);
    const expected = Math.floor(1000 * INFLUENCE_DECAY_RATE / 1000);
    expect(next[0]).toBe(expected);
  });
});

describe('tickInfluence — peso por casta', () => {
  it('un Elegido genera más influencia que un Ciudadano en la misma posición', () => {
    const pos = { x: 10, y: 10 };
    const gridBase = emptyInfluenceGrid(W, H);

    const elegido = makeTestNPC({ id: 'e1', position: pos, casta: CASTA.ELEGIDO });
    const ciudadano = makeTestNPC({ id: 'c1', position: pos, casta: CASTA.CIUDADANO });

    const withElegido = tickInfluence(gridBase, [elegido], W, H);
    const withCiudadano = tickInfluence(gridBase, [ciudadano], W, H);

    const idxCenter = pos.y * W + pos.x;
    expect(withElegido[idxCenter]).toBeGreaterThan(withCiudadano[idxCenter]);
  });

  it('INFLUENCE_CASTA_WEIGHT tiene elegido > ciudadano', () => {
    expect(INFLUENCE_CASTA_WEIGHT[CASTA.ELEGIDO]).toBeGreaterThan(
      INFLUENCE_CASTA_WEIGHT[CASTA.CIUDADANO],
    );
  });
});
