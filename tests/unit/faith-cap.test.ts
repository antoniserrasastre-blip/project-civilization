/**
 * Tests del cap de Fe — v1.0.1 decisión #1.
 *
 * Contrato (DECISIONS-PENDING.md bloque 1, opción A):
 *   - Fe del player y de cada rival acumula hasta FAITH_CAP.
 *   - Eventos `faith_gained` y `rival_faith_gained` que superarían el
 *     cap truncan al cap — el overflow se PIERDE, no se difiere.
 *   - Los gastos (grantGift, curseNpc) NO interactúan con el cap:
 *     solo se capa al ganar, no al gastar.
 *   - Determinismo y round-trip JSON preservados.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { anoint } from '@/lib/anoint';
import { applyEvents } from '@/lib/scheduler';
import { FAITH_CAP, clampFaith } from '@/lib/faith';
import { grantGift } from '@/lib/gifts';

describe('clampFaith (helper)', () => {
  it('no toca valores dentro del rango', () => {
    expect(clampFaith(0)).toBe(0);
    expect(clampFaith(100)).toBe(100);
    expect(clampFaith(FAITH_CAP)).toBe(FAITH_CAP);
  });

  it('trunca por arriba al FAITH_CAP', () => {
    expect(clampFaith(FAITH_CAP + 1)).toBe(FAITH_CAP);
    expect(clampFaith(99999)).toBe(FAITH_CAP);
  });

  it('trunca por abajo a 0 (defensa contra valores negativos)', () => {
    expect(clampFaith(-10)).toBe(0);
  });
});

describe('FAITH_CAP aplicado via applyEvents', () => {
  it('faith_gained normal acumula hasta FAITH_CAP', () => {
    const s0 = initialState(42, { playerGroupId: 'tramuntana' });
    const s1 = applyEvents(s0, [
      { type: 'faith_gained', amount: 100, reason: 'rezar' },
    ]);
    expect(s1.player_god.faith_points).toBe(100);
    const s2 = applyEvents(s1, [
      { type: 'faith_gained', amount: 200, reason: 'rezar' },
    ]);
    expect(s2.player_god.faith_points).toBe(300);
  });

  it('faith_gained que superaría FAITH_CAP se trunca (overflow perdido)', () => {
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    // Llevamos Fe a FAITH_CAP - 10.
    s = {
      ...s,
      player_god: { ...s.player_god, faith_points: FAITH_CAP - 10 },
    };
    // Intento de ganar 100 → final queda en FAITH_CAP, no en CAP+90.
    const next = applyEvents(s, [
      { type: 'faith_gained', amount: 100, reason: 'enemigo_caido' },
    ]);
    expect(next.player_god.faith_points).toBe(FAITH_CAP);
  });

  it('rival_faith_gained también capa en FAITH_CAP (simetría)', () => {
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    const gid = s.rival_gods[0].group_id;
    s = {
      ...s,
      rival_gods: s.rival_gods.map((r) =>
        r.group_id === gid ? { ...r, faith_points: FAITH_CAP - 5 } : r,
      ),
    };
    const next = applyEvents(s, [
      {
        type: 'rival_faith_gained',
        rival_group_id: gid,
        amount: 50,
        reason: 'rezar',
      },
    ]);
    const rival = next.rival_gods.find((r) => r.group_id === gid)!;
    expect(rival.faith_points).toBe(FAITH_CAP);
  });

  it('gastos (grantGift) NO chocan con el cap — solo se capa al ganar', () => {
    let s = anoint(initialState(42, { playerGroupId: 'tramuntana' }), 'npc_0000');
    s = {
      ...s,
      player_god: { ...s.player_god, faith_points: FAITH_CAP, gifts_granted: 1 },
    };
    // Segundo don cuesta 30 Fe. Tras gastar queda FAITH_CAP-30; sigue
    // bajo el cap sin que el cap haya interferido con la operación.
    const after = grantGift(s, 'npc_0000', 'fuerza_sobrehumana');
    expect(after.player_god.faith_points).toBe(FAITH_CAP - 30);
  });

  it('un estado cargado con faith > cap (save antiguo) NO se toca hasta el próximo ingreso', () => {
    // Importante: el cap se aplica cuando LLEGA Fe nueva, no como
    // guardián en cada render. Un save pre-cap puede tener 800 Fe; la
    // app no lo trunca al cargar (lo deja "fuera de cap" hasta la
    // próxima ganancia, que sí lo recortará si intentara subir).
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = {
      ...s,
      player_god: { ...s.player_god, faith_points: 800 },
    };
    // applyEvents con lista vacía no toca Fe.
    const untouched = applyEvents(s, []);
    expect(untouched.player_god.faith_points).toBe(800);
    // Con un gain pequeño, el cap actúa y recorta al FAITH_CAP (no
    // sube de 800: el cap es techo absoluto, el overflow se pierde).
    const bumped = applyEvents(s, [
      { type: 'faith_gained', amount: 5, reason: 'rezar' },
    ]);
    expect(bumped.player_god.faith_points).toBe(FAITH_CAP);
  });

  it('determinismo: misma semilla + cap activo ⇒ estado idéntico tras 1000 ticks', async () => {
    const { runTicks } = await import('@/lib/simulation');
    const a = runTicks(initialState(42, { playerGroupId: 'tramuntana' }), 1000);
    const b = runTicks(initialState(42, { playerGroupId: 'tramuntana' }), 1000);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    // Y la Fe del player nunca excede el cap.
    expect(a.player_god.faith_points).toBeLessThanOrEqual(FAITH_CAP);
  }, 10_000);
});
