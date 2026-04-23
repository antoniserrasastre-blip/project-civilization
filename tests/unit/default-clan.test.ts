/**
 * Unit — `makeDefaultClan(seed)` produce 14 NPCs deterministas.
 *
 * El helper cablea drafting.ts (bloque A + B) con picks canónicos
 * para que el arranque UI no requiera drafting interactivo. El
 * test verifica shape (4 Elegidos + 10 Ciudadanos), budget exacto
 * (2M + 2F en A), determinismo y round-trip JSON.
 */

import { describe, it, expect } from 'vitest';
import { makeDefaultClan } from '@/lib/default-clan';
import { CASTA, SEX } from '@/lib/npcs';

describe('makeDefaultClan', () => {
  it('produce 14 NPCs (4 Elegidos + 10 Ciudadanos)', () => {
    const clan = makeDefaultClan(42);
    expect(clan).toHaveLength(14);
    expect(clan.filter((n) => n.casta === CASTA.ELEGIDO)).toHaveLength(4);
    expect(clan.filter((n) => n.casta === CASTA.CIUDADANO)).toHaveLength(10);
  });

  it('cumple 2M + 2F en los Elegidos', () => {
    const clan = makeDefaultClan(42);
    const elegidos = clan.filter((n) => n.casta === CASTA.ELEGIDO);
    expect(elegidos.filter((n) => n.sex === SEX.M)).toHaveLength(2);
    expect(elegidos.filter((n) => n.sex === SEX.F)).toHaveLength(2);
  });

  it('determinismo — mismo seed produce ids idénticos', () => {
    const a = makeDefaultClan(123);
    const b = makeDefaultClan(123);
    expect(a.map((n) => n.id)).toEqual(b.map((n) => n.id));
  });

  it('determinismo — seeds distintos producen clanes distintos', () => {
    const a = makeDefaultClan(1);
    const b = makeDefaultClan(2);
    expect(a.map((n) => n.id)).not.toEqual(b.map((n) => n.id));
  });

  it('round-trip JSON estructuralmente idéntico (§A4)', () => {
    const clan = makeDefaultClan(7);
    const rt = JSON.parse(JSON.stringify(clan));
    expect(rt).toEqual(clan);
  });

  it('cada NPC tiene `name` no vacío y únicos entre sí (§9 voz)', () => {
    const clan = makeDefaultClan(42);
    for (const n of clan) {
      expect(typeof n.name).toBe('string');
      expect(n.name.length).toBeGreaterThan(0);
    }
    const names = clan.map((n) => n.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('nombres salen del pool catalano-balear', async () => {
    const { MALE_NAMES, FEMALE_NAMES } = await import('@/lib/names');
    const pool = new Set([...MALE_NAMES, ...FEMALE_NAMES]);
    const clan = makeDefaultClan(13);
    for (const n of clan) {
      expect(pool.has(n.name)).toBe(true);
    }
  });

  it('nombre respeta el sexo del NPC', async () => {
    const { MALE_NAMES, FEMALE_NAMES } = await import('@/lib/names');
    const males = new Set(MALE_NAMES);
    const females = new Set(FEMALE_NAMES);
    const clan = makeDefaultClan(99);
    for (const n of clan) {
      if (n.sex === SEX.M) expect(males.has(n.name)).toBe(true);
      if (n.sex === SEX.F) expect(females.has(n.name)).toBe(true);
    }
  });

  it('todas las posiciones caen sobre tierra (no agua) — Sprint #5', async () => {
    const { TILE } = await import('@/lib/world-state');
    const fixture = (await import('@/lib/fixtures/world-map.v1.json')).default as unknown as {
      tiles: number[];
      width: number;
    };
    const clan = makeDefaultClan(42);
    for (const n of clan) {
      const t = fixture.tiles[n.position.y * fixture.width + n.position.x];
      expect(t).not.toBe(TILE.WATER);
    }
  });

  it('seeds distintos producen clanes en posiciones distintas (Sprint #5)', () => {
    const a = makeDefaultClan(1);
    const b = makeDefaultClan(2);
    // Al menos un NPC cambia de posición entre seeds, porque el
    // picker de isla ahora depende del seed.
    const anyDiff = a.some((n, i) =>
      n.position.x !== b[i].position.x || n.position.y !== b[i].position.y,
    );
    expect(anyDiff).toBe(true);
  });
});
