/**
 * Tests del fog-of-war (CLAUDE-primigenia §5).
 *
 * Bitmap empaquetado en bits, serializable como base64 para
 * round-trip JSON. Idempotente + conmutativo (no consume PRNG).
 */

import { describe, it, expect } from 'vitest';
import {
  createFog,
  markDiscovered,
  isDiscovered,
  type FogState,
} from '@/lib/fog';

describe('createFog', () => {
  it('crea bitmap con dim correctas y todo a 0 (velado)', () => {
    const f = createFog(64, 64);
    expect(f.width).toBe(64);
    expect(f.height).toBe(64);
    // 64*64 = 4096 bits = 512 bytes empaquetados.
    // En base64: 512 bytes → 512/3 * 4 ≈ 684 chars (con padding).
    expect(f.bitmap.length).toBeGreaterThan(600);
    // Ningún tile descubierto aún.
    for (let y = 0; y < 64; y += 7) {
      for (let x = 0; x < 64; x += 7) {
        expect(isDiscovered(f, x, y)).toBe(false);
      }
    }
  });

  it('dim no cuadrada también funciona', () => {
    const f = createFog(10, 20);
    expect(f.width).toBe(10);
    expect(f.height).toBe(20);
    expect(isDiscovered(f, 5, 15)).toBe(false);
  });
});

describe('markDiscovered — pureza', () => {
  it('no muta el fog input', () => {
    const a = createFog(32, 32);
    const snapshot = JSON.stringify(a);
    markDiscovered(a, 10, 10, 3);
    expect(JSON.stringify(a)).toBe(snapshot);
  });
});

describe('markDiscovered — cobertura', () => {
  it('marca tiles dentro del radio (círculo discreto)', () => {
    const f = createFog(32, 32);
    const r = markDiscovered(f, 16, 16, 3);
    expect(isDiscovered(r, 16, 16)).toBe(true);
    expect(isDiscovered(r, 17, 16)).toBe(true);
    expect(isDiscovered(r, 16, 19)).toBe(true); // borde exacto
    expect(isDiscovered(r, 20, 16)).toBe(false); // fuera del radio
  });

  it('radio 0 marca solo el tile central', () => {
    const f = createFog(16, 16);
    const r = markDiscovered(f, 8, 8, 0);
    expect(isDiscovered(r, 8, 8)).toBe(true);
    expect(isDiscovered(r, 7, 8)).toBe(false);
    expect(isDiscovered(r, 8, 9)).toBe(false);
  });

  it('no desborda fuera del mapa (clamp)', () => {
    const f = createFog(16, 16);
    // Centro en la esquina — radio saldría fuera del mapa.
    expect(() => markDiscovered(f, 0, 0, 4)).not.toThrow();
    const r = markDiscovered(f, 0, 0, 4);
    expect(isDiscovered(r, 0, 0)).toBe(true);
    expect(isDiscovered(r, 3, 0)).toBe(true);
  });
});

describe('markDiscovered — idempotencia + conmutatividad', () => {
  it('marcar dos veces el mismo punto da mismo bitmap', () => {
    const f = createFog(32, 32);
    const a = markDiscovered(f, 5, 5, 2);
    const b = markDiscovered(a, 5, 5, 2);
    expect(b.bitmap).toBe(a.bitmap);
  });

  it('orden de marcas no afecta al resultado final', () => {
    const f = createFog(32, 32);
    const a = markDiscovered(markDiscovered(f, 5, 5, 2), 10, 10, 3);
    const b = markDiscovered(markDiscovered(f, 10, 10, 3), 5, 5, 2);
    expect(a.bitmap).toBe(b.bitmap);
  });
});

describe('Round-trip JSON (§A4)', () => {
  it('fog vacío round-trip', () => {
    const f = createFog(128, 128);
    const after = JSON.parse(JSON.stringify(f)) as FogState;
    expect(after).toEqual(f);
  });

  it('fog con descubrimientos round-trip preservando bitmap', () => {
    let f = createFog(64, 64);
    f = markDiscovered(f, 10, 10, 5);
    f = markDiscovered(f, 40, 40, 4);
    const after = JSON.parse(JSON.stringify(f)) as FogState;
    expect(after.bitmap).toBe(f.bitmap);
    expect(isDiscovered(after, 10, 10)).toBe(true);
    expect(isDiscovered(after, 40, 40)).toBe(true);
    expect(isDiscovered(after, 30, 30)).toBe(false);
  });
});

describe('Determinismo sin PRNG', () => {
  it('bitmap tras secuencia dada es byte-idéntico entre corridas', () => {
    function run() {
      let f = createFog(128, 128);
      for (let i = 0; i < 50; i++) {
        f = markDiscovered(f, i * 2, i * 2, 6);
      }
      return f.bitmap;
    }
    expect(run()).toBe(run());
  });
});
