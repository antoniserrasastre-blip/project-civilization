/**
 * E2E Sprint 3 — conceder don tras ungir.
 *
 * 1. Arranca la partida limpia.
 * 2. Pausa el reloj para estabilidad.
 * 3. Unge a npc_0000.
 * 4. El panel muestra "Dones concedidos: ninguno".
 * 5. Click en "Conceder Fuerza Sobrehumana" → aparece badge del don.
 * 6. Click en "Conceder Aura de Carisma" → aparece también.
 * 7. El botón de cada don queda deshabilitado ("ya").
 */

import { test, expect, Page } from '@playwright/test';

async function goHomeFresh(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('Sprint 3 — dones', () => {
  test('ungir y conceder ambos dones aparece en el panel', async ({ page }) => {
    await goHomeFresh(page);
    await page.getByTestId('clock-slower').click();

    await page.getByTestId('npc-npc_0000').click();
    await page.getByTestId('anoint-button').click();
    await expect(page.getByTestId('hud-chosen')).toContainText('1');

    // Antes de conceder: panel de dones vacío.
    await expect(page.getByTestId('gifts-panel')).toBeVisible();
    await expect(page.getByTestId('gift-granted-fuerza_sobrehumana')).toHaveCount(0);

    // Conceder fuerza_sobrehumana.
    await page.getByTestId('grant-gift-fuerza_sobrehumana').click();
    await expect(page.getByTestId('gift-granted-fuerza_sobrehumana')).toBeVisible();
    await expect(page.getByTestId('grant-gift-fuerza_sobrehumana')).toBeDisabled();

    // Conceder aura_de_carisma.
    await page.getByTestId('grant-gift-aura_de_carisma').click();
    await expect(page.getByTestId('gift-granted-aura_de_carisma')).toBeVisible();
    await expect(page.getByTestId('grant-gift-aura_de_carisma')).toBeDisabled();

    // La crónica contiene entradas de don.
    await expect(page.getByTestId('chronicle-list')).toContainText('don');
  });

  test('no se puede conceder don a un NPC no-Elegido', async ({ page }) => {
    await goHomeFresh(page);
    await page.getByTestId('clock-slower').click();
    await page.getByTestId('npc-npc_0000').click();
    // Sin ungir, el panel de dones no debe aparecer.
    await expect(page.getByTestId('gifts-panel')).toHaveCount(0);
  });

  test('character card overlay muestra dones y linaje', async ({ page }) => {
    await goHomeFresh(page);
    await page.getByTestId('clock-slower').click();

    // Ungir + conceder don desde el roster+panel primero.
    await page.getByTestId('npc-npc_0000').click();
    await page.getByTestId('anoint-button').click();
    await expect(page.getByTestId('anoint-button')).toBeDisabled();
    await page.getByTestId('grant-gift-fuerza_sobrehumana').click();
    // Esperar a que el panel refleje el don concedido antes de seguir.
    await expect(page.getByTestId('gift-granted-fuerza_sobrehumana')).toBeVisible();

    // Ahora abrir la character card desde el mapa — dispatchEvent para
    // invocar el handler de npc_0000 sin depender del hit-testing.
    await page.getByTestId('map-npc-npc_0000').dispatchEvent('click');
    await expect(page.getByTestId('character-card')).toBeVisible();
    await expect(page.getByTestId('card-gifts')).toBeVisible();
    await expect(page.getByTestId('card-gift-fuerza_sobrehumana')).toBeVisible();
    await expect(page.getByTestId('card-lineage')).toBeVisible();
    // Fundacional: sin padres conocidos.
    await expect(page.getByTestId('card-lineage')).toContainText('fundacional');
  });
});
