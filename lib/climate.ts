/**
 * Sistema de Clima y Estaciones - Determinismo §A4.
 * Un año = 60 días (15 días por estación).
 */

import { nextInt, type PRNGState } from './prng';
import type { Season, ClimateState } from './world-state';

export const SEASON = {
  SPRING: 'spring',
  SUMMER: 'summer',
  AUTUMN: 'autumn',
  WINTER: 'winter',
} as const;

export const DAYS_PER_SEASON = 15;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * 4;

export function initialClimateState(): ClimateState {
  return {
    dayOfYear: 0,
    season: SEASON.SPRING,
    temperature: 50,
    humidity: 50,
  };
}

export function tickClimate(state: ClimateState, prng: PRNGState): { state: ClimateState; next: PRNGState } {
  const dayOfYear = state.dayOfYear + 1 > DAYS_PER_YEAR ? 1 : state.dayOfYear + 1;
  
  let season: Season = SEASON.SPRING;
  if (dayOfYear <= DAYS_PER_SEASON) season = SEASON.SPRING;
  else if (dayOfYear <= DAYS_PER_SEASON * 2) season = SEASON.SUMMER;
  else if (dayOfYear <= DAYS_PER_SEASON * 3) season = SEASON.AUTUMN;
  else season = SEASON.WINTER;

  // Variación determinista de temperatura/humedad según estación
  let baseTemp = 50;
  let baseHum = 50;

  switch (season) {
    case SEASON.SPRING: baseTemp = 40 + (dayOfYear / DAYS_PER_SEASON) * 20; baseHum = 60; break;
    case SEASON.SUMMER: baseTemp = 70 + (nextInt(prng, 0, 30).value); baseHum = 20; break;
    case SEASON.AUTUMN: baseTemp = 60 - ((dayOfYear - DAYS_PER_SEASON * 2) / DAYS_PER_SEASON) * 30; baseHum = 70; break;
    case SEASON.WINTER: baseTemp = 10 + (nextInt(prng, 0, 20).value); baseHum = 40; break;
  }

  const { value: vTemp, next: n1 } = nextInt(prng, -5, 5);
  const { value: vHum, next: n2 } = nextInt(n1, -5, 5);

  return {
    state: {
      dayOfYear,
      season,
      temperature: Math.max(0, Math.min(100, baseTemp + vTemp)),
      humidity: Math.max(0, Math.min(100, baseHum + vHum)),
    },
    next: n2,
  };
}
