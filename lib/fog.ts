/**
 * Fog-of-war seedable — CLAUDE-primigenia §5.
 *
 * Bitmap `width × height` empaquetado en bits (1 = descubierto,
 * 0 = velado). Serializado como base64 dentro del estado para
 * round-trip JSON sin Uint8Array (que no sobrevive JSON.stringify).
 *
 * Todas las ops son puras: input readonly → FogState nuevo.
 * Idempotentes: marcar dos veces no cambia el resultado. Sin PRNG.
 */

export interface FogState {
  width: number;
  height: number;
  /** base64 de un Uint8Array empaquetado row-major bit a bit. */
  bitmap: string;
}

function packedSize(width: number, height: number): number {
  return Math.ceil((width * height) / 8);
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  // btoa disponible en navegador y Node ≥18.
  return btoa(s);
}

function decodeBase64(str: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(str, 'base64'));
  }
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function createFog(width: number, height: number): FogState {
  const bytes = new Uint8Array(packedSize(width, height));
  return { width, height, bitmap: encodeBase64(bytes) };
}

function bitIndex(width: number, x: number, y: number): number {
  return y * width + x;
}

export function decodeFogBitmap(bitmap: string): Uint8Array {
  return decodeBase64(bitmap);
}

export function isDiscovered(fog: FogState, x: number, y: number, decodedBuffer?: Uint8Array): boolean {
  if (x < 0 || y < 0 || x >= fog.width || y >= fog.height) return false;
  const bytes = decodedBuffer ?? decodeBase64(fog.bitmap);
  const idx = bitIndex(fog.width, x, y);
  return (bytes[idx >> 3] & (1 << (idx & 7))) !== 0;
}

/**
 * Marca el círculo discreto de radio `radius` alrededor de (cx, cy)
 * como descubierto. Idempotente (marcar dos veces = una).
 * Clamp a los bordes del mapa — un radio que saldría fuera no
 * throws; solo marca los tiles válidos.
 */
export function markDiscovered(
  fog: FogState,
  cx: number,
  cy: number,
  radius: number,
): FogState {
  const bytes = decodeBase64(fog.bitmap);
  // Mutamos una copia del Uint8Array; la serializamos al final.
  const r2 = radius * radius;
  const y0 = Math.max(0, cy - radius);
  const y1 = Math.min(fog.height - 1, cy + radius);
  const x0 = Math.max(0, cx - radius);
  const x1 = Math.min(fog.width - 1, cx + radius);
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy;
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      if (dx * dx + dy * dy > r2) continue;
      const idx = bitIndex(fog.width, x, y);
      bytes[idx >> 3] |= 1 << (idx & 7);
    }
  }
  return { width: fog.width, height: fog.height, bitmap: encodeBase64(bytes) };
}
