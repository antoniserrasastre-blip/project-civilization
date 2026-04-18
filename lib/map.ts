/**
 * Mapa procedural — Sprint 2 (costa de isla balear ficticia).
 *
 * Genera un polígono cerrado que aproxima el perímetro de una isla. Está
 * construido para cumplir §A4:
 *   - Pura (sin side effects, sin Date.now, sin Math.random).
 *   - Determinista: misma seed + mismo tamaño + misma resolución produce
 *     el mismo array de puntos byte a byte.
 *   - JSON-serializable (solo arrays y objetos planos).
 *
 * Heurística: radio polar = baseRadius + Σ A_i · sin(f_i · θ + φ_i). Las
 * amplitudes/frecuencias/fases salen del PRNG seedable. El primer/último
 * punto coinciden para que la costa cierre sin solapamiento.
 */

import { next, nextRange, seedState, type PRNGState } from './prng';

export interface CoastPoint {
  x: number;
  y: number;
}

export interface Coast {
  /**
   * Polígono cerrado (el último punto es igual al primero). Orientado en
   * sentido antihorario partiendo del este (θ=0).
   */
  points: CoastPoint[];
}

export interface CoastOptions {
  /** Nº de segmentos del polígono. Default 128. */
  resolution?: number;
  /** Nº de capas de seno a sumar. Default 4. */
  layers?: number;
  /** Fracción del radio base respecto a mapSize/2. Default 0.8. */
  baseRadiusFrac?: number;
  /** Amplitud total del ruido sinusoidal como fracción de baseRadius. Default 0.25. */
  noiseFrac?: number;
}

/**
 * Genera una costa cerrada para la isla.
 */
export function generateCoast(
  seed: number,
  mapSize: number,
  options: CoastOptions = {},
): Coast {
  const resolution = options.resolution ?? 128;
  const layers = options.layers ?? 4;
  const baseRadiusFrac = options.baseRadiusFrac ?? 0.8;
  const noiseFrac = options.noiseFrac ?? 0.25;

  const cx = mapSize / 2;
  const cy = mapSize / 2;
  const baseRadius = (mapSize / 2) * baseRadiusFrac;

  // Sortear por adelantado las frecuencias / amplitudes / fases.
  let prng: PRNGState = seedState(seed);
  const waves: Array<{ freq: number; amp: number; phase: number }> = [];
  let totalAmp = 0;
  for (let i = 0; i < layers; i++) {
    const freqRoll = next(prng);
    prng = freqRoll.next;
    const ampRoll = next(prng);
    prng = ampRoll.next;
    const phaseRoll = next(prng);
    prng = phaseRoll.next;

    // Frecuencias enteras bajas (2..8) — forma orgánica, no ruido fino.
    const freq = 2 + Math.floor(freqRoll.value * 7);
    // Amplitud relativa decreciente por capa.
    const amp = ampRoll.value * Math.pow(0.7, i);
    const phase = phaseRoll.value * Math.PI * 2;

    waves.push({ freq, amp, phase });
    totalAmp += amp;
  }

  const amplitudeScale = totalAmp > 0 ? (baseRadius * noiseFrac) / totalAmp : 0;

  const points: CoastPoint[] = [];
  for (let i = 0; i < resolution; i++) {
    const theta = (i / resolution) * Math.PI * 2;
    let delta = 0;
    for (const w of waves) {
      delta += w.amp * Math.sin(w.freq * theta + w.phase);
    }
    // Un poquito de jitter adicional por-punto, también seedable.
    const jitterRoll = nextRange(prng, -1, 1);
    prng = jitterRoll.next;
    delta += jitterRoll.value * (baseRadius * noiseFrac * 0.05);

    const r = baseRadius + delta * amplitudeScale;
    const x = clamp(cx + Math.cos(theta) * r, 0, mapSize);
    const y = clamp(cy + Math.sin(theta) * r, 0, mapSize);
    points.push({ x, y });
  }
  // Cierre: repetir el primer punto al final para que los consumidores
  // puedan iterar sin caso especial.
  points.push({ ...points[0] });

  return { points };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
