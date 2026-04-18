/**
 * E2E Sprint 8 — tech panel + era transition cinematic.
 *
 * 1. Arranca fresco (saltar tutorial). Tech panel muestra fuego y
 *    2 pendientes en era tribal.
 * 2. Validar el layout (no probamos la transición porque requiere 30k
 *    ticks de simulación; ese flujo está cubierto en unit tests).
 */

import { test, expect } from '@playwright/test';
import { goHomeFresh } from './helpers';

test.describe('Sprint 8 — tech panel', () => {
  test('el panel muestra fuego ya conocido y 2 pendientes en tribal', async ({ page }) => {
    await goHomeFresh(page);

    await expect(page.getByTestId('tech-panel')).toBeVisible();
    await expect(page.getByTestId('tech-known-fuego')).toBeVisible();
    await expect(page.getByTestId('tech-pending')).toContainText('2');
  });
});
