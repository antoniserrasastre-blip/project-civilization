/**
 * Capa generativa de la crónica — Sprint 12 (v0.4).
 *
 * Arquitectura:
 *   - El núcleo sigue emitiendo `ChronicleEntry` deterministas vía las
 *     plantillas de `chronicle.ts`. El `state.chronicle` es y seguirá
 *     siendo reproducible byte a byte desde la misma semilla.
 *   - Este módulo define `ChronicleProvider`: transforma el texto
 *     plantilla → texto enriquecido, PARA RENDER. No se almacena en el
 *     estado. Swap del provider no cambia la simulación.
 *   - Proveedores disponibles:
 *       · `templateProvider`: identidad. Lo que emite el núcleo.
 *       · `mockLLMProvider`: decora con fórmulas partisanas preescritas.
 *         Determinista si la entrada lo es (reglas sobre el texto).
 *       · `claudeProvider`: esqueleto para integración real con Claude.
 *         Requiere ANTHROPIC_API_KEY vía env var del servidor, no desde
 *         el cliente. Hoy en modo "disabled" — ver NOTES-OVERNIGHT.md
 *         para el cableado.
 *
 * Voz partisana: el system prompt del provider LLM real incluye la
 * regla de §9 (narrar desde el pueblo del jugador, nunca neutral).
 */

import type { ChronicleEntry } from './world-state';

export interface ChronicleProviderContext {
  /** Nombre del pueblo del jugador — para que el provider personalice. */
  groupName?: string;
  /** Era actual, útil como pista de tono. */
  era?: string;
}

export interface ChronicleProvider {
  id: 'template' | 'mock-llm' | 'claude';
  /** Descripción corta para UI. */
  label: string;
  /**
   * Mejora una entrada. DEBE ser pura respecto al argumento `entry`:
   * misma entrada → mismo output. Los proveedores no deterministas
   * (LLM real) deberían cachear por `entry.day + hash(text)`.
   */
  enhance(
    entry: ChronicleEntry,
    ctx?: ChronicleProviderContext,
  ): Promise<string> | string;
}

// ---------------------------------------------------------------------------
// templateProvider — baseline, identidad.
// ---------------------------------------------------------------------------

export const templateProvider: ChronicleProvider = {
  id: 'template',
  label: 'Plantilla (determinista)',
  enhance(entry) {
    return entry.text;
  },
};

// ---------------------------------------------------------------------------
// mockLLMProvider — decoración preescrita, sin red.
// ---------------------------------------------------------------------------

/**
 * Fórmulas cortas de apertura que se prependen al texto plantilla. La
 * elección es determinista en función del día de la entrada, así que
 * la "voz" es consistente entre cargas de partida.
 */
const MOCK_OPENERS = [
  'Dicen los viejos que',
  'Cuenta la memoria que',
  'En la página de este día se lee:',
  'Los cronistas no dejan olvidar:',
  'Quien estuvo allí lo repite:',
  'El vino y la lengua guardan que',
] as const;

function openerFor(day: number): string {
  return MOCK_OPENERS[day % MOCK_OPENERS.length];
}

export const mockLLMProvider: ChronicleProvider = {
  id: 'mock-llm',
  label: 'LLM simulado (offline)',
  enhance(entry) {
    // Extraemos la fecha y el cuerpo — añadimos una apertura partisana
    // antes del cuerpo, sin tocar la fecha.
    const match = /^([^.]+\.\s*)(.*)$/.exec(entry.text);
    if (!match) return entry.text;
    const [, date, body] = match;
    if (body.length === 0) return entry.text;
    return `${date}${openerFor(entry.day)} ${body.charAt(0).toLowerCase()}${body.slice(1)}`;
  },
};

// ---------------------------------------------------------------------------
// claudeProvider — esqueleto para integración real (disabled por defecto).
// ---------------------------------------------------------------------------

/**
 * Placeholder. No llama a la API de Anthropic hasta que:
 *   1. El usuario configure ANTHROPIC_API_KEY via server env (.env.local).
 *   2. Se cablee un route handler `/api/chronicle/enhance` que haga el
 *      fetch server-side y devuelva JSON.
 *   3. Se active el provider con `claudeProvider.enable()` tras
 *      comprobar que el endpoint responde.
 *
 * Ver NOTES-OVERNIGHT.md para la checklist de activación.
 */
export const claudeProvider: ChronicleProvider & { enabled: boolean } = {
  id: 'claude',
  label: 'Claude (requiere ANTHROPIC_API_KEY)',
  enabled: false,
  async enhance(entry, ctx) {
    if (typeof window === 'undefined') return entry.text;
    try {
      const res = await fetch('/api/chronicle/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: entry.day, text: entry.text, ctx }),
      });
      if (!res.ok) {
        // 501 esperado hasta cableado. Caemos a la plantilla en silencio.
        return entry.text;
      }
      const data = (await res.json()) as { text?: string };
      return data.text ?? entry.text;
    } catch {
      return entry.text;
    }
  },
};

// ---------------------------------------------------------------------------
// Registry + helpers
// ---------------------------------------------------------------------------

export const CHRONICLE_PROVIDERS: ChronicleProvider[] = [
  templateProvider,
  mockLLMProvider,
  claudeProvider,
];

export function providerById(id: ChronicleProvider['id']): ChronicleProvider {
  return (
    CHRONICLE_PROVIDERS.find((p) => p.id === id) ?? templateProvider
  );
}
