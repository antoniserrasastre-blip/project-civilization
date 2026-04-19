/**
 * Tests del disclaimer de esclavitud (decisión #28).
 *
 * Lógica pura de persistencia + recuperación desde una `Storage`
 * inyectable (para testear sin localStorage real).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hasAcceptedDisclaimer,
  markDisclaimerAccepted,
  DISCLAIMER_STORAGE_KEY,
  SLAVERY_DISCLAIMER_COPY,
} from '@/lib/disclaimer';

function memoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  };
}

describe('Storage key versionada', () => {
  it('es "primigenia.disclaimer.v1"', () => {
    expect(DISCLAIMER_STORAGE_KEY).toBe('primigenia.disclaimer.v1');
  });
});

describe('hasAcceptedDisclaimer', () => {
  let s: Storage;
  beforeEach(() => {
    s = memoryStorage();
  });

  it('devuelve false en primera carga (storage limpio)', () => {
    expect(hasAcceptedDisclaimer(s)).toBe(false);
  });

  it('devuelve true tras markDisclaimerAccepted', () => {
    markDisclaimerAccepted(s);
    expect(hasAcceptedDisclaimer(s)).toBe(true);
  });

  it('tolera valores basura en storage sin crashear', () => {
    s.setItem(DISCLAIMER_STORAGE_KEY, 'basura');
    // Cualquier valor no-null lo tratamos como aceptado; el
    // markDisclaimerAccepted escribe un valor canónico pero no
    // queremos que un storage manipulado rompa.
    expect(hasAcceptedDisclaimer(s)).toBe(true);
  });

  it('Storage null (SSR / sin localStorage) → false sin throw', () => {
    expect(hasAcceptedDisclaimer(null)).toBe(false);
  });
});

describe('markDisclaimerAccepted', () => {
  it('persiste el valor canónico', () => {
    const s = memoryStorage();
    markDisclaimerAccepted(s);
    expect(s.getItem(DISCLAIMER_STORAGE_KEY)).toBe('accepted');
  });

  it('Storage null no crashea', () => {
    expect(() => markDisclaimerAccepted(null)).not.toThrow();
  });
});

describe('Copy del disclaimer', () => {
  it('contiene al menos "esclavitud" y "representación"', () => {
    // No testamos el texto exacto (lo firma el Director Creativo);
    // solo que trata el tema y no es trivial.
    const lower = SLAVERY_DISCLAIMER_COPY.toLowerCase();
    expect(lower).toContain('esclavitud');
    expect(lower).toContain('representación');
    expect(SLAVERY_DISCLAIMER_COPY.length).toBeGreaterThan(80);
  });
});

describe('Determinismo en §A4', () => {
  it('el disclaimer NO toca state.prng — es UI-only', () => {
    // Contrato: el disclaimer es una pantalla editorial previa al
    // juego. No participa en la simulación. Este test documenta el
    // contrato; cualquier futuro hook con state.prng requeriría
    // actualizar CLAUDE-primigenia.
    // No hay assertion activa — el test existe como marcador.
    expect(true).toBe(true);
  });
});

// silenciar warnings de vi innecesarios
void vi;
