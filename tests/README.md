# Tests — guía rápida (Ubuntu)

Esta carpeta contiene la suite completa del proyecto: unit, integration y E2E. Nunca se llama a la API real de Gemini durante `pnpm test`; todos los tests de integración usan `vi.mock('@google/genai')` con fixtures deterministas.

## Requisitos

- **Node 18+** (`node --version`)
- **pnpm** (`npm i -g pnpm` si no lo tienes)
- **ImageMagick** solo si vas a regenerar las imágenes de prueba (`sudo apt install imagemagick`). Ver `tests/fixtures/images/README.md`.

## Instalación

Desde la raíz del proyecto:

```bash
pnpm install
pnpm exec playwright install chromium
```

El segundo comando descarga el navegador de Playwright solo si vas a correr E2E.

## Comandos

| Comando | Qué hace | Presupuesto |
|---------|----------|-------------|
| `pnpm test` | Corre unit + integration en una pasada | < 5s |
| `pnpm test:unit` | Solo `tests/unit/**` | < 2s |
| `pnpm test:integration` | Solo `tests/integration/**` (Gemini mockeado) | < 5s |
| `pnpm test:e2e` | Playwright contra el dev server local | < 30s |
| `pnpm test:coverage` | Igual que `test` pero con reporte de cobertura V8 | ~10s |

## Variables de entorno

- `GEMINI_API_KEY` — **ignorada** durante `pnpm test` (el setup la borra para evitar fugas). Solo el canario la usa.
- `RUN_GEMINI_CANARY=1` — activa `tests/integration/gemini-canary.test.ts`, que **sí** llama a la API real. Úsalo en un cron, no en CI normal.
- `E2E_MOCK_GEMINI=1` — la config de Playwright lo setea automáticamente al levantar el dev server; no lo toques a mano.

## Ejecutar solo un test concreto

```bash
pnpm test -- pixel-parser
pnpm test -- -t "stats no se mueven"
```

## Debugging

```bash
# Vitest con UI interactiva
pnpm exec vitest --ui

# Playwright en modo headed (ve el navegador)
pnpm exec playwright test --headed

# Playwright traza detallada de un fallo
pnpm exec playwright show-report
```

## Estructura

```
tests/
├── setup.ts                       # Setup global (reloj congelado, limpieza de env)
├── unit/
│   ├── pixel-parser.test.ts       # Capa 1: clasificación de píxeles
│   └── state-invariants.test.ts   # Capa 2: invariantes + applyBlessing
├── integration/
│   ├── gemini-action.test.ts      # Capa 3: runOracleTurn mockeado
│   └── gemini-canary.test.ts      # Canario opt-in (API real)
├── e2e/
│   └── blessing-flow.spec.ts      # Capa 5: flujo completo con Playwright
└── fixtures/
    ├── game-states/               # Estados canónicos + rotos
    ├── gemini-responses/          # Respuestas mockeadas
    ├── images/                    # PNGs generados con ImageMagick (no en git)
    └── test-image-generator.ts    # Buffers RGBA sintéticos
```

## Capas del testing

Ver `TEST_SPEC.md` en la raíz del proyecto para la especificación completa. Resumen:

- **Capa 1 — pixel-parser:** puro, determinista.
- **Capa 2 — invariantes de estado:** reglas que el juego NUNCA debe romper.
- **Capa 3 — integración Gemini:** server action mockeado, cubre 8 failure modes.
- **Capa 4 — fidelidad narrativa:** heurísticas sobre la `chronicle` (español, menciona NPCs).
- **Capa 5 — E2E:** un único golden path + el botón disabled sin faith.
