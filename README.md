# Proyecto Civilización — GODGAME v0.1

Motor de simulación determinista de civilizaciones. Juegas como un dios
observador sobre un pueblo insular (Hijos de Tramuntana). El mundo avanza
solo: tú decides cuándo intervenir ungiendo mortales como Elegidos.

La arquitectura es un núcleo puro JSON-serializable (`lib/`) envuelto en
una capa React (`app/`, `components/`). Cada tick es determinista: misma
semilla + mismas acciones → mismo mundo byte a byte.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind v4 + shadcn/ui + Motion
- Vitest (unit + integration) + Playwright (E2E)

## Arranque

```bash
pnpm install
pnpm dev
```

Abre `http://localhost:4747`.

## Tests

```bash
pnpm test              # unit + integration (Vitest)
pnpm test:e2e          # Playwright (levanta Next en :3100 con su propio server)
pnpm test:coverage     # cobertura v8 sobre lib/
```

La suite actual es 100 tests unit+integration + 3 E2E, todo verde.

## Estructura

```
lib/
  prng.ts            PRNG determinista (mulberry32) con seed+cursor
  world-state.ts     Tipos + initialState(seed) — JSON puro
  simulation.ts      tick(state) puro — avanza día, envejece, mueve NPCs
  anoint.ts          canAnoint + anoint (filtro "solo tu grupo")
  chronicle.ts       Plantillas partisanas del cronista
  persistence.ts     saveSnapshot/loadSnapshot sobre localStorage
  pixel-parser.ts    Clasificador de biomas desde imagen
app/page.tsx         Dashboard del jugador (roster + reloj + crónica)
tests/
  unit/              89 tests — contratos módulo por módulo
  integration/       11 tests — flujos multi-módulo y runs de 10k ticks
  e2e/               3 tests — ungir + persistencia tras reload
```

## Contrato del núcleo (§A4 del Vision Document)

Todo módulo de `lib/` respeta tres reglas duras:

1. **Pureza**: recibe estado, devuelve estado nuevo. Sin side effects.
2. **Determinismo**: mismo input → mismo output, byte a byte.
3. **Round-trip JSON**: el `WorldState` sobrevive `JSON.stringify/parse`
   sin pérdida — requisito para que `localStorage` y los replays
   funcionen.

Si un test de determinismo falla, no se mergea.

## Scope del MVP (v0.1)

Qué hay:
- Reloj de simulación con velocidades 0/1×/5×/20×/100×.
- Roster de 50 NPCs Hijos de Tramuntana con stats y rasgos.
- Ungir como Elegido (primero gratis).
- Crónica partisana (voz del pueblo, no neutral).
- Persistencia en localStorage.

Qué no hay (scope v0.2+):
- Muertes, nacimientos, combate.
- Dones con efectos mecánicos sobre los Elegidos.
- Generación de Fe por fervor.
- Grupos rivales con IA de dios rival (los tipos ya existen vacíos).

## Licencia

Sin licencia declarada aún.
