/**
 * EL MAR — Sprint 05c (decisión de diseño de Toni, 11-06-2026).
 *
 * El agua profunda (TILE.WATER) DEJA DE SER PARED: se puede nadar por
 * toda el agua, pero el mar cobra. Cuatro contratos observables:
 *
 *   1. TRANSITABLE CON COSTE — isMovementPassable (lib/simulation.ts:80)
 *      acepta WATER y el A* (lib/pathfinding.ts) cobra coste de terreno:
 *      tile WATER = 8 por paso, resto = 1 (enteros, ratio 8:1; la
 *      heurística manhattan sigue siendo admisible). Observable: con un
 *      desvío terrestre barato se elige tierra; un estrecho de 2 tiles
 *      frente a ~35 pasos por la costa se cruza a nado.
 *
 *   2. LENTO Y DRENA — en WATER el NPC se mueve 1 de cada
 *      SWIM_TICK_INTERVAL = 3 ticks (constante existente en
 *      lib/simulation.ts:58; hoy el throttle de lib/simulation.ts:241
 *      solo aplica a SHALLOW_WATER y usa el literal `% 3`). Drenaje:
 *      −0.5 sv/tick sobre WATER (en tickNeeds, lib/needs.ts, junto a los
 *      decays). En WATER NO opera la recuperación pasiva por agua
 *      (lib/needs.ts:546-547 — único call-site de recuperación por agua).
 *
 *   3. AHOGAMIENTO — la muerte sigue viviendo donde vive (tickNeeds pone
 *      alive=false al llegar sv≤0, lib/needs.ts:598; la crónica nace en
 *      tickCultureAndSocial, lib/simulation.ts:528, vía
 *      narrate({type:'death', cause:'agotamiento'})). Si el NPC muere
 *      SOBRE un tile WATER, la entrada (type 'death') dice
 *      «se lo llevó el mar».
 *
 *   4. TECHO 40 GLOBAL — la recuperación pasiva por agua satura en 40,
 *      no en 70 (lib/needs.ts:546-547; búsqueda 11-06-2026: no hay otro
 *      sitio que recupere sv por agua). Un día de hambre ya no se borra:
 *      quien cierra el día con sv<40 NO amanece a 70.
 *
 * NACE ROJO HOY (verificado 11-06-2026):
 *   - "cruza el estrecho": el A* esquiva el agua y rodea por el puente
 *     (camino largo y seco) — ni corto ni mojado.
 *   - "cruza el canal / throttle": findPath devuelve null (canal sin
 *     alternativa terrestre) → el nadador no se mueve jamás.
 *   - "drenaje" y "no-recuperación": el drenaje no existe; la
 *     recuperación pasiva sí opera (sube +5 hasta 70 estés donde estés).
 *   - "se lo llevó el mar": hoy toda muerte narra «(agotamiento)».
 *   - "techo 40" y "no amanece curado": el techo es 70.
 *
 * VERDES A PROPÓSITO (guardarraíles del contrato, no placeholders):
 *   - "elige tierra": hoy el agua es pared y el desvío terrestre ya es
 *     la única opción; tras el cambio sigue debiendo elegir tierra.
 *   - "morir en tierra": agotamiento sigue siendo agotamiento.
 *   - determinismo y round-trip (§A4): valen hoy y deben seguir valiendo
 *     cuando haya nado de verdad.
 *
 * Estilo auditoria-agua: mundos pequeños montados a mano, sin generador.
 * NOTA floats: sv/miedo son floats por deuda histórica — se usa la
 * escala existente y toBeCloseTo donde toca (§A4 aplica al resto).
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { findPath } from '@/lib/pathfinding';
import { tickNeeds } from '@/lib/needs';
import { initialGameState, type GameState } from '@/lib/game-state';
import { TICKS_PER_DAY } from '@/lib/resources';
import { TILE, RESOURCE, type WorldMap } from '@/lib/world-state';
import { CRAFTABLE } from '@/lib/crafting';
import { LABORATORIO_FEATURES } from '@/lib/laboratorio';
import type { PRNGState } from '@/lib/prng';
import { makeTestNPC, makeTestDestinationContext, defaultStats } from '../helpers/npc-fixtures';

// ————————————————————————————————————————————————————————————————
// Helpers — mundos de juguete montados a mano (patrón auditoria-agua)
// ————————————————————————————————————————————————————————————————

const PRNG_FIJO: PRNGState = { seed: 1, cursor: 0 };

function mundo(width: number, height: number, fill: number = TILE.GRASS): WorldMap {
  return {
    seed: 0,
    width,
    height,
    tiles: new Array(width * height).fill(fill) as WorldMap['tiles'],
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
  };
}

function setTile(w: WorldMap, x: number, y: number, t: number): void {
  w.tiles[y * w.width + x] = t as WorldMap['tiles'][number];
}

function tileEn(s: GameState, x: number, y: number): number | undefined {
  if (x < 0 || y < 0 || x >= s.world.width || y >= s.world.height) return undefined;
  return s.world.tiles[y * s.world.width + x];
}

function manantialEn(w: WorldMap, x: number, y: number): void {
  w.resources.push({ id: RESOURCE.WATER, x, y, quantity: 999, initialQuantity: 999 });
}

/** Canal sin alternativa: dos orillas (x=0..3 y x=10..13) separadas por
 *  6 columnas de agua profunda (x=4..9) que cubren TODO el alto. Un solo
 *  NPC constructor con la obra en la otra orilla → la única ruta es a nado.
 *  HOY: findPath devuelve null y el nadador se queda clavado para siempre. */
function makeEscenarioCruceDelCanal(): GameState {
  const W = 14, H = 7;
  const w = mundo(W, H);
  for (let x = 4; x <= 9; x++) {
    for (let y = 0; y < H; y++) setTile(w, x, y, TILE.WATER);
  }
  const npcs = [
    { ...makeTestNPC({ id: 'nadador', position: { x: 2, y: 3 } }), designio: 'construccion' as const },
  ];
  const base = initialGameState(7, npcs, w as never, 'stone', { skipSpawning: true });
  return {
    ...base,
    phasedMode: false,
    features: { ...LABORATORIO_FEATURES },
    buildProject: {
      id: 'bp-el-mar', kind: CRAFTABLE.FOGATA_PERMANENTE,
      position: { x: 12, y: 3 }, startedAtTick: 0, progress: 0,
      required: 100 * TICKS_PER_DAY, // obra larga: el destino persiste
    },
  };
}

/** Mar abierto: todo agua profunda salvo un islote de hierba irrelevante
 *  en (0,0). El NPC nace en medio del mar con la sv que se le pida. */
function makeMarAbierto(sv: number): GameState {
  const w = mundo(12, 12, TILE.WATER);
  setTile(w, 0, 0, TILE.GRASS);
  const npcs = [
    makeTestNPC({ id: 'naufrago', position: { x: 6, y: 6 }, stats: { ...defaultStats(), supervivencia: sv } }),
  ];
  const base = initialGameState(7, npcs, w as never, 'stone', { skipSpawning: true });
  return { ...base, phasedMode: false, features: { ...LABORATORIO_FEATURES } };
}

/** Islote del manantial: 9×9 de agua profunda con un único tile de hierba
 *  en (4,4) que tiene un recurso de agua. El NPC famélico (sv 20) vive ahí:
 *  hoy la recuperación pasiva lo sube a ~70 antes de la primera noche. */
function makeIsloteDelManantial(): GameState {
  const w = mundo(9, 9, TILE.WATER);
  setTile(w, 4, 4, TILE.GRASS);
  manantialEn(w, 4, 4);
  const npcs = [
    makeTestNPC({ id: 'famelico', position: { x: 4, y: 4 }, stats: { ...defaultStats(), supervivencia: 20 } }),
  ];
  const base = initialGameState(7, npcs, w as never, 'stone', { skipSpawning: true });
  return { ...base, phasedMode: false, features: { ...LABORATORIO_FEATURES } };
}

// ————————————————————————————————————————————————————————————————
// Contrato 1 — transitable con coste: el A* cobra el agua (8 vs 1)
// ————————————————————————————————————————————————————————————————

describe('El Mar — contrato 1: el A* cobra coste de terreno (agua=8, tierra=1)', () => {
  it('elige tierra: con un desvío terrestre barato, el camino no pisa agua profunda (espejo — guardarraíl, verde hoy)', () => {
    // Muro de agua en x=4 (y=2..6) con paso seco por el norte (y=0..1).
    // De (2,4) a (6,4): mojarse ahorra 6 pasos pero el tile de agua cuesta 8
    // → el desvío seco (10 pasos × 1) gana al cruce (3×1 + 1×8 = 11).
    const w = mundo(10, 7);
    for (let y = 2; y <= 6; y++) setTile(w, 4, y, TILE.WATER);

    const r = findPath(w, { x: 2, y: 4 }, { x: 6, y: 4 }, PRNG_FIJO);
    expect(r.path, 'debe existir camino (el desvío seco siempre está)').not.toBeNull();
    const mojados = r.path!.filter(p => w.tiles[p.y * w.width + p.x] === TILE.WATER);
    expect(mojados, 'pasos sobre agua profunda cuando ahorrar es barato').toEqual([]);
  });

  it('cruza el estrecho: 2 tiles de agua frente a ~35 pasos por el puente de tierra → nada en línea recta (ROJO HOY)', () => {
    // Dos masas de tierra separadas por un estrecho de 2 columnas de agua
    // (x=5,6 en y=0..16), con puente terrestre al sur (y=17..19).
    // De (4,1) a (7,1): a nado cuesta 8+8+1 = 17; por el puente, 35 pasos.
    // HOY: el agua es pared → el A* rodea por el puente (largo y seco).
    const w = mundo(12, 20);
    for (let y = 0; y <= 16; y++) {
      setTile(w, 5, y, TILE.WATER);
      setTile(w, 6, y, TILE.WATER);
    }

    const r = findPath(w, { x: 4, y: 1 }, { x: 7, y: 1 }, PRNG_FIJO);
    expect(r.path, 'debe existir camino').not.toBeNull();
    const mojados = r.path!.filter(p => w.tiles[p.y * w.width + p.x] === TILE.WATER);
    expect(mojados.length, 'el ahorro es enorme: debe cruzar el estrecho a nado').toBeGreaterThan(0);
    expect(
      r.path!.length,
      `el cruce óptimo es la línea recta (4 posiciones); hoy rodea por el puente con ${r.path!.length}`,
    ).toBe(4);
    expect(r.path).toContainEqual({ x: 5, y: 1 });
    expect(r.path).toContainEqual({ x: 6, y: 1 });
  });
});

// ————————————————————————————————————————————————————————————————
// Contrato 2 — lento y drena
// ————————————————————————————————————————————————————————————————

describe('El Mar — contrato 2: nadar es lento (1 de cada 3 ticks) y drena (−0.5 sv/tick)', () => {
  it('el nadador cruza el canal y sobre agua profunda solo avanza 1 de cada SWIM_TICK_INTERVAL=3 ticks (ROJO HOY: no se mueve jamás)', () => {
    // Mismo mecanismo que el throttle existente de SHALLOW_WATER
    // (lib/simulation.ts:241): estando SOBRE el tile lento, solo se avanza
    // cuando state.tick % 3 === 0. Aquí se mide en posiciones por tick.
    let s = makeEscenarioCruceDelCanal();
    const movimientosIlegales: string[] = [];
    let movesEnAgua = 0;
    let ticksEnAgua = 0;
    let llegoEnTick = -1;

    for (let t = 0; t < 200 && llegoEnTick === -1; t++) {
      const antes = s.npcs[0];
      const tPre = s.tick;
      const tileAntes = tileEn(s, antes.position.x, antes.position.y);
      s = tick(s);
      const despues = s.npcs[0];
      const seMovio = despues.position.x !== antes.position.x || despues.position.y !== antes.position.y;
      if (tileAntes === TILE.WATER) {
        ticksEnAgua++;
        if (seMovio) {
          movesEnAgua++;
          if (tPre % 3 !== 0) {
            movimientosIlegales.push(`tick=${tPre}: (${antes.position.x},${antes.position.y}) → (${despues.position.x},${despues.position.y})`);
          }
        }
      }
      if (despues.alive && despues.position.x >= 10) llegoEnTick = s.tick;
    }

    expect(llegoEnTick, 'el nadador alcanza la otra orilla (hoy findPath da null y se queda clavado)').toBeGreaterThan(-1);
    expect(movesEnAgua, 'pasos dados estando sobre agua profunda (cruza 6 columnas)').toBeGreaterThanOrEqual(5);
    expect(movimientosIlegales, 'movimientos sobre agua en ticks no múltiplos de 3').toEqual([]);
    expect(ticksEnAgua, 'nadar cuesta ~3 ticks por tile: el agua retiene').toBeGreaterThanOrEqual(2 * movesEnAgua);
  });

  it('drenaje exacto: −0.5 sv/tick sobre agua profunda, medido contra un control en tierra (ROJO HOY: diff 0)', () => {
    // Dos NPCs idénticos, lejos uno de otro (sin efectos sociales): el del
    // agua debe perder exactamente 0.5 sv MÁS por tick que el de tierra
    // (mismo decay base para ambos — el contraste aísla el drenaje).
    const w = mundo(12, 12);
    setTile(w, 2, 2, TILE.WATER);
    const nadador = makeTestNPC({ id: 'nadador', position: { x: 2, y: 2 } });
    const control = makeTestNPC({ id: 'control', position: { x: 9, y: 9 } });
    const ctx = makeTestDestinationContext({ world: w, npcs: [nadador, control] });

    const out = tickNeeds([nadador, control], ctx);

    const svNadador = out[0].stats.supervivencia;
    const svControl = out[1].stats.supervivencia;
    expect(svControl - svNadador, 'drenaje del mar = diferencia exacta contra el control').toBeCloseTo(0.5, 5);
    expect(svNadador, 'el mar drena: la sv baja').toBeLessThan(80);
  });

  it('en agua profunda NO opera la recuperación pasiva por agua (ROJO HOY: sube +5 hasta 70)', () => {
    // Recurso de agua plantado SOBRE un tile de agua profunda: hoy
    // recoveryResourceAtPosition (lib/needs.ts:546) no mira el tile y
    // regala +5/tick. En el mar no se descansa: solo drena.
    const w = mundo(8, 8);
    setTile(w, 3, 3, TILE.WATER);
    manantialEn(w, 3, 3);
    const naufrago = makeTestNPC({ id: 'naufrago', position: { x: 3, y: 3 }, stats: { ...defaultStats(), supervivencia: 20 } });
    const ctx = makeTestDestinationContext({ world: w, npcs: [naufrago] });

    const out = tickNeeds([naufrago], ctx);

    expect(
      out[0].stats.supervivencia,
      'sobre TILE.WATER la sv solo puede bajar (hoy: 20 − 0.15 + 5 = 24.85)',
    ).toBeLessThan(20);
  });
});

// ————————————————————————————————————————————————————————————————
// Contrato 3 — ahogamiento: «se lo llevó el mar»
// ————————————————————————————————————————————————————————————————

describe('El Mar — contrato 3: morir sobre agua profunda es ahogarse', () => {
  it('la crónica de quien muere sobre TILE.WATER dice «se lo llevó el mar» (type death) (ROJO HOY: narra «agotamiento»)', () => {
    // sv=2 en medio del mar: muere en pocos ticks sin poder salir.
    let s = makeMarAbierto(2);
    for (let t = 0; t < 40; t++) s = tick(s);

    const naufrago = s.npcs[0];
    expect(naufrago.alive, 'el náufrago debe morir dentro de la ventana').toBe(false);
    expect(tileEn(s, naufrago.position.x, naufrago.position.y), 'muere sobre agua profunda').toBe(TILE.WATER);

    const muertes = s.chronicle.filter(e => e.type === 'death' && e.text.includes(naufrago.name));
    expect(muertes.length, 'debe existir crónica de su muerte').toBeGreaterThan(0);
    expect(
      muertes.some(e => e.text.includes('se lo llevó el mar')),
      `la crónica debe decir «se lo llevó el mar» — hoy dice: ${muertes.map(e => `«${e.text}»`).join(' | ')}`,
    ).toBe(true);
  });

  it('morir en tierra sigue sin ser cosa del mar (guardarraíl, verde hoy)', () => {
    // Mismo final, suelo seco: la causa terrestre no cambia con El Mar.
    const w = mundo(12, 12);
    const npcs = [
      makeTestNPC({ id: 'exhausto', position: { x: 6, y: 6 }, stats: { ...defaultStats(), supervivencia: 2 } }),
    ];
    const base = initialGameState(7, npcs, w as never, 'stone', { skipSpawning: true });
    let s: GameState = { ...base, phasedMode: false, features: { ...LABORATORIO_FEATURES } };
    for (let t = 0; t < 40; t++) s = tick(s);

    const exhausto = s.npcs[0];
    expect(exhausto.alive).toBe(false);
    const muertes = s.chronicle.filter(e => e.type === 'death' && e.text.includes(exhausto.name));
    expect(muertes.length).toBeGreaterThan(0);
    expect(
      muertes.some(e => e.text.includes('se lo llevó el mar')),
      'una muerte en tierra firme jamás se atribuye al mar',
    ).toBe(false);
  });
});

// ————————————————————————————————————————————————————————————————
// Contrato 4 — techo 40 global de la recuperación pasiva por agua
// ————————————————————————————————————————————————————————————————

describe('El Mar — contrato 4: la recuperación pasiva por agua satura en 40 (antes 70)', () => {
  it('un NPC con sv 20 junto al agua se recupera hasta ~40 y AHÍ PARA (ROJO HOY: llega a ~70)', () => {
    // Manantial en tierra (lib/needs.ts:546-547, único punto de recuperación
    // por agua): +5/tick mientras sv < techo. 30 ticks dan de sobra para
    // saturar — el techo es lo que se mide.
    const w = mundo(8, 8);
    manantialEn(w, 4, 4);
    let npcs = [
      makeTestNPC({ id: 'sediento', position: { x: 4, y: 4 }, stats: { ...defaultStats(), supervivencia: 20 } }),
    ];
    const ctx = makeTestDestinationContext({ world: w, npcs });

    for (let i = 0; i < 30; i++) npcs = tickNeeds(npcs, { ...ctx, npcs });

    const sv = npcs[0].stats.supervivencia;
    expect(sv, 'el techo de la recuperación pasiva por agua es 40').toBeLessThanOrEqual(40);
    expect(sv, 'sí recupera HASTA el techo — no se queda por el camino').toBeGreaterThan(38);
  });

  it('un día de hambre ya no se borra: cierra el día con sv<45 y NO amanece a 70 (ROJO HOY: amanece ~70)', { timeout: 60000 }, () => {
    // El "amanecer curado" de hoy no es magia del dawn (lib/dawn.ts no toca
    // sv): es la recuperación pasiva bombeando +5/tick toda la noche hasta
    // 70. Con techo 40, el famélico cruza el amanecer sin borrar su hambre.
    let s = makeIsloteDelManantial();
    let svAlCierre = -1;
    for (let t = 0; t < TICKS_PER_DAY + 20; t++) {
      if ((s.tick + 1) % TICKS_PER_DAY === 0) svAlCierre = s.npcs[0].stats.supervivencia;
      s = tick(s);
    }

    expect(s.tick, 'la simulación cruzó el amanecer').toBeGreaterThan(TICKS_PER_DAY);
    expect(s.npcs[0].alive, 'el famélico sobrevive junto a su manantial').toBe(true);
    expect(svAlCierre, 'al cierre del día el agua no lo subió de ~40').toBeLessThan(45);
    expect(
      s.npcs[0].stats.supervivencia,
      'tras el amanecer sigue tocado: el día de hambre no se borra',
    ).toBeLessThan(45);
  });
});

// ————————————————————————————————————————————————————————————————
// §A4 — determinismo y round-trip con NPCs nadando
// ————————————————————————————————————————————————————————————————

describe('El Mar — §A4 (guardarraíles, verdes hoy: deben seguir verdes con nado real)', () => {
  it('determinismo: dos corridas idénticas del cruce del canal producen el mismo estado tick a tick', () => {
    let a = makeEscenarioCruceDelCanal();
    let b = makeEscenarioCruceDelCanal();
    for (let t = 0; t < 60; t++) {
      a = tick(a);
      b = tick(b);
    }
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('round-trip JSON: el estado en mitad del cruce sobrevive sin pérdida y la sim continúa idéntica', () => {
    let s = makeEscenarioCruceDelCanal();
    for (let t = 0; t < 30; t++) s = tick(s);

    const revivido = JSON.parse(JSON.stringify(s)) as GameState;
    expect(revivido).toEqual(s);
    expect(JSON.stringify(tick(revivido))).toBe(JSON.stringify(tick(s)));
  });
});
