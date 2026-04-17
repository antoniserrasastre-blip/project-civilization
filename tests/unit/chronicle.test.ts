/**
 * Tests de las plantillas partisanas del cronista.
 *
 * Valida la voz (§9 del Vision Document): el cronista NO es neutral.
 * Habla de "los nuestros" para el grupo del jugador; de "los hijos de X"
 * para los grupos rivales (v0.3-ready).
 *
 * No comprobamos prosa exacta — eso es fragil. Comprobamos marcadores
 * léxicos que indican si la voz es la correcta.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState, type NPC } from '@/lib/world-state';
import {
  formatDate,
  narrateBirth,
  narrateDeath,
  narrateConflict,
  narrateAnointment,
  narrateGift,
  appendChronicle,
} from '@/lib/chronicle';

const freshState = (): WorldState => initialState(42);

function foreigner(base: NPC, overrides: Partial<NPC> = {}): NPC {
  return {
    ...base,
    id: 'npc_foreign_test',
    name: 'Joan Foraster',
    group_id: 'rival_clan',
    ...overrides,
  };
}

describe('formatDate', () => {
  it('día 0 → Año 0, día 1', () => {
    expect(formatDate(0)).toBe('Año 0, día 1');
  });

  it('día 365 → Año 1, día 1', () => {
    expect(formatDate(365)).toBe('Año 1, día 1');
  });

  it('día 730 → Año 2, día 1', () => {
    expect(formatDate(730)).toBe('Año 2, día 1');
  });
});

describe('narrateBirth — voz partisana', () => {
  it('habla de "los nuestros" para un nacimiento del grupo del jugador', () => {
    const s = freshState();
    const entry = narrateBirth(s, s.npcs[0]);
    expect(entry.text).toMatch(/los nuestros/);
    expect(entry.text).toContain(s.npcs[0].name);
  });

  it('habla de "los hijos de X" para un nacimiento de un grupo rival (v0.3-ready)', () => {
    const s = freshState();
    const s2: WorldState = {
      ...s,
      groups: [...s.groups, { id: 'rival_clan', name: 'Hijos del Migjorn' }],
    };
    const entry = narrateBirth(s2, foreigner(s.npcs[0]));
    expect(entry.text).toMatch(/hijos de Hijos del Migjorn|hijos de Migjorn/);
    expect(entry.text).not.toMatch(/los nuestros/);
  });
});

describe('narrateDeath — voz partisana', () => {
  it('habla de "de los nuestros" para muerte propia', () => {
    const s = freshState();
    const entry = narrateDeath(s, s.npcs[0]);
    expect(entry.text).toMatch(/de los nuestros/);
  });

  it('menciona la edad en inviernos', () => {
    const s = freshState();
    const entry = narrateDeath(s, s.npcs[0]);
    expect(entry.text).toMatch(/inviernos/);
  });
});

describe('narrateConflict — tono según quién mata a quién', () => {
  it('fratricidio (nuestro mata a nuestro): tono trágico', () => {
    const s = freshState();
    const [killer, victim] = s.npcs;
    const entry = narrateConflict(s, killer, victim, 'un ciervo');
    expect(entry.text).toMatch(/mancha la primera página|trágico|los nuestros/i);
  });

  it('victoria propia (nuestro mata a rival): tono mesurado, identifica al rival', () => {
    const s = freshState();
    const s2: WorldState = {
      ...s,
      groups: [...s.groups, { id: 'rival_clan', name: 'Migjorn' }],
    };
    const killer = s.npcs[0];
    const victim = foreigner(s.npcs[1]);
    const entry = narrateConflict(s2, killer, victim, 'agua');
    expect(entry.text).toContain(killer.name);
    expect(entry.text).toContain('Migjorn');
    expect(entry.text).toMatch(/de los nuestros/);
  });

  it('caída propia (rival mata a nuestro): tono de lamento', () => {
    const s = freshState();
    const s2: WorldState = {
      ...s,
      groups: [...s.groups, { id: 'rival_clan', name: 'Migjorn' }],
    };
    const killer = foreigner(s.npcs[0]);
    const victim = s.npcs[1];
    const entry = narrateConflict(s2, killer, victim, 'tierra');
    expect(entry.text).toMatch(/no olvidaremos|cayó/i);
    expect(entry.text).toContain(victim.name);
  });
});

describe('narrateAnointment', () => {
  it('marca al Elegido con voz ritual', () => {
    const s = freshState();
    const entry = narrateAnointment(s, s.npcs[0]);
    expect(entry.text).toMatch(/dios|mirada|destino/i);
    expect(entry.text).toContain(s.npcs[0].name);
  });
});

describe('narrateGift', () => {
  it('menciona el don por nombre', () => {
    const s = freshState();
    const entry = narrateGift(s, s.npcs[0], 'Fuerza Sobrehumana');
    expect(entry.text).toContain('Fuerza Sobrehumana');
    expect(entry.text).toContain(s.npcs[0].name);
  });
});

describe('appendChronicle — pureza', () => {
  it('devuelve un estado nuevo con la entrada al final', () => {
    const s = freshState();
    const entry = narrateAnointment(s, s.npcs[0]);
    const next = appendChronicle(s, entry);
    expect(next.chronicle).toHaveLength(s.chronicle.length + 1);
    expect(next.chronicle.at(-1)).toEqual(entry);
  });

  it('no muta el estado original', () => {
    const s = freshState();
    const snapshot = JSON.stringify(s);
    appendChronicle(s, narrateAnointment(s, s.npcs[0]));
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
