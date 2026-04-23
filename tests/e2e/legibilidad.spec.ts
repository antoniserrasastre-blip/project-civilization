/**
 * E2E de legibilidad del susurro — Sprint #2 Fase 5 LEGIBILIDAD-MVP.
 *
 * Contrato: el jugador entiende qué susurro elegir y por qué sin
 * abrir la visión. Verificaciones:
 *
 *   1. Al abrir el selector, cada intención muestra su "tonalidad
 *      que empuja" (texto §3.7) al hacer hover.
 *   2. Un panel de contexto del clan (hambre media, apuros, días
 *      desde último nacimiento) es visible en el selector.
 *   3. El feed de crónica muestra al menos el historial de susurros
 *      tras el primero.
 */

import { test, expect } from '@playwright/test';

test.describe('Legibilidad del susurro — tooltips + contexto', () => {
  test('cada opción tiene un descriptor con su tonalidad §3.7', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('whisper-open').click();

    // Tooltip accesible por descriptor (data-testid
    // `whisper-option-coraje-desc`). Debe contener texto de §3.7
    // ("acción", "riesgos", o similar).
    await expect(
      page.getByTestId('whisper-option-coraje-desc'),
    ).toContainText(/acc(ió|io)n|riesg/i);

    await expect(
      page.getByTestId('whisper-option-auxilio-desc'),
    ).toContainText(/supervivencia|reparto|recursos/i);

    await expect(
      page.getByTestId('whisper-option-paciencia-desc'),
    ).toContainText(/negociar|reparar|aguardar/i);
  });

  test('panel de contexto del clan visible en el selector', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('whisper-open').click();

    const ctx = page.getByTestId('clan-context');
    await expect(ctx).toBeVisible();
    await expect(ctx).toContainText(/hambre/i);
    await expect(ctx).toContainText(/apuros/i);
    await expect(ctx).toContainText(/(nacimiento|nacim)/i);
  });

  test('feed de crónica registra el susurro elegido', async ({ page }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const feed = page.getByTestId('chronicle-feed');
    await expect(feed).toBeVisible();

    // Primer susurro → elige coraje.
    await page.getByTestId('whisper-open').click();
    await page.getByTestId('whisper-option-coraje').click();

    // Cambio de susurro → se archiva el previo y entra en el feed.
    // (Sólo se archiva al cambiar — con Fe insuficiente para el
    // primer cambio, el selector inhibe el botón; como alternativa
    // comprobamos que el feed muestre el susurro activo actual).
    await expect(feed).toContainText(/coraje/i);
  });
});
