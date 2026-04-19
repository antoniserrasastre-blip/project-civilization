/**
 * Matemática pura del viewport del mapa — pan + zoom clamping.
 *
 * Sin estado, sin DOM, sin React. La componente `MapView` importa
 * estas funciones para mantener la lógica geométrica testable por
 * vitest. Cualquier ajuste de clamp/zoom se cubre con unit tests
 * antes de tocar el render.
 */

export interface ViewportDims {
  /** Tamaño del mundo en tiles. */
  worldWidth: number;
  worldHeight: number;
  /** Pixels por tile a zoom 1. */
  tileSize: number;
  /** Tamaño del viewport en pixels. */
  screenWidth: number;
  screenHeight: number;
}

export interface ViewportState {
  /** Factor de zoom. 1 = nativo. < 1 = mapa empequeñece. */
  zoom: number;
  /** Offset en pixels del origen del mapa respecto al origen del
   *  viewport. (0, 0) = esquina superior izquierda del mapa en la
   *  esquina superior izquierda del viewport. */
  offsetX: number;
  offsetY: number;
}

/** Zoom mínimo: mapa entero cabe en la dimensión más corta. */
export function minZoom(dims: ViewportDims): number {
  const totalW = dims.worldWidth * dims.tileSize;
  const totalH = dims.worldHeight * dims.tileSize;
  return Math.min(dims.screenWidth / totalW, dims.screenHeight / totalH);
}

/** Zoom máximo: ~40 tiles visibles en la dimensión más corta. */
export function maxZoom(dims: ViewportDims): number {
  const shorter = Math.min(dims.screenWidth, dims.screenHeight);
  return shorter / (40 * dims.tileSize);
}

export function clampZoom(dims: ViewportDims, zoom: number): number {
  const lo = minZoom(dims);
  const hi = Math.max(lo, maxZoom(dims));
  return Math.max(lo, Math.min(hi, zoom));
}

/**
 * Clampa los offsets para que el mapa no se salga del viewport.
 * El offset es el desplazamiento del origen del mapa; se mantiene
 * en `[screen - mapPx, 0]` (si mapa > pantalla) o centrado (si
 * mapa <= pantalla).
 */
export function clampOffset(
  dims: ViewportDims,
  state: ViewportState,
): ViewportState {
  // clampOffset respeta el zoom que el caller da — no aplica
  // clampZoom silenciosamente. Si necesitas ambos, llama
  // clampZoom primero y luego clampOffset.
  const zoom = state.zoom;
  const mapPxW = dims.worldWidth * dims.tileSize * zoom;
  const mapPxH = dims.worldHeight * dims.tileSize * zoom;

  const clampDim = (off: number, mapPx: number, screenPx: number) => {
    if (mapPx <= screenPx) {
      // Centrar si sobra espacio.
      return (screenPx - mapPx) / 2;
    }
    const min = screenPx - mapPx;
    const max = 0;
    return Math.max(min, Math.min(max, off));
  };

  return {
    zoom,
    offsetX: clampDim(state.offsetX, mapPxW, dims.screenWidth),
    offsetY: clampDim(state.offsetY, mapPxH, dims.screenHeight),
  };
}

/** Coordenada del tile bajo un pixel de pantalla, o null si fuera del mapa. */
export function screenToTile(
  dims: ViewportDims,
  state: ViewportState,
  screenX: number,
  screenY: number,
): { x: number; y: number } | null {
  const worldPxX = (screenX - state.offsetX) / state.zoom;
  const worldPxY = (screenY - state.offsetY) / state.zoom;
  const tileX = Math.floor(worldPxX / dims.tileSize);
  const tileY = Math.floor(worldPxY / dims.tileSize);
  if (
    tileX < 0 ||
    tileY < 0 ||
    tileX >= dims.worldWidth ||
    tileY >= dims.worldHeight
  ) {
    return null;
  }
  return { x: tileX, y: tileY };
}

/** Aplica un delta de drag al viewport y clampa. */
export function applyDrag(
  dims: ViewportDims,
  state: ViewportState,
  dx: number,
  dy: number,
): ViewportState {
  return clampOffset(dims, {
    zoom: state.zoom,
    offsetX: state.offsetX + dx,
    offsetY: state.offsetY + dy,
  });
}

/**
 * Aplica un delta de zoom alrededor de un punto del viewport
 * (típicamente el cursor). Mantiene ese punto visualmente fijo —
 * estándar de UX de pan&zoom.
 */
export function applyZoom(
  dims: ViewportDims,
  state: ViewportState,
  factor: number,
  pivotScreenX: number,
  pivotScreenY: number,
): ViewportState {
  const newZoom = clampZoom(dims, state.zoom * factor);
  // Coordenada world-px del pivote antes del zoom.
  const worldPxX = (pivotScreenX - state.offsetX) / state.zoom;
  const worldPxY = (pivotScreenY - state.offsetY) / state.zoom;
  // Después del zoom, queremos que esa misma world-coord siga bajo
  // el mismo pivote de pantalla.
  const newOffsetX = pivotScreenX - worldPxX * newZoom;
  const newOffsetY = pivotScreenY - worldPxY * newZoom;
  return clampOffset(dims, {
    zoom: newZoom,
    offsetX: newOffsetX,
    offsetY: newOffsetY,
  });
}
