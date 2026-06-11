/**
 * AUDITORÍA DE GAMEPLAY — Sprint 05 (línea C, "El pulso del día").
 *
 * No testea funciones: testea COMPORTAMIENTO del juego a lo largo de días,
 * con el motor puro (determinista, ~6s/día). Cada auditoría que falla es un
 * bug de jugabilidad; cada una que pasa queda como regresión permanente.
 *
 * ROJO HOY (bug del playtest de Toni, 10-06-2026): el miedo sube de noche,
 * satura a 100 tras la primera noche y nunca se recupera → la "urgencia
 * suprema" clava a los NPCs en la fogata desde el día 2 (2-4 tiles/día).
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { initialGameState } from '@/lib/game-state';
import { TICKS_PER_DAY } from '@/lib/resources';
import { makeTestNPC, makeFullInventory } from '../helpers/npc-fixtures';

function runDays(seed: number, days: number, designios: (string | null)[] = [null, null, null, null]) {
  const npcs = [0, 1, 2, 3].map((i) => ({
    ...makeTestNPC({ id: `n${i}`, position: { x: 0, y: 0 }, inventory: makeFullInventory({ berry: 30 }) }),
    ...(designios[i] ? { designio: designios[i] as any } : {}),
  }));
  let s = initialGameState(seed, npcs); // mundo real 512×512 + spawn costero
  const tilesPerDay: number[][] = [];
  const fearEndOfDay: number[][] = [];
  const harvestedPerDay: number[][] = [];
  for (let day = 0; day < days; day++) {
    const visited = s.npcs.map(() => new Set<string>());
    for (let t = 0; t < TICKS_PER_DAY; t++) {
      s = tick(s);
      s.npcs.forEach((n, i) => { if (n.alive) visited[i].add(`${n.position.x},${n.position.y}`); });
      // El amanecer (último tick del día) borra dailyActivity: muestreamos justo antes.
      if (t === TICKS_PER_DAY - 2) harvestedPerDay.push(s.npcs.map((n) => n.dailyActivity?.harvested ?? 0));
    }
    tilesPerDay.push(visited.map((v) => v.size));
    fearEndOfDay.push(s.npcs.map((n) => Math.round(n.stats.miedo ?? 0)));
  }
  return { state: s, tilesPerDay, fearEndOfDay, harvestedPerDay };
}

describe('Auditoría — movilidad y miedo (multi-día, mundo real)', () => {
  // runDays con mundo real tarda ~20s — timeout propio, por encima de los 15s default.
  it('los NPCs CON DESIGNIO siguen móviles los días 2 y 3 (el juego es designio-driven)', { timeout: 60000 }, () => {
    // Contrato del loop C: el jugador asigna designios cada noche. El NPC
    // dirigido NO puede colapsar a la holgazanería tras la primera noche.
    // (El libre puede holgazanear — la errancia por aburrimiento es deuda
    // de diseño registrada, no contrato de este sprint.)
    const { state, tilesPerDay, harvestedPerDay } = runDays(42, 3, ['exploracion', 'recoleccion', 'exploracion', null]);
    expect(state.npcs.filter((n) => n.alive).length).toBeGreaterThan(0);
    for (let day = 1; day < tilesPerDay.length; day++) {
      // Exploradores: su métrica es MOVIMIENTO (deben patear la frontera).
      for (const i of [0, 2]) {
        expect(tilesPerDay[day][i], `día ${day + 1}, n${i} (exploracion): tiles`).toBeGreaterThanOrEqual(8);
      }
      // Recolector: su métrica es PRODUCCIÓN (clavado en la baya = trabajando).
      expect(harvestedPerDay[day][1], `día ${day + 1}, n1 (recoleccion): harvested`).toBeGreaterThan(0);
    }
  });

  it('el recolector se COMPROMETE con su recurso: sin sillas musicales entre dos objetivos', async () => {
    // Repro del playtest 10-06-2026: dos recolectores entre dos bayas
    // equidistantes oscilaban de destino CADA tick (16 flips/40 ticks) por
    // las reclamaciones de tiles. Contrato: histéresis — pocos cambios de
    // destino y al menos un recolector cosechando.
    const { TILE, RESOURCE } = await import('@/lib/world-state');
    const world = {
      seed: 0, width: 24, height: 24, tiles: new Array(576).fill(TILE.GRASS),
      resources: [
        { id: RESOURCE.BERRY, x: 6, y: 12, quantity: 500, initialQuantity: 500, regime: 'regenerable' as const, depletedAtTick: null },
        { id: RESOURCE.BERRY, x: 18, y: 12, quantity: 500, initialQuantity: 500, regime: 'regenerable' as const, depletedAtTick: null },
      ], meta: { generatorVersion: 1, shaHash: '', islandCount: 1 }, influence: [],
    };
    const npcs = [0, 1].map((i) => ({ ...makeTestNPC({ id: `g${i}`, position: { x: 12, y: 12 } }), designio: 'recoleccion' as const }));
    let s = initialGameState(5, npcs, world, 'stone', { skipSpawning: true });
    // 05d: el compromiso se mide MIENTRAS pueden cosechar — al llegar al cap
    // de bayas (20, hacia el tick ~25) soltar el nodo es lo correcto (ningún
    // nodo del tipo lleno es objetivo; sin almacén aquí, buscan otra cosa).
    const dests: string[][] = [[], []];
    for (let t = 0; t < 40; t++) {
      s = tick(s);
      s.npcs.forEach((n, i) => {
        if (n.inventory.berry < 20) dests[i].push(`${n.destination?.x},${n.destination?.y}`);
      });
    }
    dests.forEach((d, i) => {
      let flips = 0;
      for (let k = 1; k < d.length; k++) if (d[k] !== d[k - 1]) flips++;
      expect(flips, `g${i}: cambios de destino con cap libre (${d.length} ticks medidos)`).toBeLessThanOrEqual(4);
      expect(d.length, `g${i}: ventana de medición no vacía`).toBeGreaterThan(10);
    });
    expect(s.npcs.some((n) => (n.dailyActivity?.harvested ?? 0) > 0)).toBe(true);
  });

  it('el miedo NO es un bucle absorbente: se recupera de día (nadie acaba 2 días seguidos a 100)', { timeout: 60000 }, () => {
    const { fearEndOfDay } = runDays(42, 3);
    // BUG HOY: miedo = 100 constante desde el final del día 1.
    for (let day = 1; day < fearEndOfDay.length; day++) {
      fearEndOfDay[day].forEach((fear, i) => {
        const yesterday = fearEndOfDay[day - 1][i];
        expect(fear === 100 && yesterday === 100, `n${i} saturado 2 días seguidos (día ${day + 1})`).toBe(false);
      });
    }
  });
});
