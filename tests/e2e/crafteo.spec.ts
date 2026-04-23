import { expect, test } from '@playwright/test';

test.describe('Crafteo visible — estructuras en mapa', () => {
  test('la fogata/crafteables construidos se exponen en el canvas', async ({
    page,
  }) => {
    await page.goto('/?seed=1');
    const canvas = page.getByTestId('map-view-canvas');
    await expect(canvas).toBeVisible();

    await expect
      .poll(
        async () => Number(await canvas.getAttribute('data-structure-count')),
        {
          timeout: 40_000,
          message: 'esperando a que el autobuild cree una estructura visible',
        },
      )
      .toBeGreaterThan(0);
  });
});
