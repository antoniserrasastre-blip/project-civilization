/**
 * Tests de la persistencia en localStorage.
 *
 * En Node (vitest environment: node), `localStorage` no existe. Los
 * tests validan dos cosas:
 *   1. Que las funciones degradan a no-op sin lanzar cuando no hay
 *      localStorage. Eso permite que la capa de simulación las llame
 *      desde tests sin montar jsdom.
 *   2. Que el round-trip en un mock simple funcione correctamente.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveSnapshot, loadSnapshot, clearSnapshot } from '@/lib/persistence';
import { initialState } from '@/lib/world-state';

describe('persistence — sin localStorage (Node puro)', () => {
  it('saveSnapshot es no-op y no lanza', () => {
    expect(() => saveSnapshot(initialState(42))).not.toThrow();
  });

  it('loadSnapshot devuelve null cuando no hay localStorage', () => {
    expect(loadSnapshot()).toBeNull();
  });

  it('clearSnapshot es no-op y no lanza', () => {
    expect(() => clearSnapshot()).not.toThrow();
  });
});

describe('persistence — con localStorage mockeado', () => {
  // Mockeamos localStorage a nivel global para este bloque. Usamos
  // un objeto con la misma API — no necesitamos jsdom completo.
  const store: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      key: () => null,
      length: 0,
    });
    return () => vi.unstubAllGlobals();
  });

  it('save + load round-trip preserva el estado', () => {
    const original = initialState(42);
    saveSnapshot(original);
    const loaded = loadSnapshot();
    expect(loaded).toEqual(original);
  });

  it('loadSnapshot devuelve null si el save está corrupto', () => {
    store['godgame.state.v1'] = 'this-is-not-json{{';
    expect(loadSnapshot()).toBeNull();
  });

  it('clearSnapshot borra el save', () => {
    saveSnapshot(initialState(42));
    expect(loadSnapshot()).not.toBeNull();
    clearSnapshot();
    expect(loadSnapshot()).toBeNull();
  });
});
