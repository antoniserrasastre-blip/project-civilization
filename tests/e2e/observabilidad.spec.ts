/**
 * E2E del Sprint 11 OBSERVABILIDAD-TOTAL (Pilar 3).
 *
 * Contrato: el jugador ve la profundidad social y técnica de su clan
 * sin micromanagement. Esta suite comprueba las tres superficies:
 *
 *   1. HUD — panel de Inventario Comunal visible con las cinco
 *      reservas del clan (madera, piedra, bayas, caza, pescado).
 *   2. NpcSheet — sección de Skills (hunting / gathering / crafting /
 *      fishing / healing) y sección de Historia Biográfica
 *      (nacimiento, linaje, arquetipo, hijos, edad) añadidas a la
 *      ficha existente.
 *   3. MapView — toggle de capa de Relaciones (para dibujar parentesco
 *      y deudas cuando el jugador lo pide) y "píxel de oficio" sobre
 *      los marcadores (color distintivo según arquetipo).
 *
 * No se testea el balance ni la lógica (§A4 vive en lib/). Aquí sólo
 * verificamos que los data-testid del contrato UI existen y responden
 * a la interacción.
 */

import { test, expect } from '@playwright/test';

test.describe('Observabilidad total — HUD, NpcSheet y MapView ampliados', () => {
  test('HUD muestra Inventario Comunal con las cinco reservas', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const inv = page.getByTestId('hud-inventory');
    await expect(inv).toBeVisible();
    // Etiquetas en castellano — cinco reservas enumeradas.
    await expect(inv).toContainText(/madera/i);
    await expect(inv).toContainText(/piedra/i);
    await expect(inv).toContainText(/bayas/i);
    await expect(inv).toContainText(/caza/i);
    await expect(inv).toContainText(/pescado/i);
  });

  test('NpcSheet muestra Skills e Historia Biográfica al abrir un NPC', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('map-view-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas sin bounding box');
    const tooltip = page.getByTestId('npc-tooltip');
    // Barrido en espiral rectangular desde el centro (el spawn del
    // clan está centrado por `initialCenter` → los NPCs caen cerca).
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const step = 18;
    const maxRadius = Math.min(box.width, box.height) / 2 - step;
    let clicked = false;
    outer: for (let r = 0; r < maxRadius; r += step) {
      const n = Math.max(1, Math.floor((r * 2) / step));
      for (let i = -n; i <= n; i++) {
        for (const [dx, dy] of [
          [i * step, -r],
          [i * step, r],
          [-r, i * step],
          [r, i * step],
        ] as const) {
          await page.mouse.move(cx + dx, cy + dy);
          if (await tooltip.isVisible().catch(() => false)) {
            await page.mouse.click(cx + dx, cy + dy);
            clicked = true;
            break outer;
          }
        }
      }
    }
    expect(clicked).toBe(true);

    const sheet = page.getByTestId('npc-sheet');
    await expect(sheet).toBeVisible();

    const skills = page.getByTestId('npc-sheet-skills');
    await expect(skills).toBeVisible();
    await expect(skills).toContainText(/caza|hunting/i);
    await expect(skills).toContainText(/recolec|gather/i);
    await expect(skills).toContainText(/artesan|craft/i);
    await expect(skills).toContainText(/pesca|fish/i);
    await expect(skills).toContainText(/sanaci|heal/i);

    const bio = page.getByTestId('npc-sheet-biography');
    await expect(bio).toBeVisible();
    await expect(bio).toContainText(/d(í|i)a/i);
    await expect(bio).toContainText(/hijos?/i);
  });

  test('MapView expone toggle de capa de Relaciones y píxel de oficio', async ({
    page,
  }) => {
    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const canvas = page.getByTestId('map-view-canvas');
    await expect(canvas).toBeVisible();

    // Píxel de oficio: el canvas expone el flag de capa activa por
    // defecto.
    await expect(canvas).toHaveAttribute('data-profession-layer', 'on');

    const toggle = page.getByTestId('map-layer-relations-toggle');
    await expect(toggle).toBeVisible();

    // Estado inicial: capa off.
    await expect(canvas).toHaveAttribute('data-relations-layer', 'off');
    await toggle.click();
    await expect(canvas).toHaveAttribute('data-relations-layer', 'on');
    await toggle.click();
    await expect(canvas).toHaveAttribute('data-relations-layer', 'off');
  });
});
