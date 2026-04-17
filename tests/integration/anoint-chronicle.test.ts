/**
 * Integración: ungimiento + crónica.
 *
 * Valida el flujo que hace el handler de la UI (app/page.tsx):
 *   canAnoint → anoint → narrateAnointment → appendChronicle.
 *
 * El objetivo es asegurar que los módulos encajan correctamente, y que
 * un ungimiento real deja huella en el estado del mundo tal como lo
 * espera el jugador.
 */

import { describe, it, expect } from 'vitest';
import { initialState } from '@/lib/world-state';
import { canAnoint, anoint } from '@/lib/anoint';
import { appendChronicle, narrateAnointment } from '@/lib/chronicle';

describe('integración: ungimiento produce entrada de crónica', () => {
  it('el flujo completo deja al NPC como Elegido y narra el evento', () => {
    const s = initialState(42);
    const target = s.npcs[0];

    const check = canAnoint(s, target.id);
    expect(check).toEqual({ ok: true });

    const afterAnoint = anoint(s, target.id);
    const entry = narrateAnointment(afterAnoint, target);
    const next = appendChronicle(afterAnoint, entry);

    expect(next.player_god.chosen_ones).toContain(target.id);
    expect(next.chronicle.at(-1)?.text).toContain(target.name);
    expect(next.chronicle.at(-1)?.text).toMatch(/dios/i);
  });

  it('dos ungimientos consecutivos producen dos entradas de crónica', () => {
    let s = initialState(42);
    for (const target of s.npcs.slice(0, 2)) {
      const check = canAnoint(s, target.id);
      if (!check.ok) throw new Error(`inesperado: ${check.reason}`);
      const afterAnoint = anoint(s, target.id);
      s = appendChronicle(afterAnoint, narrateAnointment(afterAnoint, target));
    }
    expect(s.player_god.chosen_ones).toHaveLength(2);
    expect(s.chronicle).toHaveLength(2);
  });

  it('el segundo ungimiento del mismo NPC es rechazado con already_chosen', () => {
    const s = initialState(42);
    const target = s.npcs[0];
    const s2 = anoint(s, target.id);
    expect(canAnoint(s2, target.id)).toEqual({
      ok: false,
      reason: 'already_chosen',
    });
  });
});
