/**
 * E2E del MapView — pan + zoom sobre el archipiélago 512×512.
 *
 * ESTADO: ready-for-future. No se ejecuta en el sandbox actual
 * porque `pnpm exec playwright install` está bloqueado por red
 * (ver NOTES-OVERNIGHT.md § Bloqueo Sprint 1.5 E2E). En cuanto el
 * entorno permita descargar Chrome de playwright, este spec entra
 * al gate automático via `pnpm test:e2e`.
 *
 * Cobertura esperada:
 *   1. Carga de la página → canvas presente.
 *   2. Drag del canvas → offset cambia (snapshot diferente).
 *   3. Scroll del canvas → zoom cambia.
 *   4. Snapshot del viewport inicial como test de regresión visual.
 */

import { test, expect } from '@playwright/test';

test.describe('MapView — pan + zoom', () => {
  test('canvas del mapa aparece al cargar', async ({ page }) => {
    await page.goto('/');
    const canvas = page.getByTestId('map-view-canvas');
    await expect(canvas).toBeVisible();
  });

  test('drag desplaza el mapa', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const canvas = page.getByTestId('map-view-canvas');
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas no tiene bounding box');
    const before = await canvas.screenshot();
    // Arranca el drag cerca del centro y lo arrastra hacia la
    // esquina superior-izquierda. El viewport inicial tiene
    // offsetX/Y = 0 clampado al borde del mapa: un drag positivo
    // (hacia abajo-derecha) se clamparía a 0 y no generaría
    // cambio visible. Dirección negativa siempre tiene margen
    // dentro de [screen - mapPx, 0].
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endX = startX - 200;
    const endY = startY - 200;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();
    const after = await canvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test('scroll aplica zoom', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const canvas = page.getByTestId('map-view-canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas no tiene bounding box');
    const before = await canvas.screenshot();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -500);
    const after = await canvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });
});
