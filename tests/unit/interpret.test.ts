/**
 * Tests del motor de interpretación — Sprint 5.2 (Pilar 1).
 */

import { describe, it, expect } from 'vitest';
import { interpretIntent, type NPCBehaviorBias } from '@/lib/interpret';
import { MESSAGE_INTENTS, SILENCE } from '@/lib/messages';
import { makeTestNPC, LINAJE } from '@/lib/npcs';

function dist(a: NPCBehaviorBias, b: NPCBehaviorBias): number {
  return (
    Math.abs(a.hungerFocus - b.hungerFocus) +
    Math.abs(a.riskAppetite - b.riskAppetite) +
    Math.abs(a.socialGravity - b.socialGravity) +
    Math.abs(a.explorationPush - b.explorationPush) +
    Math.abs(a.restraint - b.restraint)
  );
}

describe('interpretIntent — Pilar 1: mismo intent, perfiles distintos → bias distinto', () => {
  it('supervivencia-alta vs supervivencia-baja divergen con AUXILIO', () => {
    const strong = makeTestNPC({
      id: 'strong',
      stats: { supervivencia: 90, socializacion: 50 },
    });
    const weak = makeTestNPC({
      id: 'weak',
      stats: { supervivencia: 10, socializacion: 50 },
    });
    const a = interpretIntent(MESSAGE_INTENTS.AUXILIO, strong);
    const b = interpretIntent(MESSAGE_INTENTS.AUXILIO, weak);
    expect(dist(a, b)).toBeGreaterThan(0.1);
    // Débil pone más peso en hungerFocus.
    expect(b.hungerFocus).toBeGreaterThan(a.hungerFocus);
  });

  it('linaje mestral (explorador) sube explorationPush frente a base', () => {
    const base = makeTestNPC({ id: 'b', linaje: LINAJE.TRAMUNTANA });
    const mestral = makeTestNPC({ id: 'm', linaje: LINAJE.MESTRAL });
    const a = interpretIntent(MESSAGE_INTENTS.CORAJE, base);
    const b = interpretIntent(MESSAGE_INTENTS.CORAJE, mestral);
    expect(b.explorationPush).toBeGreaterThan(a.explorationPush);
  });

  it('linaje gregal sube riskAppetite', () => {
    const base = makeTestNPC({ id: 'b', linaje: LINAJE.TRAMUNTANA });
    const gregal = makeTestNPC({ id: 'g', linaje: LINAJE.GREGAL });
    const a = interpretIntent(MESSAGE_INTENTS.CORAJE, base);
    const b = interpretIntent(MESSAGE_INTENTS.CORAJE, gregal);
    expect(b.riskAppetite).toBeGreaterThan(a.riskAppetite);
  });

  it('linaje garbi sube restraint', () => {
    const base = makeTestNPC({ id: 'b', linaje: LINAJE.TRAMUNTANA });
    const garbi = makeTestNPC({ id: 'g', linaje: LINAJE.GARBI });
    const a = interpretIntent(MESSAGE_INTENTS.PACIENCIA, base);
    const b = interpretIntent(MESSAGE_INTENTS.PACIENCIA, garbi);
    expect(b.restraint).toBeGreaterThan(a.restraint);
  });
});

describe('interpretIntent — rango [0, 1] en todas las dimensiones', () => {
  it('clamp en ambos extremos', () => {
    const xFull = makeTestNPC({
      id: 'x',
      stats: { supervivencia: 100, socializacion: 100 },
    });
    const xEmpty = makeTestNPC({
      id: 'y',
      stats: { supervivencia: 0, socializacion: 0 },
    });
    for (const intent of [
      MESSAGE_INTENTS.AUXILIO,
      MESSAGE_INTENTS.CORAJE,
      MESSAGE_INTENTS.PACIENCIA,
      MESSAGE_INTENTS.ENCUENTRO,
      MESSAGE_INTENTS.RENUNCIA,
      MESSAGE_INTENTS.ESPERANZA,
    ]) {
      for (const npc of [xFull, xEmpty]) {
        const b = interpretIntent(intent, npc);
        for (const v of Object.values(b)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });
});

describe('interpretIntent — silence y null', () => {
  it('silence → bias todo en 0', () => {
    const n = makeTestNPC({ id: 'x' });
    const b = interpretIntent(SILENCE, n);
    expect(b).toEqual({
      hungerFocus: 0,
      riskAppetite: 0,
      socialGravity: 0,
      explorationPush: 0,
      restraint: 0,
    });
  });

  it('null (sin mensaje activo) → bias 0', () => {
    const n = makeTestNPC({ id: 'x' });
    const b = interpretIntent(null, n);
    expect(b.hungerFocus).toBe(0);
  });
});

describe('interpretIntent — determinismo + pureza', () => {
  it('mismo input → mismo output', () => {
    const n = makeTestNPC({ id: 'x' });
    expect(interpretIntent(MESSAGE_INTENTS.CORAJE, n)).toEqual(
      interpretIntent(MESSAGE_INTENTS.CORAJE, n),
    );
  });

  it('no muta el NPC', () => {
    const n = makeTestNPC({ id: 'x' });
    const snap = JSON.stringify(n);
    interpretIntent(MESSAGE_INTENTS.CORAJE, n);
    expect(JSON.stringify(n)).toBe(snap);
  });
});
