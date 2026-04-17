/**
 * Setup global para Vitest.
 *
 * Se ejecuta una vez por worker antes de la primera suite, y `afterEach`
 * corre tras cada test individual. Úsalo para:
 *   - Invariantes que deben estar limpias para todo test (env vars, mocks).
 *   - Hooks que apliquen a la suite entera.
 *
 * Reglas de oro:
 *   - Nada de lógica del juego aquí. Esto es infraestructura de tests.
 *   - Nada de fetch real / IO real. Si un test lo necesita, que lo monte él.
 *   - Determinismo: el orden de ejecución no debe cambiar resultados.
 *
 * NOTA sobre fake timers: NO los activamos globalmente. Los tests que
 * asertan presupuestos de performance con `performance.now()` requieren
 * reloj real, y el setup global pisaría eso con semántica inconsistente.
 * Los tests que necesitan control del tiempo (p.ej. timeout) activan
 * `vi.useFakeTimers()` localmente y lo restauran al final.
 */

import { afterEach, vi } from 'vitest';

afterEach(() => {
  // Restaura mocks de `vi.fn()` y spies. Preserva implementaciones
  // declaradas con `vi.mock(...)` a nivel de módulo (que es lo que queremos).
  vi.clearAllMocks();
});

/**
 * Aislamos cada corrida de la `GEMINI_API_KEY` que pueda vivir en el dev
 * env del desarrollador. Los tests de integración la inyectan vía
 * `opts.apiKey`; el canario opt-in (RUN_GEMINI_CANARY=1) la lee
 * explícitamente de `process.env`.
 */
if (process.env.RUN_GEMINI_CANARY !== '1') {
  delete process.env.GEMINI_API_KEY;
}
