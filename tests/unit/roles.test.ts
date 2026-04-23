/**
 * Tests de roles activos — Sprint 10 ARQUETIPOS-ACTIVOS (Pilar 1).
 *
 * Los 7 roles se derivan del estado del NPC (skills + item equipado):
 * no se persisten en el NPC (no se cambia el shape §A4). `computeRole`
 * es una función pura que devuelve el rol vigente este tick.
 *
 * El "filtro de intención" (`intentFilter`) expresa el sesgo del rol
 * hacia ciertos recursos: ese sesgo lo consume `decideDestination`
 * (tests en `needs.test.ts`).
 */

import { describe, it, expect } from 'vitest';
import {
  ROLE,
  computeRole,
  intentFilter,
  roleLabel,
  roleColor,
  type Role,
} from '@/lib/roles';
import { makeTestNPC } from '@/lib/npcs';
import { createItem, ITEM_KIND } from '@/lib/items';
import { RESOURCE } from '@/lib/world-state';

describe('ROLE catálogo', () => {
  it('declara los 7 roles iniciales', () => {
    const values = Object.values(ROLE) as Role[];
    expect(values).toHaveLength(7);
    expect(new Set(values).size).toBe(7);
    for (const r of values) {
      expect(roleLabel(r)).toMatch(/[A-Za-zÀ-ÿ]/);
    }
  });

  it('contiene exactamente los 7 roles canónicos del sprint', () => {
    const values = new Set(Object.values(ROLE) as string[]);
    for (const k of [
      'cazador',
      'rastreador',
      'pescador',
      'recolector',
      'tallador',
      'tejedor',
      'curandero',
    ]) {
      expect(values.has(k)).toBe(true);
    }
  });
});

describe('roleColor — paleta estable por rol', () => {
  it('todos los 7 roles tienen color asignado', () => {
    for (const r of Object.values(ROLE) as Role[]) {
      expect(roleColor(r)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('colores son distintos entre roles', () => {
    const seen = new Set<string>();
    for (const r of Object.values(ROLE) as Role[]) {
      seen.add(roleColor(r));
    }
    expect(seen.size).toBe(7);
  });
});

describe('computeRole — derivación pura', () => {
  it('CURANDERO cuando healing alto y reliquia equipada', () => {
    const item = createItem(ITEM_KIND.RELIC_CHARM, 'n1', 0);
    const npc = makeTestNPC({
      id: 'n1',
      casta: 'elegido',
      skills: { hunting: 10, gathering: 10, crafting: 10, fishing: 10, healing: 70 },
      equippedItemId: item.id,
    });
    expect(computeRole(npc, item)).toBe(ROLE.CURANDERO);
  });

  it('CAZADOR cuando hunting alto y lanza equipada', () => {
    const item = createItem(ITEM_KIND.SPEAR, 'n1', 0);
    const npc = makeTestNPC({
      id: 'n1',
      skills: { hunting: 60, gathering: 10, crafting: 10, fishing: 10, healing: 10 },
      equippedItemId: item.id,
    });
    expect(computeRole(npc, item)).toBe(ROLE.CAZADOR);
  });

  it('RASTREADOR cuando hunting alto pero sin lanza', () => {
    const npc = makeTestNPC({
      id: 'n1',
      skills: { hunting: 55, gathering: 10, crafting: 10, fishing: 20, healing: 10 },
      equippedItemId: null,
    });
    expect(computeRole(npc, null)).toBe(ROLE.RASTREADOR);
  });

  it('TALLADOR cuando crafting alto y hacha equipada', () => {
    const item = createItem(ITEM_KIND.HAND_AXE, 'n1', 0);
    const npc = makeTestNPC({
      id: 'n1',
      skills: { hunting: 10, gathering: 30, crafting: 70, fishing: 10, healing: 10 },
      equippedItemId: item.id,
    });
    expect(computeRole(npc, item)).toBe(ROLE.TALLADOR);
  });

  it('TEJEDOR cuando crafting alto y aguja de hueso equipada', () => {
    const item = createItem(ITEM_KIND.BONE_NEEDLE, 'n1', 0);
    const npc = makeTestNPC({
      id: 'n1',
      skills: { hunting: 10, gathering: 20, crafting: 65, fishing: 10, healing: 10 },
      equippedItemId: item.id,
    });
    expect(computeRole(npc, item)).toBe(ROLE.TEJEDOR);
  });

  it('PESCADOR cuando fishing domina', () => {
    const npc = makeTestNPC({
      id: 'n1',
      skills: { hunting: 20, gathering: 20, crafting: 10, fishing: 65, healing: 10 },
      equippedItemId: null,
    });
    expect(computeRole(npc, null)).toBe(ROLE.PESCADOR);
  });

  it('RECOLECTOR como fallback (skills planos)', () => {
    const npc = makeTestNPC({
      id: 'n1',
      skills: { hunting: 20, gathering: 20, crafting: 20, fishing: 20, healing: 20 },
      equippedItemId: null,
    });
    expect(computeRole(npc, null)).toBe(ROLE.RECOLECTOR);
  });

  it('RECOLECTOR cuando gathering es el skill más alto', () => {
    const npc = makeTestNPC({
      id: 'n1',
      skills: { hunting: 15, gathering: 60, crafting: 15, fishing: 15, healing: 10 },
      equippedItemId: null,
    });
    expect(computeRole(npc, null)).toBe(ROLE.RECOLECTOR);
  });

  it('la herramienta prevalece sobre skills nominales', () => {
    // hunting > crafting pero lleva hacha: la herramienta dicta el rol activo.
    const item = createItem(ITEM_KIND.HAND_AXE, 'n1', 0);
    const npc = makeTestNPC({
      id: 'n1',
      skills: { hunting: 50, gathering: 10, crafting: 30, fishing: 10, healing: 10 },
      equippedItemId: item.id,
    });
    expect(computeRole(npc, item)).toBe(ROLE.TALLADOR);
  });

  it('determinista: misma entrada → mismo rol', () => {
    const npc = makeTestNPC({
      id: 'n1',
      skills: { hunting: 40, gathering: 30, crafting: 20, fishing: 25, healing: 10 },
    });
    const a = computeRole(npc, null);
    const b = computeRole(npc, null);
    expect(a).toBe(b);
  });

  it('NPC muerto conserva rol derivable (no crashea)', () => {
    const npc = makeTestNPC({
      id: 'n1',
      alive: false,
      skills: { hunting: 80, gathering: 10, crafting: 10, fishing: 10, healing: 10 },
    });
    const r = computeRole(npc, null);
    // No se asume cuál — solo que devuelve uno de los 7.
    expect(Object.values(ROLE)).toContain(r);
  });
});

describe('intentFilter — sesgo hacia recursos afines', () => {
  it('CAZADOR pondera game positivamente', () => {
    const weights = intentFilter(ROLE.CAZADOR);
    expect(weights[RESOURCE.GAME]).toBeGreaterThan(0);
    expect(weights[RESOURCE.BERRY] ?? 0).toBeLessThanOrEqual(
      weights[RESOURCE.GAME] ?? 0,
    );
  });

  it('RASTREADOR pondera game (rastrea) por encima de bayas', () => {
    const w = intentFilter(ROLE.RASTREADOR);
    expect(w[RESOURCE.GAME]).toBeGreaterThan(w[RESOURCE.BERRY] ?? 0);
  });

  it('PESCADOR pondera fish positivamente', () => {
    const w = intentFilter(ROLE.PESCADOR);
    expect(w[RESOURCE.FISH]).toBeGreaterThan(0);
    expect(w[RESOURCE.FISH]).toBeGreaterThan(w[RESOURCE.GAME] ?? 0);
  });

  it('RECOLECTOR pondera berry y wood positivamente', () => {
    const w = intentFilter(ROLE.RECOLECTOR);
    expect(w[RESOURCE.BERRY]).toBeGreaterThan(0);
    expect(w[RESOURCE.WOOD]).toBeGreaterThan(0);
  });

  it('TALLADOR pondera stone y wood (trabajo con materiales)', () => {
    const w = intentFilter(ROLE.TALLADOR);
    expect(w[RESOURCE.STONE]).toBeGreaterThan(0);
    expect(w[RESOURCE.WOOD]).toBeGreaterThan(0);
  });

  it('TEJEDOR pondera game (pieles) moderadamente', () => {
    const w = intentFilter(ROLE.TEJEDOR);
    expect(w[RESOURCE.GAME]).toBeGreaterThan(0);
  });

  it('CURANDERO no dirige hacia recursos físicos (peso neutro)', () => {
    const w = intentFilter(ROLE.CURANDERO);
    // Healing no se dedica a forrajeo — no debe tirar del NPC hacia
    // nada concreto. Todos los pesos son 0 o no existen.
    for (const v of Object.values(w)) {
      expect(v).toBe(0);
    }
  });

  it('pesos son enteros pequeños (no distancia-like)', () => {
    // El filtro es un bias aditivo sobre la distancia Manhattan. Un
    // peso entero de 1-3 mueve el desempate pero no hace que un
    // recurso al otro lado del mapa "gane" por afinidad.
    for (const role of Object.values(ROLE) as Role[]) {
      const w = intentFilter(role);
      for (const v of Object.values(w)) {
        expect(Number.isInteger(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThanOrEqual(5);
      }
    }
  });
});
