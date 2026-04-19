# Proyecto Civilización — GODGAME

Motor de simulación determinista de civilizaciones. Juegas como un dios
incipiente sobre **los Hijos de Tramuntana**, un clan nómada de 14
personas en un archipiélago balear-ficticio. No gobiernas: bendices.
Cada bendición se traduce en un rasgo que altera cómo los NPCs se
comportan, y el mundo hace el resto.

La arquitectura es un **núcleo puro JSON-serializable** (`lib/`)
envuelto en una capa React (`app/`, `components/`). Cada tick es
determinista: misma semilla + mismas acciones → mismo mundo byte a
byte.

## Estado actual — Bootstrap Edad Primigenia (camino a v2.0)

El repo está en pleno **wipe-y-refundación**. La v1.0.1 single-player
(`13 sprints`, eras tribal → atómica, dioses rivales) se completó en
abril de 2026 y está **archivada** en la rama remota `archive/v1.0.1`.

A partir del 2026-04-19 el `main` ejecuta la **Edad Primigenia**: una
edad totalmente nueva, **anterior** a la tribal, donde el objetivo
mecánico es construir un **monumento** que ancle al clan a un punto
del mapa y desbloquee la siguiente era. El v1.0.1 archivado se
reconstruirá sobre primigenia cuando llegue la edad tribal.

Hoy el `main` contiene:

- **Scaffolding mínimo** — `lib/prng.ts`, `lib/utils.ts`, harness de
  tests, primitives de UI, shell de Next.js, placeholder de página.
- **Sprint 1.1-1.2 cerrado** — `lib/world-gen.ts` genera el
  archipiélago determinista 512×512 con recursos. Test de
  reproducibilidad byte-idéntica 1000 veces.
- **Documentación constitucional** — `vision-primigenia.md` (anexo
  editorial), `DECISIONS-PENDING-primigenia.md` (bandeja del Director),
  `ROADMAP.md` (Fases 1-6 descompuestas en sprints), `CLAUDE.md` /
  `CLAUDE-primigenia.md` (metodología del ingeniero), `CLAUDEDIRECTOR.md`
  (contrapeso editorial).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript estricto.
- Tailwind v4 + shadcn/ui + Motion.
- Vitest (unit + integration) + Playwright (E2E).

## Arranque

```bash
pnpm install
pnpm dev          # next dev en :4747
```

Abre `http://localhost:4747`. Hoy verás el placeholder de primigenia
hasta que la Fase 1 (mundo + render) cierre.

## Tests

```bash
pnpm test              # Vitest unit + integration
pnpm test:unit         # Sólo unit
pnpm test:integration  # Sólo integration (vacío hoy)
pnpm test:e2e          # Playwright (Next en :3100, vacío hoy)
pnpm exec tsc --noEmit
pnpm exec eslint .
pnpm build
```

## Contrato del núcleo (§A4)

Todo módulo de `lib/` respeta tres reglas duras:

1. **Pureza** — recibe estado, devuelve estado nuevo. Sin side effects.
2. **Determinismo** — mismo input → mismo output, byte a byte. Toda
   aleatoriedad pasa por `state.prng_cursor`. Nunca `Math.random`,
   `Date.now` ni `crypto.randomUUID`.
3. **Round-trip JSON** — `JSON.parse(JSON.stringify(state))`
   estructuralmente idéntico al original.

Si un test de determinismo falla, no se mergea.

## Roadmap (resumen)

Plan en 6 fases hasta cerrar el loop primigenia. Detalle por sprint
en `ROADMAP.md`.

| Fase | Tema | Sprints | Estado |
|-|-|-|-|
| 1 | Mundo (mapa + render) | 5 | sprint 1.1-1.2 ✅, resto pendiente |
| 2 | NPCs + recursos + fog-of-war | 6 | pendiente |
| 3 | Movimiento + pathfinding | 4 | pendiente |
| 4 | Economía (necesidades + crafting + grafo) | 7 | pendiente |
| 5 | Bendiciones y rasgos | 5 | pendiente |
| 6 | Monumento + bendición de aldea + transición | 4 | pendiente |

Total: **31 sprints** antes de cerrar primigenia. Fase 7 (migrantes
externos + dios rival) queda diferida; abre la puerta a la edad
tribal completa.

## Documentación

| Documento | Qué contiene |
|-|-|
| `vision-primigenia.md` | Anexo editorial: identidad, sistemas base, fases. Manda sobre la visión madre para mecánicas primigenia. |
| `ROADMAP.md` | Plan canónico de primigenia (Fases 1-6). |
| `DECISIONS-PENDING-primigenia.md` | Bandeja del Director humano. Sprints bloqueados hasta firmar. |
| `CLAUDE.md` | Metodología del ingeniero (TDD estricto, contratos §A4, batches anti-timeout, eficiencia de tokens). |
| `CLAUDE-primigenia.md` | Convenciones específicas de la nueva arquitectura. |
| `CLAUDEDIRECTOR.md` | Contrapeso editorial: rituales, protocolos de frenada, plantillas. |
| `NOTES-OVERNIGHT.md` | Bitácora técnica del bootstrap y blockers. |

## Ramas

- `main` — primigenia activa.
- `archive/v1.0.1` — referencia histórica del juego v1.0 single-player
  pre-wipe (todo el código + version logs + reportes de playtest).
- `archive/*` — copias 1:1 de las ramas `claude/*` previas, conservadas
  por consulta histórica.

## Licencia

Sin licencia declarada aún.
