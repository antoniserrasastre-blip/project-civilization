/**
 * E2E Sprint 4 — economía de Fe.
 *
 * 1. Arranca limpio. Pausa el reloj.
 * 2. Unge + concede primer don (gratis).
 * 3. El panel de Fe muestra que el próximo don cuesta 30 Fe.
 * 4. El botón del segundo don aparece con "30 Fe" y está deshabilitado
 *    mientras no haya Fe suficiente.
 * 5. Acelera el reloj a 100×, deja correr ticks hasta superar 30 Fe
 *    (Elegido vivo → 0.05/tick), vuelve a pausar.
 * 6. Ahora el botón se habilita y se puede conceder el segundo don.
 * 7. Tras conceder, Fe baja 30 y gifts_granted=2.
 */

import { test, expect } from '@playwright/test';
import { goHomeFresh } from './helpers';

test.describe('Sprint 4 — economía de Fe', () => {
  test('acumular Fe y conceder segundo don', async ({ page }) => {
      test.setTimeout(60_000);
      await goHomeFresh(page);
      await page.getByTestId('clock-slower').click(); // pausa
      await expect(page.getByTestId('clock-speed')).toContainText('Pausado');

      // Ungir + primer don gratis.
      await page.getByTestId('npc-npc_0000').click();
      await page.getByTestId('anoint-button').click();
      await page.getByTestId('grant-gift-fuerza_sobrehumana').click();
      await expect(
        page.getByTestId('gift-granted-fuerza_sobrehumana'),
      ).toBeVisible();

      // Panel de Fe: próximo don es 30 Fe.
      await expect(page.getByTestId('faith-panel-next-cost')).toContainText(
        '30',
      );
      // Botón del segundo don deshabilitado por falta de Fe.
      await expect(page.getByTestId('grant-gift-aura_de_carisma')).toBeDisabled();

      // Acelerar a 100× y esperar Fe ≥ 30. A 100 ticks cada 200ms con 1
      // sagrado produce 5 Fe/s. 30 Fe ≈ 6s. Damos margen.
      for (let i = 0; i < 3; i++) await page.getByTestId('clock-faster').click();
      await expect(page.getByTestId('clock-speed')).toContainText('100×');

      await expect
        .poll(
          async () => {
            const text = await page
              .getByTestId('faith-panel-points')
              .textContent();
            const m = text?.match(/([\d.]+)/);
            return m ? parseFloat(m[1]) : 0;
          },
          { timeout: 20_000, intervals: [300] },
        )
        .toBeGreaterThanOrEqual(30);

      // Si durante la aceleración se disparó una cinemática de era, la
      // cerramos antes de seguir tocando controles (blocking overlay).
      // Puede dispararse más de una (por descubrir varias techs); loop
      // cerrando hasta que ninguna esté visible antes de pausar.
      for (let attempt = 0; attempt < 5; attempt++) {
        const cinematic = page.getByTestId('era-cinematic');
        if (!(await cinematic.isVisible().catch(() => false))) break;
        await page
          .getByTestId('era-cinematic-close')
          .click()
          .catch(() => {});
      }

      // Pausar de nuevo para estabilidad. Si otra cinemática aparece entre
      // clicks, volvemos a cerrarla y reintentamos.
      for (let i = 0; i < 3; i++) {
        const cin = page.getByTestId('era-cinematic');
        if (await cin.isVisible().catch(() => false)) {
          await page
            .getByTestId('era-cinematic-close')
            .click()
            .catch(() => {});
        }
        await page.getByTestId('clock-slower').click();
      }
      await expect(page.getByTestId('clock-speed')).toContainText('Pausado');

      // Re-seleccionar el Elegido (la velocidad hace que el roster se
      // redibuje y la selección puede persistir, pero por seguridad).
      await page.getByTestId('npc-npc_0000').click();
      await expect(page.getByTestId('grant-gift-aura_de_carisma')).toBeEnabled();

      // Conceder segundo don — Fe baja 30.
      const beforeText = await page
        .getByTestId('faith-panel-points')
        .textContent();
      const before = beforeText ? parseFloat(beforeText.match(/([\d.]+)/)?.[1] ?? '0') : 0;
      await page.getByTestId('grant-gift-aura_de_carisma').click();
      await expect(
        page.getByTestId('gift-granted-aura_de_carisma'),
      ).toBeVisible();

      await expect
        .poll(
          async () => {
            const text = await page
              .getByTestId('faith-panel-points')
              .textContent();
            return text ? parseFloat(text.match(/([\d.]+)/)?.[1] ?? '0') : 0;
          },
          { timeout: 3000 },
        )
        .toBeLessThanOrEqual(before - 30 + 0.1);
  });
});
