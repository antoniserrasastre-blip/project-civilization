/**
 * E2E Sprint 10 — panel de dioses rivales.
 */

import { test, expect } from '@playwright/test';
import { goHomeFresh } from './helpers';

test.describe('Sprint 10 — dioses rivales', () => {
  test('el panel muestra los 2 rivales con perfil y nombres', async ({ page }) => {
    await goHomeFresh(page);
    await expect(page.getByTestId('rival-panel')).toBeVisible();
    // Con playerGroupId=tramuntana, rivales son llevant y migjorn.
    await expect(page.getByTestId('rival-llevant')).toBeVisible();
    await expect(page.getByTestId('rival-migjorn')).toBeVisible();
  });
});
