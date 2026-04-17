/**
 * Integración: tick + persistencia.
 *
 * Escenario: el jugador deja pasar días, el mundo se persiste, luego
 * recarga la página. Tras recargar, el estado debe ser idéntico (round-trip
 * exacto) y un siguiente tick desde el estado cargado debe producir lo
 * mismo que un tick desde el estado en memoria.
 *
 * Si este test falla, es porque la persistencia está perdiendo o
 * deformando información del WorldState — el bug clásico que rompe los
 * replays y los saves cargados.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initialState } from '@/lib/world-state';
import { tick, runTicks } from '@/lib/simulation';
import { saveSnapshot, loadSnapshot, clearSnapshot } from '@/lib/persistence';

describe('integración: tick + persistencia', () => {
  // Mock de localStorage (reutilizamos el mismo patrón que en el test
  // unitario de persistence para no depender de jsdom).
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

  it('save → load → tick equivale a tick directo desde memoria', () => {
    const s = runTicks(initialState(42), 50);
    saveSnapshot(s);
    const loaded = loadSnapshot();
    expect(loaded).not.toBeNull();

    const fromLoaded = tick(loaded!);
    const fromMemory = tick(s);
    expect(fromLoaded).toEqual(fromMemory);
  });

  it('1000 ticks con save intermedio no divergen de la simulación sin save', () => {
    // Simulación A: 1000 ticks en una ventana continua.
    const directFinal = runTicks(initialState(42), 1000);

    // Simulación B: 500 ticks, save, load, 500 ticks más.
    const mid = runTicks(initialState(42), 500);
    saveSnapshot(mid);
    const restored = loadSnapshot();
    expect(restored).not.toBeNull();
    const viaSaveFinal = runTicks(restored!, 500);

    expect(viaSaveFinal).toEqual(directFinal);
  });

  it('clearSnapshot borra el save y fuerza partida nueva', () => {
    saveSnapshot(initialState(42));
    expect(loadSnapshot()).not.toBeNull();
    clearSnapshot();
    expect(loadSnapshot()).toBeNull();
  });
});
