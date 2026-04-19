/**
 * Tests del mensaje diario — Sprint 5.1.
 */

import { describe, it, expect } from 'vitest';
import {
  MESSAGE_INTENTS,
  SILENCE,
  VALID_CHOICES,
  isDawn,
  awaitsMessage,
  selectIntent,
  archiveAtDawn,
} from '@/lib/messages';
import { TICKS_PER_DAY } from '@/lib/resources';
import { initialVillageState } from '@/lib/village';

describe('Constantes (decisión #30.a)', () => {
  it('MESSAGE_INTENTS tiene las 6 + SILENCE = 7 VALID_CHOICES', () => {
    expect(Object.values(MESSAGE_INTENTS)).toHaveLength(6);
    expect(VALID_CHOICES).toHaveLength(7);
    expect(VALID_CHOICES).toContain(SILENCE);
  });

  it('las 6 intenciones son las del diseño', () => {
    expect(Object.values(MESSAGE_INTENTS).sort()).toEqual([
      'auxilio',
      'coraje',
      'encuentro',
      'esperanza',
      'paciencia',
      'renuncia',
    ]);
  });
});

describe('isDawn', () => {
  it('true en múltiplos de TICKS_PER_DAY', () => {
    expect(isDawn(0)).toBe(true);
    expect(isDawn(TICKS_PER_DAY)).toBe(true);
    expect(isDawn(TICKS_PER_DAY - 1)).toBe(false);
    expect(isDawn(1)).toBe(false);
  });
});

describe('awaitsMessage', () => {
  it('true en amanecer sin activeMessage', () => {
    const v = initialVillageState();
    expect(awaitsMessage(v, 0)).toBe(true);
    expect(awaitsMessage(v, TICKS_PER_DAY)).toBe(true);
  });

  it('false en amanecer con activeMessage ya elegido', () => {
    const v = { ...initialVillageState(), activeMessage: MESSAGE_INTENTS.CORAJE };
    expect(awaitsMessage(v, 0)).toBe(false);
  });

  it('false en mitad de día', () => {
    const v = initialVillageState();
    expect(awaitsMessage(v, 5)).toBe(false);
  });
});

describe('selectIntent — pureza + validación', () => {
  it('guarda intent válido sin mutar input', () => {
    const v = initialVillageState();
    const next = selectIntent(v, MESSAGE_INTENTS.CORAJE);
    expect(next.activeMessage).toBe('coraje');
    expect(v.activeMessage).toBeNull(); // no mutación
  });

  it('acepta silence', () => {
    const v = initialVillageState();
    const next = selectIntent(v, SILENCE);
    expect(next.activeMessage).toBe('silence');
  });

  it('rechaza intent inválido', () => {
    const v = initialVillageState();
    expect(() => selectIntent(v, 'foo' as never)).toThrow(/inválido/i);
  });
});

describe('archiveAtDawn — rotación diaria', () => {
  it('en amanecer siguiente con activeMessage → archiva y limpia', () => {
    const v1 = { ...initialVillageState(), activeMessage: 'coraje' as const };
    const v2 = archiveAtDawn(v1, TICKS_PER_DAY);
    expect(v2.activeMessage).toBeNull();
    expect(v2.messageHistory).toEqual([{ day: 0, intent: 'coraje' }]);
  });

  it('no-op si no amanecer', () => {
    const v1 = { ...initialVillageState(), activeMessage: 'coraje' as const };
    const v2 = archiveAtDawn(v1, 5);
    expect(v2).toEqual(v1);
  });

  it('no-op en tick 0 (no ha pasado día aún)', () => {
    const v1 = { ...initialVillageState(), activeMessage: 'coraje' as const };
    expect(archiveAtDawn(v1, 0)).toEqual(v1);
  });

  it('history preserva orden ascendente por day', () => {
    let v = initialVillageState();
    v = selectIntent(v, 'coraje');
    v = archiveAtDawn(v, TICKS_PER_DAY);
    v = selectIntent(v, 'paciencia');
    v = archiveAtDawn(v, TICKS_PER_DAY * 2);
    v = selectIntent(v, 'esperanza');
    v = archiveAtDawn(v, TICKS_PER_DAY * 3);
    expect(v.messageHistory.map((m) => m.day)).toEqual([0, 1, 2]);
    expect(v.messageHistory.map((m) => m.intent)).toEqual([
      'coraje',
      'paciencia',
      'esperanza',
    ]);
  });
});

describe('§A4 — no consume PRNG', () => {
  it('selectIntent no recibe ni devuelve prng', () => {
    const v = initialVillageState();
    const result = selectIntent(v, 'coraje');
    expect('prng' in result).toBe(false);
  });
});
