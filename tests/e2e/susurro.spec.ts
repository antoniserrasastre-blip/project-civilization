/**
 * E2E del susurro persistente — Sprint #1 REFACTOR-SUSURRO-FE
 * (vision-primigenia §3.7, §3.7b).
 *
 * Contratos cubiertos:
 *   - Botón "Hablar al clan" siempre visible.
 *   - El selector ofrece las 7 opciones (6 intenciones + silencio).
 *   - El susurro persiste entre días (no se reabre solo al amanecer).
 *   - Tras primer susurro gratis, cambiar cuesta 80 Fe y el botón
 *     queda deshabilitado si el pool no alcanza.
 *
 * Corre cuando playwright tiene chromium.
 */

import { test, expect } from '@playwright/test';

test.describe('Susurro persistente + Fe', () => {
  test('botón siempre visible; 7 opciones; susurro persiste entre días', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const talk = page.getByTestId('talk-button');
    await expect(talk).toBeVisible();

    await talk.click();
    const selector = page.getByTestId('whisper-selector');
    await expect(selector).toBeVisible();

    for (const opt of [
      'auxilio',
      'coraje',
      'paciencia',
      'encuentro',
      'renuncia',
      'esperanza',
      'silence',
    ]) {
      await expect(page.getByTestId(`whisper-option-${opt}`)).toBeVisible();
    }

    // Primer susurro gratis — Paciencia.
    await page.getByTestId('whisper-option-paciencia').click();
    await expect(page.getByTestId('whisper-selector')).toHaveCount(0);

    // Día avanzó — pero el susurro sigue activo: reabrir y verificar.
    await expect(page.getByTestId('hud-day')).toHaveText(/Día\s*2/);
    await talk.click();
    await expect(
      page.getByTestId('whisper-option-paciencia'),
    ).toBeVisible();

    // La fila "Paciencia" indica "activo" (ya es el susurro vigente).
    await expect(
      page.getByTestId('whisper-option-paciencia'),
    ).toContainText(/activo/i);
  });

  test('cambiar susurro sin Fe queda deshabilitado', async ({ page }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('talk-button').click();
    // Primer susurro gratis — Coraje.
    await page.getByTestId('whisper-option-coraje').click();

    // Reabrir: ahora cambiar cuesta 80 Fe; arrancamos con 30 Fe
    // iniciales + un día de acumulación ~sqrt(14)=3.74. No alcanza.
    await page.getByTestId('talk-button').click();
    const auxilioBtn = page.getByTestId('whisper-option-auxilio');
    await expect(auxilioBtn).toBeVisible();
    await expect(auxilioBtn).toBeDisabled();
  });
});
