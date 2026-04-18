/**
 * E2E: Sprint 2 — mapa visual + character card overlay + velocidad.
 *
 * Qué valida:
 *   1. El mapa procedural aparece con polígono de costa y NPCs como círculos.
 *   2. Click en un círculo NPC ⇒ aparece la character card overlay.
 *   3. El close cierra la overlay.
 *   4. El ciclo de velocidad 0 → 1× → 10× → 100× recorre los 4 valores.
 */

import { test, expect } from '@playwright/test';
import { goHomeFresh } from './helpers';

test.describe('Sprint 2 — mapa y overlay de carácter', () => {
  test('el mapa renderiza costa y NPCs', async ({ page }) => {
    await goHomeFresh(page);
    await expect(page.getByTestId('map-view')).toBeVisible();
    await expect(page.getByTestId('coast-polygon')).toBeVisible();
    // v0.3 multi-grupo: 3 grupos × 12 = 36 NPCs iniciales.
    const circles = page.locator('[data-testid^="map-npc-"]');
    await expect(circles).toHaveCount(36);
  });

  test('click en NPC del mapa abre la character card overlay', async ({ page }) => {
    await goHomeFresh(page);
    // Pausa para que el NPC no se mueva bajo el cursor.
    await page.getByTestId('clock-slower').click();

    const firstNpc = page.getByTestId('map-npc-npc_0000');
    // Usamos dispatchEvent para invocar el handler del círculo concreto
    // sin depender del hit-testing del navegador: otros círculos pueden
    // superponerse en el mismo pixel según la seed y engañarían a un
    // click real. Lo que validamos aquí es el listener, no el pointer path.
    await firstNpc.dispatchEvent('click');

    const card = page.getByTestId('character-card');
    await expect(card).toBeVisible();
    await expect(page.getByTestId('character-card-name')).toBeVisible();

    // Cerrar
    await page.getByTestId('character-card-close').click();
    await expect(card).not.toBeVisible();
  });

  test('controles de velocidad ciclan [0, 1×, 10×, 100×]', async ({ page }) => {
    await goHomeFresh(page);
    const speed = page.getByTestId('clock-speed');
    // Arranca en 1×
    await expect(speed).toContainText('1×');

    await page.getByTestId('clock-faster').click();
    await expect(speed).toContainText('10×');

    await page.getByTestId('clock-faster').click();
    await expect(speed).toContainText('100×');

    // Ya en 100×, más rápido no cambia (clamp)
    await page.getByTestId('clock-faster').click();
    await expect(speed).toContainText('100×');

    // Bajando llegamos a Pausado
    await page.getByTestId('clock-slower').click();
    await expect(speed).toContainText('10×');
    await page.getByTestId('clock-slower').click();
    await expect(speed).toContainText('1×');
    await page.getByTestId('clock-slower').click();
    await expect(speed).toContainText('Pausado');
  });
});
