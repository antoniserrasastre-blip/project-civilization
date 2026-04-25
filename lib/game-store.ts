import { create } from 'zustand';
import type { GameState } from './game-state';
import { initialGameState } from './game-state';
import { makeDefaultClan } from './default-clan';
import { tick as tickSim } from './simulation';
import { generateWorld } from './world-gen';

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

export const useGameStore = create<GameStore>((set, get) => ({
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
    const { state, paused, isTabActive } = get();
    if (paused || state.era !== 'primigenia') return;
    
    set((s) => ({
      state: tickSim(s.state)
    }));
  },

  setPaused: (paused) => set({ paused }),
  
  setIsTabActive: (isTabActive) => set({ isTabActive }),

  updateState: (fn) => set((s) => ({ state: fn(s.state) })),
}));
