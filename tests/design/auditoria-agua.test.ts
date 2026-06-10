/**
 * AUDITORÍA DE AGUA — Sprint 05 (El Laboratorio).
 *
 * No testea funciones: testea el CONTRATO observable del playtest de Toni
 * (10-06-2026): "se veían NPCs metidos en tiles de agua o atascados sin
 * avanzar". Dos contratos:
 *
 *   C1. Ningún NPC vivo pisa agua profunda (TILE.WATER) jamás.
 *   C2. Ningún NPC vivo pasa un día entero clavado en el mismo tile
 *       con un destino pendiente (destination ≠ position).
 *
 * ROJO HOY — diagnóstico (cadena causal verificada con scripts de barrido
 * el 10/11-06-2026: pangea 32×32 25 seeds × 5 días → 0 eventos (la costa
 * por NPC es poca); archipelago 32×32 → repro orgánica en seed 3; en los
 * mapas acuosos los días 3+ además se ARRASTRAN porque los findPath
 * fallidos queman maxExpand cada tick — ver MODO 2):
 *
 *   MODO 1 — "el vector del capataz" (lib/simulation.ts:216-218):
 *   cuando varios NPCs comparten destino, el primero del grupo (capataz)
 *   calcula A* y publica su paso como vector; los seguidores a distancia
 *   ≤3 aplican ese vector A SU PROPIA posición SIN validar límites ni
 *   transitabilidad (isMovementPassable, lib/simulation.ts:80). Resultado:
 *   el seguidor es empujado a TILE.WATER (o fuera del mapa). Repro
 *   orgánica: archipelago seed=3, tick=1606 — e1-3 pasa de SHALLOW_WATER
 *   (10,4) a WATER (10,3) compartiendo destino (9,4) con e0-3.
 *
 *   MODO 2 — "varado para siempre": una vez sobre TILE.WATER no hay
 *   salida: findPath corta si el tile de ORIGEN es intransitable
 *   (lib/pathfinding.ts:46 → null) y el BFS de alcanzabilidad devuelve
 *   set vacío desde agua (lib/simulation.ts:90), así que tickMovement
 *   re-publica al NPC quieto con destino pendiente cada tick
 *   (lib/simulation.ts:226). El NPC queda clavado en el agua hasta morir
 *   de inanición (verificado en el script de repro: sin comida muere hacia
 *   el tick ~400; en C2 lleva bayas para poder observar el día entero).
 *
 * Los escenarios mínimos de abajo (pasillo de hierba con franja de agua,
 * obra compartida) reproducen ambos modos en <1s y de forma determinista.
 *
 * NOTA phasedMode: makeLaboratorioState congela en el anochecer
 * (phase: 'preparation'); aquí se cruza el límite del día con
 * `phasedMode: false` vía spread (mismo patrón del barrido de repro),
 * para auditar días completos sin pasar por applyAssignments.
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { initialGameState, type GameState } from '@/lib/game-state';
import { generateWorld } from '@/lib/world-gen';
import { TICKS_PER_DAY } from '@/lib/resources';
import { TILE } from '@/lib/world-state';
import { CRAFTABLE } from '@/lib/crafting';
import { LABORATORIO_FEATURES } from '@/lib/laboratorio';
import { startDraft, pickArchetype, setSex, finalizeBlockA } from '@/lib/drafting';
import { ARCHETYPE, SEX } from '@/lib/npcs';
import { makeTestNPC, makeFullInventory } from '../helpers/npc-fixtures';

// ————————————————————————————————————————————————————————————————
// Helpers
// ————————————————————————————————————————————————————————————————

function tileEn(s: GameState, x: number, y: number): number | undefined {
  if (x < 0 || y < 0 || x >= s.world.width || y >= s.world.height) return undefined;
  return s.world.tiles[y * s.world.width + x];
}

/** Laboratorio "acuoso": mismo patrón que makeLaboratorioState
 *  (draft fijo 4 NPCs + skipSpawning: false) pero mapa archipelago —
 *  pequeño y con mucha costa, donde la repro orgánica es frecuente. */
function makeMundoAcuoso(seed: number): GameState {
  const world = generateWorld(seed, { width: 32, height: 32, type: 'archipelago' });
  let draft = startDraft(seed);
  const picks = [
    { archetype: ARCHETYPE.CAZADOR, sex: SEX.M },
    { archetype: ARCHETYPE.ARTESANO, sex: SEX.F },
    { archetype: ARCHETYPE.RECOLECTOR, sex: SEX.M },
    { archetype: ARCHETYPE.SCOUT, sex: SEX.F },
  ];
  picks.forEach((p, i) => {
    draft = pickArchetype(draft, i, p.archetype);
    draft = setSex(draft, i, p.sex);
  });
  const base = initialGameState(seed, finalizeBlockA(draft), world, 'stone', { skipSpawning: false });
  return { ...base, phasedMode: false, features: { ...LABORATORIO_FEATURES } };
}

/** Pasillo mínimo: hierba 12×8 con una franja de agua PROFUNDA en y=2
 *  (x=3..7). Capataz en (2,1) y seguidor en (2,2), ambos asignados a la
 *  misma obra en (7,1) → destino compartido → vector de capataz activo. */
function makeEscenarioObraJuntoAlAgua(): GameState {
  const W = 12, H = 8;
  const tiles = new Array(W * H).fill(TILE.GRASS);
  for (const x of [3, 4, 5, 6, 7]) tiles[2 * W + x] = TILE.WATER;
  const world = {
    seed: 0, width: W, height: H, tiles,
    resources: [], influence: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
  };
  // Con bayas en el zurrón: el varado come y NO muere de inanición durante
  // la auditoría — el atasco (C2) se observa limpio, sin que la muerte
  // corte el contador antes de cumplir el día.
  const npcs = [
    { ...makeTestNPC({ id: 'capataz', position: { x: 2, y: 1 }, inventory: makeFullInventory({ berry: 40 }) }), designio: 'construccion' as const },
    { ...makeTestNPC({ id: 'seguidor', position: { x: 2, y: 2 }, inventory: makeFullInventory({ berry: 40 }) }), designio: 'construccion' as const },
  ];
  const base = initialGameState(7, npcs, world as never, 'stone', { skipSpawning: true });
  return {
    ...base,
    features: { ...LABORATORIO_FEATURES },
    buildProject: {
      id: 'bp-auditoria', kind: CRAFTABLE.FOGATA_PERMANENTE,
      position: { x: 7, y: 1 }, startedAtTick: 0, progress: 0,
      required: 100 * TICKS_PER_DAY, // obra larga: el destino compartido persiste
    },
  };
}

interface PisadaEnAgua { tick: number; npc: string; pos: string; dest: string }

/** Corre `dias` días y registra cada tick en que un NPC VIVO está sobre
 *  agua profunda (o fuera del mapa), más el máximo de ticks consecutivos
 *  que alguien pasa clavado (misma posición) con destino pendiente. */
function auditar(s0: GameState, dias: number) {
  let s = s0;
  const pisadas: PisadaEnAgua[] = [];
  const enAgua = new Set<string>();
  const clavadoDesde = new Map<string, number>(); // ticks acumulados quieto-queriendo-moverse
  const prevPos = new Map<string, string>();
  let maxClavado = 0;
  let peorClavado = '';

  for (let t = 0; t < dias * TICKS_PER_DAY; t++) {
    s = tick(s);
    for (const n of s.npcs) {
      if (!n.alive) continue;
      const { x, y } = n.position;
      const tile = tileEn(s, x, y);
      const key = n.id;

      // C1 — agua profunda (se registra solo la ENTRADA para no inundar el diff)
      if (tile === undefined || tile === TILE.WATER) {
        if (!enAgua.has(key)) {
          enAgua.add(key);
          pisadas.push({
            tick: s.tick, npc: n.id, pos: `(${x},${y})`,
            dest: `(${n.destination?.x},${n.destination?.y})`,
          });
        }
      } else {
        enAgua.delete(key);
      }

      // C2 — clavado con destino pendiente: el contador crece si no se ha
      // movido Y quiere moverse; se mantiene si no quiere; se resetea al moverse.
      const posKey = `${x},${y}`;
      const seMovio = prevPos.get(key) !== undefined && prevPos.get(key) !== posKey;
      const quiereMoverse = !!n.destination && (n.destination.x !== x || n.destination.y !== y);
      if (seMovio) {
        clavadoDesde.set(key, 0);
      } else if (quiereMoverse) {
        const c = (clavadoDesde.get(key) ?? 0) + 1;
        clavadoDesde.set(key, c);
        if (c > maxClavado) {
          maxClavado = c;
          peorClavado = `${n.id} en (${x},${y}) → dest (${n.destination!.x},${n.destination!.y}), tick=${s.tick}`;
        }
      }
      prevPos.set(key, posKey);
    }
  }
  return { state: s, pisadas, maxClavado, peorClavado };
}

// ————————————————————————————————————————————————————————————————
// Auditorías
// ————————————————————————————————————————————————————————————————

describe('Auditoría — NPCs en el agua y atascos de movimiento (playtest 10-06-2026)', () => {
  // 4 días de sim 32×32 — timeout propio, generoso para CI.
  it('C1 orgánico: ningún NPC vivo pisa agua profunda jamás (laboratorio acuoso, seed 3)', { timeout: 300000 }, () => {
    // BUG HOY (modo 1): en el día 4 (tick 1606), e1-3 comparte destino con
    // e0-3 y el vector del capataz lo empuja de la orilla (SHALLOW_WATER)
    // al mar abierto (TILE.WATER), de donde ya no puede salir.
    const { pisadas } = auditar(makeMundoAcuoso(3), 4);
    expect(pisadas, 'entradas de NPCs vivos en agua profunda (tick/npc/pos/dest)').toEqual([]);
  });

  it('C1 mínimo: el seguidor de una obra compartida no es empujado al agua por el vector del capataz', () => {
    // BUG HOY (modo 1, determinista en <1s): capataz y seguidor marchan a la
    // misma obra; el seguidor copia el paso del capataz sin validar el tile
    // (lib/simulation.ts:218) y cae al agua en el primer tick.
    let s = makeEscenarioObraJuntoAlAgua();
    const pisadas: string[] = [];
    for (let t = 0; t < 30; t++) {
      s = tick(s);
      for (const n of s.npcs) {
        if (!n.alive) continue;
        if (tileEn(s, n.position.x, n.position.y) === TILE.WATER) {
          pisadas.push(`tick=${s.tick} ${n.id} en agua en (${n.position.x},${n.position.y})`);
        }
      }
    }
    expect(pisadas, 'ticks con un NPC vivo sobre TILE.WATER').toEqual([]);
  });

  it('C2: nadie pasa un día entero clavado con destino pendiente (varado en el agua tras perder al capataz)', { timeout: 60000 }, () => {
    // BUG HOY (modo 2): cuando el capataz llega a la obra deja de publicar
    // vector; el seguidor, varado en agua profunda, no puede calcular camino
    // (findPath corta por origen intransitable, lib/pathfinding.ts:46) y se
    // queda quieto con destino pendiente día tras día, hasta morir.
    const { maxClavado, peorClavado } = auditar(makeEscenarioObraJuntoAlAgua(), 2);
    expect(
      maxClavado,
      `máximo de ticks consecutivos quieto con destino pendiente (peor: ${peorClavado})`,
    ).toBeLessThan(TICKS_PER_DAY);
  });
});
