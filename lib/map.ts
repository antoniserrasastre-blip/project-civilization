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

// ---------------------------------------------------------------------------
// Archipiélago balear — v1.2 mapa antiguo.
//
// Emula Baleares reales: Mallorca central + Menorca NE + Ibiza SW +
// Formentera al sur de Ibiza. Determinista por seed. Cada isla es un
// polígono cerrado con parámetros sinusoidales distintos para darles
// siluetas distinguibles.
// ---------------------------------------------------------------------------

export type IslandKind = 'mallorca' | 'menorca' | 'ibiza' | 'formentera';

export interface Island extends Coast {
  kind: IslandKind;
  /** Etiqueta latina para el mapa antiguo (INSVLA MAIORICA, etc.). */
  name: string;
  /** Centro geométrico aproximado (para posicionar label + NPCs). */
  center: CoastPoint;
}

export interface Archipelago {
  islands: Island[];
  /** Posición sugerida de la rosa de los vientos en mar abierto. */
  compassRose: CoastPoint;
}

interface IslandSpec {
  kind: IslandKind;
  name: string;
  center: CoastPoint;
  baseRadius: number;
  resolution: number;
  layers: number;
  noiseFrac: number;
  /** Estira en un eje (ej. Mallorca SE-NW). */
  stretch?: { angle: number; factor: number };
}

// Posiciones + formas calibradas sobre un mapa 100×100.
// (SVG: y↑ hacia abajo; usamos esa convención.)
const BALEARES_SPECS: IslandSpec[] = [
  {
    kind: 'mallorca',
    name: 'INSVLA MAIORICA',
    center: { x: 45, y: 48 },
    baseRadius: 22,
    resolution: 160,
    layers: 5,
    noiseFrac: 0.22,
    stretch: { angle: Math.PI / 6, factor: 1.3 }, // eje SE-NW
  },
  {
    kind: 'menorca',
    name: 'MINORICA',
    center: { x: 82, y: 22 },
    baseRadius: 10,
    resolution: 96,
    layers: 3,
    noiseFrac: 0.18,
    stretch: { angle: 0, factor: 1.4 }, // alargada E-W
  },
  {
    kind: 'ibiza',
    name: 'EBVSVS',
    center: { x: 17, y: 72 },
    baseRadius: 9,
    resolution: 96,
    layers: 3,
    noiseFrac: 0.2,
  },
  {
    kind: 'formentera',
    name: 'FRVMENTARIA',
    center: { x: 22, y: 90 },
    baseRadius: 4,
    resolution: 64,
    layers: 2,
    noiseFrac: 0.15,
    stretch: { angle: Math.PI / 8, factor: 1.6 },
  },
];

function generateIsland(
  prng: PRNGState,
  spec: IslandSpec,
  mapSize: number,
): { island: Island; next: PRNGState } {
  let s = prng;
  const waves: Array<{ freq: number; amp: number; phase: number }> = [];
  let totalAmp = 0;
  for (let i = 0; i < spec.layers; i++) {
    const freqRoll = next(s);
    s = freqRoll.next;
    const ampRoll = next(s);
    s = ampRoll.next;
    const phaseRoll = next(s);
    s = phaseRoll.next;
    const freq = 2 + Math.floor(freqRoll.value * 7);
    const amp = ampRoll.value * Math.pow(0.7, i);
    const phase = phaseRoll.value * Math.PI * 2;
    waves.push({ freq, amp, phase });
    totalAmp += amp;
  }
  const ampScale = totalAmp > 0 ? (spec.baseRadius * spec.noiseFrac) / totalAmp : 0;

  const points: CoastPoint[] = [];
  const stretchAngle = spec.stretch?.angle ?? 0;
  const stretchFactor = spec.stretch?.factor ?? 1;
  for (let i = 0; i < spec.resolution; i++) {
    const theta = (i / spec.resolution) * Math.PI * 2;
    let delta = 0;
    for (const w of waves) delta += w.amp * Math.sin(w.freq * theta + w.phase);
    const jitter = nextRange(s, -1, 1);
    s = jitter.next;
    delta += jitter.value * (spec.baseRadius * spec.noiseFrac * 0.05);
    const r = spec.baseRadius + delta * ampScale;
    // Punto antes del estiramiento.
    let dx = Math.cos(theta) * r;
    let dy = Math.sin(theta) * r;
    // Rotación inversa para alinear con eje de estiramiento.
    const cosA = Math.cos(-stretchAngle);
    const sinA = Math.sin(-stretchAngle);
    const u = dx * cosA - dy * sinA;
    const v = dx * sinA + dy * cosA;
    // Estiramos eje u.
    const uS = u * stretchFactor;
    // Rotación de vuelta.
    const cosB = Math.cos(stretchAngle);
    const sinB = Math.sin(stretchAngle);
    dx = uS * cosB - v * sinB;
    dy = uS * sinB + v * cosB;
    points.push({
      x: clamp(spec.center.x + dx, 0, mapSize),
      y: clamp(spec.center.y + dy, 0, mapSize),
    });
  }
  points.push({ ...points[0] });

  return {
    island: {
      kind: spec.kind,
      name: spec.name,
      center: { ...spec.center },
      points,
    },
    next: s,
  };
}

/**
 * Genera el archipiélago balear con rosa de los vientos. Determinista.
 */
export function generateArchipelago(
  seed: number,
  mapSize: number,
): Archipelago {
  let prng = seedState(seed ^ 0xba1ea5);
  const islands: Island[] = [];
  for (const spec of BALEARES_SPECS) {
    const { island, next: n } = generateIsland(prng, spec, mapSize);
    islands.push(island);
    prng = n;
  }
  // Rosa de los vientos en NO (mar abierto entre islas).
  return {
    islands,
    compassRose: { x: mapSize * 0.1, y: mapSize * 0.12 },
  };
}
