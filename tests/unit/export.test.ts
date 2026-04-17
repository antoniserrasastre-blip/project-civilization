/**
 * Tests de exportación de crónica — Sprint 6.
 *
 * Valida formato, pureza y determinismo del serializador.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { appendChronicle } from '@/lib/chronicle';
import { exportChronicle, exportFilename } from '@/lib/export';

function withEntries(s: WorldState, lines: string[]): WorldState {
  let out = s;
  for (const l of lines) {
    out = appendChronicle(out, { day: out.day, text: l });
  }
  return out;
}

describe('exportChronicle', () => {
  it('sin entradas muestra el mensaje de tiempo sin huella', () => {
    const s = initialState(42);
    const text = exportChronicle(s, { withHeader: false });
    expect(text).toContain('El tiempo aún no ha dejado huella');
  });

  it('incluye cabecera con seed y día por default', () => {
    const s = initialState(42);
    const text = exportChronicle(s);
    expect(text).toContain('Semilla: 42');
    expect(text).toContain('Día de escritura: 0');
  });

  it('preserva orden cronológico de las entradas', () => {
    const s = withEntries(initialState(42), ['Primera línea.', 'Segunda línea.']);
    const text = exportChronicle(s, { withHeader: false });
    const idx1 = text.indexOf('Primera línea.');
    const idx2 = text.indexOf('Segunda línea.');
    expect(idx1).toBeGreaterThan(-1);
    expect(idx2).toBeGreaterThan(idx1);
  });

  it('es pura: el estado de entrada no cambia', () => {
    const s = withEntries(initialState(42), ['Entry A']);
    const snap = JSON.stringify(s);
    exportChronicle(s);
    expect(JSON.stringify(s)).toBe(snap);
  });

  it('determinista: mismo estado ⇒ mismo output', () => {
    const s = withEntries(initialState(42), ['x', 'y', 'z']);
    expect(exportChronicle(s)).toBe(exportChronicle(s));
  });
});

describe('exportFilename', () => {
  it('incluye seed y día en el nombre', () => {
    const s = { ...initialState(42), day: 123 };
    expect(exportFilename(s)).toBe('cronica-seed-42-dia-123.txt');
  });
});
