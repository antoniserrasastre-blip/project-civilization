# package.json — scripts y devDependencies a añadir

Fusiona estos bloques con el `package.json` existente. No reemplaces el fichero entero.

## Scripts

Añade al objeto `"scripts"`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest"
  }
}
```

## devDependencies

```bash
pnpm add -D vitest @vitest/coverage-v8 @vitest/ui @playwright/test
pnpm exec playwright install chromium
```

Versiones mínimas recomendadas (ajusta según disponibilidad):

```json
{
  "devDependencies": {
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "@vitest/ui": "^2.1.0",
    "@playwright/test": "^1.48.0"
  }
}
```

## .gitignore

Añade:

```
# Test artifacts
coverage/
playwright-report/
test-results/
tests/fixtures/images/*.png
!tests/fixtures/images/README.md
```
