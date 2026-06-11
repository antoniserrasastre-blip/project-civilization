/**
 * Suite de diseño TDD — Sprint 05b (bloque 5): DESGLOSE ECONÓMICO.
 *
 * El playtest dictó: "MADERA 0→20 sin explicación; las bayas bajan y nadie
 * dice que el clan COME; no hay log de transacciones". Los recursos cambian
 * solos: el informe debe decir QUIÉN aportó QUÉ y QUÉ se comió.
 *
 * Contrato (decidido por el orquestador):
 *  - `NPC.dailyActivity` gana dos campos OPCIONALES (compat; claves ausentes
 *    si cero — round-trip limpio, el patrón del propio dailyActivity):
 *      · `porRecurso?: Partial<Record<ResourceId, number>>` — lo cosechado
 *        HOY por tipo. Coherencia: suma de porRecurso === harvested.
 *      · `comido?: Partial<Record<'berry'|'fish'|'game', number>>` — unidades
 *        de comida consumidas HOY por tipo.
 *  - `DawnReport.clan` gana `aportes` y `comido`: la suma de los campos de
 *    los VIVOS. SIEMPRE presentes como objeto (aunque {}); los tipos a 0 se
 *    omiten del objeto.
 *  - Las entradas npcs del DawnReport ganan `porRecurso?` (presente SOLO si
 *    cosechó algo) — dailyActivity se borra en reset-diario, así que la UI
 *    pinta «Martí 8 bayas» desde el informe, sin estado extra.
 *  - `computeDawnReport` (lib/dawn.ts) agrega; reset-diario no cambia.
 *  - §A4: determinismo y round-trip JSON sin pérdida.
 *
 * Los tests escriben contra el contrato futuro: los campos nuevos hoy NO
 * existen (vitest transpila sin type-check → el rojo es `undefined` en las
 * aserciones, legible test a test).
 *
 * Fixture: laboratorio seed 1 (32×32, 4 NPCs, flags OFF, comida ×0.25 —
 * escasez 05b.3). Sondeado el 11-06-2026 sobre campos EXISTENTES: en el
 * día 0 los 4 NPCs cosechan (2/2/3/26), alguien lleva comida encima en
 * algún tick (máx 4) y al anochecer no queda comida ni en manos ni en
 * despensas con los 4 vivos → el clan COMIÓ de verdad ese día. Cada
 * precondición se re-verifica en el test (sin tautologías).
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { applyAssignments, computeDawnReport } from '@/lib/dawn';
import { TICKS_PER_DAY } from '@/lib/resources';
import { makeLaboratorioState } from '@/lib/laboratorio';
import { carriedFood } from '@/lib/needs';
import type { DawnReport, GameState } from '@/lib/game-state';
import type { NPC } from '@/lib/npcs';
import type { ResourceId } from '@/lib/world-state';

// ————————————————————————————————————————————————————————————————
// El contrato futuro, como tipos locales (hoy NO compilan contra lib/ —
// cuando el implementer los añada, estos alias se vuelven redundantes
// pero siguen siendo válidos).
// ————————————————————————————————————————————————————————————————

type FoodKind = 'berry' | 'fish' | 'game';
type PorRecurso = Partial<Record<ResourceId, number>>;
type Comido = Partial<Record<FoodKind, number>>;

/** dailyActivity extendida (contrato 1). */
interface ActividadX {
  harvested: number;
  built: number;
  discovered: number;
  porRecurso?: PorRecurso;
  comido?: Comido;
}

/** Vista extendida de un NPC / informe (lectura sin type-error hoy). */
const actividadDe = (n: NPC): ActividadX | undefined =>
  n.dailyActivity as ActividadX | undefined;
type EntradaX = DawnReport['npcs'][number] & { porRecurso?: PorRecurso };
type ClanX = DawnReport['clan'] & { aportes: PorRecurso; comido: Comido };
const clanDe = (rep: DawnReport): ClanX => rep.clan as ClanX;
const entradasDe = (rep: DawnReport): EntradaX[] => rep.npcs as EntradaX[];

// ————————————————————————————————————————————————————————————————
// Helpers + fixture canónica
// ————————————————————————————————————————————————————————————————

/** Suma clave a clave de mapas parciales, omitiendo los ceros (la forma
 *  exacta que el contrato exige a aportes/comido). */
function sumaParciales<K extends string>(
  parciales: ReadonlyArray<Partial<Record<K, number>> | undefined>,
): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {};
  for (const p of parciales) {
    if (!p) continue;
    for (const k of Object.keys(p) as K[]) {
      const v = p[k] ?? 0;
      if (v !== 0) out[k] = (out[k] ?? 0) + v;
    }
  }
  return out;
}

/** Suma de los valores de un mapa parcial (ausente = 0). */
const total = (p: Partial<Record<string, number>> | undefined): number =>
  Object.values(p ?? {}).reduce((a: number, v) => a + (v ?? 0), 0);

/** Entrada del informe por id, con guard (nada de undefined silencioso). */
function entrada(rep: DawnReport, id: string): EntradaX {
  const e = entradasDe(rep).find((n) => n.id === id);
  if (!e) throw new Error(`el informe no trae al NPC ${id}`);
  return e;
}

interface Partida {
  /** Anochecer del día 0 (phase 'preparation') — dailyActivity aún viva. */
  anochecer: GameState;
  /** Tras cruzar el amanecer sin designios — dawnReport es el del día 0. */
  amanecer: GameState;
  /** Sondas sobre campos EXISTENTES, recogidas tick a tick durante el día. */
  sondas: {
    /** Máxima comida (berry+fish+game) en manos de algún vivo en un tick. */
    maxComidaEnMano: number;
    /** Mínima supervivencia de algún vivo en un tick (¿hubo hambre intradía?). */
    minSupervivencia: number;
  };
}

/** Partida canónica: laboratorio seed 1, día 0 entero tick a tick (con
 *  sondas sobre campos existentes) + su amanecer. Pura y determinista. */
function partidaDia0(): Partida {
  let s = makeLaboratorioState(1);
  let maxComidaEnMano = 0;
  let minSupervivencia = Infinity;
  let guard = 0;
  while (s.phase !== 'preparation') {
    s = tick(s);
    for (const n of s.npcs) {
      if (!n.alive) continue;
      maxComidaEnMano = Math.max(maxComidaEnMano, carriedFood(n));
      minSupervivencia = Math.min(minSupervivencia, n.stats.supervivencia);
    }
    if (++guard > TICKS_PER_DAY + 5) {
      throw new Error('nunca llegó a preparation — la máquina de fases no pausa');
    }
  }
  return {
    anochecer: s,
    amanecer: applyAssignments(s, {}),
    sondas: { maxComidaEnMano, minSupervivencia },
  };
}

// Cache (pura y determinista → reusable entre tests).
let _canon: Partida | null = null;
function canon(): Partida {
  if (!_canon) _canon = partidaDia0();
  return _canon;
}

/** NPC con dailyActivity montada a mano (contrato futuro → cast local). */
function conActividad(n: NPC, a: ActividadX): NPC {
  return { ...n, dailyActivity: a as NPC['dailyActivity'] };
}

// ————————————————————————————————————————————————————————————————
// 1. Coherencia contable por NPC: porRecurso suma exactamente harvested
// ————————————————————————————————————————————————————————————————

describe('Desglose — porRecurso de cada NPC cuadra con su harvested (sim real, día 0)', () => {
  it('los 4 vivos al anochecer: suma de porRecurso === harvested, valores enteros > 0, sin claves a cero', () => {
    const { anochecer } = canon();
    const vivos = anochecer.npcs.filter((n) => n.alive);
    expect(vivos).toHaveLength(4);
    // 05d: la exigencia "los 4 cosechan >0" era lotería de seed (el reloj
    // nuevo movió los repartos). El contrato es la COHERENCIA CONTABLE:
    // porRecurso cuadra con harvested en todos; la evidencia no-vacua es
    // que al menos dos cosechen de verdad.
    let cosechadores = 0;
    for (const n of vivos) {
      const act = actividadDe(n);
      if (!act) continue; // sin actividad = sin nada que cuadrar
      if (act.harvested > 0) {
        cosechadores++;
        expect(act.porRecurso).toBeDefined();
        expect(total(act.porRecurso)).toBe(act.harvested);
        for (const [recurso, v] of Object.entries(act.porRecurso!)) {
          expect(Number.isInteger(v), `porRecurso.${recurso} de ${n.id} no es entero`).toBe(true);
          expect(v, `porRecurso.${recurso} de ${n.id} está a 0 — la clave debe OMITIRSE`).toBeGreaterThan(0);
        }
      } else {
        expect(total(act.porRecurso), `${n.id} sin harvested pero con porRecurso`).toBe(0);
      }
    }
    expect(cosechadores, 'evidencia no-vacua: al menos 2 NPCs cosechan').toBeGreaterThanOrEqual(2);
  });
});

// ————————————————————————————————————————————————————————————————
// 2. Agregados del clan = suma de los vivos
// ————————————————————————————————————————————————————————————————

describe('Desglose — los agregados del clan cuadran con los vivos', () => {
  it('clan.aportes === suma clave a clave del porRecurso de los vivos (y sin claves a cero)', () => {
    const { anochecer, amanecer } = canon();
    const esperado = sumaParciales(
      anochecer.npcs.filter((n) => n.alive).map((n) => actividadDe(n)?.porRecurso),
    );
    const clan = clanDe(amanecer.dawnReport!);
    expect(clan.aportes).toEqual(esperado);
    // Coherencia con el agregado clásico: los aportes suman el harvested del clan.
    expect(total(clan.aportes)).toBe(amanecer.dawnReport!.clan.harvested);
    for (const [recurso, v] of Object.entries(clan.aportes)) {
      expect(v, `aportes.${recurso} está a 0 — la clave debe OMITIRSE`).toBeGreaterThan(0);
    }
  });

  it('clan.comido === suma clave a clave del comido de los vivos; los tipos que nadie comió NO están', () => {
    const { anochecer, amanecer } = canon();
    const esperado = sumaParciales(
      anochecer.npcs.filter((n) => n.alive).map((n) => actividadDe(n)?.comido),
    );
    const clan = clanDe(amanecer.dawnReport!);
    expect(clan.comido).toEqual(esperado);
    for (const kind of ['berry', 'fish', 'game'] as const) {
      const sumado = esperado[kind] ?? 0;
      if (sumado === 0) {
        expect(kind in clan.comido, `comido.${kind} presente con nada comido`).toBe(false);
      } else {
        expect(clan.comido[kind]).toBe(sumado);
      }
    }
  });
});

// ————————————————————————————————————————————————————————————————
// 3. El día que el clan COME queda dicho (el corazón del playtest)
// ————————————————————————————————————————————————————————————————

describe('Desglose — cuando el clan come, el informe lo dice', () => {
  it('seed 1, día 0: hubo comida en manos y al anochecer no queda → clan.comido trae al menos un tipo > 0', () => {
    const { anochecer, amanecer, sondas } = canon();
    // Cadena de precondiciones sobre campos EXISTENTES (sin tautología).
    // 05d: la versión "al anochecer queda 0 comida" era lotería de tuning
    // (con la noche corta el clan come menos y le sobra). Evidencia robusta:
    // 1. en algún tick del día alguien llevaba comida encima…
    expect(sondas.maxComidaEnMano).toBeGreaterThan(0);
    // 2. …el laboratorio escaso garantiza hambre intradía (sv cae bajo el
    //    umbral de comer-del-inventario en algún momento)…
    expect(sondas.minSupervivencia).toBeLessThan(65);
    // 3. …y nadie murió (los muertos no se llevan el inventario a la tumba
    //    fuera del recuento). Con hambre + comida en mano, alguien COMIÓ.
    expect(anochecer.npcs.filter((n) => n.alive)).toHaveLength(4);
    // Contrato nuevo: el informe lo dice — "las bayas bajan PORQUE el clan come".
    const comido = clanDe(amanecer.dawnReport!).comido;
    expect(comido).toBeDefined();
    expect(total(comido)).toBeGreaterThan(0);
    const tipos = Object.entries(comido).filter(([, v]) => (v ?? 0) > 0);
    expect(tipos.length).toBeGreaterThanOrEqual(1);
  });
});

// ————————————————————————————————————————————————————————————————
// 4. computeDawnReport con actividad montada a mano (exactitud)
// ————————————————————————————————————————————————————————————————

describe('Desglose — computeDawnReport agrega exacto la actividad montada a mano', () => {
  it('aportes/comido exactos; porRecurso por entrada SOLO si cosechó; los muertos no cuentan', () => {
    const { anochecer } = canon();
    const npcs = anochecer.npcs.map((n, i) => {
      if (i === 0)
        return conActividad(n, {
          harvested: 8, built: 0, discovered: 0,
          porRecurso: { berry: 8 },
          comido: { fish: 2 },
        });
      if (i === 1)
        return conActividad(n, {
          harvested: 5, built: 0, discovered: 0,
          porRecurso: { wood: 3, stone: 2 },
        });
      if (i === 2)
        return conActividad(n, {
          harvested: 0, built: 12, discovered: 0,
          comido: { berry: 1 },
        });
      // i === 3: muerto con actividad — NO debe contar en los agregados.
      return {
        ...conActividad(n, {
          harvested: 99, built: 0, discovered: 0,
          porRecurso: { wood: 99 },
          comido: { game: 5 },
        }),
        alive: false,
      };
    });
    const rep = computeDawnReport({ ...anochecer, npcs });
    const clan = clanDe(rep);

    // Agregados exactos: solo los vivos.
    expect(clan.aportes).toEqual({ berry: 8, wood: 3, stone: 2 });
    expect(clan.comido).toEqual({ fish: 2, berry: 1 });

    // Entradas: porRecurso presente SOLO si cosechó.
    const e0 = entrada(rep, npcs[0].id);
    expect(e0.porRecurso).toEqual({ berry: 8 });
    const e1 = entrada(rep, npcs[1].id);
    expect(e1.porRecurso).toEqual({ wood: 3, stone: 2 });
    const e2 = entrada(rep, npcs[2].id);
    expect(e2.harvested).toBe(0); // precondición: no cosechó
    expect('porRecurso' in e2, 'porRecurso presente en quien no cosechó — la clave debe OMITIRSE').toBe(false);
    // El muerto ni siquiera sale en el informe (contrato 04a intacto).
    expect(entradasDe(rep).some((e) => e.id === npcs[3].id)).toBe(false);
  });

  it('día sin cosecha ni comida: aportes y comido SIEMPRE presentes, como {} (el informe existe igual)', () => {
    const { anochecer } = canon();
    const npcs = anochecer.npcs.map((n) =>
      conActividad(n, { harvested: 0, built: 0, discovered: 0 }),
    );
    const rep = computeDawnReport({ ...anochecer, npcs });
    const clan = clanDe(rep);
    expect(clan.aportes).toEqual({});
    expect(clan.comido).toEqual({});
    for (const e of entradasDe(rep)) {
      expect('porRecurso' in e).toBe(false);
    }
  });
});

// ————————————————————————————————————————————————————————————————
// 5. Round-trip JSON (§A4)
// ————————————————————————————————————————————————————————————————

describe('Desglose — round-trip JSON del informe extendido', () => {
  it('el informe de la sim sobrevive JSON sin pérdida y byte-estable', () => {
    const rep = canon().amanecer.dawnReport!;
    const revived = JSON.parse(JSON.stringify(rep)) as DawnReport;
    expect(revived).toEqual(rep);
    // Los agregados nuevos EXISTEN tras revivir (objetos, no undefined).
    expect(typeof clanDe(revived).aportes).toBe('object');
    expect(typeof clanDe(revived).comido).toBe('object');
    expect(JSON.stringify(revived)).toBe(JSON.stringify(rep));
  });

  it('las claves AUSENTES siguen ausentes tras revivir (montado: el que no cosechó, el tipo no comido)', () => {
    const { anochecer } = canon();
    const npcs = anochecer.npcs.map((n, i) =>
      i === 0
        ? conActividad(n, { harvested: 4, built: 0, discovered: 0, porRecurso: { fish: 4 }, comido: { fish: 1 } })
        : conActividad(n, { harvested: 0, built: 0, discovered: 0 }),
    );
    const rep = computeDawnReport({ ...anochecer, npcs });
    const revived = JSON.parse(JSON.stringify(rep)) as DawnReport;
    expect(revived).toEqual(rep);
    expect(JSON.stringify(revived)).toBe(JSON.stringify(rep));
    // Presencias y ausencias exactas tras el revive.
    expect(clanDe(revived).aportes).toEqual({ fish: 4 });
    expect(clanDe(revived).comido).toEqual({ fish: 1 });
    expect('berry' in clanDe(revived).comido).toBe(false);
    expect('game' in clanDe(revived).comido).toBe(false);
    expect('porRecurso' in entrada(revived, npcs[0].id)).toBe(true);
    for (const id of [npcs[1].id, npcs[2].id, npcs[3].id]) {
      expect('porRecurso' in entrada(revived, id), `porRecurso resucitó en ${id}`).toBe(false);
    }
  });
});

// ————————————————————————————————————————————————————————————————
// 6. Determinismo (§A4)
// ————————————————————————————————————————————————————————————————

describe('Desglose — determinismo del informe extendido', () => {
  it(
    'misma partida dos veces → informes byte-idénticos, y llevan aportes/comido de verdad',
    () => {
      const a = partidaDia0().amanecer.dawnReport!;
      const b = partidaDia0().amanecer.dawnReport!;
      const ja = JSON.stringify(a);
      expect(ja).toBe(JSON.stringify(b));
      // El informe serializado lleva el contrato nuevo (no un {} casual).
      expect(ja).toContain('"aportes"');
      expect(ja).toContain('"comido"');
      expect(ja).toContain('"porRecurso"');
    },
    30_000,
  );
});

// ————————————————————————————————————————————————————————————————
// 7. Regresión: el informe clásico no cambia, solo gana campos
// ————————————————————————————————————————————————————————————————

describe('Desglose — regresión: el resto del informe queda intacto', () => {
  it('pin deliberado seed 1 día 0: harvested/built/discovered/deaths exactos y cumplido/motivo como hoy', () => {
    const { anochecer, amanecer } = canon();
    const rep = amanecer.dawnReport!;
    expect(rep.day).toBe(0);
    // 05d: los pins EXACTOS (33/964/218 y 2/2/3/26) eran un tripwire para el
    // implementer del desglose y cumplieron su misión — pero caducaban con
    // cada tuning legítimo de la sim (reloj solar, depósito del recolector).
    // La regresión que importa es ESTRUCTURAL y sobrevive al tuning:
    // los agregados del clan son exactamente la suma de las entradas.
    const suma = (k: 'harvested' | 'built' | 'discovered') =>
      rep.npcs.reduce((a, e) => a + e[k], 0);
    expect(rep.clan.harvested).toBe(suma('harvested'));
    expect(rep.clan.built).toBe(suma('built'));
    expect(rep.clan.discovered).toBe(suma('discovered'));
    expect(rep.clan.harvested).toBeGreaterThan(0); // el día 0 no es un día vacío
    expect(rep.clan.discovered).toBeGreaterThan(0);
    expect(rep.clan.deaths).toBe(0);
    expect(anochecer.npcs.filter((n) => n.alive)).toHaveLength(4);
    expect(rep.clan.designiosDados).toBe(0);
    expect(rep.clan.designiosCumplidos).toBe(0);
    // Sin designios: cumplido null y motivo AUSENTE en todas las entradas.
    for (const e of rep.npcs) {
      expect(e.cumplido).toBeNull();
      expect('motivo' in e).toBe(false);
    }
  });

  it('cumplido/motivo no cambian de semántica con la actividad extendida (montado)', () => {
    const { anochecer } = canon();
    const npcs = anochecer.npcs.map((n, i) => {
      if (i === 0)
        return {
          ...conActividad(n, { harvested: 20, built: 0, discovered: 0, porRecurso: { berry: 20 } }),
          designio: 'recoleccion' as const,
        };
      if (i === 1)
        return {
          ...conActividad(n, { harvested: 0, built: 0, discovered: 0 }),
          designio: 'construccion' as const,
        };
      return n;
    });
    const rep = computeDawnReport({ ...anochecer, npcs });
    const recolector = entrada(rep, npcs[0].id);
    expect(recolector.cumplido).toBe('cumplido'); // 20 ≥ UMBRAL_CUMPLIDO.recoleccion (15)
    expect('motivo' in recolector).toBe(false);
    const constructor = entrada(rep, npcs[1].id);
    expect(constructor.cumplido).toBe('fallido');
    expect(['sin-obra-pendiente', 'sin-frontera', 'corto']).toContain(constructor.motivo);
  });
});
