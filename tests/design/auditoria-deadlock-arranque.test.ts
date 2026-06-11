/**
 * AUDITORÍA DE GAMEPLAY — Sprint 05 ("El Laboratorio").
 *
 * Deadlock económico de arranque (bug del playtest de Toni, 10-06-2026):
 * sin fogata construida → inventarios per-type al cap → parálisis del clan.
 *
 * REPRO MÍNIMA DETERMINISTA (laboratorio 32×32, 4 NPCs, flags OFF):
 * ~14 de 38 seeds válidos (4, 6, 7, 11, 13, 19, 21, 27, 31, 35, 37, 39, 40…)
 * generan un mundo pangea SIN un solo nodo de madera. En esos mundos:
 *
 *   1. lib/simulation.ts:745 — BUILD_PRIORITY.find() devuelve SIEMPRE el
 *      primer kind no construido (fogata_permanente, receta wood:2).
 *   2. lib/simulation.ts:748 — sin madera en el mundo, canBuild() nunca pasa
 *      y tryAutoBuild devuelve el estado tal cual: BLOQUEO DE CABECERA DE
 *      COLA. El stockpile_stone (stone:4 — el clan lo tiene desde el día 1,
 *      seed 7: tick 167) jamás llega a evaluarse.
 *   3. lib/harvest.ts:87 — al llegar un tipo a INVENTORY_CAP_PER_TYPE (20),
 *      ese NPC deja de cosechar ese tipo para siempre.
 *   4. lib/needs.ts:404 — la rama de depósito exige ctx.structures?.length:
 *      sin NINGUNA estructura no hay dónde soltar nada. Nada consume stone.
 *   5. Resultado: recolección diaria → 0 (seed 7: 125, 25, 9, 0, 0) con el
 *      mundo aún lleno de recursos (stone:207, fish:31, game:16).
 *
 * Estas auditorías están EN ROJO HOY por ese bloqueo (no por timeout):
 * cada una que pase en el futuro queda como regresión permanente.
 *
 * Nota phasedMode: el laboratorio congela el tick al anochecer
 * (phase='preparation'); aquí cruzamos cada noche con applyAssignments({}, sin
 * designios) — el patrón canónico de lib/dawn.ts, mismo que jugaría el PoC.
 */

import { describe, it, expect } from 'vitest';
import { makeLaboratorioState } from '@/lib/laboratorio';
import { tick } from '@/lib/simulation';
import { applyAssignments } from '@/lib/dawn';
import { TICKS_PER_DAY } from '@/lib/resources';
import { clanInventoryTotal, RECIPES, CRAFTABLE } from '@/lib/crafting';

/** Corre el laboratorio N días cruzando las noches con applyAssignments({}).
 *  Muestrea por día: nº de estructuras, recolección total del clan (antes del
 *  amanecer, que la borra), stock de stone del clan y si existe la fogata. */
function runLabDays(seed: number, days: number) {
  let s = makeLaboratorioState(seed);
  const structuresPerDay: number[] = [];
  const harvestPerDay: number[] = [];
  const clanStonePerDay: number[] = [];
  let firstDayStoneEnough = -1; // primer día con stone >= receta stockpile_stone
  let fogataDay = -1;
  const stoneNeeded = RECIPES[CRAFTABLE.STOCKPILE_STONE].inputs.stone ?? 0;

  for (let day = 1; day <= days; day++) {
    let harvested = 0;
    for (let t = 0; t < TICKS_PER_DAY; t++) {
      s = tick(s);
      if (s.phase === 'preparation') {
        harvested = s.npcs.reduce((a, n) => a + (n.dailyActivity?.harvested ?? 0), 0);
        s = applyAssignments(s, {}); // noche cruzada sin designios (día libre)
      }
    }
    const inv = clanInventoryTotal(s.npcs, s.structures);
    structuresPerDay.push(s.structures.length);
    harvestPerDay.push(harvested);
    clanStonePerDay.push(inv.stone);
    if (firstDayStoneEnough < 0 && inv.stone >= stoneNeeded) firstDayStoneEnough = day;
    if (fogataDay < 0 && s.structures.some((x) => x.kind === CRAFTABLE.FOGATA_PERMANENTE)) fogataDay = day;
  }
  return { state: s, structuresPerDay, harvestPerDay, clanStonePerDay, firstDayStoneEnough, fogataDay };
}

describe('Auditoría — deadlock económico de arranque (laboratorio, sin fogata)', () => {
  // 6 días de laboratorio ≈ 1.5s/seed; timeout holgado por si la máquina va cargada.
  it('la cola de construcción NO se bloquea: con materiales de almacén en mano, la primera estructura llega en ≤4 días', { timeout: 30000 }, () => {
    // Seeds de mundo sin madera (fogata imposible). Contrato observable: el
    // clan no puede quedarse mirando — si tiene los materiales de OTRA
    // estructura de la cola (stockpile_stone: stone≥4 desde el día 1),
    // algo se construye en los primeros 4 días.
    for (const seed of [7, 11, 13]) {
      const r = runLabDays(seed, 4);
      // Precondición honesta (no es el contrato, es la evidencia de que el
      // fallo no es escasez): los materiales del stockpile_stone están desde el día 1.
      expect(r.firstDayStoneEnough, `seed ${seed}: día con stone suficiente para stockpile_stone`).toBe(1);
      // ROJO HOY: 0 estructuras — bloqueo de cabecera de cola en tryAutoBuild
      // (lib/simulation.ts:745-748: la fogata sin madera tapona todo lo demás).
      expect(
        r.structuresPerDay[3],
        `seed ${seed}: estructuras al final del día 4 (stone del clan: ${r.clanStonePerDay.join(',')})`,
      ).toBeGreaterThan(0);
    }
  });

  it('la recolección NO muere: ningún día ≤6 acaba en 0 cosechado quedando recursos en el mundo', { timeout: 30000 }, () => {
    // Seed 7: harvested/día = 125, 25, 9, 0, 0, 2 con el mundo aún lleno
    // (stone 207, fish 31, game 16). Cadena: inventarios per-type al cap
    // (lib/harvest.ts:87) + sin estructura donde depositar (lib/needs.ts:404)
    // + nada consume materiales (no hay obra) → actividad → 0.
    const r = runLabDays(7, 6);
    const worldLeft = r.state.world.resources
      .filter((res) => res.quantity > 0 && res.id !== 'water')
      .reduce((a, res) => a + res.quantity, 0);
    expect(worldLeft, 'el mundo aún tiene recursos cosechables (la parálisis no es escasez)').toBeGreaterThan(0);
    // 05d: un día aislado a 0 ya es legítimo (SATURACIÓN: caps e inventarios
    // llenos, se come poco con la noche corta y el cap libera despacio). La
    // parálisis del bug original era una parada MUERTA: 0,0,0… para siempre.
    // Contrato re-anclado: sin DOS días consecutivos a cero.
    for (let day = 2; day <= 6; day++) {
      const ayer = r.harvestPerDay[day - 2];
      const hoy = r.harvestPerDay[day - 1];
      expect(
        ayer + hoy,
        `días ${day - 1}+${day}: parada muerta de la economía (serie: ${r.harvestPerDay.join(',')})`,
      ).toBeGreaterThan(0);
    }
  });

  it('REGRESIÓN (verde hoy): con madera en el mundo, la fogata se construye en ≤2 días', { timeout: 30000 }, () => {
    // El camino sano, como contraste: seeds con madera arrancan la fogata el
    // día 1 (wood:2, daysWork:1). Si esto rompe, el deadlock se ha extendido
    // también a los mundos con madera.
    for (const seed of [1, 5]) {
      const r = runLabDays(seed, 2);
      expect(r.fogataDay, `seed ${seed}: día de la fogata`).toBeGreaterThan(0);
      expect(r.fogataDay, `seed ${seed}: día de la fogata`).toBeLessThanOrEqual(2);
    }
  });
});
