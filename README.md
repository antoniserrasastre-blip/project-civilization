# Proyecto Civilización — GODGAME

Motor de simulación determinista de civilizaciones. Juegas como un dios
observador en un archipiélago balear ficticio: eliges a tu pueblo (3
grupos disponibles), unges mortales como Elegidos, les concedes dones
o maldices a sus rivales. Compites con hasta 2 dioses IA por el
dominio del mundo.

La arquitectura es un **núcleo puro JSON-serializable** (`lib/`) envuelto
en una capa React (`app/`, `components/`). Cada tick es determinista:
misma semilla + mismas acciones → mismo mundo byte a byte.

## Estado actual — v1.0 feature-complete

- **Single-player completo**: 5 pilares del diseño sostenidos y testados.
- **13 sprints cerrados** desde el MVP hasta v1.0 (ver `ROADMAP.md`).
- **230 tests unit + integration** y **26 E2E** en verde.
- Un reporte detallado del estado y propuestas está en `REPORT.md`.
- Los cambios de cada versión mayor documentados en
  `VERSION-LOG-v*.md` con perspectiva de jugador, balance y flags.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript estricto.
- Tailwind v4 + shadcn/ui + Motion.
- Vitest (unit + integration) + Playwright (E2E).

## Arranque

```bash
pnpm install
pnpm dev          # next dev en :4747
```

Abre `http://localhost:4747`.

### Partida con semilla compartible

Cualquier URL con `?seed=123&group=llevant` reproduce el mismo mundo
en cualquier máquina. El botón **Compartir** en el panel de crónica
copia la URL al portapapeles.

## Tests

```bash
pnpm test              # 230 unit + integration (Vitest)
pnpm test:e2e          # 26 E2E (Playwright — Next en :3100)
pnpm exec tsc --noEmit # type check limpio
pnpm exec eslint .     # lint limpio
pnpm build             # build Next.js
```

Todos en verde en la rama principal (`claude/update-claude-md-mPM1k`).

## Contrato del núcleo (§A4 del Vision Document)

Todo módulo de `lib/` respeta tres reglas duras:

1. **Pureza**: recibe estado, devuelve estado nuevo. Sin side effects.
2. **Determinismo**: mismo input → mismo output, byte a byte. Toda
   aleatoriedad pasa por `state.prng_cursor`. Nunca `Math.random`,
   `Date.now` ni `crypto.randomUUID`.
3. **Round-trip JSON**: el `WorldState` sobrevive `JSON.stringify/parse`
   sin pérdida — requisito para localStorage, replays y partidas
   compartibles.

Si un test de determinismo falla, no se mergea.

## Estructura

```
lib/ · núcleo puro (15 módulos)
  prng.ts              mulberry32 funcional con seed+cursor.
  world-state.ts       Tipos + initialState multi-grupo. GROUPS catálogo.
  simulation.ts        tick(state) compone scheduler + applyEvents.
  scheduler.ts         9 pases: lifecycle + fe + tech + IA rival.
  rival-ai.ts          Ciclo de decisión de dioses rivales.
  anoint.ts            Ungir — "solo tu grupo".
  gifts.ts             Fuerza Sobrehumana, Aura de Carisma + coste Fe.
  curses.ts            3 niveles — "solo grupo rival".
  tech.ts              6 eras: tribal → bronce → clásica → medieval → industrial → atómica.
  verdict.ts           Influencia + top-3 + ¿reina tu linaje?.
  tutorial.ts          Fases del onboarding coreografiado.
  chronicle.ts         Plantillas partisanas del cronista.
  chronicle-provider.ts 3 providers (template / mock-llm / claude).
  export.ts            TXT + HTML + shareUrl.
  persistence.ts       localStorage versioned (v3).
  map.ts               Costa procedural sine-wave layered.

app/
  page.tsx                           Dashboard principal.
  api/chronicle/enhance/route.ts     Stub LLM (501 hasta configurar ANTHROPIC_API_KEY).

components/
  map-view.tsx         SVG: costa + NPCs coloreados por grupo + halo + símbolos hand-drawn.
  ui/                  shadcn primitives.

tests/
  unit/                27 specs — contratos módulo por módulo.
  integration/         4 specs — flujos multi-módulo + runs de 10k ticks + pillars.
  e2e/                 10 specs — flujos de usuario.
```

## Feature tour

- **Onboarding coreografiado** (§A1): intro narrativa → halo dorado
  sobre el NPC más ambicioso → evento forzado día 6 → fin.
- **Lifecycle puro y determinista**: muertes por edad, conflictos
  entre ambiciosos, emparejamientos (mismo y cross-grupo),
  nacimientos con herencia de dones.
- **Economía de Fe de 3 verbos**: rezar (pasiva), enemigo caído (kill
  bonus), descendencia (bonus por nacimiento de linaje sagrado).
- **2 dones y 3 maldiciones** con coste escalonado.
- **Tutorial dinástico**: tu linaje se propaga — descendientes del
  Elegido viviendo en grupo rival siguen generando Fe.
- **Dioses rivales IA** (`aggressive`, `opportunistic`) con ciclo de
  decisión anti-presión (1 decisión / ~100s a 1×).
- **6 eras con transición automática** cuando se completa el pool
  tecnológico de cada una + cinemática pergamino.
- **Veredicto de era** con top-3 por influencia:
  `influence = fuerza + carisma + 10·seguidores + 5·descendientes`.
- **Exportación**: códice HTML standalone o .txt; URL compartible con
  seed+group para replicar tu mundo.
- **Crónica generativa**: provider swappable en vivo (plantilla
  determinista, LLM simulado offline, o Claude real — requiere
  configurar `ANTHROPIC_API_KEY`).

## Metodología

El trabajo sigue **TDD estricto**: test Red → min implementation →
refactor → gate → commit. El gate se pasa siempre antes de mergear:

```
pnpm test && pnpm test:e2e && pnpm exec tsc --noEmit && pnpm exec eslint . && pnpm build
```

Cada versión mayor (v0.1, v0.2, v0.3, v0.4, v1.0) se cierra con un
**Polish & Debug pass** + un **VERSION-LOG-vX.Y.md** escrito desde la
perspectiva del jugador, con análisis de balance y flags para
decisiones humanas pendientes. Ver `CLAUDE.md` para la metodología
completa.

## Roadmap

- `ROADMAP.md` — plan original hasta v1.0 (sprints 1-13). Todos
  cerrados.
- `ROADMAP-v2.md` (rama `claude/v2-roadmap`) — plan post-v1.0: eras
  clásica → atómica + arquitectura multijugador. v1.3 esqueleto ya
  está en esa rama, pendiente de validación.

## Documentación

| Documento | Qué contiene |
|-|-|
| `CLAUDE.md` | Metodología para agentes Claude Code trabajando en este repo. |
| `ROADMAP.md` | Plan canónico hasta v1.0 (todos los sprints cerrados). |
| `ROADMAP-v2.md` | Plan post-v1.0 en rama provisional. |
| `REPORT.md` | Reporte final overnight: estado + flags + propuestas. |
| `NOTES-OVERNIGHT.md` | Bitácora técnica sprint-por-sprint. |
| `VERSION-LOG-v0.1.md` → `v1.0.md` | Logs por versión con perspectiva de jugador. |

## Licencia

Sin licencia declarada aún.
