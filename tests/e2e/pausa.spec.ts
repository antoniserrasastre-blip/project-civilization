/**
 * E2E del botón de pausa — hotfix UX tras playtest PR #12.
 *
 * El tick automático (250ms) hace casi imposible clicar en un NPC
 * en movimiento. La pausa resuelve el bloqueo: detiene la
 * simulación mientras el jugador inspecciona fichas, concede
 * milagros, o simplemente respira.
 *
 * Contrato:
 *   1. Botón `pause-toggle` siempre visible en el HUD.
 *   2. Estado visible (pausado / corriendo) legible.
 *   3. Click pausa: el día NO avanza mientras paused.
 *   4. Barra espaciadora alterna pausa sin foco en input.
 *   5. Reanudar vuelve a avanzar el día normalmente.
 */

import { test, expect } from '@playwright/test';

/** Lee el día actual del HUD. Convierte "Día 3" → 3. */
async function readDay(
  page: import('@playwright/test').Page,
): Promise<number> {
  const txt = (await page.getByTestId('hud-day').textContent()) ?? '';
  const m = txt.match(/(\d+)/);
  return m ? Number(m[1]) : NaN;
}

test.describe('Pausa — hotfix UX PR #12', () => {
  test('botón pause-toggle visible y detiene el avance de día', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const btn = page.getByTestId('pause-toggle');
    await expect(btn).toBeVisible();

    // Confirma que sin pausa el día avanza.
    const dayStart = await readDay(page);
    await expect
      .poll(async () => await readDay(page), { timeout: 10_000 })
      .toBeGreaterThan(dayStart);

    // Pausa.
    await btn.click();
    const dayAfterPause = await readDay(page);
    await page.waitForTimeout(2_000);
    const dayLater = await readDay(page);
    expect(dayLater).toBe(dayAfterPause);

    // Reanuda.
    await btn.click();
    await expect
      .poll(async () => await readDay(page), { timeout: 10_000 })
      .toBeGreaterThan(dayLater);
  });

  test('barra espaciadora alterna pausa', async ({ page }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    // Asegura que no hay foco en algún input antes de pulsar Space.
    await page.locator('body').click();

    await page.keyboard.press('Space');
    // El indicador del estado refleja pausa.
    await expect(page.getByTestId('pause-toggle')).toContainText(
      /reanudar|▶|play/i,
    );

    const dayPaused = await readDay(page);
    await page.waitForTimeout(1_500);
    expect(await readDay(page)).toBe(dayPaused);

    await page.keyboard.press('Space');
    await expect(page.getByTestId('pause-toggle')).toContainText(
      /pausar|pausa|⏸/i,
    );
    await expect
      .poll(async () => await readDay(page), { timeout: 10_000 })
      .toBeGreaterThan(dayPaused);
  });

  test('con pausa se puede clicar un NPC y abrir la ficha sin caza al objetivo', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('pause-toggle').click();

    const canvas = page.getByTestId('map-view-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin bounding box');
    const tooltip = page.getByTestId('npc-tooltip');
    const step = 24;
    let clicked = false;
    outer: for (let dy = step / 2; dy < box.height; dy += step) {
      for (let dx = step / 2; dx < box.width; dx += step) {
        await page.mouse.move(box.x + dx, box.y + dy);
        if (await tooltip.isVisible().catch(() => false)) {
          // En pausa el NPC no se mueve: el click entre hover y
          // click impacta el mismo tile.
          await page.mouse.click(box.x + dx, box.y + dy);
          clicked = true;
          break outer;
        }
      }
    }
    expect(clicked).toBe(true);
    await expect(page.getByTestId('npc-sheet')).toBeVisible();
  });
});
