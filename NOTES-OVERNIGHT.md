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
