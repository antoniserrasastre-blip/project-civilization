import { expect, test } from '@playwright/test';

test.describe('Mapa — capas de mundo vivo', () => {
  test('muestra prioridad de construcción en el HUD', async ({ page }) => {
    await page.goto('/?seed=1');
    await expect(page.getByTestId('hud-build')).toBeVisible();
    await expect(page.getByTestId('hud-build')).toContainText(/Fogata|completa/);
  });

  test('muestra leyenda de estados del mapa', async ({ page }) => {
    await page.goto('/?seed=1');
    const legend = page.getByTestId('map-status-legend');
    await expect(legend).toBeVisible();
    await expect(legend).toContainText('crítico');
    await expect(legend).toContainText('nadando');
  });

  test('expone recursos activos en el canvas', async ({ page }) => {
    await page.goto('/?seed=1');
    const canvas = page.getByTestId('map-view-canvas');
    await expect(canvas).toBeVisible();

    await expect
      .poll(
        async () => Number(await canvas.getAttribute('data-resource-count')),
        {
          timeout: 10_000,
          message: 'esperando recursos activos renderizables',
        },
      )
      .toBeGreaterThan(0);
  });

  test('activa la niebla de guerra en partida real', async ({ page }) => {
    await page.goto('/?seed=1');
    const canvas = page.getByTestId('map-view-canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('data-fog-enabled', 'true');
  });

  test('expone rastros de intención de NPCs', async ({ page }) => {
    await page.goto('/?seed=1');
    const canvas = page.getByTestId('map-view-canvas');
    await expect(canvas).toBeVisible();

    await expect
      .poll(
        async () => Number(await canvas.getAttribute('data-intent-count')),
        {
          timeout: 10_000,
          message: 'esperando al menos una intención visible',
        },
      )
      .toBeGreaterThan(0);
  });

  test('expone badges de estado de NPCs', async ({ page }) => {
    await page.goto('/?seed=1');
    const canvas = page.getByTestId('map-view-canvas');
    await expect(canvas).toBeVisible();

    await expect
      .poll(
        async () => Number(await canvas.getAttribute('data-status-count')),
        {
          timeout: 10_000,
          message: 'esperando badges de estado visibles',
        },
      )
      .toBeGreaterThan(0);
  });
});
