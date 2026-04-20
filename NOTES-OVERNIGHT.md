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

**Reintento 2026-04-20 (ingeniero overnight)**: sigue bloqueado.
Ahora el 403 viene de `cdn.playwright.dev`
(`https://cdn.playwright.dev/builds/cft/147.0.7727.15/linux64/chrome-linux64.zip`
→ "Host not in allowlist"). Misma categoría de bloqueo. No insisto;
entregable queda pendiente de entorno humano con red.

---

> [Director] 2026-04-20: brief overnight para el ingeniero
>
> Gate local corrido hoy en `claude/review-repo-status-3rHDy`:
>
> - `pnpm exec tsc --noEmit` ✅ (exit 0)
> - `pnpm exec eslint .` ✅ (exit 0)
> - `pnpm test` ✅ **301/301** en 33 ficheros (5.16s)
> - `pnpm lint:assets` ✅ 6 assets validados
> - `pnpm build` ✅ 7.3s, `/` 15.6 kB + 101 kB shared
> - `pnpm test:e2e` ⚠️ bloqueado (Playwright Chromium sin red — flag histórico)
>
> **Contexto**: Fases 1-6 primigenia están commiteadas (hasta
> `777ea96` merge del PR #1). Pero el cierre ritual de v1-primigenia
> NO está hecho: `ROADMAP.md` tiene **0 marcas ✅**, no existen
> `VERSION-LOG-fase-N.md`, ni se ha redactado polish pass. La
> `archive/v1.0.1` preserva el estado previo.
>
> **Prioridad overnight** (ordenada por ROI, ataca de arriba abajo;
> no inviertas el orden, no te saltes nada; si te quedas sin tiempo,
> corta en la tarea donde estés y deja nota en bloque
> `wip: <tarea>` con commit parcial):
>
> **1. Marcar ✅ los 30 sprints en `ROADMAP.md`** (tuyo).
>
> Regla: una ✅ por sprint solo si existe commit en `git log` cuyo
> mensaje empieza por `sprint N.M:`. Formato sugerido: añadir ✅ al
> final de la cabecera `### Sprint N.M — <título>`. Si algún sprint
> no tiene commit correspondiente (no debería, pero comprueba),
> **no inventes la marca** — deja nota aquí abajo y para.
>
> **2. Actualizar `README.md`** (compartido, coordina conmigo en
> conversación si rompes la voz editorial).
>
> Hoy dice literalmente "Sprint 1.1-1.2 cerrado". Desfase grande
> respecto a la realidad (Fase 6 cerrada). Reescribe la sección
> "Estado actual" en ≤ 10 líneas: Fases 1-6 completas, loop
> primigenia end-to-end (drafting → cinemática tribal), bloqueos
> pendientes conocidos (Playwright + assets CC0). NO menciones
> v1.0.1 en la cabecera (sigue archivada); mantén el bloque
> histórico de archivo pero mueve "estado actual" a primigenia-end.
>
> **3. Polish & Debug pass sobre `lib/`** (tuyo).
>
> - Revisa cada módulo por `TODO`/`FIXME`/`any` injustificado.
>   Hoy solo detecté `any` en `next.config.ts` (infra, OK) y dos
>   `eslint-disable-next-line` legítimos en `hooks/use-mobile.ts`
>   y `components/map/MapView.tsx`. Confirma que siguen siendo
>   los únicos y que cada uno tiene el motivo claro al lado.
> - Lista de módulos: `prng`, `world-state`, `world-gen`, `npcs`,
>   `drafting`, `disclaimer`, `resources`, `fog`, `pathfinding`,
>   `needs`, `harvest`, `inheritance`, `relations`, `crafting`,
>   `nights`, `simulation`, `messages`, `interpret`, `gratitude`,
>   `miracles`, `monument`, `structures`, `village-blessings`,
>   `village`, `chronicle`, `game-state`. Pasada visual de
>   coherencia §A4 (pureza, determinismo, round-trip JSON) sobre
>   cada uno; si detectas algún lugar donde se cuela
>   `Math.random`, `Date.now`, `crypto.randomUUID` o una mutación
>   de input, **PARA** y abre decisión en
>   `DECISIONS-PENDING-primigenia.md` con bloque numerado #33+.
>
> **4. Test anti-regresión de determinismo extremo** (tuyo, si no
> existe ya).
>
> `tests/integration/autonomous-building.test.ts` ya prueba 20k
> ticks construyendo los 5 crafteables. Comprueba que ancla SHA-256
> del estado final para que cualquier cambio futuro de `tick` lo
> rompa explícitamente. Si NO ancla hash, añade un `expect` con el
> hash actual. Commit aparte `test: anclar sha de 20k-tick
> autonomous build` para que la regresión sea trazable.
>
> **5. Reintentar Playwright** (barato, si sigue bloqueado lo
> descartamos).
>
> `pnpm exec playwright install chromium`. Si **sigue** 403
> contra `playwright.azureedge.net`, no insistas — deja nota con
> fecha ("reintentado 2026-04-20, sigue bloqueado"). Si **pasa**,
> corre `pnpm test:e2e` y reporta resultado de los 3 tests de
> `map-view.spec.ts`. Si alguno falla, **no lo arregles overnight**
> — abre flag en `DECISIONS-PENDING-primigenia.md` (#33+) con
> diagnóstico y para. Los bugs latentes de MapView van con ojo
> humano delante.
>
> **6. Scaffold `tests/design/`** (tuyo, DEUDA para cierre v1).
>
> CLAUDE.md §"Suite de coherencia de diseño" exige esa carpeta al
> cerrar versión mayor. Hoy NO existe. Crea
> `tests/design/coherence.test.ts` con **solo los 10 `describe`
> cabecera + un `it.todo` por dominio** (economía de fe → leer
> gratitud en primigenia · población · ciclo de vida · determinismo
> extremo · dones/milagros · rival diferido · veredicto/bendición
> aldea · crónica · UI · edge cases). **No implementes los tests
> todavía** — el redactado real lo hacemos juntos tras el playtest.
> Añade script `pnpm test:design` al `package.json`. Objetivo:
> que el hueco quede visible en el gate del próximo cierre.
>
> **7. Preparar materia prima para VERSION-LOGs** (insumo para mí,
> NO los escribas tú).
>
> Los `VERSION-LOG-fase-1.md` ... `VERSION-LOG-fase-6.md` son MIOS
> (ownership §CLAUDEDIRECTOR.md) y los redacto yo con perspectiva
> del jugador tras el playtest del Director humano. Pero necesito
> datos técnicos que solo tú tienes. Deja al final de este fichero
> un bloque `## Insumos para VERSION-LOGs` con **una tabla** por
> Fase:
>
> | Fase | Commit sha de cierre | Entregable técnico 1-frase | Balance numérico relevante |
> |-|-|-|-|
> | 1 | `xxxxxxx` | ... | — |
> | ... | ... | ... | ... |
>
> El "balance numérico" solo aplica a Fases que introduzcan
> números (2: drafting pt; 4: costes crafteables / regen; 5:
> gratitud ceiling / costes milagros; 6: coste monumento). En
> Fases 1 y 3 pon `—`.
>
> ---
>
> **Qué NO hagas overnight** (regla dura):
>
> - **NO** abras ni planifiques Fase 7. Rival diferido por diseño
>   (vision-primigenia §2, §8). Cualquier "y si empezamos a dejar
>   hooks para el rival" = scope creep, para.
> - **NO** escribas los `VERSION-LOG-fase-N.md`. Son míos, los
>   redacto tras playtest humano.
> - **NO** toques `vision-primigenia.md` ni
>   `DECISIONS-PENDING-primigenia.md` para añadir decisiones
>   nuevas sin preguntarme; solo añade bloques #33+ si detectas
>   bug estructural §A4 que requiere firma.
> - **NO** mergees a `main` este branch. Trabaja en
>   `claude/review-repo-status-3rHDy`, yo revisaré por la mañana
>   antes de decidir merge o rebase.
> - **NO** hagas `git push --force` ni borres ramas `archive/*`.
> - **NO** añadas mecánica nueva al juego (nada de nuevos milagros,
>   recetas, tonalidades, rasgos). Polish ≠ features.
>
> ---
>
> **Commits esperados overnight** (un commit por bloque, no uno
> gigante):
>
> 1. `docs(roadmap): marcar ✅ sprints 1.1-6.4 cerrados`
> 2. `docs(readme): estado actual → Fase 6 cerrada`
> 3. `polish: revisión §A4 sobre lib/ (sin cambios funcionales)` o
>    commits específicos por módulo si encuentras algo real
> 4. `test: anclar sha en autonomous-building` (si no está)
> 5. `test(design): scaffold tests/design con 10 describes todo`
> 6. `docs(notes): insumos técnicos para VERSION-LOGs`
>
> Cada commit debe pasar el gate local completo antes de
> crearse. Si un commit rompe el gate, **rebobina** con
> `git checkout -- <file>` o `git reset HEAD~1 --soft` y re-ataca
> en batch más pequeño (CLAUDE.md §5 thresholds duros).
>
> Buenas noches. Cuando vuelva reviso, redacto los VERSION-LOGs
> y planeamos el playtest del loop completo.

---

## Insumos para VERSION-LOGs (redacción del Director)

> Material técnico para `VERSION-LOG-fase-1.md` ... `fase-6.md`.
> Preparado por el ingeniero la madrugada 2026-04-20. El Director
> redacta los logs con perspectiva de jugador tras playtest.
> Fases 1 y 3 no introducen números de balance (infraestructura y
> movimiento respectivamente) — columna `—`.

| Fase | Commit sha de cierre | Entregable técnico 1-frase | Balance numérico relevante |
|-|-|-|-|
| 1 | `b9f0b0c` | Mundo determinista 512×512 renderizado con pan + zoom; assets CC0 propios; lint de registro de assets. | — |
| 2 | `6378dd8` | Drafting de clan (4 Elegidos + 10 Ciudadanos en 4 tiers) sobre mapa con recursos y fog-of-war seedable. | `CHOSEN_SLOTS=4`, `CHOSEN_BUDGET=10 pt`, `TIER_CANDIDATE_COUNT=10`. |
| 3 | `90f66c9` | Tick integrado con A* 4-conexo, necesidades y decisión de destino; crónica partisana inicial. | — |
| 4 | `dfa4bbc` | Economía: recolección → inventario → crafting de 5 recetas umbral + grafo de relaciones + fogata permanente + 10 noches. Clan de 14 NPCs construye los 5 crafteables en <20k ticks en mundo rico. | `TICKS_PER_DAY=24`; regen: wood 60d / berry 45d / game 100d / stone nunca / water-fish continuous; recetas (wood/stone/game, daysWork, minSkill): REFUGIO 15/8/3, 5d, 10 · FOGATA 5/15/0, 3d, 5 · PIEL 0/0/2, 2d, 10 · HERRAMIENTA 2/5/0, 2d, 15 · DESPENSA 10/6/0, 4d, 10. |
| 5 | `21c612f` | Modal diario (6 intenciones) con pausa determinista, motor de interpretación emergente por NPC, pool de gratitud del clan y 5 milagros con coste. | `GRATITUDE_CEILING=200`, `MAX_TRAITS_PER_NPC=3`; costes de milagros: 30 / 40 / 50 / 60 / 80 gratitud. |
| 6 | `76ada22` | Desbloqueo del monumento (3 condiciones), construcción con progreso acumulativo + ruina si abandonada, selección de bendición de aldea y cinemática de transición a placeholder tribal. | `MONUMENT_COST={stone:200, wood:50, daysWork:60}` → `BUILD_TICK_HOURS=1440`; `MIN_CONSECUTIVE_NIGHTS=10`; `MIN_WORKERS=3`. |

### Estado del gate local (2026-04-20 ingeniero, post-overnight)

- Commits overnight en orden:
  1. `docs(roadmap): marcar ✅ sprints 1.1-6.4 cerrados`
  2. `docs(readme): estado actual → Fase 6 cerrada`
  3. `polish: documentar eslint-disable legítimos en hooks/ y MapView`
  4. `test: anclar sha de 20k-tick autonomous build` — SHA anclado:
     `6fd15afa42b854984a13cfcc76f866b9acf753a045073a6660fd1eec52069bb0`
  5. `test(design): scaffold tests/design con 10 describes todo` —
     28 `it.todo` en 10 `describe`.
  6. `docs(notes): insumos técnicos para VERSION-LOGs` (este commit).

- Polish §A4: sin hallazgos estructurales. Cero `Math.random`,
  `Date.now`, `crypto.randomUUID` en `lib/`. Cero `any`
  injustificado. Cero `TODO`/`FIXME`. Los 2 `eslint-disable`
  previos (hooks/use-mobile.ts, components/map/MapView.tsx) ahora
  llevan comentario explicativo del *why*.

- Playwright: reintento fallido (ver bloqueo Sprint 1.5 arriba,
  nota fechada 2026-04-20).
