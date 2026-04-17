import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — flujo E2E del MVP.
 *
 * Arranca Next en dev mode en un puerto fijo y apunta Playwright a él.
 * El MVP v0.1 es enteramente cliente-local (sin LLM, sin server actions),
 * así que no hay env vars a montar ni mocks a inyectar.
 *
 * `fullyParallel: false` y 1 proyecto: el dev server es estado compartido;
 * paralelizar aquí produce flakes por localStorage cruzando entre tests.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Puerto 3100 deliberado para no chocar con el 3000 típico del dev
    // local del usuario. `-p` es de Next; si usas otro runner, ajusta.
    command: 'pnpm exec next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
