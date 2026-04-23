import { expect, test } from '@playwright/test';

test.describe('Stylesheets — carga robusta', () => {
  test('todas las hojas de estilo referenciadas cargan con HTTP OK', async ({
    page,
    request,
  }) => {
    const failedStylesheets: string[] = [];

    page.on('requestfailed', (req) => {
      if (req.resourceType() === 'stylesheet') {
        failedStylesheets.push(`${req.url()} :: ${req.failure()?.errorText}`);
      }
    });

    page.on('response', (res) => {
      if (res.request().resourceType() === 'stylesheet' && !res.ok()) {
        failedStylesheets.push(`${res.status()} :: ${res.url()}`);
      }
    });

    await page.goto('/?seed=42');
    await page.waitForLoadState('networkidle');

    const stylesheetHrefs = await page
      .locator('link[rel="stylesheet"]')
      .evaluateAll((links) =>
        links
          .map((link) => (link as HTMLLinkElement).href)
          .filter((href): href is string => href.length > 0),
      );

    expect(stylesheetHrefs.length).toBeGreaterThan(0);

    for (const href of stylesheetHrefs) {
      const response = await request.get(href);
      expect(response.ok(), `${response.status()} :: ${href}`).toBe(true);
    }

    expect(failedStylesheets).toEqual([]);
  });
});
