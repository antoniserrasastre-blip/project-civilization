/**
 * E2E del ensamblaje — juego jugable extremo a extremo.
 *
 * Sprint #1 REFACTOR-SUSURRO-FE: el modal forzoso desaparece. El
 * jugador abre el selector con el botón "Hablar al clan" del HUD.
 *
 * Flujo cubierto: carga → HUD visible con "Día 1" → click botón
 * "Hablar al clan" → selector visible → elegir Coraje (gratis por
 * ser primer susurro) → selector cierra → día avanza a 2 → el
 * susurro persiste (no se reabre automáticamente).
 *
 * Corre en el gate cuando playwright tiene chromium.
 */

import { test, expect } from '@playwright/test';

test.describe('Ensamblaje UI — botón hablar + selector persistente', () => {
  test('HUD visible; selector se abre por botón; el día avanza al elegir', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const hudDay = page.getByTestId('hud-day');
    await expect(hudDay).toHaveText(/Día\s*1/);

    // Selector no aparece por sí solo — el jugador decide cuándo hablar.
    await expect(page.getByTestId('whisper-selector')).toHaveCount(0);

    // Abre con el botón del HUD.
    await page.getByTestId('talk-button').click();
    const selector = page.getByTestId('whisper-selector');
    await expect(selector).toBeVisible();

    // Primer susurro gratis — elige Coraje.
    await page.getByTestId('whisper-option-coraje').click();

    // Selector cierra tras elegir.
    await expect(page.getByTestId('whisper-selector')).toHaveCount(0);

    // Día avanzó (elegir consume 24 ticks).
    await expect(hudDay).toHaveText(/Día\s*2/);
  });
});
