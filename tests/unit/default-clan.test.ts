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
});
