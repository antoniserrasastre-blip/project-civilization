import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Config de Vitest para Next.js 15 + server actions.
 *
 * - `environment: node`: nuestros módulos puros no tocan DOM. Más rápido.
 *   Los tests DOM-dependientes viven en Playwright.
 * - `setupFiles`: ver tests/setup.ts (reloj congelado, limpieza de env).
 * - `alias '@/'`: espejo del `tsconfig.json` del proyecto para que los
 *   imports en tests resuelvan idénticos a los del código de la app.
 * - plugin-react: permite importar .tsx desde tests (smoke tests del
 *   MapView y siguientes componentes React). Sin él, el parser de
 *   Vite falla en JSX porque tsconfig.json tiene jsx:"preserve".
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'tests/unit/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'tests/design/**/*.test.ts',
      'tests/playtest/**/*.test.ts',
    ],
    // Los E2E son de Playwright; excluidos de la pasada de Vitest.
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    testTimeout: 15_000,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: ['**/*.d.ts', 'node_modules/**'],
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
