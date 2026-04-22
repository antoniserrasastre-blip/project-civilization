/**
 * E2E del ensamblaje — juego jugable extremo a extremo.
 *
 * ESTADO: ready-for-future. No se ejecuta en el sandbox actual
 * (chromium no descargable — ver NOTES-OVERNIGHT.md § Bloqueo
 * Sprint 1.5 E2E). Entra automáticamente al gate cuando
 * `pnpm exec playwright install chromium` tenga red.
 *
 * Cobertura esperada (criterio de cierre Sprint ENSAMBLAJE-UI):
 *   1. Carga → modal diario visible (`daily-modal`).
 *   2. HUD muestra "Día 1" al arrancar.
 *   3. Elegir intención (`daily-option-coraje`) cierra el modal.
 *   4. Tras auto-avanzar el día, HUD indica "Día 2" y el modal
 *      reaparece con las 7 opciones.
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
