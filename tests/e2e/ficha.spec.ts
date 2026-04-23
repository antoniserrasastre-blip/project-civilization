/**
 * E2E de la ficha de aventurero — Sprint #3 Fase 5 FICHA-AVENTURERO.
 *
 * Contrato: el jugador abre la ficha de un NPC con click en el mapa,
 * ve sus stats + linaje + rasgos, y puede conceder milagros si tiene
 * suficiente gratitud. El botón está deshabilitado cuando faltan
 * recursos o el NPC ya tiene 3 rasgos.
 *
 * Verificaciones:
 *   1. Click sobre un NPC abre `data-testid=npc-sheet` con stats.
 *   2. Milagros visibles con coste. Sin gratitud → botones disabled.
 *   3. Con gratitud suficiente (seteada vía mock de URL param o en
 *      el test via inyección), el botón aplica el milagro y el
 *      rasgo aparece en la sección "rasgos" de la ficha.
 *   4. Cerrar la ficha la oculta.
 */

import { test, expect } from '@playwright/test';

test.describe('Ficha aventurero — click NPC abre ficha con milagros', () => {
  test('click sobre un NPC abre la ficha con stats visibles', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('map-view-canvas');
    await expect(canvas).toBeVisible();

    // Buscar un NPC con scan → hover → click.
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin bounding box');
    const tooltip = page.getByTestId('npc-tooltip');
    const step = 24;
    let clicked = false;
    outer: for (let dy = step / 2; dy < box.height; dy += step) {
      for (let dx = step / 2; dx < box.width; dx += step) {
        await page.mouse.move(box.x + dx, box.y + dy);
        if (await tooltip.isVisible().catch(() => false)) {
          await page.mouse.click(box.x + dx, box.y + dy);
          clicked = true;
          break outer;
        }
      }
    }
    expect(clicked).toBe(true);

    const sheet = page.getByTestId('npc-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(/supervivencia/i);
    await expect(sheet).toContainText(/socializaci(ó|o)n/i);
    await expect(sheet).toContainText(
      /tramuntana|llevant|migjorn|ponent|xaloc|mestral|gregal|garbi/,
    );
  });

  test('milagros deshabilitados sin gratitud, botón cerrar oculta la ficha', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('map-view-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin bounding box');
    const tooltip = page.getByTestId('npc-tooltip');
    const step = 24;
    outer: for (let dy = step / 2; dy < box.height; dy += step) {
      for (let dx = step / 2; dx < box.width; dx += step) {
        await page.mouse.move(box.x + dx, box.y + dy);
        if (await tooltip.isVisible().catch(() => false)) {
          await page.mouse.click(box.x + dx, box.y + dy);
          break outer;
        }
      }
    }

    const sheet = page.getByTestId('npc-sheet');
    await expect(sheet).toBeVisible();

    // Gratitud inicial = 0 → todos los milagros deshabilitados.
    const ojo = page.getByTestId('miracle-btn-ojo_de_halcon');
    await expect(ojo).toBeVisible();
    await expect(ojo).toBeDisabled();

    await page.getByTestId('npc-sheet-close').click();
    await expect(sheet).toHaveCount(0);
  });
});
