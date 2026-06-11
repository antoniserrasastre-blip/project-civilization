/**
 * Suite de diseño TDD — Sprint 05b, bloque 2: INFORME HONESTO.
 * "Fallo con porqué + éxito con precio."
 *
 * El triple playtest dictó tres mentiras del informe:
 *  1. "OBRA 425 para TODOS" — dailyActivity.built suma +1/tick a todo NPC
 *     seleccionado como builder mientras exista obra (simulation.ts:711):
 *     cuenta PRESENCIA, no logro. Números sin historia.
 *  2. El ✓ es gratis — umbral `> 0` en computeDawnReport: Sebastià ✓
 *     exploración con EXPL 9 mientras un no-designado hizo EXPL 46.
 *  3. El fallo es mudo — construcción ✗ tres días seguidos sin decir que NO
 *     HABÍA OBRA (BUILD_PRIORITY agotada → buildProject null → el designio
 *     no tenía objeto).
 *
 * Contrato (decidido por el orquestador, 11-06-2026):
 *  A. built honesto: solo se incrementa en ticks donde el NPC fue builder
 *     activo Y el proyecto AVANZÓ de verdad (progress creció ese tick).
 *     Nada de contar presencia junto a una obra parada o inexistente.
 *     Observables día-nivel: día entero sin buildProject → built === 0 para
 *     todos; día con proyecto avanzando → built > 0 SOLO para los que
 *     estuvieron en la obra (este test lee "en la obra" como Chebyshev ≤ 1
 *     del buildProject.position en el tick del incremento).
 *  B. Umbrales por dominio: export `UMBRAL_CUMPLIDO:
 *     Record<AssignmentDomain, number>` en lib/dawn.ts.
 *     cumplido ⟺ actividad del dominio ≥ umbral; fallido ⟺ < umbral.
 *     El número exacto lo fija el implementer; este test fija la SEMÁNTICA
 *     (borde ±1) leyendo UMBRAL_CUMPLIDO en runtime.
 *  C. Motivo del fallo: las entradas del DawnReport ganan
 *     `motivo?: MotivoFallo` SOLO cuando cumplido === 'fallido'.
 *       · 'sin-obra-pendiente' — construccion fallida y buildProject === null
 *         al cierre del día.
 *       · 'sin-frontera'      — exploracion fallida y el fog está 100%
 *         descubierto (computable barato: popcount sobre el bitmap).
 *       · 'corto'             — default: hubo dominio donde trabajar pero no
 *         llegó al umbral.
 *     La UI traducirá; el estado lleva el CÓDIGO. Round-trip JSON: motivo
 *     AUSENTE como clave (no undefined) cuando no aplica.
 *
 * Sondeo del laboratorio escaso (makeLaboratorioState, seeds 1/3/5/7,
 * designios reco/expl/cons desde el día 1, 11-06-2026) — magnitudes reales
 * por NPC-día para fijar umbrales que separen "trabajó" de "lo rozó":
 *  - harvested:  designado en día con comida: 21/22/31; rozadores: 0-14;
 *                trabajadores libres de verdad: 19-46. → propuesta: 15.
 *  - discovered: designado día 1: 103-366; rozadores: ≤ 46 (el EXPL 9 del
 *                playtest debe caer aquí); con la niebla saturada (~70-97%
 *                y nunca 100%: quedan tiles de agua/inaccesibles) el propio
 *                designado cae a 0-37. → propuesta: 50.
 *  - built:      (escala futura ≈ ticks al pie de obra que avanza) dedicados
 *                hoy acumulan 246-419 incrementos junto a la obra por día;
 *                el drive-by (Úrsula, scout arrastrada a ratos) 56-72.
 *                → propuesta: 100 (~20% del día construyendo de verdad).
 * Los tests NO dependen de esos números: montan dailyActivity a mano en
 * umbral-1 / umbral leyendo UMBRAL_CUMPLIDO.
 *
 * Estilo "contrato futuro": UMBRAL_CUMPLIDO y motivo hoy NO existen. El
 * import de UMBRAL_CUMPLIDO va vía namespace (no rompe el link del módulo);
 * cada test que lo necesita falla con mensaje claro, y `motivo` falla como
 * undefined en la aserción — rojo legible test a test.
 *
 * §A4: puro, determinista, enteros, round-trip JSON.
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import * as dawnLib from '@/lib/dawn';
import { computeDawnReport } from '@/lib/dawn';
import { TICKS_PER_DAY } from '@/lib/resources';
import { makeLaboratorioState } from '@/lib/laboratorio';
import { addStructure, type BuildProject } from '@/lib/structures';
import { CRAFTABLE } from '@/lib/crafting';
import { decodeFogBitmap, markDiscovered } from '@/lib/fog';
import type { DawnReport, GameState } from '@/lib/game-state';
import { ASSIGNMENT_DOMAINS, type AssignmentDomain } from '@/lib/npcs';

// ————————————————————————————————————————————————————————————————
// Contrato futuro (casts locales)
// ————————————————————————————————————————————————————————————————

// El implementer la exporta de lib/game-state.ts:
//   export type MotivoFallo = 'sin-obra-pendiente' | 'sin-frontera' | 'corto';
type MotivoFallo = 'sin-obra-pendiente' | 'sin-frontera' | 'corto';

/** Entrada del informe con el campo nuevo (hoy no existe → undefined). */
type EntradaHonesta = DawnReport['npcs'][number] & { motivo?: MotivoFallo };

// El implementer lo exporta de lib/dawn.ts:
//   export const UMBRAL_CUMPLIDO: Record<AssignmentDomain, number> = { ... };
// Acceso vía namespace para que el módulo linke hoy y el rojo sea por-test.
const UMBRAL_CUMPLIDO = (
  dawnLib as unknown as { UMBRAL_CUMPLIDO?: Record<AssignmentDomain, number> }
).UMBRAL_CUMPLIDO;

/** Umbral del dominio con guard legible: si el export no existe aún, el test
 *  que lo necesita cae con este mensaje (rojo del contrato, no un TypeError). */
function umbral(dominio: AssignmentDomain): number {
  if (!UMBRAL_CUMPLIDO) {
    throw new Error('UMBRAL_CUMPLIDO no está exportado de lib/dawn.ts todavía (contrato 05b bloque 2)');
  }
  return UMBRAL_CUMPLIDO[dominio];
}

// ————————————————————————————————————————————————————————————————
// Helpers + fixtures
// ————————————————————————————————————————————————————————————————

const ACTIVIDAD_CERO = { harvested: 0, built: 0, discovered: 0 } as const;

/** Estado base barato para montar informes a mano (tick 0, nadie ha hecho
 *  nada). Determinista; se reconstruye por test para no compartir referencias. */
function base(): GameState {
  return makeLaboratorioState(1);
}

/** Monta designio + actividad a mano sobre el NPC `idx` del estado base. */
function conNpc(
  s: GameState,
  idx: number,
  designio: AssignmentDomain | null,
  actividad: { harvested: number; built: number; discovered: number },
): GameState {
  const npcs = s.npcs.map((n, i) =>
    i === idx ? { ...n, designio, dailyActivity: { ...actividad } } : n,
  );
  return { ...s, npcs };
}

/** Obra activa de pega para los estados montados (progreso a medias). */
function obraActiva(s: GameState): BuildProject {
  return {
    id: 'bp-test',
    kind: CRAFTABLE.REFUGIO,
    position: { ...s.npcs[0].position },
    startedAtTick: 0,
    progress: 100,
    required: 2400,
  };
}

/** Fog 100% descubierto: radio 64 desde el centro cubre el 32×32 entero
 *  (esquinas a distancia ~22.6 < 64). Verificado bit a bit en el test. */
function fogCompleto(s: GameState): GameState {
  return { ...s, fog: markDiscovered(s.fog, 16, 16, 64) };
}

function tilesOcultos(s: GameState): number {
  const bytes = decodeFogBitmap(s.fog.bitmap);
  const total = s.fog.width * s.fog.height;
  let ocultos = 0;
  for (let i = 0; i < total; i++) {
    if ((bytes[i >> 3] & (1 << (i & 7))) === 0) ocultos++;
  }
  return ocultos;
}

function entrada(rep: DawnReport, id: string): EntradaHonesta {
  const e = rep.npcs.find((n) => n.id === id);
  if (!e) throw new Error(`el informe no trae al NPC ${id}`);
  return e as EntradaHonesta;
}

/** Corre la sim hasta el anochecer (phasedMode pausa en 'preparation'). */
function correDia(s: GameState): GameState {
  let guard = 0;
  while (s.phase !== 'preparation') {
    s = tick(s);
    if (++guard > TICKS_PER_DAY + 5) {
      throw new Error('nunca llegó a preparation — la máquina de fases no pausa');
    }
  }
  return s;
}

interface Bump {
  npcId: string;
  delta: number;
  /** ¿Existía buildProject ANTES del tick del incremento? */
  habiaProyecto: boolean;
  /** ¿Creció progress ese tick (o el proyecto se completó ese tick)? */
  avanzo: boolean;
  /** Chebyshev del NPC (posición post-movimiento del tick) a la obra. */
  distanciaObra: number;
}

/** Día 0 del laboratorio seed 1, observado tick a tick: cada incremento de
 *  dailyActivity.built con su contexto (proyecto/avance/distancia), más qué
 *  NPCs pisaron la obra (Chebyshev ≤ 1) en algún momento del día. */
function observaDiaDeObra(): { final: GameState; bumps: Bump[]; pisaronObra: Set<string> } {
  let s = makeLaboratorioState(1);
  const bumps: Bump[] = [];
  const pisaronObra = new Set<string>();
  let guard = 0;
  while (s.phase !== 'preparation') {
    const prev = s;
    s = tick(s);
    const bp = prev.buildProject;
    if (bp) {
      for (const n of s.npcs) {
        const d = Math.max(Math.abs(n.position.x - bp.position.x), Math.abs(n.position.y - bp.position.y));
        if (d <= 1) pisaronObra.add(n.id);
      }
    }
    const prevBuilt = new Map(prev.npcs.map((n) => [n.id, n.dailyActivity?.built ?? 0]));
    for (const n of s.npcs) {
      const delta = (n.dailyActivity?.built ?? 0) - (prevBuilt.get(n.id) ?? 0);
      if (delta <= 0) continue;
      const sigue = s.buildProject;
      const avanzo =
        bp !== null && (sigue === null || sigue.id !== bp.id || sigue.progress > bp.progress);
      const distanciaObra = bp
        ? Math.max(Math.abs(n.position.x - bp.position.x), Math.abs(n.position.y - bp.position.y))
        : Number.MAX_SAFE_INTEGER;
      bumps.push({ npcId: n.id, delta, habiaProyecto: bp !== null, avanzo, distanciaObra });
    }
    if (++guard > TICKS_PER_DAY + 5) {
      throw new Error('nunca llegó a preparation — la máquina de fases no pausa');
    }
  }
  return { final: s, bumps, pisaronObra };
}

// Cache del día observado (sim pura y determinista → reusable entre tests).
let _diaObra: ReturnType<typeof observaDiaDeObra> | null = null;
function diaDeObra() {
  if (!_diaObra) _diaObra = observaDiaDeObra();
  return _diaObra;
}

/** Laboratorio con las 5 BUILD_PRIORITY ya en pie: tryAutoBuild no encuentra
 *  candidato y (recién construidas) nada decae en un día → día sin obra. */
function laboratorioSinObraPosible(): GameState {
  const s = makeLaboratorioState(1);
  let structures = s.structures;
  const ancla = s.npcs[0].position;
  const kinds = [
    CRAFTABLE.FOGATA_PERMANENTE,
    CRAFTABLE.STOCKPILE_WOOD,
    CRAFTABLE.STOCKPILE_STONE,
    CRAFTABLE.DESPENSA,
    CRAFTABLE.REFUGIO,
  ];
  kinds.forEach((k, i) => {
    structures = addStructure(
      structures,
      k,
      { x: ancla.x + (i % 3), y: ancla.y + Math.floor(i / 3) },
      0,
      100 + i,
    );
  });
  return { ...s, structures };
}

// ————————————————————————————————————————————————————————————————
// A. built honesto (sim real del laboratorio)
// ————————————————————————————————————————————————————————————————

describe('Informe honesto — A: built mide logro, no presencia', () => {
  it('un día entero sin buildProject → built === 0 para los cuatro', () => {
    let s = laboratorioSinObraPosible();
    let huboProyecto = false;
    let guard = 0;
    while (s.phase !== 'preparation') {
      s = tick(s);
      if (s.buildProject !== null) huboProyecto = true;
      if (++guard > TICKS_PER_DAY + 5) throw new Error('la máquina de fases no pausa');
    }
    // Precondición real: el día transcurrió sin obra (la fixture funciona).
    expect(huboProyecto).toBe(false);
    // Contrato A: sin obra no hay built — para nadie, ni un punto.
    for (const n of s.npcs) {
      expect(n.dailyActivity?.built ?? 0).toBe(0);
    }
  });

  it('cada incremento de built ocurre con obra existente, que AVANZÓ ese tick, y con el NPC al pie de la obra', () => {
    const { bumps } = diaDeObra();
    // Precondición: el día 0 del laboratorio seed 1 SÍ tiene obra que avanza
    // (sondeado: fogata → stockpiles; cientos de incrementos hoy).
    expect(bumps.length).toBeGreaterThan(0);
    const sinProyecto = bumps.filter((b) => !b.habiaProyecto);
    const sinAvance = bumps.filter((b) => b.habiaProyecto && !b.avanzo);
    const lejosDeLaObra = bumps.filter((b) => b.distanciaObra > 1);
    // Nada de contar presencia junto a una obra parada o inexistente…
    expect(sinProyecto).toEqual([]);
    expect(sinAvance).toEqual([]);
    // …ni "construir" mientras se camina hacia ella (hoy: rojo — el playtest
    // contó incrementos a Chebyshev hasta 7 de la obra).
    expect(lejosDeLaObra).toEqual([]);
  });

  it('día con proyecto avanzando: built > 0 SOLO para los que estuvieron en la obra', () => {
    const { final, pisaronObra } = diaDeObra();
    let alguienConstruyo = false;
    for (const n of final.npcs) {
      const built = n.dailyActivity?.built ?? 0;
      if (built > 0) {
        alguienConstruyo = true;
        expect(pisaronObra.has(n.id)).toBe(true);
      } else {
        expect(built).toBe(0); // entero, jamás negativo
      }
    }
    // Precondición: el día de obra produjo constructores de verdad.
    expect(alguienConstruyo).toBe(true);
  });
});

// ————————————————————————————————————————————————————————————————
// B. El ✓ tiene precio: UMBRAL_CUMPLIDO por dominio
// ————————————————————————————————————————————————————————————————

describe('Informe honesto — B: UMBRAL_CUMPLIDO existe y no es el ✓ gratis', () => {
  it('lib/dawn.ts exporta UMBRAL_CUMPLIDO con los 3 dominios, enteros ≥ 2', () => {
    expect(UMBRAL_CUMPLIDO).toBeDefined();
    expect(Object.keys(UMBRAL_CUMPLIDO!).sort()).toEqual([...ASSIGNMENT_DOMAINS].sort());
    for (const dominio of ASSIGNMENT_DOMAINS) {
      const u = UMBRAL_CUMPLIDO![dominio];
      expect(Number.isInteger(u)).toBe(true);
      // ≥ 2: con umbral 1 el ✓ vuelve a ser gratis (cualquier roce cuenta) —
      // exactamente la mentira del playtest (✓ exploración con EXPL 9).
      expect(u).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('Informe honesto — B: borde exacto del umbral por dominio', () => {
  const casos: Array<{ dominio: AssignmentDomain; campo: 'harvested' | 'built' | 'discovered' }> = [
    { dominio: 'recoleccion', campo: 'harvested' },
    { dominio: 'construccion', campo: 'built' },
    { dominio: 'exploracion', campo: 'discovered' },
  ];

  for (const { dominio, campo } of casos) {
    it(`${dominio}: actividad === umbral-1 → fallido; === umbral → cumplido`, () => {
      const u = umbral(dominio);
      // umbral-1 (≥ 1 porque u ≥ 2: el "lo rozó" queda por debajo).
      const corto = conNpc(base(), 0, dominio, { ...ACTIVIDAD_CERO, [campo]: u - 1 });
      // La obra activa evita que el motivo dependa de buildProject en este test.
      const conObra = { ...corto, buildProject: obraActiva(corto) };
      const repCorto = computeDawnReport(conObra);
      expect(entrada(repCorto, conObra.npcs[0].id).cumplido).toBe('fallido');

      const justo = conNpc(base(), 0, dominio, { ...ACTIVIDAD_CERO, [campo]: u });
      const repJusto = computeDawnReport(justo);
      expect(entrada(repJusto, justo.npcs[0].id).cumplido).toBe('cumplido');
    });
  }
});

// ————————————————————————————————————————————————————————————————
// C. El fallo dice por qué: motivo
// ————————————————————————————————————————————————————————————————

describe('Informe honesto — C: motivo del fallo', () => {
  it('construccion fallida y buildProject === null al cierre → motivo "sin-obra-pendiente"', () => {
    const s = conNpc(base(), 0, 'construccion', ACTIVIDAD_CERO);
    // Precondición del escenario del playtest: no hay obra al cierre.
    expect(s.buildProject).toBeNull();
    const e = entrada(computeDawnReport(s), s.npcs[0].id);
    expect(e.cumplido).toBe('fallido');
    expect(e.motivo).toBe('sin-obra-pendiente');
  });

  it('construccion fallida CON obra activa al cierre → motivo "corto" (hubo donde trabajar)', () => {
    const u = umbral('construccion');
    const s0 = conNpc(base(), 0, 'construccion', { ...ACTIVIDAD_CERO, built: u - 1 });
    const s = { ...s0, buildProject: obraActiva(s0) };
    const e = entrada(computeDawnReport(s), s.npcs[0].id);
    expect(e.cumplido).toBe('fallido');
    expect(e.motivo).toBe('corto');
  });

  it('recoleccion fallida → motivo "corto" (el default del que no llegó)', () => {
    const u = umbral('recoleccion');
    const s = conNpc(base(), 0, 'recoleccion', { ...ACTIVIDAD_CERO, harvested: u - 1 });
    const e = entrada(computeDawnReport(s), s.npcs[0].id);
    expect(e.cumplido).toBe('fallido');
    expect(e.motivo).toBe('corto');
  });

  it('exploracion fallida con el mapa 100% descubierto → motivo "sin-frontera"', () => {
    const s = fogCompleto(conNpc(base(), 0, 'exploracion', ACTIVIDAD_CERO));
    // Precondición bit a bit: de verdad no queda ni un tile oculto.
    expect(tilesOcultos(s)).toBe(0);
    const e = entrada(computeDawnReport(s), s.npcs[0].id);
    expect(e.cumplido).toBe('fallido');
    expect(e.motivo).toBe('sin-frontera');
  });

  it('exploracion fallida con niebla restante → motivo "corto" (la frontera estaba ahí)', () => {
    const s = conNpc(base(), 0, 'exploracion', ACTIVIDAD_CERO);
    // Precondición: el laboratorio recién creado tiene niebla de sobra.
    expect(tilesOcultos(s)).toBeGreaterThan(0);
    const e = entrada(computeDawnReport(s), s.npcs[0].id);
    expect(e.cumplido).toBe('fallido');
    expect(e.motivo).toBe('corto');
  });

  it('motivo AUSENTE (ni la clave) cuando el designio se cumplió', () => {
    const u = umbral('recoleccion');
    const s = conNpc(base(), 0, 'recoleccion', { ...ACTIVIDAD_CERO, harvested: u });
    const e = entrada(computeDawnReport(s), s.npcs[0].id);
    expect(e.cumplido).toBe('cumplido');
    expect('motivo' in e).toBe(false);
  });

  it('motivo AUSENTE cuando no hubo designio (cumplido null)', () => {
    const s = conNpc(base(), 0, null, { ...ACTIVIDAD_CERO, harvested: 999 });
    const e = entrada(computeDawnReport(s), s.npcs[0].id);
    expect(e.cumplido).toBeNull();
    expect('motivo' in e).toBe(false);
  });
});

// ————————————————————————————————————————————————————————————————
// Round-trip JSON (§A4)
// ————————————————————————————————————————————————————————————————

describe('Informe honesto — round-trip JSON', () => {
  /** Informe mixto: npc0 fallido-con-motivo, npc1 cumplido, npc2 libre. */
  function informeMixto(): DawnReport {
    let s = base();
    s = conNpc(s, 0, 'construccion', ACTIVIDAD_CERO); // fallido + sin-obra-pendiente
    s = conNpc(s, 1, 'recoleccion', { ...ACTIVIDAD_CERO, harvested: umbral('recoleccion') }); // cumplido
    s = conNpc(s, 2, null, { ...ACTIVIDAD_CERO, discovered: 3 }); // libre
    expect(s.buildProject).toBeNull();
    return computeDawnReport(s);
  }

  it('el informe con motivo sobrevive JSON byte a byte, sin claves fantasma', () => {
    const rep = informeMixto();
    const fallido = rep.npcs.find((n) => n.cumplido === 'fallido') as EntradaHonesta;
    expect(fallido).toBeDefined();
    expect(fallido.motivo).toBe('sin-obra-pendiente');

    const json = JSON.stringify(rep);
    const revived = JSON.parse(json) as DawnReport;
    expect(revived).toEqual(rep);
    expect(JSON.stringify(revived)).toBe(json);

    // motivo viaja exactamente en los fallidos: ni undefined serializado en
    // los demás, ni clave perdida en el que sí falló.
    const apariciones = json.split('"motivo"').length - 1;
    const fallidos = rep.npcs.filter((n) => n.cumplido === 'fallido').length;
    expect(fallidos).toBeGreaterThan(0);
    expect(apariciones).toBe(fallidos);
    for (const n of revived.npcs as EntradaHonesta[]) {
      if (n.cumplido === 'fallido') {
        expect(['sin-obra-pendiente', 'sin-frontera', 'corto']).toContain(n.motivo);
      } else {
        expect('motivo' in n).toBe(false);
      }
    }
  });
});

// ————————————————————————————————————————————————————————————————
// Determinismo (§A4)
// ————————————————————————————————————————————————————————————————

describe('Informe honesto — determinismo', () => {
  it('computeDawnReport dos veces sobre estados montados idénticos → byte-idéntico', () => {
    const monta = () => {
      let s = conNpc(base(), 0, 'construccion', ACTIVIDAD_CERO);
      s = conNpc(s, 1, 'exploracion', { ...ACTIVIDAD_CERO, discovered: 1 });
      return computeDawnReport(s);
    };
    const ja = JSON.stringify(monta());
    expect(ja).toBe(JSON.stringify(monta()));
    // Y el contrato nuevo viaja de verdad en el serializado.
    expect(ja).toContain('"motivo"');
  });

  it('el día de obra del laboratorio dos veces → mismo built por NPC y mismo informe', () => {
    const a = correDia(makeLaboratorioState(1));
    const b = correDia(makeLaboratorioState(1));
    expect(a.npcs.map((n) => n.dailyActivity?.built ?? 0)).toEqual(
      b.npcs.map((n) => n.dailyActivity?.built ?? 0),
    );
    expect(JSON.stringify(a.dawnReport)).toBe(JSON.stringify(b.dawnReport));
    // built es entero siempre (§A4).
    for (const n of a.npcs) {
      expect(Number.isInteger(n.dailyActivity?.built ?? 0)).toBe(true);
    }
  }, 30_000);
});
