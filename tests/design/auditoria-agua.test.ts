/**
 * AUDITORÍA DE AGUA — reescrita para EL MAR (Sprint 05c, 11-06-2026).
 *
 * HISTORIA: la versión original (Sprint 05) nació del playtest de Toni
 * (10-06-2026) con dos contratos: C1 "nadie pisa agua profunda jamás" y
 * C2 "nadie pasa un día clavado con destino pendiente". C1 MURIÓ por
 * decisión de diseño (11-06-2026): el agua profunda deja de ser pared —
 * se NADA por ella, pero cuesta (A* la cobra a 8 por paso), ralentiza
 * (1 movimiento de cada 3 ticks) y drena (−0.5 sv/tick). El contrato de
 * detalle vive en tests/design/el-mar.test.ts; aquí queda la AUDITORÍA:
 * que el mar nuevo no devuelva los bugs viejos con otra cara.
 *
 * Contratos vigentes:
 *
 *   A. NADAR ES ELECCIÓN DEL A*, NO ACCIDENTE: con una ruta terrestre de
 *      coste comparable, nadie pisa agua profunda. En particular, el
 *      "vector del capataz" (lib/simulation.ts:216-229) NO puede empujar
 *      a un seguidor al mar: su validación (isMovementPassable, :226)
 *      hoy rechaza WATER; cuando WATER sea transitable, copiar el vector
 *      a ciegas volvería a ser el MODO 1 de la auditoría original
 *      (e1-3 empujado de la orilla al mar abierto, archipelago seed 3).
 *      Nadar solo cuando el A* decide que compensa.
 *
 *   B. NADIE QUEDA VARADO (el C2 original, casi tal cual): ningún NPC
 *      vivo pasa un día entero quieto con destino pendiente. Con el mar
 *      transitable esto se REFUERZA: del agua siempre se puede salir
 *      (el MODO 2 original — findPath null desde origen intransitable —
 *      deja de existir por construcción).
 *
 *   C. NADIE MUERE AHOGADO POR PATHING TONTO: en el laboratorio
 *      (makeLaboratorioState(1), 5 días, sin designios suicidas) cero
 *      muertes con causa mar («se lo llevó el mar», el-mar contrato 3).
 *      El mar es un riesgo que se ELIGE, no una trampa del pathfinding.
 *
 * ESTADO AL NACER (verificado 11-06-2026): A, B y C nacen VERDES —
 * los fixes de la auditoría original (validación del vector, origen
 * intransitable en findPath) siguen en el código y hoy nadie nada ni se
 * ahoga porque el agua sigue siendo pared. Son guardarraíles: deben
 * SEGUIR verdes cuando el implementer abra el mar (el riesgo real es la
 * validación del vector del capataz aceptando WATER como "passable" y
 * recreando el empujón al mar, y los exploradores muriendo a nado).
 *
 * NOTA phasedMode: makeLaboratorioState congela en el anochecer
 * (phase: 'preparation'); aquí se cruza el límite del día con
 * `phasedMode: false` vía spread, para auditar días completos sin pasar
 * por applyAssignments.
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { initialGameState, type GameState } from '@/lib/game-state';
import { TICKS_PER_DAY } from '@/lib/resources';
import { TILE } from '@/lib/world-state';
import { CRAFTABLE } from '@/lib/crafting';
import { LABORATORIO_FEATURES, makeLaboratorioState } from '@/lib/laboratorio';
import { makeTestNPC, makeFullInventory } from '../helpers/npc-fixtures';

// ————————————————————————————————————————————————————————————————
// Helpers
// ————————————————————————————————————————————————————————————————

function tileEn(s: GameState, x: number, y: number): number | undefined {
  if (x < 0 || y < 0 || x >= s.world.width || y >= s.world.height) return undefined;
  return s.world.tiles[y * s.world.width + x];
}

/** Pasillo mínimo: hierba 12×8 con una franja de agua PROFUNDA en y=2
 *  (x=3..7). Capataz en (2,1) y seguidor en (2,2), ambos asignados a la
 *  misma obra en (7,1) → destino compartido → vector de capataz activo.
 *  CLAVE para el contrato A: la ruta terrestre (por y=1/y=0) tiene coste
 *  mínimo — meterse al agua NUNCA compensa en este mapa. */
function makeEscenarioObraJuntoAlAgua(): GameState {
  const W = 12, H = 8;
  const tiles = new Array(W * H).fill(TILE.GRASS);
  for (const x of [3, 4, 5, 6, 7]) tiles[2 * W + x] = TILE.WATER;
  const world = {
    seed: 0, width: W, height: H, tiles,
    resources: [], influence: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
  };
  // Con bayas en el zurrón: el auditado come y no muere de inanición —
  // el atasco (B) se observa limpio, sin que la muerte corte el contador.
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

/** Corre `dias` días y registra cada entrada de un NPC VIVO en agua
 *  profunda (o fuera del mapa), más el máximo de ticks consecutivos
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

      // A — agua profunda (se registra solo la ENTRADA para no inundar el diff)
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

      // B — clavado con destino pendiente: el contador crece si no se ha
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

describe('Auditoría — el mar transitable no devuelve los bugs viejos (El Mar, 11-06-2026)', () => {
  it('A: nadar es elección del A*, no accidente — con ruta terrestre de coste comparable, nadie pisa agua profunda', () => {
    // La obra está en la misma orilla: la ruta seca por y=1/y=0 ya es de
    // longitud manhattan mínima, así que el agua (coste 8/paso) JAMÁS
    // compensa. Si alguien acaba en el agua aquí, es el vector del capataz
    // empujando al seguidor (MODO 1 original) — no una decisión del A*.
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
    expect(pisadas, 'NPCs en agua profunda sin que el A* lo haya elegido').toEqual([]);
  });

  it('B: nadie queda VARADO — ningún NPC pasa un día entero quieto con destino pendiente', { timeout: 60000 }, () => {
    // El C2 original sobrevive casi tal cual. Con el mar transitable se
    // refuerza: del agua siempre se sale (el "varado para siempre" del
    // MODO 2 — findPath null por origen intransitable — muere por diseño).
    const { maxClavado, peorClavado } = auditar(makeEscenarioObraJuntoAlAgua(), 2);
    expect(
      maxClavado,
      `máximo de ticks consecutivos quieto con destino pendiente (peor: ${peorClavado})`,
    ).toBeLessThan(TICKS_PER_DAY);
  });

  it('C: nadie muere ahogado por pathing tonto — laboratorio 5 días sin designios, cero muertes con causa mar', { timeout: 300000 }, () => {
    // makeLaboratorioState(1): pangea 32×32, 4 NPCs, flags OFF, comida
    // escasa. Nadie les ordena nada (sin designios suicidas): si alguien
    // muere con «se lo llevó el mar», el pathfinding lo metió a nadar por
    // su cuenta más allá de lo que su vida aguantaba. Eso es bug, no riesgo.
    let s: GameState = { ...makeLaboratorioState(1), phasedMode: false };
    const muertesMar: string[] = [];
    for (let t = 0; t < 5 * TICKS_PER_DAY; t++) {
      s = tick(s);
      for (const e of s.chronicle) {
        if (e.type === 'death' && e.text.includes('se lo llevó el mar') && !muertesMar.includes(e.text)) {
          muertesMar.push(e.text);
        }
      }
    }
    expect(muertesMar, 'muertes narradas como ahogamiento en 5 días de laboratorio').toEqual([]);
  });
});
