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
 * Tras Sprint Fase 5 #1 (susurro persistente) ya no hay daily-modal
 * forzoso al amanecer — el canvas está limpio desde el load.
 */

import { test, expect } from '@playwright/test';

test.describe('NPC markers — visibilidad en mapa', () => {
  test('14 NPCs colocados y hover muestra tooltip de identidad', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('map-view-canvas');
    await expect(canvas).toBeVisible();

    // El contador de marcadores visible en el viewport debe incluir
    // a los 14 NPCs fundadores.
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-npc-count')), {
        timeout: 5_000,
      })
      .toBeGreaterThanOrEqual(14);

    // Hover sobre el canvas buscando los 14 marcadores. Sampleamos
    // con rejilla densa pero poco costosa (sin await por move) y
    // chequeamos el tooltip periódicamente.
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin bounding box');
    const tooltip = page.getByTestId('npc-tooltip');
    let found = false;
    const step = 24;
    const points: Array<[number, number]> = [];
    for (let dy = step / 2; dy < box.height; dy += step) {
      for (let dx = step / 2; dx < box.width; dx += step) {
        points.push([dx, dy]);
      }
    }
    for (const [dx, dy] of points) {
      await page.mouse.move(box.x + dx, box.y + dy);
      if (await tooltip.isVisible().catch(() => false)) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    // El texto del tooltip sigue la forma "<id>, <linaje>".
    await expect(tooltip).toHaveText(/.+,\s*(tramuntana|llevant|migjorn|ponent|xaloc|mestral|gregal|garbi)/);
  });
});
