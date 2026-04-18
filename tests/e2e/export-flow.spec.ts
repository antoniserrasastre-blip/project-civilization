/**
 * E2E Sprint 6 — exportación de la crónica y pulido visual.
 *
 * 1. Arranca fresco (saltar tutorial).
 * 2. El mapa muestra símbolos de montaña/bosque hand-drawn.
 * 3. La character card overlay (desde mapa) muestra silueta SVG.
 * 4. El botón "Exportar" descarga un .txt con la crónica.
 */

import { test, expect } from '@playwright/test';
import { goHomeFresh } from './helpers';

test.describe('Sprint 6 — polish visual + export', () => {
  test('el mapa muestra símbolos hand-drawn', async ({ page }) => {
    await goHomeFresh(page);

    await expect(page.getByTestId('map-symbols')).toBeVisible();
    // Al menos un símbolo de montaña o bosque visible.
    const mountains = page.locator('[data-testid="map-symbol-mountain"]');
    const forests = page.locator('[data-testid="map-symbol-forest"]');
    const totalSymbols = (await mountains.count()) + (await forests.count());
    expect(totalSymbols).toBeGreaterThan(0);
  });

  test('la character card overlay muestra silueta del NPC', async ({ page }) => {
    await goHomeFresh(page);
    await page.getByTestId('clock-slower').click();

    await page.getByTestId('map-npc-npc_0000').dispatchEvent('click');
    await expect(page.getByTestId('character-card')).toBeVisible();
    await expect(page.getByTestId('npc-silhouette')).toBeVisible();
  });

  test('el botón Exportar descarga la crónica como .txt', async ({ page }) => {
    await goHomeFresh(page);
    await page.getByTestId('clock-slower').click();

    // Generamos al menos una entrada: ungir produce crónica.
    await page.getByTestId('npc-npc_0000').click();
    await page.getByTestId('anoint-button').click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-chronicle').click();
    const download = await downloadPromise;
    const suggestedName = download.suggestedFilename();
    expect(suggestedName).toMatch(/cronica-seed-\d+-dia-\d+\.txt/);
  });
});
