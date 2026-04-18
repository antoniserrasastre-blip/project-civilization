/**
 * E2E Sprint 13 — compartir + export HTML.
 */

import { test, expect } from '@playwright/test';
import { goHomeFresh } from './helpers';

test.describe('Sprint 13 — export HTML y compartir', () => {
  test('descarga el códice HTML', async ({ page }) => {
    await goHomeFresh(page);
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-chronicle-html').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/codice-seed-\d+-dia-\d+\.html/);
  });

  test('compartir copia una URL con seed y group', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await goHomeFresh(page);
    await page.getByTestId('share-seed').click();

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toMatch(/seed=\d+/);
    expect(clipboard).toMatch(/group=/);
  });

  test('URL con ?seed=123 carga una partida a esa semilla', async ({ page }) => {
    await page.goto('/?seed=123&group=llevant');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    // El HUD muestra llevant como pueblo del jugador.
    await expect(page.locator('text=Hijos de Llevant').first()).toBeVisible();
  });
});
