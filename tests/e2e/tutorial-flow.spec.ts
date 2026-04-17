/**
 * E2E Sprint 5a — onboarding coreografiado.
 *
 * Flujo:
 *   1. Fresco: aparece el overlay de intro.
 *   2. Click "Comenzar" cierra la intro y revela el banner del tutorial.
 *   3. Halo dorado visible sobre el señalado.
 *   4. Click "Saltar" cierra el tutorial; banner y halo desaparecen.
 */

import { test, expect, Page } from '@playwright/test';

async function goHomeFresh(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');
}

test.describe('Sprint 5a — onboarding coreografiado', () => {
  test('intro → comenzar → banner + halo → saltar', async ({ page }) => {
    await goHomeFresh(page);

    // Intro overlay con botón Comenzar y saltar.
    await expect(page.getByTestId('tutorial-intro')).toBeVisible();
    await expect(page.getByTestId('tutorial-highlight-name')).toBeVisible();

    await page.getByTestId('tutorial-start').click();
    await expect(page.getByTestId('tutorial-intro')).not.toBeVisible();

    // Banner del tutorial aparece (fase halo o posterior tras avance de día).
    await expect(page.getByTestId('tutorial-banner')).toBeVisible();

    // Halo dorado renderizado.
    await expect(page.getByTestId('tutorial-halo')).toBeVisible();

    // Saltar tutorial → banner y halo desaparecen.
    // Pausamos primero para no tener race con el avance de ticks.
    await page.getByTestId('clock-slower').click();
    await page.getByTestId('tutorial-skip').click();

    await expect(page.getByTestId('tutorial-banner')).not.toBeVisible();
    await expect(page.getByTestId('tutorial-halo')).not.toBeVisible();
  });

  test('si se salta en la intro, no aparece banner posterior', async ({ page }) => {
    await goHomeFresh(page);
    await expect(page.getByTestId('tutorial-intro')).toBeVisible();

    await page.getByTestId('tutorial-skip').click();

    await expect(page.getByTestId('tutorial-intro')).not.toBeVisible();
    await expect(page.getByTestId('tutorial-banner')).not.toBeVisible();
  });
});
