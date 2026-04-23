/**
 * Tests Red — Sprint 9 CULTURA-MATERIAL · Legado Divino.
 *
 * Contrato de `lib/legacy.ts`:
 *   - transferLegacyItem: cuando un NPC muere con un item de prestige > 0,
 *     el item pasa al familiar más cercano (hijo o mismo linaje).
 *   - Si no hay heredero, el item queda sin dueño (ownerNpcId = null).
 *   - NPC heredero actualiza su equippedItemId.
 */

import { describe, it, expect } from 'vitest';
import { transferLegacyItem } from '../../lib/legacy';
import { makeTestNPC } from '../../lib/npcs';
import { LINAJE } from '../../lib/npcs';
import { ITEM_KIND, createItem } from '../../lib/items';

function prestigeItem(ownerNpcId: string, tick = 0) {
  const item = createItem(ITEM_KIND.SPEAR, ownerNpcId, tick);
  return { ...item, prestige: 10 };
}

// ── transferLegacyItem ────────────────────────────────────────────────────────

describe('transferLegacyItem', () => {
  it('no transfiere si el item no tiene prestige', () => {
    const dead = makeTestNPC({ id: 'dead', alive: false });
    const item = createItem(ITEM_KIND.SPEAR, 'dead', 0); // prestige = 0
    const heir = makeTestNPC({ id: 'heir', linaje: LINAJE.TRAMUNTANA });
    const { items, npcs } = transferLegacyItem(
      dead,
      item,
      [item],
      [dead, heir],
    );
    expect(items[0].ownerNpcId).toBe('dead');
    expect(npcs.find((n) => n.id === 'heir')?.equippedItemId).toBeNull();
  });

  it('transfiere al hijo si está vivo', () => {
    const dead = makeTestNPC({ id: 'dead', alive: false });
    const child = makeTestNPC({ id: 'child', parents: ['dead', 'mom'] });
    const item = prestigeItem('dead');
    const { items, npcs } = transferLegacyItem(
      dead,
      item,
      [item],
      [dead, child],
    );
    expect(items[0].ownerNpcId).toBe('child');
    expect(npcs.find((n) => n.id === 'child')?.equippedItemId).toBe(item.id);
  });

  it('transfiere al familiar de mismo linaje si no hay hijo', () => {
    const dead = makeTestNPC({
      id: 'dead',
      alive: false,
      linaje: LINAJE.TRAMUNTANA,
    });
    const stranger = makeTestNPC({ id: 'stranger', linaje: LINAJE.LLEVANT });
    const kin = makeTestNPC({ id: 'kin', linaje: LINAJE.TRAMUNTANA });
    const item = prestigeItem('dead');
    const { items, npcs } = transferLegacyItem(
      dead,
      item,
      [item],
      [dead, stranger, kin],
    );
    expect(items[0].ownerNpcId).toBe('kin');
    expect(npcs.find((n) => n.id === 'kin')?.equippedItemId).toBe(item.id);
  });

  it('deja el item sin dueño si no hay heredero vivo', () => {
    const dead = makeTestNPC({ id: 'dead', alive: false });
    const item = prestigeItem('dead');
    const { items } = transferLegacyItem(dead, item, [item], [dead]);
    expect(items[0].ownerNpcId).toBeNull();
  });

  it('no transfiere si el heredero ya lleva un item equipado', () => {
    const dead = makeTestNPC({ id: 'dead', alive: false });
    const heir = makeTestNPC({
      id: 'heir',
      parents: ['dead', 'mom'],
      equippedItemId: 'other-item',
    });
    const item = prestigeItem('dead');
    const { items, npcs } = transferLegacyItem(
      dead,
      item,
      [item],
      [dead, heir],
    );
    // El heredero ya lleva item → se deja sin dueño o se busca otro
    const heirAfter = npcs.find((n) => n.id === 'heir')!;
    // El item anterior no debe sobrescribirse
    expect(heirAfter.equippedItemId).toBe('other-item');
    // El item heredado queda sin dueño o se busca siguiente familiar
    // (comportamiento exacto: el test acepta ownerNpcId !== 'heir')
    expect(items[0].ownerNpcId).not.toBe('heir');
  });

  it('es puro: no muta los arrays de entrada', () => {
    const dead = makeTestNPC({ id: 'dead', alive: false });
    const child = makeTestNPC({ id: 'child', parents: ['dead', 'mom'] });
    const item = prestigeItem('dead');
    const itemsBefore = [item];
    const npcsBefore = [dead, child];
    transferLegacyItem(dead, item, itemsBefore, npcsBefore);
    expect(itemsBefore[0].ownerNpcId).toBe('dead');
    expect(npcsBefore[1].equippedItemId).toBeNull();
  });
});
