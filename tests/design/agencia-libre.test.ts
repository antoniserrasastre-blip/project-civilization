/**
 * Suite de diseño TDD — Sprint 05b, bloque 1: AGENCIA ÍNTEGRA — volver a "Libre".
 *
 * El triple playtest dictó: una vez asignado un designio, la opción "Libre"
 * no se puede aplicar JAMÁS. `applyAssignments` solo sobreescribe los ids
 * presentes en el record; no existe forma de LIMPIAR un designio.
 *
 * Contrato (decidido por el orquestador — sim-side; la UI no es asunto de
 * esta suite):
 *  - `applyAssignments(state, assignments)` pasa a aceptar
 *    `Record<string, AssignmentDomain | null>`:
 *      · valor de dominio → asigna (comportamiento actual, INTACTO).
 *      · `null` explícito → LIMPIA el designio del NPC (vuelve a libre).
 *        El implementer decide si deja `designio: null` o borra la clave
 *        (§A4-limpio); esta suite acepta ambas: `npc.designio ?? null`.
 *      · id AUSENTE del record → conserva designio (comportamiento actual,
 *        INTACTO — assignments.test.ts ya lo pinna).
 *  - El historial (`assignmentsHistory`) registra el record tal cual se
 *    aplicó — CON sus nulls — y sobrevive round-trip JSON sin pérdida.
 *  - §A4: pureza, determinismo, enteros, round-trip JSON.
 *
 * Los tests escriben contra el contrato futuro: el tipo de `Assignments`
 * hoy no admite null (cast local mínimo en `aplica()` — el rojo debe ser
 * por COMPORTAMIENTO, no por compilación; vitest transpila sin type-check).
 *
 * Fixture: el Laboratorio (32×32, 4 NPCs, flags OFF — barato y determinista),
 * con el patrón de cruce de amaneceres de conexion-designios.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { applyAssignments, type Assignments } from '@/lib/dawn';
import { TICKS_PER_DAY } from '@/lib/resources';
import { makeLaboratorioState } from '@/lib/laboratorio';
import type { DawnReport, GameState } from '@/lib/game-state';
import type { AssignmentDomain } from '@/lib/npcs';

// ————————————————————————————————————————————————————————————————
// Helpers + fixture canónica
// ————————————————————————————————————————————————————————————————

/** El tipo del contrato futuro: dominio asigna, null limpia, ausente conserva. */
type AssignmentsConNulls = Readonly<Record<string, AssignmentDomain | null>>;

/** Contrato futuro (sprint 05b): cast local mínimo SOLO en la llamada —
 *  `Assignments` aún no admite null. Así el rojo es por comportamiento. */
function aplica(s: GameState, a: AssignmentsConNulls): GameState {
  return applyAssignments(s, a as unknown as Assignments);
}

/** Corre la sim hasta el anochecer (phasedMode pausa en 'preparation').
 *  Guard duro: si en TICKS_PER_DAY + 5 ticks no llegó, el loop está roto. */
function correHastaAnochecer(s: GameState): GameState {
  let guard = 0;
  while (s.phase !== 'preparation') {
    s = tick(s);
    if (++guard > TICKS_PER_DAY + 5) {
      throw new Error('nunca llegó a preparation — la máquina de fases no pausa');
    }
  }
  return s;
}

/** Entrada del informe por id, con guard (nada de undefined silencioso). */
function entrada(rep: DawnReport, id: string) {
  const e = rep.npcs.find((n) => n.id === id);
  if (!e) throw new Error(`el informe no trae al NPC ${id}`);
  return e;
}

/** NPC del estado por id, con guard. */
function npcDe(s: GameState, id: string) {
  const n = s.npcs.find((x) => x.id === id);
  if (!n) throw new Error(`el estado no trae al NPC ${id}`);
  return n;
}

/**
 * Estado serializado para comparar partidas gemelas, neutralizando las dos
 * libertades del contrato:
 *  - `assignmentsHistory` fuera: el contrato MANDA registrar el null aplicado,
 *    así que difiere del gemelo POR DISEÑO (se asierta aparte, suite 4).
 *  - `designio` normalizado a `?? null` y re-colocado al final de cada NPC:
 *    el implementer puede dejar `null` o borrar la clave — ambas §A4-válidas.
 */
function huellaSinHistorial(s: GameState): string {
  const c = JSON.parse(JSON.stringify(s)) as GameState;
  const { assignmentsHistory: _h, ...rest } = c;
  const npcs = rest.npcs.map((n) => {
    const { designio, ...resto } = n;
    return { ...resto, designio: designio ?? null };
  });
  return JSON.stringify({ ...rest, npcs });
}

/**
 * Partida canónica (cacheada — pura y determinista, los estados son
 * inmutables y compartibles entre tests):
 *  - prep0:       anochecer del día 0, aún sin designios.
 *  - duskDia1:    anochecer del día 1, corrido entero con tres designios
 *                 (ids[0]→recoleccion, ids[1]→exploracion, ids[2]→construccion;
 *                 ids[3] queda libre — el testigo "nunca tuvo").
 *  - trasLimpiar: amanecer del día 2 cruzado con { ids[0]: null } (LIMPIA).
 *  - finDia2:     día 2 corrido entero + amanecer con {} → dawnReport = día 2.
 */
interface Partida {
  prep0: GameState;
  duskDia1: GameState;
  trasLimpiar: GameState;
  finDia2: GameState;
  ids: string[];
}

function construyePartida(): Partida {
  let s = makeLaboratorioState(1);
  s = correHastaAnochecer(s); // día 0 entero
  const prep0 = s;
  const ids = s.npcs.map((n) => n.id);
  s = aplica(s, {
    [ids[0]]: 'recoleccion',
    [ids[1]]: 'exploracion',
    [ids[2]]: 'construccion',
  });
  s = correHastaAnochecer(s); // día 1 entero, con designios
  const duskDia1 = s;
  const trasLimpiar = aplica(duskDia1, { [ids[0]]: null }); // ← LA LIMPIEZA
  let d2 = correHastaAnochecer(trasLimpiar); // día 2 entero
  const finDia2 = aplica(d2, {}); // amanecer: informe del día 2
  return { prep0, duskDia1, trasLimpiar, finDia2, ids };
}

let _canon: Partida | null = null;
function canon(): Partida {
  if (!_canon) _canon = construyePartida();
  return _canon;
}

// ————————————————————————————————————————————————————————————————
// 1. Asignar → limpiar con null → libre de verdad, también en el informe
// ————————————————————————————————————————————————————————————————

describe('Agencia — null explícito LIMPIA el designio (vuelta a Libre)', () => {
  it(
    'tras limpiar al amanecer del día 2, el NPC queda con designio null',
    () => {
      const { duskDia1, trasLimpiar, ids } = canon();
      // Precondición sobre el contrato vigente: el designio del día 1 existía.
      expect(npcDe(duskDia1, ids[0]).designio).toBe('recoleccion');
      // Contrato nuevo: el null lo limpió (hoy persiste — ROJO esperado).
      expect(npcDe(trasLimpiar, ids[0]).designio ?? null).toBeNull();
    },
    60_000,
  );

  it('limpiar NO contamina el informe del día que cierra (dawn corre antes de sobreescribir)', () => {
    const { trasLimpiar, ids } = canon();
    // El informe que trae trasLimpiar es el del día 1: ese día el designio
    // ESTUVO activo, y así debe constar (comportamiento actual, intacto).
    const rep = trasLimpiar.dawnReport!;
    expect(entrada(rep, ids[0]).designio).toBe('recoleccion');
  });

  it('el informe del día 2 lo lista con designio null y cumplido null (libre, no "fallido")', () => {
    const { finDia2, ids } = canon();
    // Guard de fixture: sigue vivo (si muere, el seed eligió mal — señal real).
    expect(npcDe(finDia2, ids[0]).alive).toBe(true);
    const e = entrada(finDia2.dawnReport!, ids[0]);
    expect(e.designio).toBeNull();
    expect(e.cumplido).toBeNull();
  });
});

// ————————————————————————————————————————————————————————————————
// 2. Limpiar a quien NUNCA tuvo designio → no-op limpio
// ————————————————————————————————————————————————————————————————

describe('Agencia — null sobre un NPC que nunca tuvo designio es no-op limpio', () => {
  it('no lanza, y el designio sigue null', () => {
    const { prep0, ids } = canon();
    let out: GameState | null = null;
    expect(() => {
      out = aplica(prep0, { [ids[3]]: null });
    }).not.toThrow();
    expect(npcDe(out!, ids[3]).designio ?? null).toBeNull();
  });

  it('el estado resultante es el gemelo del record vacío (módulo historial y forma del null)', () => {
    const { prep0, ids } = canon();
    const conNull = aplica(prep0, { [ids[3]]: null });
    const gemelo = aplica(prep0, {});
    // Misma sim, mismo prng, mismos NPCs: limpiar lo ya-libre no toca nada.
    expect(huellaSinHistorial(conNull)).toBe(huellaSinHistorial(gemelo));
  });
});

// ————————————————————————————————————————————————————————————————
// 3. Record mixto: asignar + limpiar + ausente, cada uno su semántica
// ————————————————————————————————————————————————————————————————

describe('Agencia — record mixto: dominio asigna, null limpia, ausente conserva', () => {
  it('en un solo applyAssignments conviven las tres semánticas', () => {
    const { duskDia1, ids } = canon();
    // Preconditions del contrato vigente: los tres designios del día 1 siguen.
    expect(npcDe(duskDia1, ids[0]).designio).toBe('recoleccion');
    expect(npcDe(duskDia1, ids[1]).designio).toBe('exploracion');
    expect(npcDe(duskDia1, ids[2]).designio).toBe('construccion');

    const out = aplica(duskDia1, {
      [ids[0]]: null, //          limpia (ROJO esperado hoy)
      [ids[1]]: 'recoleccion', // reasigna (comportamiento actual, intacto)
      //          ids[2] AUSENTE → conserva (pinneado por assignments.test.ts)
    });

    expect(npcDe(out, ids[0]).designio ?? null).toBeNull();
    expect(npcDe(out, ids[1]).designio).toBe('recoleccion');
    expect(npcDe(out, ids[2]).designio).toBe('construccion');
    expect(npcDe(out, ids[3]).designio ?? null).toBeNull(); // nunca tuvo
  });
});

// ————————————————————————————————————————————————————————————————
// 4. El historial registra los nulls y sobrevive round-trip JSON (§A4)
// ————————————————————————————————————————————————————————————————

describe('Agencia — assignmentsHistory registra el record con sus nulls', () => {
  it('el último registro lleva la clave limpiada con valor null (no la omite)', () => {
    const { duskDia1, ids } = canon();
    const out = aplica(duskDia1, { [ids[0]]: null, [ids[1]]: 'recoleccion' });
    const last = out.assignmentsHistory[out.assignmentsHistory.length - 1];
    const asg = last.assignments as Record<string, unknown>; // contrato futuro
    // La clave EXISTE y vale null — "tal cual se aplicó".
    expect(Object.prototype.hasOwnProperty.call(asg, ids[0])).toBe(true);
    expect(asg[ids[0]]).toBeNull();
    expect(asg[ids[1]]).toBe('recoleccion');
    // El ausente NO se inventa.
    expect(Object.prototype.hasOwnProperty.call(asg, ids[2])).toBe(false);
    expect(Object.keys(asg).sort()).toEqual([ids[0], ids[1]].sort());
  });

  it('round-trip JSON sin pérdida ni mutación de claves (null sobrevive, byte-estable)', () => {
    const { duskDia1, ids } = canon();
    const record: AssignmentsConNulls = { [ids[0]]: null, [ids[1]]: 'recoleccion' };
    const antes = JSON.stringify(record);
    const out = aplica(duskDia1, record);
    // Pureza: la llamada no mutó el record de entrada.
    expect(JSON.stringify(record)).toBe(antes);

    const revived = JSON.parse(JSON.stringify(out)) as GameState;
    const last = revived.assignmentsHistory[revived.assignmentsHistory.length - 1];
    const asg = last.assignments as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(asg, ids[0])).toBe(true); // null ≠ undefined: JSON lo conserva
    expect(asg[ids[0]]).toBeNull();
    expect(JSON.stringify(revived)).toBe(JSON.stringify(out)); // byte-estable
  });
});

// ————————————————————————————————————————————————————————————————
// 5. Determinismo (§A4)
// ————————————————————————————————————————————————————————————————

describe('Agencia — determinismo de la secuencia con limpieza', () => {
  it(
    'misma secuencia (asignar → limpiar → día 2) dos veces → estados byte-idénticos',
    () => {
      const a = construyePartida();
      const b = construyePartida();
      expect(JSON.stringify(a.trasLimpiar)).toBe(JSON.stringify(b.trasLimpiar));
      expect(JSON.stringify(a.finDia2)).toBe(JSON.stringify(b.finDia2));
    },
    120_000,
  );
});

// ————————————————————————————————————————————————————————————————
// 6. Regresión DELIBERADA: un record sin nulls se comporta EXACTAMENTE como hoy
//    (este test puede nacer VERDE — pinna el comportamiento vigente para que
//    el implementer no lo rompa al añadir la rama del null).
// ————————————————————————————————————————————————————————————————

describe('Agencia — regresión: sin nulls, nada cambia', () => {
  it('asigna los presentes, conserva los ausentes y el historial registra el record válido', () => {
    const { prep0, duskDia1, ids } = canon();

    // Primera asignación desde cero (lo que hace conexion-designios hoy).
    const primera = aplica(prep0, { [ids[0]]: 'recoleccion', [ids[1]]: 'exploracion' });
    expect(npcDe(primera, ids[0]).designio).toBe('recoleccion');
    expect(npcDe(primera, ids[1]).designio).toBe('exploracion');
    expect(npcDe(primera, ids[2]).designio ?? null).toBeNull(); // ausente: sin designio previo
    const rec1 = primera.assignmentsHistory[primera.assignmentsHistory.length - 1];
    expect(rec1.assignments).toEqual({ [ids[0]]: 'recoleccion', [ids[1]]: 'exploracion' });

    // Reasignación parcial sobre designios vivos: el ausente CONSERVA.
    const segunda = aplica(duskDia1, { [ids[0]]: 'exploracion' });
    expect(npcDe(segunda, ids[0]).designio).toBe('exploracion'); // sobreescrito
    expect(npcDe(segunda, ids[1]).designio).toBe('exploracion'); // ausente → conserva
    expect(npcDe(segunda, ids[2]).designio).toBe('construccion'); // ausente → conserva
    expect(segunda.phase).toBe('day');
    expect(segunda.tick).toBe(duskDia1.tick + 1); // cruzó el anochecer
  });
});

// ————————————————————————————————————————————————————————————————
// 7. Comportamiento real: el limpiado vive el día siguiente como libre
//
// AMBICIÓN BAJADA (documentado): la equivalencia exacta con una partida
// gemela que NUNCA asignó no se sostiene — el día 1 con designio ya divergió
// la sim de forma legítima (XP ×1.5 en las skills del foco vía DESIGNIO_SKILLS,
// lib/npcs.ts, y sesgo de movimiento en lib/needs.ts:331), así que skills,
// posiciones y prng del día 2 no pueden ser byte-iguales a las del gemelo.
// Lo que FIJAMOS en su lugar:
//  (a) el campo designio queda null durante TODO el día 2 — la puerta del
//      sesgo (`npc.designio && ...` en needs.ts) no puede abrirse jamás;
//  (b) el informe del día 2 lo trata con la MISMA forma que al testigo que
//      nunca tuvo designio: designio null y cumplido null (no 'fallido');
//  (c) no entra en los contadores de designios del clan.
// ————————————————————————————————————————————————————————————————

describe('Agencia — el limpiado se comporta al día siguiente como quien nunca tuvo designio', () => {
  it('durante todo el día 2 su designio es null (la puerta del sesgo no puede abrirse)', () => {
    const { trasLimpiar, ids } = canon();
    let s = trasLimpiar;
    expect(npcDe(s, ids[0]).designio ?? null).toBeNull(); // al arrancar el día
    let guard = 0;
    while (s.phase !== 'preparation') {
      s = tick(s);
      if (npcDe(s, ids[0]).alive) {
        expect(npcDe(s, ids[0]).designio ?? null).toBeNull(); // en cada tick
      }
      if (++guard > TICKS_PER_DAY + 5) {
        throw new Error('nunca llegó a preparation — la máquina de fases no pausa');
      }
    }
  });

  it('su entrada del informe del día 2 tiene la misma forma que la del testigo que nunca tuvo designio', () => {
    const { finDia2, ids } = canon();
    const rep = finDia2.dawnReport!;
    const limpiado = entrada(rep, ids[0]);
    const testigo = entrada(rep, ids[3]); // ids[3] jamás recibió designio
    // Precondición: el testigo es de verdad un libre-de-siempre.
    expect(testigo.designio).toBeNull();
    expect(testigo.cumplido).toBeNull();
    // El limpiado, idéntico en forma: libre, no "fallido".
    expect(limpiado.designio).toBeNull();
    expect(limpiado.cumplido).toBeNull();
  });

  it('no cuenta en designiosDados ni designiosCumplidos del día 2', () => {
    const { finDia2, ids } = canon();
    const rep = finDia2.dawnReport!;
    // El día 2 solo conservan designio ids[1] y ids[2] (ids[0] limpiado,
    // ids[3] nunca tuvo) — los contadores deben cuadrar con las entradas.
    const conDesignio = rep.npcs.filter((n) => n.designio !== null);
    expect(conDesignio.map((n) => n.id)).not.toContain(ids[0]);
    expect(rep.clan.designiosDados).toBe(conDesignio.length);
    expect(rep.clan.designiosDados).toBe(2);
  });
});
