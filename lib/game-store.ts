import { create } from 'zustand';
import type { GameState } from './game-state';
import { initialGameState } from './game-state';
import { makeDefaultClan } from './default-clan';
import { generateWorld } from './world-gen';

let simulationWorker: Worker | null = null;
let isTicking = false;

function getWorker() {
  if (typeof window === 'undefined') return null;
  if (!simulationWorker) {
    // Añadir un cache-bust en dev para que HMR no use el worker antiguo
    simulationWorker = new Worker(new URL('./simulation.worker.ts', import.meta.url));
  }
  return simulationWorker;
}

// En dev, invalida el worker cuando el módulo se recarga por HMR
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (module as any).hot?.dispose(() => {
    simulationWorker?.terminate();
    simulationWorker = null;
  });
}

interface GameStore {
  state: GameState;
  paused: boolean;
  isTabActive: boolean;
  
  // Acciones
  bootstrap: (seed: number) => void;
  initializeFromDraft: (seed: number, mapType: any, npcs: any[]) => void;
  tick: () => void;
  setPaused: (paused: boolean) => void;
  setIsTabActive: (active: boolean) => void;
  updateState: (fn: (prev: GameState) => GameState) => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  // Configurar listener del worker una sola vez
  const worker = getWorker();
  if (worker) {
    worker.onmessage = (e) => {
      const { type, state, error } = e.data;
      if (type === 'TICK_SUCCESS') {
        set({ state });
      } else if (type === 'TICK_ERROR') {
        console.error('[GameStore] Worker Tick Error:', error);
      }
      isTicking = false;
    };
  }

  return {
    state: initialGameState(1, makeDefaultClan(1)), // Fallback inicial
    paused: false,
    isTabActive: true,

    bootstrap: (seed: number) => {
      set({ state: initialGameState(seed, makeDefaultClan(seed)) });
    },

    initializeFromDraft: (seed: number, mapType: any, npcs: any[]) => {
      const world = generateWorld(seed, { type: mapType });
      set({ 
        state: initialGameState(seed, npcs, world, 'stone', { skipSpawning: false }) 
      });
    },

    tick: () => {
      const { state, paused } = get();
      if (paused || state.era !== 'primigenia' || isTicking) return;
      
      const worker = getWorker();
      if (worker) {
        isTicking = true;
        worker.postMessage({ type: 'TICK', state });
      }
    },

    setPaused: (paused) => set({ paused }),
    
    setIsTabActive: (isTabActive) => set({ isTabActive }),

    updateState: (fn) => set((s) => ({ state: fn(s.state) })),
  };
});
