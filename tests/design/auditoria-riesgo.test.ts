/**
 * AUDITORÍA DE RIESGO — Sprint 05b (bloque 3, "Mordisco de riesgo").
 *
 * Triple playtest del laboratorio (10-06-2026): 3 días saboteando al clan
 * (todos los designios a exploración, nadie a recolección) y los recursos
 * SUBIERON; jamás HAMBRE; cero muertes. Sin riesgo no hay juego.
 *
 * CONTRATO AUDITADO: en makeLaboratorioState(1), si el jugador dirige MAL
 * al clan 3 días seguidos (todos a exploracion), el coste debe ser VISIBLE:
 * al cierre del día 3, ≥1 NPC con supervivencia bajo el umbral de hambre
 * (NEED_THRESHOLDS.supervivenciaHungry — el umbral real de lib/needs.ts).
 *
 * ROJO HOY (auditoría 11-06-2026, sonda determinista seed 1):
 *  - svMin al cierre: día 1 = 72.3, día 2 = 65.0, día 3 = 72.6.
 *  - Ticks con algún NPC < 45: 0 de 480, los 4 días (ni un parpadeo).
 *  - El sabotaje SÍ fue real aquí (designios aplicados, discovered 332 el
 *    día 1) — el clan explora Y come a la vez. El mecanismo:
 *    1. El designio es solo un bias del TIEMPO LIBRE (needs.ts:331): las
 *       urgencias van antes — con sv<45 y sin comida encima, el NPC ignora
 *       el designio y va al nodo de comida más cercano (needs.ts:257).
 *    2. Auto-cosecha pasiva: todo NPC parado sobre un nodo cosecha 1/tick
 *       sin importar su designio (harvest.ts:80-121) — el explorador que
 *       cruza el mapa se llena los bolsillos sin querer.
 *    3. Auto-comer con sv<65 (needs.ts:509): una ración rinde 15-40 sv
 *       (×1.5 con fogata) contra un decay de 0.15/tick = 72 sv/día.
 *    4. Suelo de agua: de pie en agua, +5/tick hasta 70 (needs.ts:541) —
 *       incluso con la comida del mundo a CERO (sonda a 10 días) nadie
 *       cierra por debajo de 65 y la muerte es inalcanzable.
 *    5. Tuning encima: 190 de comida inicial para 4 NPCs que consumen
 *       ~26-37/día → ~6 días de despensa gratis sin hacer nada.
 *
 * El test de contexto de abajo (VERDE) deja la economía medida como
 * evidencia y mata la hipótesis del playtest: con sabotaje REAL la comida
 * del mundo BAJA (177→137→100→73), no sube — si en el playtest subió, los
 * designios del agente no se estaban aplicando (bug conocido de dropdowns).
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { applyAssignments } from '@/lib/dawn';
import { TICKS_PER_DAY, isFoodResource } from '@/lib/resources';
import { makeLaboratorioState } from '@/lib/laboratorio';
import { NEED_THRESHOLDS } from '@/lib/needs';
import type { GameState } from '@/lib/game-state';

const UMBRAL_HAMBRE = NEED_THRESHOLDS.supervivenciaHungry;
const DIAS_SABOTAJE = 3;

/** Comida total del mundo (berry + fish + game) — la despensa silvestre. */
function comidaDelMundo(s: GameState): number {
  return s.world.resources.reduce(
    (acc, r) => acc + (isFoodResource(r.id) ? r.quantity : 0),
    0,
  );
}

function svMinima(s: GameState): number {
  return Math.min(...s.npcs.filter((n) => n.alive).map((n) => n.stats.supervivencia));
}

interface CierreDeDia {
  /** Día del informe del amanecer (cierra en 'preparation'). */
  dia: number;
  comidaMundo: number;
  svMin: number;
  /** Ticks del día en que ALGÚN NPC vivo estuvo bajo el umbral de hambre. */
  ticksConHambre: number;
  /** Tiles descubiertos por el clan ese día (¿el sabotaje movió al clan?). */
  discovered: number;
  /** Designios vigentes al cierre (¿el sabotaje aplicó de verdad?). */
  designios: (string | null)[];
  vivos: number;
}

/** Corre un día entero hasta 'preparation' midiendo el hambre tick a tick.
 *  Guard duro como en conexion-designios: si no pausa, el loop está roto. */
function correDiaMidiendo(s: GameState): { state: GameState; cierre: CierreDeDia } {
  let ticksConHambre = 0;
  let guard = 0;
  while (s.phase !== 'preparation') {
    s = tick(s);
    if (svMinima(s) < UMBRAL_HAMBRE) ticksConHambre++;
    if (++guard > TICKS_PER_DAY + 5) {
      throw new Error('nunca llegó a preparation — la máquina de fases no pausa');
    }
  }
  return {
    state: s,
    cierre: {
      dia: s.dawnReport?.day ?? -1,
      comidaMundo: comidaDelMundo(s),
      svMin: Math.round(svMinima(s) * 10) / 10,
      ticksConHambre,
      discovered: s.dawnReport?.clan.discovered ?? -1,
      designios: s.npcs.filter((n) => n.alive).map((n) => n.designio ?? null),
      vivos: s.npcs.filter((n) => n.alive).length,
    },
  };
}

interface Sabotaje {
  estadoFinal: GameState;
  comidaInicial: number;
  /** Día 0 (libre) + días 1..3 (sabotaje), cada uno medido a su cierre. */
  cierres: CierreDeDia[];
}

/** La partida del playtest, reproducida sobre la sim real: laboratorio seed 1,
 *  día 0 libre (primera 'preparation' = primera ocasión de asignar) y después
 *  3 días con TODOS los designios a exploracion — nadie a recoleccion. */
function ejecutaSabotaje(): Sabotaje {
  let s = makeLaboratorioState(1);
  const comidaInicial = comidaDelMundo(s);
  const cierres: CierreDeDia[] = [];

  let r = correDiaMidiendo(s); // día 0: sin designios (aún no hubo preparación)
  s = r.state;
  cierres.push(r.cierre);

  const ids = s.npcs.map((n) => n.id);
  for (let d = 1; d <= DIAS_SABOTAJE; d++) {
    const todosAExplorar = Object.fromEntries(ids.map((id) => [id, 'exploracion' as const]));
    s = applyAssignments(s, todosAExplorar);
    r = correDiaMidiendo(s);
    s = r.state;
    cierres.push(r.cierre);
  }
  return { estadoFinal: s, comidaInicial, cierres };
}

// Cache (sim pura y determinista → una sola ejecución para ambos tests).
let _sabotaje: Sabotaje | null = null;
function sabotaje(): Sabotaje {
  if (!_sabotaje) _sabotaje = ejecutaSabotaje();
  return _sabotaje;
}

/** Libro de cuentas legible para los mensajes de los expects. */
function libroDeCuentas(sab: Sabotaje): string {
  const filas = sab.cierres.map(
    (c) =>
      `día ${c.dia}: comida=${c.comidaMundo}, svMin=${c.svMin}, ` +
      `ticksConHambre=${c.ticksConHambre}/${TICKS_PER_DAY}, discovered=${c.discovered}`,
  );
  return `comida inicial=${sab.comidaInicial} | ${filas.join(' | ')}`;
}

// ————————————————————————————————————————————————————————————————
// 1. EL CONTRATO: dirigir mal tiene que doler
// ————————————————————————————————————————————————————————————————

describe('Auditoría de riesgo — el sabotaje del jugador tiene coste visible', () => {
  it(
    `dirigir mal 3 días tiene coste visible: ≥1 NPC con hambre real (sv < ${UMBRAL_HAMBRE}) al cierre del día 3`,
    { timeout: 60_000 },
    () => {
      const sab = sabotaje();
      const cierre3 = sab.cierres[DIAS_SABOTAJE];

      // Preconditions sobre campos existentes (sin tautología): el sabotaje
      // fue REAL — estamos en el cierre del día 3, todos los vivos pasaron el
      // día con designio de exploración, y el designio movió al clan de
      // verdad el día 1 (discovered > 0). Si esto falla, no se midió nada:
      // sería el mismo bug de aplicación de designios que cegó al playtest.
      expect(cierre3.dia).toBe(DIAS_SABOTAJE);
      for (const c of sab.cierres.slice(1)) {
        expect(c.designios.every((d) => d === 'exploracion'), `día ${c.dia}: designios=${c.designios}`).toBe(true);
      }
      expect(sab.cierres[1].discovered).toBeGreaterThan(0);
      expect(cierre3.vivos).toBeGreaterThan(0);

      // EL CONTRATO: nadie recolectó en 3 días → al menos un NPC debe llegar
      // al cierre del día 3 con hambre real (bajo el umbral de lib/needs.ts).
      const sv = sab.estadoFinal.npcs
        .filter((n) => n.alive)
        .map((n) => Math.round(n.stats.supervivencia * 10) / 10);
      expect(
        Math.min(...sv),
        `sin riesgo no hay juego — 3 días de sabotaje y nadie pasó hambre. ` +
          `sv al cierre del día 3: [${sv.join(', ')}] (umbral ${UMBRAL_HAMBRE}). ` +
          `Economía: ${libroDeCuentas(sab)}`,
      ).toBeLessThan(UMBRAL_HAMBRE);
    },
  );
});

// ————————————————————————————————————————————————————————————————
// 2. CONTEXTO: la economía del laboratorio, medida y a la vista
// ————————————————————————————————————————————————————————————————

describe('Auditoría de riesgo — contexto: la economía del lab deja evidencia medible', () => {
  it(
    'con sabotaje REAL la comida del mundo BAJA día a día (si en un playtest sube, los designios no se aplicaron)',
    { timeout: 60_000 },
    () => {
      const sab = sabotaje();
      const cuentas = libroDeCuentas(sab);

      // El clan consume de verdad: la despensa silvestre mengua respecto al
      // arranque. (En el playtest "subió" — eso solo cuadra si el supuesto
      // sabotaje nunca llegó a la sim.)
      const comidaFinal = sab.cierres[DIAS_SABOTAJE].comidaMundo;
      expect(
        comidaFinal,
        `la comida del mundo no mengua tras 3 días de bocas sin recolectar — ${cuentas}`,
      ).toBeLessThan(sab.comidaInicial);

      // Y mengua de forma sostenida: ningún cierre con más comida que el
      // anterior (a 3 días vista el lab no regala regeneración: las bayas
      // regenerables solo resetean a los 45 días — REGEN_DAYS, resources.ts).
      for (let i = 1; i < sab.cierres.length; i++) {
        expect(
          sab.cierres[i].comidaMundo,
          `del día ${sab.cierres[i - 1].dia} al ${sab.cierres[i].dia} la comida SUBIÓ — ${cuentas}`,
        ).toBeLessThanOrEqual(sab.cierres[i - 1].comidaMundo);
      }

      // Margen documentado, no solo pasa/no-pasa: la serie completa (comida,
      // svMin y ticks-con-hambre por día) viaja en el mensaje del assert.
      // Sin tautología: si algún día el lab muerde tanto que mata, este
      // assert (cero muertes en 3 días con agua infinita a 70, needs.ts:541)
      // avisará de que el mordisco se pasó de frenada.
      expect(
        sab.cierres[DIAS_SABOTAJE].vivos,
        `hubo muertes durante el sabotaje de 3 días — ${cuentas}`,
      ).toBe(sab.cierres[0].vivos);
    },
  );
});
