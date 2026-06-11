/**
 * Ciclo solar — SSOT del tiempo del día (Sprint 05d, 12-06-2026).
 *
 * Antes había DOS relojes que no coincidían: el sim consideraba noche desde
 * el 50% del día (needs.ts) y la UI la pintaba desde el 80% (TimeOrbit) —
 * media partida el HUD decía "Día" mientras el clan se comportaba como de
 * noche. Y el calendario visible vivía DENTRO del clima (climate.dayOfYear),
 * así que el laboratorio (climate OFF) lo congelaba en Día 1 para siempre.
 *
 * Aquí vive el único reloj: fases como fracciones enteras de TICKS_PER_DAY,
 * la noche es el ÚLTIMO 20% (decisión de Toni: las noches eran eternas), y
 * el día del calendario deriva del tick, nunca del clima. §A4: puro, enteros.
 */

import { TICKS_PER_DAY } from './resources';

export type SolarPhase = 'amanecer' | 'dia' | 'ocaso' | 'noche';

/** Límites de fase en centésimas del día (enteros): [inicio, fin). */
export const SOLAR_PHASE_BOUNDS: Record<SolarPhase, readonly [number, number]> = {
  amanecer: [0, 10],
  dia: [10, 70],
  ocaso: [70, 80],
  noche: [80, 100],
};

export function solarPhase(tick: number, ticksPerDay: number = TICKS_PER_DAY): SolarPhase {
  const pct = Math.floor(((tick % ticksPerDay) * 100) / ticksPerDay);
  if (pct < SOLAR_PHASE_BOUNDS.amanecer[1]) return 'amanecer';
  if (pct < SOLAR_PHASE_BOUNDS.dia[1]) return 'dia';
  if (pct < SOLAR_PHASE_BOUNDS.ocaso[1]) return 'ocaso';
  return 'noche';
}

/** Noche del SIM (miedo, vuelta al fuego, no-forrajeo): solo el último 20%. */
export function isNightTick(tick: number, ticksPerDay: number = TICKS_PER_DAY): boolean {
  return solarPhase(tick, ticksPerDay) === 'noche';
}

/** Día del calendario, 1-based — deriva del TICK, jamás del clima. */
export function currentDay(tick: number, ticksPerDay: number = TICKS_PER_DAY): number {
  return Math.floor(tick / ticksPerDay) + 1;
}
