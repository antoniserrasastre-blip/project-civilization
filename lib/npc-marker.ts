/**
 * Helper puro de render: de NPC → especificación visual del marcador.
 *
 * Separa el "qué dibujar" (tamaño, forma, color, outline) del "cómo
 * dibujarlo" (canvas, context, paths). El canvas consume el struct y
 * no toma decisiones; el helper es testeable sin DOM.
 *
 * Contrato §A4: función pura, determinista, sin RNG, sin side effects.
 *
 * PLACEHOLDER hasta Sprint ASSETS-IMPORT. El pixel-art real de Kenney
 * reemplazará estas formas geométricas sin cambiar el cableado.
 */

import { CASTA, LINAJE, type NPC } from './npcs';

export type MarkerShape = 'circle' | 'diamond';

/** Un color por cada uno de los 8 vientos. Se usa como anillo exterior
 *  del marcador para que el jugador lea de un vistazo la facción del NPC
 *  sin perder el color de rol interior. */
export const LINAJE_COLORS: Record<string, string> = {
  [LINAJE.TRAMUNTANA]: '#a8d8ea',
  [LINAJE.LLEVANT]:    '#f4a261',
  [LINAJE.MIGJORN]:    '#e63946',
  [LINAJE.PONENT]:     '#9b5de5',
  [LINAJE.XALOC]:      '#f7d060',
  [LINAJE.MESTRAL]:    '#57cc99',
  [LINAJE.GREGAL]:     '#38b2ac',
  [LINAJE.GARBI]:      '#a07850',
};

export interface MarkerColors {
  /** Relleno principal del cuerpo del marcador. */
  fill: string;
  /** Outline duro alrededor del cuerpo — contraste sobre tiles. */
  outline: string;
  /** Detalle interior (halo del Elegido, reflejo del Ciudadano). */
  highlight: string;
}

export interface NpcMarker {
  /** Tamaño total del marcador en pixels (diámetro / lado del bbox). */
  size: number;
  shape: MarkerShape;
  colors: MarkerColors;
  /** Grosor del outline en pixels (1 o 2, pixel-art duro). */
  outline: number;
  /** Color del anillo de linaje (facción de los 8 vientos). */
  linajeBorderColor: string;
}

/** Tamaño mínimo legible a cualquier zoom — contrato del sprint. */
export const MARKER_MIN_SIZE = 14;

const ELEGIDO_SCALE = 1.35;
const CIUDADANO_SCALE = 1.0;

export function computeNpcMarker(
  npc: NPC,
  zoom: number,
  tileSize: number = 32,
): NpcMarker {
  const tilePx = tileSize * zoom;
  const isElegido = npc.casta === CASTA.ELEGIDO;
  const scale = isElegido ? ELEGIDO_SCALE : CIUDADANO_SCALE;
  // Fórmula base del sprint: max(MIN, tilePx * 0.45).
  const raw = Math.floor(tilePx * 0.45 * scale);
  const size = Math.max(MARKER_MIN_SIZE, raw);
  const shape: MarkerShape = isElegido ? 'diamond' : 'circle';
  // Outline gordo solo en marcadores grandes para que a zoom alto no
  // se coma el relleno.
  const outline = size >= 20 ? 2 : 1;
  return {
    size,
    shape,
    colors: {
      fill: isElegido ? '#ffd54f' : '#ffffff',
      outline: '#0b0b0b',
      highlight: isElegido ? '#fff3b0' : '#d8d8d8',
    },
    outline,
    linajeBorderColor: LINAJE_COLORS[npc.linaje] ?? '#888888',
  };
}
