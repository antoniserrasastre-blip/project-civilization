/**
 * Tests del pool de gratitud — v2 (diseño Gratitud v2) + legacy rate
 * ajustado y drain de silencio con gracia (Sprint Fase 5 #1).
 *
 * Cubre:
 *   - Event-driven: dominios, multiplicadores, cap diario, dedupe,
 *     dawn reset.
 *   - Legacy trickle: rate 0.1 post sub-ajuste (no cableado en
 *     simulation v2 pero exportado y testable).
 *   - Drain silencio-por-default vs silencio-elegido + gracia.
 *   - Round-trip JSON del shape ampliado.
 */

import { describe, it, expect } from 'vitest';
import {
  applyGratitudeDelta,
  applyGratitudeFromEvent,
  computeGratitudeFromEvent,
  computeGratitudeTickDelta,
  computeSilenceDrainPerDay,
  GRATITUDE_CEILING,
  GRATITUDE_DAILY_CAP,
  GRATITUDE_EVENT_VALUES,
  GRATITUDE_RATES,
  penalizeElegidoDeath,
  resetGratitudeDailyTracking,
  spendGratitude,
  SUSURRO_DOMAINS,
  type GratitudeEvent,
} from '@/lib/gratitude';
import { makeTestNPC } from '@/lib/npcs';
import { MESSAGE_INTENTS, SILENCE } from '@/lib/messages';
import { initialVillageState } from '@/lib/village';

function thrivingClan(n: number) {
  return Array.from({ length: n }, (_, i) =>
    makeTestNPC({
      id: `npc-${i}`,
      stats: { supervivencia: 80, socializacion: 50 },
    }),
  );
}

describe('Constantes', () => {
  it('ceiling positivo y mayor que cap diario', () => {
    expect(GRATITUDE_CEILING).toBe(200);
    expect(GRATITUDE_DAILY_CAP).toBe(40);
    expect(GRATITUDE_CEILING).toBeGreaterThan(GRATITUDE_DAILY_CAP);
  });

  it('valores de eventos son enteros en bandas S=2 / M=5 / L=10', () => {
    const vals = Object.values(GRATITUDE_EVENT_VALUES).map((e) => e.base);
    for (const v of vals) {
      expect(Number.isInteger(v)).toBe(true);
      expect([2, 5, 10]).toContain(v);
    }
  });

  it('cada evento tiene dominio asignado', () => {
    for (const [key, def] of Object.entries(GRATITUDE_EVENT_VALUES)) {
      expect(typeof def.domain).toBe('string');
      expect(def.domain.length).toBeGreaterThan(0);
      expect(key.length).toBeGreaterThan(0);
    }
  });

  it('SUSURRO_DOMAINS cubre los 6 intents (ESPERANZA puede estar vacío)', () => {
    for (const intent of Object.values(MESSAGE_INTENTS)) {
      expect(SUSURRO_DOMAINS[intent]).toBeDefined();
    }
  });

  it('threshold supervivencia 50 (legacy)', () => {
    expect(GRATITUDE_RATES.thrivingThreshold).toBe(50);
  });
});

describe('computeGratitudeTickDelta — legacy con y sin mensaje', () => {
  it('mensaje activo → delta positivo proporcional a NPCs thriving', () => {
    const clan = thrivingClan(10);
    const d = computeGratitudeTickDelta(clan, MESSAGE_INTENTS.CORAJE);
    expect(d).toBeCloseTo(10 * GRATITUDE_RATES.perThrivingNpcWithMessage, 5);
  });

  it('SILENCE → delta 0', () => {
    const clan = thrivingClan(10);
    expect(computeGratitudeTickDelta(clan, SILENCE)).toBe(0);
  });

  it('null → delta 0', () => {
    const clan = thrivingClan(10);
    expect(computeGratitudeTickDelta(clan, null)).toBe(0);
  });

  it('NPCs no thriving no contribuyen', () => {
    const hungryClan = Array.from({ length: 10 }, (_, i) =>
      makeTestNPC({
        id: `npc-${i}`,
        stats: { supervivencia: 20, socializacion: 50 },
      }),
    );
    expect(
      computeGratitudeTickDelta(hungryClan, MESSAGE_INTENTS.CORAJE),
    ).toBe(0);
  });

  it('muertos no contribuyen', () => {
    const npcs = [
      ...thrivingClan(5),
      makeTestNPC({
        id: 'dead',
        alive: false,
        stats: { supervivencia: 90, socializacion: 50 },
      }),
    ];
    expect(
      computeGratitudeTickDelta(npcs, MESSAGE_INTENTS.CORAJE),
    ).toBeCloseTo(5 * GRATITUDE_RATES.perThrivingNpcWithMessage, 5);
  });
});

describe('Rate ajustado legacy — Sprint Fase 5 #1', () => {
  it('perThrivingNpcWithMessage es bajo (< 0.5) para no saturar rápido', () => {
    expect(GRATITUDE_RATES.perThrivingNpcWithMessage).toBeLessThan(0.5);
    expect(GRATITUDE_RATES.perThrivingNpcWithMessage).toBeGreaterThan(0);
  });

  it('10 NPCs thriving × 1 día (24 ticks) no satura el cap 200', () => {
    const clan = thrivingClan(10);
    const perTick = computeGratitudeTickDelta(clan, MESSAGE_INTENTS.CORAJE);
    const perDay = perTick * 24;
    expect(perDay).toBeLessThan(GRATITUDE_CEILING);
  });

  it('cap (200) requiere ≥ 3 días con 10 NPCs thriving — no instantáneo', () => {
    const clan = thrivingClan(10);
    const perTick = computeGratitudeTickDelta(clan, MESSAGE_INTENTS.CORAJE);
    const perDay = perTick * 24;
    const daysToCap = GRATITUDE_CEILING / perDay;
    expect(daysToCap).toBeGreaterThanOrEqual(3);
  });

  it('primer milagro (~30) reachable sin ser grind con 14 NPCs thriving', () => {
    const clan = thrivingClan(14);
    const perTick = computeGratitudeTickDelta(clan, MESSAGE_INTENTS.CORAJE);
    const perDay = perTick * 24;
    const daysTo30 = 30 / perDay;
    expect(daysTo30).toBeGreaterThan(0);
    expect(daysTo30).toBeLessThanOrEqual(7);
  });
});

describe('Drain del silencio — distinción elegido vs default (§3.7b)', () => {
  it('silencio por default tras 7 días de gracia: drain aplica', () => {
    const v = {
      ...initialVillageState(),
      activeMessage: null,
      messageHistory: [],
      silenceGraceDaysRemaining: 0,
    };
    expect(computeSilenceDrainPerDay(v)).toBe(
      GRATITUDE_RATES.silenceDailyDrain,
    );
  });

  it('silencio por default dentro de gracia: drain NO aplica', () => {
    const v = {
      ...initialVillageState(),
      activeMessage: null,
      messageHistory: [],
      silenceGraceDaysRemaining: 3,
    };
    expect(computeSilenceDrainPerDay(v)).toBe(0);
  });

  it('silencio elegido (SILENCE): drain NO aplica (pagó 40 Fe)', () => {
    const v = {
      ...initialVillageState(),
      activeMessage: SILENCE,
      messageHistory: [{ day: 0, intent: MESSAGE_INTENTS.CORAJE }],
      silenceGraceDaysRemaining: 0,
    };
    expect(computeSilenceDrainPerDay(v)).toBe(0);
  });

  it('susurro activo (no silencio): drain NO aplica', () => {
    const v = {
      ...initialVillageState(),
      activeMessage: MESSAGE_INTENTS.CORAJE,
      silenceGraceDaysRemaining: 0,
    };
    expect(computeSilenceDrainPerDay(v)).toBe(0);
  });
});

describe('computeGratitudeFromEvent — multiplicadores de alineación', () => {
  const hungerEscape: GratitudeEvent = {
    type: 'hunger_escape',
    npcId: 'npc-1',
  };
  const discovery: GratitudeEvent = {
    type: 'resource_discovered',
    npcId: 'npc-2',
  };
  const birth: GratitudeEvent = { type: 'birth', npcId: 'child-1' };

  it('susurro afín (AUXILIO × hunger_escape) → ×1.5 sobre L=10 → 15', () => {
    expect(
      computeGratitudeFromEvent(hungerEscape, MESSAGE_INTENTS.AUXILIO),
    ).toBe(15);
  });

  it('susurro no afín (ENCUENTRO × hunger_escape) → ×0.5 sobre L=10 → 5', () => {
    expect(
      computeGratitudeFromEvent(hungerEscape, MESSAGE_INTENTS.ENCUENTRO),
    ).toBe(5);
  });

  it('CORAJE cubre supervivencia y exploración', () => {
    expect(
      computeGratitudeFromEvent(hungerEscape, MESSAGE_INTENTS.CORAJE),
    ).toBe(15);
    expect(
      computeGratitudeFromEvent(discovery, MESSAGE_INTENTS.CORAJE),
    ).toBe(3);
  });

  it('ESPERANZA → ×1.0 universal sobre cualquier evento', () => {
    expect(
      computeGratitudeFromEvent(hungerEscape, MESSAGE_INTENTS.ESPERANZA),
    ).toBe(10);
    expect(
      computeGratitudeFromEvent(birth, MESSAGE_INTENTS.ESPERANZA),
    ).toBe(10);
    expect(
      computeGratitudeFromEvent(discovery, MESSAGE_INTENTS.ESPERANZA),
    ).toBe(2);
  });

  it('SILENCE → 0', () => {
    expect(computeGratitudeFromEvent(hungerEscape, SILENCE)).toBe(0);
    expect(computeGratitudeFromEvent(birth, SILENCE)).toBe(0);
  });

  it('null (sin susurro activo) → 0', () => {
    expect(computeGratitudeFromEvent(hungerEscape, null)).toBe(0);
  });

  it('redondeo half-up determinista — S=2 × 0.5 = 1 entero', () => {
    expect(
      computeGratitudeFromEvent(discovery, MESSAGE_INTENTS.AUXILIO),
    ).toBe(1);
  });
});

describe('applyGratitudeFromEvent — suma, dedupe y cap diario', () => {
  it('suma el delta y lo refleja en gratitudeEarnedToday + gratitudeEventKeys', () => {
    const v = initialVillageState();
    const ev: GratitudeEvent = { type: 'birth', npcId: 'c1' };
    const after = applyGratitudeFromEvent(v, ev, MESSAGE_INTENTS.ENCUENTRO);
    expect(after.gratitude).toBe(v.gratitude + 15);
    expect(after.gratitudeEarnedToday).toBe(15);
    expect(after.gratitudeEventKeys).toContain('birth:c1');
  });

  it('dedupe: mismo evento sobre mismo NPC el mismo día no vuelve a sumar', () => {
    const v = initialVillageState();
    const ev: GratitudeEvent = { type: 'birth', npcId: 'c1' };
    const a = applyGratitudeFromEvent(v, ev, MESSAGE_INTENTS.ENCUENTRO);
    const b = applyGratitudeFromEvent(a, ev, MESSAGE_INTENTS.ENCUENTRO);
    expect(b.gratitude).toBe(a.gratitude);
    expect(b.gratitudeEarnedToday).toBe(a.gratitudeEarnedToday);
    expect(b.gratitudeEventKeys.length).toBe(a.gratitudeEventKeys.length);
  });

  it('mismo tipo de evento sobre distintos NPCs SÍ suma ambos', () => {
    const v = initialVillageState();
    const e1: GratitudeEvent = { type: 'hunger_escape', npcId: 'a' };
    const e2: GratitudeEvent = { type: 'hunger_escape', npcId: 'b' };
    const s1 = applyGratitudeFromEvent(v, e1, MESSAGE_INTENTS.AUXILIO);
    const s2 = applyGratitudeFromEvent(s1, e2, MESSAGE_INTENTS.AUXILIO);
    expect(s2.gratitude).toBe(v.gratitude + 30);
    expect(s2.gratitudeEventKeys.length).toBe(2);
  });

  it('cap diario 40: trunca lo que excede sin tirar', () => {
    let v = initialVillageState();
    const start = v.gratitude;
    for (const id of ['c1', 'c2', 'c3']) {
      v = applyGratitudeFromEvent(
        v,
        { type: 'birth', npcId: id },
        MESSAGE_INTENTS.ENCUENTRO,
      );
    }
    expect(v.gratitude).toBe(start + GRATITUDE_DAILY_CAP);
    expect(v.gratitudeEarnedToday).toBe(GRATITUDE_DAILY_CAP);
  });

  it('eventos globales (fuente B, sin npcId) dedupean por tipo + "global"', () => {
    const v = initialVillageState();
    const ev: GratitudeEvent = { type: 'day_without_deaths' };
    const a = applyGratitudeFromEvent(v, ev, MESSAGE_INTENTS.PACIENCIA);
    const b = applyGratitudeFromEvent(a, ev, MESSAGE_INTENTS.PACIENCIA);
    expect(b.gratitude).toBe(a.gratitude);
    expect(a.gratitudeEventKeys).toContain('day_without_deaths:global');
  });

  it('evento bajo SILENCE o null no modifica nada (ni registra key)', () => {
    const v = initialVillageState();
    const ev: GratitudeEvent = { type: 'birth', npcId: 'c1' };
    expect(applyGratitudeFromEvent(v, ev, SILENCE)).toEqual(v);
    expect(applyGratitudeFromEvent(v, ev, null)).toEqual(v);
  });

  it('al saturar techo 200, no supera el ceiling', () => {
    const v = { ...initialVillageState(), gratitude: GRATITUDE_CEILING - 3 };
    const ev: GratitudeEvent = { type: 'birth', npcId: 'c1' };
    const after = applyGratitudeFromEvent(v, ev, MESSAGE_INTENTS.ENCUENTRO);
    expect(after.gratitude).toBe(GRATITUDE_CEILING);
  });
});

describe('resetGratitudeDailyTracking — pulso al amanecer', () => {
  it('pone gratitudeEarnedToday a 0 y vacía eventKeys sin tocar pool', () => {
    const v = {
      ...initialVillageState(),
      gratitude: 75,
      gratitudeEarnedToday: 30,
      gratitudeEventKeys: ['birth:c1', 'hunger_escape:n2'],
    };
    const after = resetGratitudeDailyTracking(v);
    expect(after.gratitude).toBe(75);
    expect(after.gratitudeEarnedToday).toBe(0);
    expect(after.gratitudeEventKeys).toEqual([]);
  });

  it('tras reset, el mismo evento sobre el mismo NPC vuelve a sumar', () => {
    let v = initialVillageState();
    const ev: GratitudeEvent = { type: 'birth', npcId: 'c1' };
    v = applyGratitudeFromEvent(v, ev, MESSAGE_INTENTS.ENCUENTRO);
    const day1 = v.gratitude;
    v = resetGratitudeDailyTracking(v);
    v = applyGratitudeFromEvent(v, ev, MESSAGE_INTENTS.ENCUENTRO);
    expect(v.gratitude).toBe(day1 + 15);
  });
});

describe('applyGratitudeDelta + spendGratitude + penalizeElegidoDeath (legacy cruda)', () => {
  it('applyGratitudeDelta suma sin tocar cap diario (pérdidas y milagros no cuentan)', () => {
    const v = {
      ...initialVillageState(),
      gratitude: 100,
      gratitudeEarnedToday: 35,
    };
    const after = applyGratitudeDelta(v, -30);
    expect(after.gratitude).toBe(70);
    expect(after.gratitudeEarnedToday).toBe(35);
  });

  it('satura en CEILING y clampa en 0', () => {
    const hi = { ...initialVillageState(), gratitude: GRATITUDE_CEILING - 5 };
    expect(applyGratitudeDelta(hi, 100).gratitude).toBe(GRATITUDE_CEILING);
    const lo = { ...initialVillageState(), gratitude: 5 };
    expect(applyGratitudeDelta(lo, -100).gratitude).toBe(0);
  });

  it('spendGratitude resta si suficiente y tira si no', () => {
    const v = { ...initialVillageState(), gratitude: 50 };
    expect(spendGratitude(v, 30).gratitude).toBe(20);
    expect(() => spendGratitude(v, 80)).toThrow(/insuficiente/i);
    expect(() => spendGratitude(v, 0)).toThrow(/> 0/);
  });

  it('penalizeElegidoDeath resta 20 con clamp a 0', () => {
    const v = { ...initialVillageState(), gratitude: 30 };
    expect(penalizeElegidoDeath(v).gratitude).toBe(
      30 - GRATITUDE_RATES.elegidoDeathPenalty,
    );
    const low = { ...initialVillageState(), gratitude: 5 };
    expect(penalizeElegidoDeath(low).gratitude).toBe(0);
  });
});

describe('Round-trip JSON (§A4)', () => {
  it('VillageState con tracking de gratitud serializa sin perder forma', () => {
    let v = initialVillageState();
    v = applyGratitudeFromEvent(
      v,
      { type: 'birth', npcId: 'c1' },
      MESSAGE_INTENTS.ENCUENTRO,
    );
    v = applyGratitudeFromEvent(
      v,
      { type: 'hunger_escape', npcId: 'n2' },
      MESSAGE_INTENTS.AUXILIO,
    );
    const clone = JSON.parse(JSON.stringify(v));
    expect(clone).toEqual(v);
    expect(Array.isArray(clone.gratitudeEventKeys)).toBe(true);
  });
});
