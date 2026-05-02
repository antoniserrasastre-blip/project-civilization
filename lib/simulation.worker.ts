import { tick } from './simulation';
import type { GameState } from './game-state';

/**
 * Web Worker para la simulación del mundo.
 * Ejecuta el tick de simulación fuera del hilo principal de UI.
 */

const LOG_INTERVAL = 96; // cada ~12 segundos de juego (2 veces por día)

self.onmessage = (e: MessageEvent) => {
  const { type, state } = e.data;

  if (type === 'TICK') {
    try {
      const nextState = tick(state as GameState);

      // LOG periódico para diagnóstico de balance
      if (nextState.tick % LOG_INTERVAL === 0) {
        const alive = nextState.npcs.filter((n: any) => n.alive);
        const day = Math.floor(nextState.tick / 480);
        const avgSv = alive.length ? Math.round(alive.reduce((s: number, n: any) => s + n.stats.supervivencia, 0) / alive.length) : 0;
        const avgSoc = alive.length ? Math.round(alive.reduce((s: number, n: any) => s + n.stats.socializacion, 0) / alive.length) : 0;
        const totalFood = alive.reduce((s: number, n: any) => s + n.inventory.berry + n.inventory.fish + n.inventory.game, 0);
        const atDest = alive.filter((n: any) => n.destination && n.destination.x === n.position.x && n.destination.y === n.position.y).length;
        const structs = nextState.structures.map((s: any) => s.kind).join(', ') || '—';
        const faithStr = Math.floor(nextState.village.faith);
        const gratStr = Math.floor(nextState.village.gratitude);
        console.log(
          `[T${nextState.tick}|D${day}] NPCs:${alive.length} sv:${avgSv} soc:${avgSoc} | food_inv:${totalFood} | parados:${atDest}/${alive.length} | fe:${faithStr} grat:${gratStr} | structs:[${structs}]`
        );
        // Log detallado si hay muchos NPCs parados
        if (atDest > alive.length * 0.5) {
          alive.forEach((n: any) => {
            const atPos = n.destination && n.destination.x === n.position.x && n.destination.y === n.position.y;
            const food = n.inventory.berry + n.inventory.fish + n.inventory.game;
            console.log(`  ⚠ ${n.name} [${n.vocation}] sv:${Math.round(n.stats.supervivencia)} food:${food} ${atPos ? '🔴PARADO' : '→moving'} pos:(${n.position.x},${n.position.y})`);
          });
        }
      }

      self.postMessage({ type: 'TICK_SUCCESS', state: nextState });
    } catch (error) {
      console.error('[SimulationWorker] Error during tick:', error);
      self.postMessage({ type: 'TICK_ERROR', error: (error as Error).message });
    }
  }
};
