# Tests

Suite del proyecto: unit + integration con Vitest, E2E con Playwright.
El MVP v0.1 corre cliente-local sin LLMs ni APIs externas, así que todos
los tests son offline y deterministas.

## Requisitos

- **Node 18+**
- **pnpm** (`npm i -g pnpm` si no lo tienes)

## Instalación

```bash
pnpm install
pnpm exec playwright install chromium   # solo si vas a correr E2E
```

## Comandos

| Comando                   | Qué hace                                            | Presupuesto |
|---------------------------|-----------------------------------------------------|-------------|
| `pnpm test`               | unit + integration en una pasada                    | < 1s        |
| `pnpm test:unit`          | solo `tests/unit/**`                                | < 1s        |
| `pnpm test:integration`   | solo `tests/integration/**`                         | < 1s        |
| `pnpm test:e2e`           | Playwright contra Next en `:3100`                   | < 30s       |
| `pnpm test:coverage`      | igual que `test` con reporte V8 sobre `lib/`        | ~5s         |
| `pnpm test:watch`         | watch mode                                          | —           |

## Ejecutar tests concretos

```bash
pnpm test -- simulation
pnpm test -- -t "determinismo"
```

## Debugging

```bash
pnpm exec vitest --ui                  # Vitest con UI interactiva
pnpm exec playwright test --headed     # E2E en modo headed
pnpm exec playwright show-report       # traza detallada tras un fallo
```

## Estructura

```
tests/
├── setup.ts                            # clearAllMocks, limpieza de env
├── unit/
│   ├── prng.test.ts                    # determinismo + distribución
│   ├── world-state.test.ts             # shape, group_id, rangos, round-trip JSON
│   ├── simulation.test.ts              # tick() puro, performance < 2ms
│   ├── anoint.test.ts                  # canAnoint + anoint
│   ├── chronicle.test.ts               # voz partisana
│   └── persistence.test.ts             # round-trip localStorage
├── integration/
│   ├── anoint-chronicle.test.ts        # flujo UI: canAnoint → anoint → chronicle
│   ├── tick-persistence.test.ts        # save → load → tick idéntico a tick directo
│   └── long-run.test.ts                # 10k ticks deterministas
└── e2e/
    └── anoint-flow.spec.ts             # ungir + reload persiste + reset
```

## Invariantes duros (§A4)

Ningún cambio merguea si rompe:

1. **Determinismo** — misma semilla + mismos inputs ⇒ mismo output byte a byte.
2. **Pureza** — `tick`, `anoint`, `appendChronicle`… no mutan su input.
3. **Round-trip JSON** — `JSON.parse(JSON.stringify(state))` es igual al original.

Si un test de determinismo flakea, es bug, no flake. Arreglar antes de seguir.
