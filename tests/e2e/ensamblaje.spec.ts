/**
 * E2E del ensamblaje — juego jugable extremo a extremo.
 *
 * Reescrito en Sprint Fase 5 #1 para el susurro persistente (§3.7):
 * ya no hay modal forzoso al amanecer. El jugador abre el selector
 * desde "Hablar al clan" y el tick corre en automático.
 *
 * Flujo cubierto:
 *   - Carga /?seed=42 → HUD visible con Día 1, Fe 30, botón.
 *   - Botón visible desde el inicio, no hay daily-modal.
 *   - Click botón → selector visible con 7 opciones.
 *   - Click "coraje" (primer susurro, gratis) → susurro activo
 *     visible en HUD.
 *
 * Corre en el gate cuando playwright tiene chromium (instalación
 * normal o override `PLAYWRIGHT_CHROMIUM_PATH`).
 */

import { test, expect } from '@playwright/test';

test.describe('Ensamblaje UI — susurro persistente jugable', () => {
  test('HUD + botón disponibles al cargar; elegir susurro lo activa', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    // Sin modal forzoso.
    await expect(page.getByTestId('daily-modal')).toHaveCount(0);

    // Botón "Hablar al clan" visible.
    const btn = page.getByTestId('whisper-open');
    await expect(btn).toBeVisible();

    // HUD con día 1 y Fe inicial.
    await expect(page.getByTestId('hud-day')).toHaveText(/Día\s*1/);
    await expect(page.getByTestId('hud-faith')).toContainText(/30/);

    // Abrir selector y elegir coraje (primer susurro, gratis).
    await btn.click();
    await expect(page.getByTestId('whisper-selector')).toBeVisible();
    await page.getByTestId('whisper-option-coraje').click();

    // Susurro activo visible en HUD.
    await expect(page.getByTestId('hud-active-whisper')).toContainText(
      /coraje/i,
    );
  });
});
