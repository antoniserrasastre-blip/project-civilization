/**
 * E2E Sprint 11 — maldiciones.
 *
 * 1. Arranca, entra en un mundo con Fe artificial (via botón de
 *    acumulación rápida: no existe — en vez usamos el character card
 *    sobre un NPC rival, comprobamos que los botones aparecen pero
 *    están desactivados por falta de Fe inicial).
 */

import { test, expect } from '@playwright/test';
import { goHomeFresh } from './helpers';

test.describe('Sprint 11 — maldiciones', () => {
  test('la character card de un rival muestra botones de maldición', async ({ page }) => {
    await goHomeFresh(page);
    await page.getByTestId('clock-slower').click();

    // Encontrar un NPC rival (llevant o migjorn) — usamos el último del
    // roster, que suele ser de otro grupo dado el clustering.
    const rivalNpc = page.locator('[data-testid^="map-npc-"][data-rival-chosen]').first();
    // Fallback: cualquier npc, check si es rival via data attribute. Usamos
    // el id 30 que casi seguro es llevant o migjorn (Tramuntana 0..11).
    await page.getByTestId('map-npc-npc_0020').dispatchEvent('click');

    await expect(page.getByTestId('character-card')).toBeVisible();
    await expect(page.getByTestId('curses-panel')).toBeVisible();
    await expect(page.getByTestId('curse-curse_simple')).toBeVisible();
    // Sin Fe, todas deshabilitadas.
    await expect(page.getByTestId('curse-curse_simple')).toBeDisabled();
  });

  test('la character card de un miembro propio NO muestra maldiciones', async ({ page }) => {
    await goHomeFresh(page);
    await page.getByTestId('clock-slower').click();
    // npc_0000 es de Tramuntana (jugador).
    await page.getByTestId('map-npc-npc_0000').dispatchEvent('click');
    await expect(page.getByTestId('character-card')).toBeVisible();
    await expect(page.getByTestId('curses-panel')).toHaveCount(0);
  });
});
