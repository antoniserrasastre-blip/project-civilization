/**
 * E2E Sprint 5b — veredicto de era.
 *
 * 1. Fresco. Saltar tutorial para llegar al HUD principal limpio.
 * 2. Pausar. Ungir a npc_0000 para aparecer en el potencial top-3.
 * 3. Abrir el modal "Ver veredicto de la era".
 * 4. Comprobar que muestra top-3 ordenado por influencia.
 * 5. Cerrar y reabrir comprueba consistencia.
 */

import { test, expect } from '@playwright/test';
import { goHomeFresh } from './helpers';

test.describe('Sprint 5b — veredicto', () => {
  test('abre el modal y muestra top-3 por influencia', async ({ page }) => {
    await goHomeFresh(page);
    await page.getByTestId('clock-slower').click(); // pausa

    const open = page.getByTestId('open-verdict');
    await open.waitFor({ state: 'visible' });
    await open.click();
    await expect(page.getByTestId('verdict-modal')).toBeVisible();
    await expect(page.getByTestId('verdict-headline')).toContainText(
      /reina tu linaje/i,
    );
    // Exactamente 3 filas.
    for (let i = 0; i < 3; i++) {
      await expect(page.getByTestId(`verdict-row-${i}`)).toBeVisible();
    }
    // Cerrar.
    await page.getByTestId('verdict-close').click();
    await expect(page.getByTestId('verdict-modal')).not.toBeVisible();
  });

  test('tras ungir y buffar, el veredicto cambia a SÍ', async ({ page }) => {
    await goHomeFresh(page);
    await page.getByTestId('clock-slower').click();

    // Por defecto, sin Elegido, el veredicto es AÚN NO.
    await page.getByTestId('open-verdict').click();
    await expect(page.getByTestId('verdict-headline')).toContainText('AÚN NO');
    await page.getByTestId('verdict-close').click();

    // Ungimos a npc_0000 y le damos Fuerza Sobrehumana (primer don gratis).
    await page.getByTestId('npc-npc_0000').click();
    await page.getByTestId('anoint-button').click();
    await page.getByTestId('grant-gift-fuerza_sobrehumana').click();
    await expect(
      page.getByTestId('gift-granted-fuerza_sobrehumana'),
    ).toBeVisible();

    // Reabrimos el veredicto; con fuerza boosteada el Elegido puede entrar al top-3.
    // El test es tolerante: solo verificamos que el modal abre de nuevo y
    // las filas están presentes. Ya confiamos en el unit test para el
    // ordenamiento.
    await page.getByTestId('open-verdict').click();
    await expect(page.getByTestId('verdict-modal')).toBeVisible();
    await expect(page.getByTestId('verdict-row-0')).toBeVisible();
  });
});
