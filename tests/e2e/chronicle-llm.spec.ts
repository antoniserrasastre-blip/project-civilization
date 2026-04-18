/**
 * E2E Sprint 12 — selector de provider de crónica.
 */

import { test, expect } from '@playwright/test';
import { goHomeFresh } from './helpers';

test.describe('Sprint 12 — chronicle provider selector', () => {
  test('el selector cambia el provider y el texto cambia', async ({ page }) => {
    await goHomeFresh(page);
    await page.getByTestId('clock-slower').click();

    // Generamos una entrada ungiendo.
    await page.getByTestId('npc-npc_0000').click();
    await page.getByTestId('anoint-button').click();
    await expect(page.getByTestId('chronicle-list')).toBeVisible();

    const entry = page.getByTestId('chronicle-entry').first();
    const templateText = (await entry.textContent()) ?? '';
    expect(templateText).toContain('dios');

    // Cambiar a mock-llm: el texto debe ganar una apertura.
    await page.getByTestId('chronicle-provider-select').selectOption('mock-llm');
    await expect(entry).not.toHaveText(templateText, { timeout: 3000 });
    const llmText = (await entry.textContent()) ?? '';
    expect(llmText.length).toBeGreaterThan(templateText.length);
  });
});
