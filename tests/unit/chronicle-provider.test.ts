/**
 * Tests del provider layer — Sprint 12.
 *
 * Núcleo de la política:
 *   - El state.chronicle NO cambia por el provider — solo el render.
 *   - templateProvider es identidad.
 *   - mockLLMProvider es determinista en función de la entrada.
 *   - claudeProvider queda disabled hasta cableado server-side.
 */

import { describe, it, expect } from 'vitest';
import {
  templateProvider,
  mockLLMProvider,
  claudeProvider,
  providerById,
  CHRONICLE_PROVIDERS,
} from '@/lib/chronicle-provider';

const sampleEntry = {
  day: 37,
  text: 'Año 0, día 38. Nació Joan Ferrer, una nueva alma entre los nuestros.',
};

describe('templateProvider', () => {
  it('devuelve el texto sin cambios', async () => {
    expect(await templateProvider.enhance(sampleEntry)).toBe(sampleEntry.text);
  });
});

describe('mockLLMProvider', () => {
  it('prepende una apertura partisana preservando la fecha', async () => {
    const out = await mockLLMProvider.enhance(sampleEntry);
    expect(out).toContain('Año 0, día 38.');
    expect(out.length).toBeGreaterThan(sampleEntry.text.length);
  });

  it('determinista: misma entrada ⇒ misma salida', async () => {
    const a = await mockLLMProvider.enhance(sampleEntry);
    const b = await mockLLMProvider.enhance(sampleEntry);
    expect(a).toBe(b);
  });

  it('no revienta con una entrada sin cuerpo tras la fecha', async () => {
    const out = await mockLLMProvider.enhance({ day: 1, text: 'Día 1. ' });
    expect(typeof out).toBe('string');
  });
});

describe('claudeProvider — disabled hasta cableado', () => {
  it('enabled=false por defecto', () => {
    expect(claudeProvider.enabled).toBe(false);
  });

  it('con API key ausente cae al texto plantilla', async () => {
    const out = await claudeProvider.enhance(sampleEntry);
    expect(out).toBe(sampleEntry.text);
  });
});

describe('registry', () => {
  it('providerById resuelve los 3 providers conocidos', () => {
    expect(providerById('template').id).toBe('template');
    expect(providerById('mock-llm').id).toBe('mock-llm');
    expect(providerById('claude').id).toBe('claude');
  });

  it('providerById cae a template ante id desconocido', () => {
    // @ts-expect-error deliberado.
    expect(providerById('xyz').id).toBe('template');
  });

  it('CHRONICLE_PROVIDERS expone exactamente 3', () => {
    expect(CHRONICLE_PROVIDERS).toHaveLength(3);
  });
});
