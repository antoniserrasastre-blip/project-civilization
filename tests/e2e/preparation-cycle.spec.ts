/**
 * E2E del ciclo completo línea C (Sprint 04b):
 * quick-start → Fases ON → anochecer → pantalla de preparación →
 * asignar designio en una carta → Amanecer → día siguiente → el informe
 * del nuevo anochecer refleja el designio asignado.
 */
import { test, expect } from '@playwright/test';

test('ciclo día → preparación → designio → amanecer → informe', async ({ page }) => {
  test.setTimeout(600_000); // test LENTO a propósito: ~3 min/día in-game en dev (deuda perf worker)
  await page.goto('/');
  await page.getByTestId('quickstart-test-clan').click();
  await page.getByTestId('speed-5').click(); // día = 480 ticks × 50ms ≈ 24s

  // Fases ON (el toggle solo existe fuera de preparación)
  const toggle = page.getByTestId('phased-mode-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveText(/ON/);

  // Primer anochecer → pantalla de preparación
  const prep = page.getByTestId('preparation-screen');
  await expect(prep).toBeVisible({ timeout: 180_000 });
  await expect(page.getByTestId('dawn-report')).toContainText(/Primera noche|Día/);

  // Asignar designio de exploración en la primera carta
  const select = page.locator('[data-testid^="designio-select-"]').first();
  await select.selectOption('exploracion');

  // Amanecer → la sim arranca el día siguiente
  await page.getByTestId('dawn-button').click();
  await expect(prep).not.toBeVisible();
  await page.getByTestId('speed-5').click(); // re-asegurar ×5 tras la pausa de preparación

  // Segundo anochecer → el informe existe y refleja el designio
  await expect(prep).toBeVisible({ timeout: 180_000 });
  await expect(page.getByTestId('dawn-report')).toContainText('Exploración');
});
