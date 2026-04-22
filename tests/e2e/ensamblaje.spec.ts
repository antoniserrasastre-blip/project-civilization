/**
 * E2E del ensamblaje — juego jugable extremo a extremo.
 *
 * Flujo cubierto: carga → `daily-modal` visible → HUD "Día 1" →
 * elegir `daily-option-coraje` → día avanza a 2 → modal reabre →
 * repetir con `daily-option-paciencia` → día 3.
 *
 * Corre en el gate cuando playwright tiene chromium (instalación
 * normal o override `PLAYWRIGHT_CHROMIUM_PATH`). Si no hay chromium
 * accesible, playwright falla en el bootstrap del browser — no es
 * un skip: quien ejecute el gate debe arrancarlo con chromium.
 */

import { test, expect } from '@playwright/test';

test.describe('Ensamblaje UI — loop diario jugable', () => {
  test('modal aparece, elegir intención avanza el día y reabre', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const modal = page.getByTestId('daily-modal');
    await expect(modal).toBeVisible();

    const hud = page.getByTestId('hud-day');
    await expect(hud).toHaveText(/Día\s*1/);

    await page.getByTestId('daily-option-coraje').click();

    // Modal reaparece al cruzar el amanecer siguiente.
    await expect(modal).toBeVisible();
    await expect(hud).toHaveText(/Día\s*2/);

    // Y seguimos: elige otra distinta.
    await page.getByTestId('daily-option-paciencia').click();
    await expect(modal).toBeVisible();
    await expect(hud).toHaveText(/Día\s*3/);
  });
});
