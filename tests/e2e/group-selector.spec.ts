/**
 * E2E Sprint 9 — selector de grupos (v0.3).
 *
 * 1. Partida fresca: aparece el selector de 3 grupos.
 * 2. Elegir Llevant → desaparece el selector, la página sigue el tutorial.
 * 3. El HUD refleja "Hijos de Llevant" como pueblo propio.
 * 4. Reset: vuelve a aparecer el selector.
 */

import { test, expect } from '@playwright/test';

test.describe('Sprint 9 — selector de grupos', () => {
  test('arranca mostrando 3 grupos; al elegir uno, desaparece', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('group-selector')).toBeVisible();
    await expect(page.getByTestId('pick-group-tramuntana')).toBeVisible();
    await expect(page.getByTestId('pick-group-llevant')).toBeVisible();
    await expect(page.getByTestId('pick-group-migjorn')).toBeVisible();

    await page.getByTestId('pick-group-llevant').click();
    await expect(page.getByTestId('group-selector')).not.toBeVisible();
    await expect(page.locator('text=Hijos de Llevant').first()).toBeVisible();
  });

  test('reset vuelve a mostrar el selector', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('networkidle');
    const pick = page.getByTestId('pick-group-migjorn');
    await pick.waitFor({ state: 'visible' });
    await pick.click();
    await expect(page.getByTestId('group-selector')).not.toBeVisible();

    // Saltar tutorial y resetear — intro puede tardar en montarse.
    const skip = page.getByTestId('tutorial-skip-intro');
    await skip.waitFor({ state: 'visible' });
    await skip.click();
    await expect(page.getByTestId('tutorial-intro')).not.toBeVisible();
    await page.getByTestId('clock-reset').click();
    await expect(page.getByTestId('group-selector')).toBeVisible();
  });
});
