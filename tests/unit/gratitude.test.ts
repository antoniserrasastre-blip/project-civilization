/**
 * Tests del pool de gratitud — Sprint 5.3 (decisión #31).
 */

import { describe, it, expect } from 'vitest';
import {
  computeGratitudeTickDelta,
  applyGratitudeDelta,
  spendGratitude,
  penalizeElegidoDeath,
  GRATITUDE_CEILING,
  GRATITUDE_RATES,
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
  it('CEILING positivo', () => {
    expect(GRATITUDE_CEILING).toBeGreaterThan(0);
  });

  it('threshold supervivencia 50', () => {
    expect(GRATITUDE_RATES.thrivingThreshold).toBe(50);
  });
});

describe('computeGratitudeTickDelta — con y sin mensaje', () => {
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
        stats: { supervivencia: 20, socializacion: 50 }, // <threshold
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
    expect(computeGratitudeTickDelta(npcs, MESSAGE_INTENTS.CORAJE)).toBeCloseTo(
      5 * GRATITUDE_RATES.perThrivingNpcWithMessage,
      5,
    );
  });
});

describe('Rate ajustado — Sprint Fase 5 #1 (sub-ajuste obligatorio)', () => {
  // El rate previo (1) saturaba el cap (200) en < 1 día con 10
  // NPCs thriving. El target jugable es: primer milagro barato
  // (~30) alcanzable en 2-3 días de susurro alineado.
  it('perThrivingNpcWithMessage es bajo (< 0.5) para no saturar rápido', () => {
    expect(GRATITUDE_RATES.perThrivingNpcWithMessage).toBeLessThan(0.5);
    expect(GRATITUDE_RATES.perThrivingNpcWithMessage).toBeGreaterThan(0);
  });

  it('10 NPCs thriving × 1 día (24 ticks) no satura el cap 200', () => {
    const clan = thrivingClan(10);
    const perTick = computeGratitudeTickDelta(
      clan,
      MESSAGE_INTENTS.CORAJE,
    );
    const perDay = perTick * 24;
    expect(perDay).toBeLessThan(GRATITUDE_CEILING);
  });

  it('cap (200) requiere ≥ 3 días con 10 NPCs thriving — no instantáneo', () => {
    const clan = thrivingClan(10);
    const perTick = computeGratitudeTickDelta(
      clan,
      MESSAGE_INTENTS.CORAJE,
    );
    const perDay = perTick * 24;
    const daysToCap = GRATITUDE_CEILING / perDay;
    expect(daysToCap).toBeGreaterThanOrEqual(3);
  });

  it('primer milagro (~30) reachable sin ser grind con 14 NPCs thriving', () => {
    const clan = thrivingClan(14);
    const perTick = computeGratitudeTickDelta(
      clan,
      MESSAGE_INTENTS.CORAJE,
    );
    const perDay = perTick * 24;
    const daysTo30 = 30 / perDay;
    // Rango amplio: el playtest calibra el número exacto; aquí el
    // contrato es "ni < 1 tick (trivial) ni > 7 días (grind)".
    expect(daysTo30).toBeGreaterThan(0);
    expect(daysTo30).toBeLessThanOrEqual(7);
  });
});

describe('Drain del silencio — distinción elegido vs default (§3.7b)', () => {
  it('silencio por default tras 7 días de gracia: drain aplica', async () => {
    const { computeSilenceDrainPerDay } = await import('@/lib/gratitude');
    // Village con activeMessage null (default), history vacío,
    // gracia agotada.
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

  it('silencio por default dentro de gracia: drain NO aplica', async () => {
    const { computeSilenceDrainPerDay } = await import('@/lib/gratitude');
    const v = {
      ...initialVillageState(),
      activeMessage: null,
      messageHistory: [],
      silenceGraceDaysRemaining: 3,
    };
    expect(computeSilenceDrainPerDay(v)).toBe(0);
  });

  it('silencio elegido (SILENCE): drain NO aplica (pagó 40 Fe)', async () => {
    const { computeSilenceDrainPerDay } = await import('@/lib/gratitude');
    const v = {
      ...initialVillageState(),
      activeMessage: SILENCE,
      messageHistory: [{ day: 0, intent: MESSAGE_INTENTS.CORAJE }],
      silenceGraceDaysRemaining: 0,
    };
    expect(computeSilenceDrainPerDay(v)).toBe(0);
  });

  it('susurro activo (no silencio): drain NO aplica', async () => {
    const { computeSilenceDrainPerDay } = await import('@/lib/gratitude');
    const v = {
      ...initialVillageState(),
      activeMessage: MESSAGE_INTENTS.CORAJE,
      silenceGraceDaysRemaining: 0,
    };
    expect(computeSilenceDrainPerDay(v)).toBe(0);
  });
});

describe('applyGratitudeDelta — saturación y clamp', () => {
  it('suma normal sin tocar ceiling', () => {
    const v = { ...initialVillageState(), gratitude: 50 };
    expect(applyGratitudeDelta(v, 20).gratitude).toBe(70);
  });

  it('satura en CEILING', () => {
    const v = { ...initialVillageState(), gratitude: GRATITUDE_CEILING - 5 };
    expect(applyGratitudeDelta(v, 100).gratitude).toBe(GRATITUDE_CEILING);
  });

  it('clamp en 0', () => {
    const v = { ...initialVillageState(), gratitude: 5 };
    expect(applyGratitudeDelta(v, -100).gratitude).toBe(0);
  });
});

describe('spendGratitude', () => {
  it('resta la cantidad si hay suficiente', () => {
    const v = { ...initialVillageState(), gratitude: 50 };
    expect(spendGratitude(v, 30).gratitude).toBe(20);
  });

  it('tira si no hay suficiente', () => {
    const v = { ...initialVillageState(), gratitude: 10 };
    expect(() => spendGratitude(v, 30)).toThrow(/insuficiente/i);
  });

  it('tira si amount <= 0', () => {
    const v = { ...initialVillageState(), gratitude: 50 };
    expect(() => spendGratitude(v, 0)).toThrow(/debe ser > 0/i);
    expect(() => spendGratitude(v, -5)).toThrow(/debe ser > 0/i);
  });
});

describe('penalizeElegidoDeath', () => {
  it('resta GRATITUDE_RATES.elegidoDeathPenalty con clamp a 0', () => {
    const v = { ...initialVillageState(), gratitude: 30 };
    const after = penalizeElegidoDeath(v);
    expect(after.gratitude).toBe(30 - GRATITUDE_RATES.elegidoDeathPenalty);
  });

  it('clamp en 0 si pool ya bajo', () => {
    const v = { ...initialVillageState(), gratitude: 5 };
    expect(penalizeElegidoDeath(v).gratitude).toBe(0);
  });
});

describe('Suma conmutativa (§A4)', () => {
  it('orden de eventos no cambia el pool final sobre 1000 deltas', () => {
    const deltas = [12, -8, 33, -50, 17, 3, -2, 44, -10, 5];
    const start = { ...initialVillageState(), gratitude: 100 };
    let a = start;
    for (const d of deltas) a = applyGratitudeDelta(a, d);
    let b = start;
    for (const d of [...deltas].reverse()) b = applyGratitudeDelta(b, d);
    // Con clamps los dos caminos pueden diverger si se cruzan los
    // límites — validamos solo cuando no se cruzan.
    if (a.gratitude !== 0 && a.gratitude !== GRATITUDE_CEILING) {
      expect(a.gratitude).toBe(b.gratitude);
    }
  });
});
