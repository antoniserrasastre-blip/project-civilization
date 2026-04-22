/**
 * E2E — NPCs visibles en el mapa (sprint render-npcs).
 *
 * Contrato del sprint: al cargar `?seed=42`, el jugador encuentra
 * los 14 NPCs sin esforzarse. Verificamos:
 *   1. El canvas expone `data-npc-count` ≥ 14 (marcadores colocados).
 *   2. Al hacer hover sobre la zona de los marcadores, aparece un
 *      tooltip con la forma `"${id}, ${linaje}"`.
 *   3. Los marcadores cambian el render del canvas respecto a un
 *      mundo sin NPCs (screenshot diff tras hover no es trivial;
 *      basta con la presencia del tooltip y el contador).
 *
 * El daily-modal inicial bloquea parte del viewport; lo cerramos
 * antes de buscar marcadores (igual que el jugador real).
 */

import { test, expect } from '@playwright/test';

test.describe('NPC markers — visibilidad en mapa', () => {
  test('14 NPCs colocados y hover muestra tooltip de identidad', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    // Cerrar el daily-modal inicial para despejar el mapa.
    const modal = page.getByTestId('daily-modal');
    await expect(modal).toBeVisible();
    await page.getByTestId('daily-option-coraje').click();

    const canvas = page.getByTestId('map-view-canvas');
    await expect(canvas).toBeVisible();

    // El contador de marcadores visible en el viewport debe incluir
    // a los 14 NPCs fundadores.
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-npc-count')), {
        timeout: 5_000,
      })
      .toBeGreaterThanOrEqual(14);

    // Hover sobre el cuadrante donde caen los NPCs (origen del
    // mapa + offset inicial). Barremos unos cuantos puntos cerca
    // del origen hasta que un tooltip aparezca.
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin bounding box');
    const tooltip = page.getByTestId('npc-tooltip');
    let found = false;
    // Los NPCs arrancan cerca de tile (0, 0) con offset 0 y zoom
    // inicial. Rastreamos una rejilla pequeña.
    for (let dx = 0; dx < 60 && !found; dx += 4) {
      for (let dy = 0; dy < 60 && !found; dy += 4) {
        await page.mouse.move(box.x + dx, box.y + dy);
        // Breve settle para que React propague el hover.
        if (await tooltip.isVisible().catch(() => false)) {
          found = true;
        }
      }
    }
    expect(found).toBe(true);
    // El texto del tooltip sigue la forma "<id>, <linaje>".
    await expect(tooltip).toHaveText(/.+,\s*(tramuntana|llevant|migjorn|ponent|xaloc|mestral|gregal|garbi)/);
  });
});
