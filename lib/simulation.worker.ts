import { tick } from './simulation';
import type { GameState } from './game-state';

/**
 * Web Worker para la simulación del mundo.
 * Ejecuta el tick de simulación fuera del hilo principal de UI.
 */

self.onmessage = (e: MessageEvent) => {
  const { type, state } = e.data;

  if (type === 'TICK') {
    try {
      const nextState = tick(state as GameState);
      self.postMessage({ type: 'TICK_SUCCESS', state: nextState });
    } catch (error) {
      console.error('[SimulationWorker] Error during tick:', error);
      self.postMessage({ type: 'TICK_ERROR', error: (error as Error).message });
    }
  }
};
