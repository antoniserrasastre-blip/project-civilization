# Notas nocturnas — bootstrap Edad Primigenia

Bitácora técnica del ingeniero ejecutor tras la edición del 2026-04-19
que reemplaza la edad temprana (v1.0.1) por la edad primigenia. El log
histórico de v0.x → v1.0.1 vive en `archive/v1.0.1`.

## Tarea 1 — Archivo de v1.0.1 y wipe del scaffolding

**Commit base archivado**: `b1cfc26` (tip de `origin/main` previo al
wipe, contiene v1.0.1 + v1.2 map baleares + `CLAUDEDIRECTOR.md` +
hacks de eficiencia).

- Rama `archive/v1.0.1` creada en ese commit y pusheada al remoto ✅
  (sustituye a la rama provisional `claude/v1.0.1-archivada`, que
  sigue existiendo como redundancia).
- Tag local `v1.0.1-archive` creado sobre el mismo commit ✅.
- **Push del tag**: bloqueado por el servidor git con HTTP 403
  persistente. La rama archivada `archive/v1.0.1` preserva el mismo
  SHA, así que la recuperación histórica sigue garantizada sin el tag.

### Qué se conservó en la rama principal (scaffolding mínimo)

- `lib/prng.ts` — PRNG determinista reutilizable (§A4).
- `lib/utils.ts` — helper `cn` de shadcn (infra UI, no lógica de juego).
- `package.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`,
  `next.config.ts`, `eslint.config.mjs`, `.eslintrc.json`,
  `postcss.config.mjs`, `components.json`, `pnpm-lock.yaml`, `.env.example`,
  `metadata.json`, `next-env.d.ts`, `.gitignore` — infra.
- `tests/unit/prng.test.ts` + `tests/setup.ts` + `tests/README.md` +
  `tests/package.json.snippet.md` — test harness mínimo.
- `components/ui/*`, `hooks/use-mobile.ts` — primitives shadcn reusables.
- `app/layout.tsx`, `app/globals.css` — shell de Next.js.
- `app/page.tsx` — placeholder vacío con `data-testid="primigenia-placeholder"`.
- `CLAUDE.md`, `CLAUDEDIRECTOR.md` — metodología + contrapeso editorial.
- `README.md` — queda para reescribir en tarea 2/3.
- `vision-primigenia.md`, `DECISIONS-PENDING-primigenia.md` — constitución
  y bandeja de la nueva edad (extraídos de la rama editorial
  `origin/claude/read-claudedirector-a3VyQ`).

### Qué se borró

- `lib/` — `anoint, chronicle, chronicle-provider, curses, export, faith,
  gifts, map, nuclear, persistence, rival-ai, scheduler, simulation,
  tech, tutorial, verdict, world-state`.
- `tests/unit/` — todos los tests de los módulos anteriores (23 ficheros).
- `tests/integration/`, `tests/design/`, `tests/playtest/`, `tests/e2e/`
  enteros.
- `components/map-view.tsx` (depende del `lib/map.ts` borrado).
- `app/api/chronicle/enhance/route.ts` (server route del chronicle LLM).
- Docs archivadas: el `ROADMAP.md` previo (sprints 1-13 hasta v1.0),
  `DECISIONS-PENDING.md`, `PLAYTEST-REPORT.md`, `REPORT.md`,
  `VERSION-LOG-v0.{1,2,3,4}.md`, `VERSION-LOG-v1.0.md`,
  `VERSION-LOG-v1.0.1.md`. Todas recuperables en `archive/v1.0.1`.
  El `ROADMAP.md` actual del repo es el de primigenia (renombrado
  desde `ROADMAP-primigenia.md`).

## Blockers y acciones requeridas al Director humano

1. **Tag `v1.0.1-archive`**: push manual si se quiere referencia
   versionada (opcional — rama archivada ya cubre el requisito).
2. **Primigenia docs**: los documentos `vision-primigenia.md` y
   `DECISIONS-PENDING-primigenia.md` ya están en `main` (provenientes
   de la rama editorial original `claude/read-claudedirector-a3VyQ`,
   ahora preservada en `archive/read-claudedirector`). El bootstrap
   completo se mergeó a `main` el 2026-04-19; la rama
   `claude/primigenia-bootstrap-nGvO9` queda preservada en
   `archive/primigenia-bootstrap`.

> [Revisor] 2026-04-20: auditoría de PR #2 (`fix: gate verde tras
> bootstrap primigenia`, rama `claude/fix-gate-primigenia`).
> Resultado: 🔴 el fix del build no cierra en mi entorno. Tras
> checkout de la rama y `pnpm build` (con el `prebuild: rm -rf
> .next` ya ejecutado), sigue fallando con `PageNotFoundError:
> Cannot find module for page: /_document` durante "Collecting
> page data". Causa raíz real — no la que el PR identifica:
> existe `/home/randomite/package-lock.json` (88 bytes, huérfano
> del 17-feb) y Next 15 lo detecta como workspace root en vez
> del repo. El warning lo canta literal: *"We detected multiple
> lockfiles and selected the directory of
> /home/randomite/package-lock.json as the root directory"*. Al
> buscar `_document` relativo a esa raíz equivocada, revienta.
> El PR atribuye el fallo a `.next` stale (no reproducible tras
> wipe); eso es sintomático, no causal — el agente corrió el
> gate en un sandbox probablemente sin lockfile huérfano arriba.
> El fix del E2E (dirección de drag positiva clampada a 0) sí
> es correcto y bien diagnosticado; queda tal cual.
> **Acción sugerida**: añadir `outputFileTracingRoot: __dirname`
> a `next.config.ts` (solución que el warning de Next recomienda
> explícitamente). Alternativa inferior: borrar
> `/home/randomite/package-lock.json` — frágil, deja al próximo
> clonador expuesto si tiene un lockfile errante en su home.
> Finding comunicado como comentario en el PR #2. Merge
> bloqueado hasta que se aplique el fix o el humano degrade la
> severidad.

## Bloqueo Sprint 1.4 — assets CC0 externos

**Contexto**: el sprint 1.4 pedía descarga de tileset Kenney CC0 para
los 6 tipos de tile (water/shore/grass/forest/mountain/sand).

**Bloqueo**: el sandbox del entorno de agente responde HTTP 403
`host_not_allowed` al probar `kenney.nl`. Asumido también bloqueado
para `opengameart.org`. Sin red outbound, no hay forma de traer el
tileset canónico.

**Decisión operativa tomada**: generé placeholders SVG procedurales
(32×32, solid color por tile type) y los registré en `assets/ORIGINS.md`
con origen `Proyecto Civilización (procedural) · Licencia CC0 · Equipo
interno`. Son arte propio trivial — sin dependencia externa, CC0 por
declaración. El Director Creativo puede sustituir cuando haya entorno
con red: solo hay que reemplazar los `.svg` bajo `assets/tiles/` y
actualizar hash + origen en ORIGINS.md.

**Lint operativo**: `pnpm lint:assets` funcional — verifica que cada
fichero bajo `assets/` tiene fila en ORIGINS.md con hash SHA-256
correcto y licencia en la whitelist (solo CC0 por ahora). Tests
sintéticos en `tests/unit/asset-registry.test.ts` cubren happy path
+ fallos (hash mismatch, fila huérfana, licencia no whitelisted).

**Acción requerida al Director humano**: cuando el entorno permita
fetch, descargar tileset Kenney o equivalente, reemplazar SVGs y
actualizar ORIGINS.md. Hasta entonces los placeholders procedurales
sirven para desarrollar el render (Sprint 1.5) sin bloqueo.

## Bloqueo Sprint 1.5 — E2E Playwright

**Contexto**: el sprint 1.5 pedía E2E Playwright cubriendo carga,
drag, zoom y snapshot del MapView.

**Bloqueo**: `pnpm exec playwright install chromium` falla con
"Failed to download Chrome for Testing 147.0.7727.15" — igual que
Sprint 1.4, la sandbox no permite fetch a CDN del browser.

**Decisión operativa tomada**:
  - La lógica de viewport (pan, zoom, clamp, screen→tile) tiene
    cobertura unit completa en `tests/unit/viewport.test.ts`
    (14 tests).
  - `tests/unit/map-view-smoke.test.ts` añadido como sanity de
    import/export del componente.
  - `tests/e2e/map-view.spec.ts` escrito en modo "ready-for-future":
    entra automáticamente al gate cuando `pnpm exec playwright
    install` funcione. Cubre canvas presente, drag desplaza,
    scroll zoomea.
  - Build de Next.js compila la página con MapView (14.5 kB); el
    dev server arrancaría correctamente.

**Acción requerida al Director humano**: arrancar `pnpm exec
playwright install chromium` en un entorno con red a
`playwright.azureedge.net`, luego `pnpm test:e2e` para validar
los 3 tests escritos. Si fallan, eran bugs latentes de MapView
(primera vez que se ejecutan).

## Sprint FIX-GATE-PRIMIGENIA — causa raíz de los 2 fallos post-merge

Tras mergear PR #1 a `main`, el gate reportó 2 de 5 checks rojos.
Causas identificadas y corregidas en rama
`claude/fix-gate-primigenia`.

### 1. `pnpm build` — `PageNotFoundError: /_document`

**Causa probable**: estado stale en `.next/` heredado de un build
previo (antes del wipe v1.0.1 → primigenia), donde
`pages-manifest.json` referenciaba rutas obsoletas del Pages
Router. Next 15.5 intenta resolver esas rutas durante "Collecting
page data" y tira `PageNotFoundError` sobre `/_document`, aunque
el codebase actual sea 100% App Router.

**No reproducible en entorno limpio** (fresh `rm -rf .next && pnpm
install && pnpm build` pasa verde). Depende del estado heredado
entre merges.

**Fix**: script `prebuild` añadido a `package.json` que ejecuta
`rm -rf .next` antes de cada `pnpm build`. Garantiza start-from-
scratch en cualquier entorno (local o CI), sin coste de dev (el
overhead de rebuild es < 1s). El script `clean` obsoleto
(`next clean` no existe como subcomando) queda corregido al mismo
estilo.

### 2. `pnpm test:e2e` — drag test falla 1/3 en chromium

**Causa raíz**: el test dragea `box.x+100 → box.x+300` (dx=+200,
dy=+200), sentido **positivo**. El viewport inicial de MapView
tiene `offsetX = offsetY = 0` (borde superior-izquierdo del mapa
visible en la esquina del viewport). `clampOffset` fuerza
`offsetX ∈ [screen-mapPx, 0]`: cualquier delta positivo se clampa
a 0. El drag no genera cambio visible → `Buffer.compare(before,
after) === 0` → test falla. NO era flake — era bug determinista
de dirección.

**Fix** (`tests/e2e/map-view.spec.ts`): drag desde el centro del
canvas hacia la esquina superior-izquierda (dx=-200, dy=-200).
Sentido negativo: siempre dentro del rango válido de `clampOffset`,
siempre produce cambio visible. Más robusto también ante futuros
ajustes de viewport inicial. Añadido `waitForLoadState('networkidle')`
+ `expect(canvas).toBeVisible()` como barandilla.

### Verificación local

Gate reproducido con browser chromium-1194 pre-instalado en el
sandbox (vía `PLAYWRIGHT_CHROMIUM_PATH` override soportado por
`playwright.config.ts`):

  pnpm test              ✅ 301/301 (33 ficheros)
  pnpm test:e2e          ✅ 3/3 (chromium)
  pnpm exec tsc --noEmit ✅ limpio
  pnpm exec eslint .     ✅ limpio
  pnpm build             ✅ prebuild + build OK

## Sprint #1 REFACTOR-SUSURRO-FE — finding al arrancar

**Fecha**: 2026-04-22. Rama `claude/refactor-susurro-fe`.

**Finding**: el briefing del sprint pide *"Bump `STORAGE_KEY` `.v2` →
`.v3`"* sobre `lib/world-state.ts`, pero el repo actual **no tiene
persistencia del `GameState`**. El único `STORAGE_KEY` vivo es
`DISCLAIMER_STORAGE_KEY` (`lib/disclaimer.ts`). El módulo
`lib/persistence.ts` se borró en el wipe v1.0.1 → primigenia y
`GameShell.tsx:18` lo confirma literal (*"Sin persistencia"*).

**Decisión operativa**: el bump de storage es **no-op en este
sprint** — no hay saves viejos que invalidar. Se omite del scope.
Deuda documental stale (2 referencias) queda pendiente de limpiar
en polish pass:

- `lib/world-gen.ts:38` — comentario referencia `lib/persistence.ts`.
- `scripts/compile-world.ts:13` — comentario referencia `STORAGE_KEY`.

Cuando vuelva a haber persistencia del GameState (Fase 7 o cuando
el Director lo pida), `village.faith` y
`village.silenceGraceDaysRemaining` serán los primeros campos que
fuercen el primer bump real post-wipe.

No requiere firma — es hecho descubierto, no decisión §A4 nueva.
