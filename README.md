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

## Estado actual — Edad Primigenia end-to-end (camino a v2.0)

Fases 1-6 del roadmap primigenia cerradas (30 sprints). Loop completo:
drafting de 4 Elegidos + 10 Ciudadanos → mapa 512×512 con fog-of-war →
pathfinding + necesidades + recolección + crafting (5 recetas) →
grafo de relaciones → fogata + 10 noches → modal diario con 6
intenciones + motor de interpretación → pool de gratitud + 5 milagros →
construcción del monumento → bendición de aldea → cinemática de
transición a placeholder tribal.

**Bloqueos activos** (ver `NOTES-OVERNIGHT.md`): Playwright Chromium
no instala por sandbox sin red (`playwright.azureedge.net` 403); y
assets CC0 externos (Kenney) tampoco — hay placeholders procedurales
propios CC0 en `assets/tiles/` hasta que el Director humano reemplace
en entorno con red.

El v1.0.1 single-player histórico (13 sprints, eras tribal → atómica,
dioses rivales, completado en abril 2026) está **archivado** en
`archive/v1.0.1`; se reconstruirá sobre primigenia cuando la edad
tribal entre en scope.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript estricto.
- Tailwind v4 + shadcn/ui + Motion.
- Vitest (unit + integration) + Playwright (E2E).

## Arranque

```bash
pnpm install
pnpm dev          # next dev en :4747
```

Abre `http://localhost:4747`. Verás el loop primigenia desde el
drafting de clan hasta la cinemática tribal.

## Tests

```bash
pnpm test              # Vitest unit + integration
pnpm test:unit         # Sólo unit
pnpm test:integration  # Sólo integration
pnpm test:e2e          # Playwright (Next en :3100, requiere chromium instalado)
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
| 1 | Mundo (mapa + render) | 5 | ✅ |
| 2 | NPCs + recursos + fog-of-war | 6 | ✅ |
| 3 | Movimiento + pathfinding | 4 | ✅ |
| 4 | Economía (necesidades + crafting + grafo) | 7 | ✅ |
| 5 | Bendiciones y rasgos | 4 | ✅ |
| 6 | Monumento + bendición de aldea + transición | 4 | ✅ |

Total: **30 sprints** de primigenia cerrados. Fase 7 (migrantes
externos + dios rival) queda diferida por diseño; abre la puerta a la
edad tribal completa.

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
