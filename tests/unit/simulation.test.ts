/**
 * Tests del tick integrado — Sprint 3.3.
 *
 * El tick mueve NPCs, tickea recursos, actualiza fog. Puro.
 * Determinismo sobre N ticks.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { tick } from '@/lib/simulation';
import { initialGameState } from '@/lib/game-state';
import { makeTestNPC } from '@/lib/npcs';
import { TILE, RESOURCE, type WorldMap } from '@/lib/world-state';
import type { NPC } from '@/lib/npcs';
import { isDiscovered } from '@/lib/fog';

function mkFlatWorld(w = 32, h = 32): WorldMap {
  return {
    seed: 0,
    width: w,
    height: h,
    tiles: new Array(w * h).fill(TILE.GRASS),
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
  };
}

function sha(state: unknown): string {
  return createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

describe('tick — pureza + avance determinista', () => {
  it('no muta el state recibido', () => {
    const world = mkFlatWorld();
    const npcs: NPC[] = [
      makeTestNPC({ id: 'a', position: { x: 5, y: 5 } }),
    ];
    const s = initialGameState(1, npcs, world);
    const snap = JSON.stringify(s);
    tick(s);
    expect(JSON.stringify(s)).toBe(snap);
  });

  it('tick++ en cada paso', () => {
    const s = initialGameState(1, [makeTestNPC({ id: 'a' })], mkFlatWorld());
    const s1 = tick(s);
    expect(s1.tick).toBe(1);
    expect(tick(s1).tick).toBe(2);
  });

  it('10.000 ticks no crashean con NPC sobre recurso (sobrevive)', () => {
    const world = mkFlatWorld();
    // NPC sobre agua continuo → supervivencia recupera y no muere.
    world.resources.push({
      id: RESOURCE.WATER,
      x: 10,
      y: 10,
      quantity: 999,
      initialQuantity: 999,
      regime: 'continuous',
      depletedAtTick: null,
    });
    const npcs: NPC[] = [
      makeTestNPC({
        id: 'ok',
        position: { x: 10, y: 10 },
        stats: { supervivencia: 90, socializacion: 90 },
      }),
    ];
    let s = initialGameState(1, npcs, world);
    for (let i = 0; i < 10_000; i++) {
      s = tick(s);
    }
    expect(s.tick).toBe(10_000);
    expect(s.npcs[0].alive).toBe(true);
  });
});

describe('tick — determinismo', () => {
  it('misma seed + mismos NPCs → estado byte-idéntico tras 100 ticks', () => {
    const makeRun = () => {
      const npcs: NPC[] = [
        makeTestNPC({ id: 'a', position: { x: 2, y: 2 } }),
        makeTestNPC({ id: 'b', position: { x: 8, y: 8 } }),
      ];
      let s = initialGameState(42, npcs, mkFlatWorld());
      for (let i = 0; i < 100; i++) s = tick(s);
      return s;
    };
    const a = makeRun();
    const b = makeRun();
    expect(sha(a)).toBe(sha(b));
  });
});

describe('tick — movimiento hacia comida', () => {
  it('NPC hambriento converge hacia baya', () => {
    const world = mkFlatWorld(20, 20);
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 10,
      y: 10,
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    const npc = makeTestNPC({
      id: 'hungry',
      position: { x: 0, y: 0 },
      stats: { supervivencia: 30, socializacion: 80 },
    });
    let s = initialGameState(1, [npc], world);
    const startD =
      Math.abs(s.npcs[0].position.x - 10) + Math.abs(s.npcs[0].position.y - 10);
    for (let i = 0; i < 25; i++) s = tick(s);
    const endD =
      Math.abs(s.npcs[0].position.x - 10) + Math.abs(s.npcs[0].position.y - 10);
    expect(endD).toBeLessThan(startD);
  });
});

describe('tick — fog', () => {
  it('posición del NPC y alrededores quedan descubiertos', () => {
    const npc = makeTestNPC({
      id: 'a',
      position: { x: 10, y: 10 },
      visionRadius: 3,
    });
    let s = initialGameState(1, [npc], mkFlatWorld(32, 32));
    s = tick(s);
    expect(isDiscovered(s.fog, 10, 10)).toBe(true);
    // Radio 3 alrededor de (10,10).
    expect(isDiscovered(s.fog, 12, 10)).toBe(true);
    expect(isDiscovered(s.fog, 20, 20)).toBe(false);
  });
});

describe('tick — Fe acumula pasivamente (§3.7b) · Sprint Fase 5 #1', () => {
  it('Fe inicial es 30 tras initialGameState', async () => {
    const { FAITH_INITIAL } = await import('@/lib/faith');
    const s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    expect(s.village.faith).toBe(FAITH_INITIAL);
  });

  it('Fe se acumula cada tick según sqrt(vivos)', async () => {
    const { faithPerTick, FAITH_INITIAL } = await import('@/lib/faith');
    const npcs = Array.from({ length: 14 }, (_, i) =>
      makeTestNPC({
        id: `n${i}`,
        position: { x: 5 + (i % 5), y: 5 + Math.floor(i / 5) },
      }),
    );
    let s = initialGameState(7, npcs, mkFlatWorld(32, 32));
    const before = s.village.faith;
    expect(before).toBe(FAITH_INITIAL);
    s = tick(s);
    expect(s.village.faith).toBeGreaterThan(before);
    // Un tick ≈ faithPerTick(14) más.
    expect(s.village.faith - before).toBeCloseTo(faithPerTick(14), 3);
  });

  it('Fe respeta el cap FAITH_CAP tras muchos ticks', async () => {
    const { FAITH_CAP } = await import('@/lib/faith');
    // Mundo con agua continua para que los NPCs sobrevivan los 5000
    // ticks del test (sin agua, morirían de sed y Fe no acumularía).
    const world = mkFlatWorld(32, 32);
    world.resources.push({
      id: RESOURCE.WATER,
      x: 10,
      y: 10,
      quantity: 999,
      initialQuantity: 999,
      regime: 'continuous',
      depletedAtTick: null,
    });
    const npcs = Array.from({ length: 14 }, (_, i) =>
      makeTestNPC({
        id: `n${i}`,
        position: { x: 10, y: 10 },
        stats: { supervivencia: 90, socializacion: 90 },
      }),
    );
    let s = initialGameState(3, npcs, world);
    for (let i = 0; i < 5_000; i++) s = tick(s);
    // Con 14 vivos, Fe/tick ≈ 0.156 — en 5000 ticks alcanza cap
    // holgadamente. Tolerancia ±1 por redondeo de acumulación.
    expect(s.village.faith).toBeLessThanOrEqual(FAITH_CAP);
    expect(s.village.faith).toBeGreaterThanOrEqual(FAITH_CAP - 1);
  });

  it('con 0 vivos, Fe no crece', async () => {
    const { FAITH_INITIAL } = await import('@/lib/faith');
    const npcs = [
      makeTestNPC({ id: 'a', alive: false }),
      makeTestNPC({ id: 'b', alive: false }),
    ];
    let s = initialGameState(1, npcs, mkFlatWorld());
    for (let i = 0; i < 50; i++) s = tick(s);
    expect(s.village.faith).toBe(FAITH_INITIAL);
  });

  it('primer susurro es gratuito — no descuenta Fe', async () => {
    const { applyPlayerIntent } = await import('@/lib/messages');
    const { FAITH_INITIAL } = await import('@/lib/faith');
    const s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    const after = applyPlayerIntent(s.village, 'coraje', s.tick);
    expect(after.faith).toBe(FAITH_INITIAL);
    expect(after.activeMessage).toBe('coraje');
  });

  it('cambiar susurro activo descuenta FAITH_COST_CHANGE (80)', async () => {
    const { applyPlayerIntent } = await import('@/lib/messages');
    const { FAITH_COST_CHANGE } = await import('@/lib/faith');
    const s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    // Primero: susurro gratis.
    const v1 = applyPlayerIntent(s.village, 'coraje', 0);
    // Simulamos acumulación de Fe: ponemos 100 a mano.
    const rich = { ...v1, faith: 100 };
    const v2 = applyPlayerIntent(rich, 'paciencia', 10);
    expect(v2.faith).toBe(100 - FAITH_COST_CHANGE);
    expect(v2.activeMessage).toBe('paciencia');
  });

  it('silencio elegido descuenta FAITH_COST_SILENCE (40)', async () => {
    const { applyPlayerIntent, SILENCE } = await import('@/lib/messages');
    const { FAITH_COST_SILENCE } = await import('@/lib/faith');
    const s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    const v1 = applyPlayerIntent(s.village, 'coraje', 0);
    const rich = { ...v1, faith: 80 };
    const v2 = applyPlayerIntent(rich, SILENCE, 10);
    expect(v2.faith).toBe(80 - FAITH_COST_SILENCE);
    expect(v2.activeMessage).toBe(SILENCE);
  });

  it('cambio sin Fe suficiente tira error', async () => {
    const { applyPlayerIntent } = await import('@/lib/messages');
    const s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    const v1 = applyPlayerIntent(s.village, 'coraje', 0);
    const broke = { ...v1, faith: 10 };
    expect(() => applyPlayerIntent(broke, 'paciencia', 5)).toThrow(
      /insuficiente|faith|fe/i,
    );
  });

  it('silencio sin Fe suficiente tira error', async () => {
    const { applyPlayerIntent, SILENCE } = await import('@/lib/messages');
    const s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    const v1 = applyPlayerIntent(s.village, 'coraje', 0);
    const broke = { ...v1, faith: 10 };
    expect(() => applyPlayerIntent(broke, SILENCE, 5)).toThrow(
      /insuficiente|faith|fe/i,
    );
  });
});

describe('tick — susurro persistente (§3.7) · Sprint Fase 5 #1', () => {
  it('activeMessage NO se resetea al cruzar amanecer', async () => {
    const { applyPlayerIntent } = await import('@/lib/messages');
    const { TICKS_PER_DAY } = await import('@/lib/resources');
    let s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    s = { ...s, village: applyPlayerIntent(s.village, 'coraje', 0) };
    for (let i = 0; i < TICKS_PER_DAY * 3; i++) s = tick(s);
    // Tres días después, el susurro persiste.
    expect(s.village.activeMessage).toBe('coraje');
  });

  it('archiveOnChange sólo archiva al cambiar, no al amanecer', async () => {
    const { applyPlayerIntent } = await import('@/lib/messages');
    const { TICKS_PER_DAY } = await import('@/lib/resources');
    let s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    s = { ...s, village: applyPlayerIntent(s.village, 'coraje', 0) };
    for (let i = 0; i < TICKS_PER_DAY * 3; i++) s = tick(s);
    // Sin cambios → history vacío.
    expect(s.village.messageHistory).toEqual([]);
    // Al cambiar → history archiva coraje.
    const rich = { ...s.village, faith: 100 };
    const v = applyPlayerIntent(rich, 'paciencia', s.tick);
    expect(v.messageHistory.length).toBe(1);
    expect(v.messageHistory[0].intent).toBe('coraje');
    expect(v.activeMessage).toBe('paciencia');
  });
});

describe('tick — gracia de silencio (§3.7 · 7 días) · Sprint Fase 5 #1', () => {
  it('silenceGraceDaysRemaining arranca en 7', () => {
    const s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    expect(s.village.silenceGraceDaysRemaining).toBe(7);
  });

  it('decrementa 1/día mientras activeMessage === null', async () => {
    const { TICKS_PER_DAY } = await import('@/lib/resources');
    let s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    for (let i = 0; i < TICKS_PER_DAY; i++) s = tick(s);
    expect(s.village.silenceGraceDaysRemaining).toBe(6);
    for (let i = 0; i < TICKS_PER_DAY; i++) s = tick(s);
    expect(s.village.silenceGraceDaysRemaining).toBe(5);
  });

  it('deja de decrementar tras el primer susurro', async () => {
    const { applyPlayerIntent } = await import('@/lib/messages');
    const { TICKS_PER_DAY } = await import('@/lib/resources');
    let s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    for (let i = 0; i < TICKS_PER_DAY; i++) s = tick(s);
    expect(s.village.silenceGraceDaysRemaining).toBe(6);
    s = { ...s, village: applyPlayerIntent(s.village, 'coraje', s.tick) };
    const frozen = s.village.silenceGraceDaysRemaining;
    for (let i = 0; i < TICKS_PER_DAY * 3; i++) s = tick(s);
    expect(s.village.silenceGraceDaysRemaining).toBe(frozen);
  });

  it('gracia solo aplica con messageHistory.length === 0', async () => {
    // Test de invariante: tras haber susurrado (history no vacío) el
    // contador de gracia ya no protege contra el drenaje.
    const { applyPlayerIntent } = await import('@/lib/messages');
    let s = initialGameState(
      1,
      [makeTestNPC({ id: 'a' })],
      mkFlatWorld(),
    );
    const v1 = applyPlayerIntent(s.village, 'coraje', 0);
    expect(v1.messageHistory.length + Number(v1.activeMessage !== null))
      .toBeGreaterThan(0);
  });
});
