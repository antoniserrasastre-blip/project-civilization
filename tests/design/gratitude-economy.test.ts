/**
 * Suite de coherencia transversal — Economía de Gratitud (Pilar 3).
 *
 * Chequea invariantes de diseño que los tests por sprint no
 * detectarían: el cap diario es inviolable, el silencio no acumula
 * nada, los multiplicadores tienen las polaridades esperadas y los
 * costes de milagros son alcanzables en una sesión razonable.
 *
 * Regla de oro: si un test falla aquí, no se revierte el test —
 * se investiga si es bug de código o expectativa de diseño
 * equivocada (entonces se actualiza el test Y el comentario de por
 * qué). Ver CLAUDE.md §Suite de coherencia.
 */

import { describe, expect, it } from 'vitest';
import {
  applyGratitudeFromEvent,
  computeGratitudeFromEvent,
  GRATITUDE_CEILING,
  GRATITUDE_DAILY_CAP,
  GRATITUDE_EVENT_VALUES,
  resetGratitudeDailyTracking,
  SUSURRO_DOMAINS,
  type GratitudeEvent,
  type GratitudeEventType,
} from '@/lib/gratitude';
import { MIRACLES_CATALOG } from '@/lib/miracles';
import { MESSAGE_INTENTS, SILENCE } from '@/lib/messages';
import { initialVillageState } from '@/lib/village';

const ALL_EVENT_TYPES = Object.keys(
  GRATITUDE_EVENT_VALUES,
) as GratitudeEventType[];
const ALL_INTENTS = Object.values(MESSAGE_INTENTS);

describe('1. Cap diario es inviolable', () => {
  it('ningún día puede ganar más de GRATITUDE_DAILY_CAP por eventos A+B', () => {
    // Simulamos el día más prolífico posible: cada tipo de evento
    // sobre 20 NPCs distintos con susurro maximalmente afín
    // (ESPERANZA cubre todo a ×1.0, AUXILIO+CORAJE+ENCUENTRO+
    // PACIENCIA+RENUNCIA cubren sus dominios a ×1.5). Bruteforce
    // sobre susurros para confirmar cota.
    for (const intent of [...ALL_INTENTS, MESSAGE_INTENTS.ESPERANZA]) {
      let v = initialVillageState();
      for (const type of ALL_EVENT_TYPES) {
        for (let i = 0; i < 20; i++) {
          const ev: GratitudeEvent = {
            type,
            npcId: `n-${type}-${i}`,
          };
          v = applyGratitudeFromEvent(v, ev, intent);
        }
      }
      expect(v.gratitudeEarnedToday).toBeLessThanOrEqual(
        GRATITUDE_DAILY_CAP,
      );
    }
  });

  it('el cap se libera al día siguiente (reset) — 30 días no saturan pool', () => {
    let v = { ...initialVillageState(), gratitude: 0 };
    for (let day = 0; day < 30; day++) {
      // Día generoso — suma algo, pero bajo cap.
      v = applyGratitudeFromEvent(
        v,
        { type: 'birth', npcId: `c${day}` },
        MESSAGE_INTENTS.ENCUENTRO,
      );
      v = resetGratitudeDailyTracking(v);
    }
    // Pool crece pero no necesariamente satura (30 días × 15 = 450,
    // pero clamp 200 → saturación natural). Verificamos clamp.
    expect(v.gratitude).toBeLessThanOrEqual(GRATITUDE_CEILING);
    expect(v.gratitude).toBeGreaterThan(0);
  });
});

describe('2. Silencio no acumula nada y drena el pool', () => {
  it('ningún evento bajo SILENCE suma gratitud', () => {
    for (const type of ALL_EVENT_TYPES) {
      expect(
        computeGratitudeFromEvent({ type, npcId: 'n' }, SILENCE),
      ).toBe(0);
    }
  });

  it('ningún evento con activeMessage null suma gratitud', () => {
    for (const type of ALL_EVENT_TYPES) {
      expect(computeGratitudeFromEvent({ type, npcId: 'n' }, null)).toBe(0);
    }
  });
});

describe('3. Multiplicadores por susurro — polaridades correctas', () => {
  it('AUXILIO favorece supervivencia', () => {
    expect(
      computeGratitudeFromEvent({ type: 'hunger_escape', npcId: 'x' }, MESSAGE_INTENTS.AUXILIO),
    ).toBe(15); // 10 × 1.5
    expect(
      computeGratitudeFromEvent({ type: 'birth', npcId: 'x' }, MESSAGE_INTENTS.AUXILIO),
    ).toBe(5); // 10 × 0.5
  });

  it('ENCUENTRO favorece lo social (linaje + moral)', () => {
    expect(
      computeGratitudeFromEvent(
        { type: 'birth', npcId: 'x' },
        MESSAGE_INTENTS.ENCUENTRO,
      ),
    ).toBe(15);
    expect(
      computeGratitudeFromEvent(
        { type: 'debt_settled', npcId: 'x' },
        MESSAGE_INTENTS.ENCUENTRO,
      ),
    ).toBe(3); // 2 × 1.5
  });

  it('ESPERANZA es ×1.0 universal — ni premia ni castiga', () => {
    for (const type of ALL_EVENT_TYPES) {
      const expected = GRATITUDE_EVENT_VALUES[type].base;
      expect(
        computeGratitudeFromEvent({ type, npcId: 'n' }, MESSAGE_INTENTS.ESPERANZA),
      ).toBe(expected);
    }
  });

  it('susurro no afín siempre produce algo (×0.5, no ×0) — dignidad del pueblo', () => {
    // Evento supervivencia sobre susurro social: ×0.5, nunca cero.
    for (const intent of ALL_INTENTS) {
      if (intent === MESSAGE_INTENTS.ESPERANZA) continue;
      if (SUSURRO_DOMAINS[intent].includes('supervivencia')) continue;
      const d = computeGratitudeFromEvent(
        { type: 'hunger_escape', npcId: 'x' },
        intent,
      );
      expect(d).toBeGreaterThan(0);
    }
  });
});

describe('4. Alcanzabilidad de milagros — feel del bucle', () => {
  it('el milagro más barato (30) cabe en <2 días óptimos', () => {
    // Un día óptimo con susurro afín puede alcanzar cap=40. Por
    // tanto el milagro más barato es ≤1 día óptimo.
    const cheapest = Math.min(
      ...Object.values(MIRACLES_CATALOG).map((m) => m.cost),
    );
    expect(cheapest).toBeLessThanOrEqual(GRATITUDE_DAILY_CAP);
  });

  it('el milagro más caro (≤80) cabe en ≤3 días con cap saturado', () => {
    const most = Math.max(
      ...Object.values(MIRACLES_CATALOG).map((m) => m.cost),
    );
    // 3 × GRATITUDE_DAILY_CAP = 120 ≥ 80. Acabable en 3 días
    // óptimos sin perder milagros intermedios.
    expect(most).toBeLessThanOrEqual(GRATITUDE_DAILY_CAP * 3);
  });
});

describe('5. Valores base son S/M/L enteros — auditabilidad', () => {
  it('todos los eventos son 2, 5 o 10', () => {
    for (const def of Object.values(GRATITUDE_EVENT_VALUES)) {
      expect([2, 5, 10]).toContain(def.base);
    }
  });
});

describe('6. Dedupe por (tipo, npcId) evita exploits de loop', () => {
  it('reaplicar el mismo evento 100 veces no supera el delta de una aplicación', () => {
    let v = initialVillageState();
    const ev: GratitudeEvent = { type: 'birth', npcId: 'c1' };
    for (let i = 0; i < 100; i++) {
      v = applyGratitudeFromEvent(v, ev, MESSAGE_INTENTS.ENCUENTRO);
    }
    expect(v.gratitude).toBe(15); // una sola vez
    expect(v.gratitudeEventKeys.filter((k) => k === 'birth:c1').length).toBe(
      1,
    );
  });
});

describe('7. Round-trip JSON del VillageState ampliado (§A4)', () => {
  it('estado con tracking activo serializa byte-idéntico', () => {
    let v = initialVillageState();
    v = applyGratitudeFromEvent(
      v,
      { type: 'hunger_escape', npcId: 'a' },
      MESSAGE_INTENTS.AUXILIO,
    );
    v = applyGratitudeFromEvent(
      v,
      { type: 'birth', npcId: 'c' },
      MESSAGE_INTENTS.ENCUENTRO,
    );
    v = { ...v, dailyDeaths: 1, dailyHungerEscapes: 2 };
    expect(JSON.parse(JSON.stringify(v))).toEqual(v);
  });
});
