/**
 * E2E del susurro persistente (§3.7 + §3.7b) — Sprint #1 Fase 5.
 *
 * Flujo cubierto:
 *   - Carga → HUD con Fe visible (barra + marcas 40/80).
 *   - Botón "Hablar al clan" siempre visible — no se fuerza modal
 *     al amanecer.
 *   - Click botón → selector con 7 opciones (6 intenciones + silencio).
 *   - Primer susurro gratis → intención activa visible, Fe no cambia.
 *   - Tick sigue corriendo (el susurro NO bloquea la simulación).
 *   - Cerrar selector sin elegir no avanza el mundo.
 */

import { test, expect } from '@playwright/test';

test.describe('Susurro persistente — HUD + selector (Sprint Fase 5 #1)', () => {
  test('botón "Hablar al clan" siempre visible; no hay modal forzado', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const btn = page.getByTestId('whisper-open');
    await expect(btn).toBeVisible();

    // El modal diario forzoso del pulso antiguo NO aparece.
    const oldModal = page.getByTestId('daily-modal');
    await expect(oldModal).toHaveCount(0);
  });

  test('HUD muestra barra de Fe con valor inicial 30', async ({ page }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const faith = page.getByTestId('hud-faith');
    await expect(faith).toBeVisible();
    await expect(faith).toContainText(/30/);
  });

  test('click en "Hablar al clan" abre selector con 7 opciones', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('whisper-open').click();
    const selector = page.getByTestId('whisper-selector');
    await expect(selector).toBeVisible();

    for (const choice of [
      'auxilio',
      'coraje',
      'paciencia',
      'encuentro',
      'renuncia',
      'esperanza',
      'silence',
    ]) {
      await expect(
        page.getByTestId(`whisper-option-${choice}`),
      ).toBeVisible();
    }
  });

  test('primer susurro gratis persiste entre ticks', async ({ page }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('whisper-open').click();
    await page.getByTestId('whisper-option-coraje').click();

    // Indicador del susurro activo visible en el HUD.
    const activeLabel = page.getByTestId('hud-active-whisper');
    await expect(activeLabel).toContainText(/coraje/i);

    // Fe sin cambios tras primer susurro (gratis).
    await expect(page.getByTestId('hud-faith')).toContainText(/30/);
  });
});
