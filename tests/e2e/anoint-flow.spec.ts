/**
 * E2E: flujo del primer Elegido.
 *
 * Simula lo que hace un jugador nuevo el primer minuto:
 *   1. Abre la app. El mundo arranca en día 0.
 *   2. Selecciona un mortal del roster.
 *   3. Lo unge como Elegido.
 *   4. Ve que la crónica refleja el evento con voz partisana.
 *   5. Recarga la página y verifica que el Elegido persiste.
 *
 * El valor de este test es que cubre la integración UI ↔ núcleo puro
 * ↔ localStorage end-to-end. Si cualquiera de esas capas se rompe, este
 * test falla y los unit/integration tests no lo verían.
 */

import { test, expect, Page } from '@playwright/test';

async function goHomeFresh(page: Page) {
  // Partida limpia: borramos localStorage antes de cargar la página.
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('Flujo del primer Elegido', () => {
  test('selecciona, unge y persiste tras reload', async ({ page }) => {
    await goHomeFresh(page);

    // Pausamos el reloj para que las asserciones de crónica/roster no
    // corran contra un mundo que cambia bajo los pies.
    const slowerBtn = page.getByTestId('clock-slower');
    // Velocidades disponibles: [0, 1, 5, 20, 100]. Arrancamos en 1.
    // Un click nos lleva a 0 (pausado).
    await slowerBtn.click();
    await expect(page.getByTestId('clock-speed')).toContainText('Pausado');

    // El roster debe tener NPCs vivos.
    await expect(page.getByTestId('roster-count')).toContainText('vivos');

    // Seleccionamos el primero.
    const firstNpc = page.getByTestId('npc-npc_0000');
    await firstNpc.click();
    await expect(firstNpc).toHaveAttribute('data-selected', 'true');

    // Panel de intervención visible, botón de ungir activo.
    const anointBtn = page.getByTestId('anoint-button');
    await expect(anointBtn).toBeVisible();
    await expect(anointBtn).toBeEnabled();

    await anointBtn.click();

    // Toast de confirmación.
    await expect(page.getByTestId('toast')).toContainText('Elegido');

    // Crónica tiene al menos una entrada y contiene voz partisana ("nuestros" o "dios").
    const chronicleEntries = page.getByTestId('chronicle-entry');
    await expect(chronicleEntries.first()).toBeVisible();
    await expect(chronicleEntries.first()).toContainText(/nuestros|dios/i);

    // El HUD muestra 1 elegido.
    await expect(page.getByTestId('hud-chosen')).toContainText('1');

    // El botón de ungir queda deshabilitado + etiqueta "Ya ungido".
    await expect(anointBtn).toBeDisabled();
    await expect(anointBtn).toContainText('Ya ungido');

    // --- Persistencia: reload y verificamos que el Elegido sigue. -------
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('hud-chosen')).toContainText('1');

    // El NPC persistido tiene la corona (data-chosen=true).
    await expect(page.getByTestId('npc-npc_0000')).toHaveAttribute(
      'data-chosen',
      'true',
    );
  });

  test('reset borra el mundo y arranca uno nuevo', async ({ page }) => {
    await goHomeFresh(page);

    // Ungimos alguien para dejar rastro en localStorage.
    await page.getByTestId('clock-slower').click();
    await page.getByTestId('npc-npc_0000').click();
    await page.getByTestId('anoint-button').click();
    await expect(page.getByTestId('hud-chosen')).toContainText('1');

    // Click en "Reiniciar mundo".
    await page.getByTestId('clock-reset').click();

    await expect(page.getByTestId('hud-chosen')).toContainText('0');
    await expect(page.getByTestId('npc-npc_0000')).toHaveAttribute(
      'data-chosen',
      'false',
    );

    // Tras reload tampoco hay Elegido — el clear llegó a localStorage.
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('hud-chosen')).toContainText('0');
  });

  test('intentar ungir un NPC ya elegido muestra el rechazo', async ({ page }) => {
    await goHomeFresh(page);
    await page.getByTestId('clock-slower').click();

    await page.getByTestId('npc-npc_0000').click();
    await page.getByTestId('anoint-button').click();
    await expect(page.getByTestId('hud-chosen')).toContainText('1');

    // El botón está disabled, así que no podemos clickarlo. Pero si otro
    // NPC seleccionáramos y luego volviéramos a este, seguiría disabled.
    await page.getByTestId('npc-npc_0001').click();
    await page.getByTestId('npc-npc_0000').click();
    await expect(page.getByTestId('anoint-button')).toBeDisabled();
  });
});
