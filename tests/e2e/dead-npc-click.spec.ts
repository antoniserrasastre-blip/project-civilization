/**
 * E2E regresión — click sobre NPC muerto no crashea (v1.0.1 polish).
 *
 * Captura el gotcha "render vs click race": un NPC puede morir en un
 * tick mientras el puntero del jugador está sobre él. El click debe
 * resolverse limpiamente: abre la character card con `fallecido`, sin
 * errores de consola, sin overlays rotos.
 */

import { test, expect } from '@playwright/test';
import { goHomeFresh } from './helpers';

test.describe('Click sobre NPC muerto — no crashea', () => {
  test('acelerar hasta producir muertes, clic sobre uno ⇒ card "fallecido"', async ({
    page,
  }) => {
    // Captura errores de consola durante toda la sesión.
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await goHomeFresh(page);

    // Acelerar a 100× para producir muertes rápidamente.
    await page.getByTestId('clock-faster').click();
    await page.getByTestId('clock-faster').click();
    await expect(page.getByTestId('clock-speed')).toContainText('100×');

    // Esperar hasta encontrar al menos un NPC muerto en el DOM.
    // Max 15s — con edades iniciales [15-40] y aceleración, algunos
    // llegan al umbral de muerte por edad en segundos reales.
    const deadLocator = page.locator(
      '[data-testid^="map-npc-"][data-alive="false"]',
    );
    await expect(deadLocator.first()).toBeVisible({ timeout: 30_000 });

    // Pausar antes de clicar para evitar race adicional.
    // (Varios clocks-slower para asegurar 'Pausado'.)
    for (let i = 0; i < 3; i++) {
      // Cerrar cinemáticas que puedan bloquear.
      const cinematic = page.getByTestId('era-cinematic');
      if (await cinematic.isVisible().catch(() => false)) {
        await page
          .getByTestId('era-cinematic-close')
          .click()
          .catch(() => {});
      }
      await page.getByTestId('clock-slower').click();
    }

    // Click sobre el primer NPC muerto.
    await deadLocator.first().dispatchEvent('click');

    // La character card aparece con estado "fallecido".
    await expect(page.getByTestId('character-card')).toBeVisible();
    const card = page.getByTestId('character-card');
    await expect(card).toContainText(/fallecido/i);

    // No errores de consola de aplicación (filtramos warnings y
    // errores de red 404 — son ruido ambiental, no bugs del app).
    const appErrors = consoleErrors.filter(
      (m) =>
        !/warning/i.test(m) &&
        !/failed to load resource/i.test(m) &&
        !/404/.test(m),
    );
    expect(appErrors).toEqual([]);
  });
});
