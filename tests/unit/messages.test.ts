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
  archiveOnChange,
  applyPlayerIntent,
} from '@/lib/messages';
import { TICKS_PER_DAY } from '@/lib/resources';
import { initialVillageState } from '@/lib/village';
import { FAITH_COST_CHANGE, FAITH_COST_SILENCE, FAITH_INITIAL } from '@/lib/faith';

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

describe('awaitsMessage — deprecado tras §3.7 (susurro persistente)', () => {
  // El susurro no se fuerza en cada amanecer — el jugador decide
  // cuándo hablar. El helper sigue existiendo sólo para compat
  // transitoria; su valor ya no rige el UI.
  it('sigue siendo puro', () => {
    const v = initialVillageState();
    expect(typeof awaitsMessage(v, 0)).toBe('boolean');
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

describe('archiveOnChange — rotación al cambiar (§3.7 susurro persistente)', () => {
  it('al cambiar de intent → archiva el activo previo y setea el nuevo', () => {
    const v1 = {
      ...initialVillageState(),
      activeMessage: 'coraje' as const,
      faith: 100,
    };
    const v2 = archiveOnChange(v1, 'paciencia', 10);
    expect(v2.activeMessage).toBe('paciencia');
    expect(v2.messageHistory).toEqual([{ day: 0, intent: 'coraje' }]);
  });

  it('mismo intent → no-op (no archiva)', () => {
    const v1 = {
      ...initialVillageState(),
      activeMessage: 'coraje' as const,
    };
    const v2 = archiveOnChange(v1, 'coraje', 10);
    expect(v2).toEqual(v1);
  });

  it('activeMessage null → no archiva nada, setea el nuevo', () => {
    const v1 = initialVillageState();
    const v2 = archiveOnChange(v1, 'coraje', 5);
    expect(v2.activeMessage).toBe('coraje');
    expect(v2.messageHistory).toEqual([]);
  });

  it('day del archivado se deriva del tick recibido', () => {
    const v1 = {
      ...initialVillageState(),
      activeMessage: 'coraje' as const,
      faith: 100,
    };
    const v2 = archiveOnChange(v1, 'paciencia', TICKS_PER_DAY * 4 + 3);
    expect(v2.messageHistory[0].day).toBe(4);
  });
});

describe('applyPlayerIntent — orquesta coste Fe + archive (§3.7 / §3.7b)', () => {
  it('primer susurro (activeMessage===null, history vacío) es gratis', () => {
    const v1 = initialVillageState();
    const v2 = applyPlayerIntent(v1, 'coraje', 0);
    expect(v2.activeMessage).toBe('coraje');
    expect(v2.faith).toBe(v1.faith);
    expect(v2.messageHistory).toEqual([]);
  });

  it('cambio de intent descuenta FAITH_COST_CHANGE (80) y archiva', () => {
    const v1 = { ...initialVillageState(), activeMessage: 'coraje' as const, faith: 100 };
    const v2 = applyPlayerIntent(v1, 'paciencia', TICKS_PER_DAY);
    expect(v2.activeMessage).toBe('paciencia');
    expect(v2.faith).toBe(100 - FAITH_COST_CHANGE);
    expect(v2.messageHistory).toEqual([{ day: 1, intent: 'coraje' }]);
  });

  it('silencio elegido descuenta FAITH_COST_SILENCE (40) y archiva', () => {
    const v1 = { ...initialVillageState(), activeMessage: 'coraje' as const, faith: 80 };
    const v2 = applyPlayerIntent(v1, SILENCE, TICKS_PER_DAY);
    expect(v2.activeMessage).toBe(SILENCE);
    expect(v2.faith).toBe(80 - FAITH_COST_SILENCE);
    expect(v2.messageHistory).toEqual([{ day: 1, intent: 'coraje' }]);
  });

  it('mismo intent → no-op, no descuenta Fe', () => {
    const v1 = { ...initialVillageState(), activeMessage: 'coraje' as const, faith: 50 };
    const v2 = applyPlayerIntent(v1, 'coraje', 10);
    expect(v2.faith).toBe(50);
    expect(v2.messageHistory).toEqual([]);
  });

  it('sin Fe suficiente tira (excepto primer susurro)', () => {
    const v1 = { ...initialVillageState(), activeMessage: 'coraje' as const, faith: 10 };
    expect(() => applyPlayerIntent(v1, 'paciencia', 5)).toThrow(/insuficiente/i);
  });

  it('primer susurro gratis se cumple aunque faith < 30', () => {
    const v1 = { ...initialVillageState(), faith: 0 };
    const v2 = applyPlayerIntent(v1, 'coraje', 0);
    expect(v2.activeMessage).toBe('coraje');
    expect(v2.faith).toBe(0);
  });
});

describe('selectIntent — API previa (no altera Fe, usada en edición)', () => {
  it('sigue disponible para mutación directa no transaccional', () => {
    const v = initialVillageState();
    const next = selectIntent(v, 'coraje');
    expect(next.activeMessage).toBe('coraje');
    expect(next.faith).toBe(FAITH_INITIAL);
  });
});

describe('§A4 — no consume PRNG', () => {
  it('selectIntent no recibe ni devuelve prng', () => {
    const v = initialVillageState();
    const result = selectIntent(v, 'coraje');
    expect('prng' in result).toBe(false);
  });
});
