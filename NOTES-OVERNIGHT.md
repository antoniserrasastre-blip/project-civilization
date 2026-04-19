# Notas nocturnas — bootstrap Edad Primigenia

Bitácora técnica del ingeniero ejecutor tras la edición del 2026-04-19
que reemplaza la edad temprana (v1.0.1) por la edad primigenia. El log
histórico de v0.x → v1.0.1 vive en `claude/v1.0.1-archivada`.

## Tarea 1 — Archivo de v1.0.1 y wipe del scaffolding

**Commit base archivado**: `b1cfc26` (tip de `origin/main` previo al
wipe, contiene v1.0.1 + v1.2 map baleares + `CLAUDEDIRECTOR.md` +
hacks de eficiencia).

- Rama `claude/v1.0.1-archivada` creada en ese commit y pusheada al
  remoto ✅.
- Tag local `v1.0.1-archive` creado sobre el mismo commit ✅.
- **Push del tag**: bloqueado por el servidor git con HTTP 403
  persistente (4 intentos con backoff). La rama archivada
  (`claude/v1.0.1-archivada`) preserva el mismo SHA, así que la
  recuperación histórica sigue garantizada sin el tag. **Acción
  sugerida al Director humano**: pushear manualmente el tag desde
  entorno con permisos (`git push origin v1.0.1-archive`) o dejar
  la rama como único pin.

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
- Docs archivadas: `ROADMAP.md`, `DECISIONS-PENDING.md`,
  `PLAYTEST-REPORT.md`, `REPORT.md`, `VERSION-LOG-v0.{1,2,3,4}.md`,
  `VERSION-LOG-v1.0.md`, `VERSION-LOG-v1.0.1.md`. Todas recuperables
  en `claude/v1.0.1-archivada`.

## Blockers y acciones requeridas al Director humano

1. **Tag `v1.0.1-archive`**: push manual si se quiere referencia
   versionada (opcional — rama archivada ya cubre el requisito).
2. **Primigenia docs**: los documentos llegaron desde una rama
   editorial (`claude/read-claudedirector-a3VyQ`). Merge a `main` de
   la rama editorial pendiente de decisión del Director humano;
   mientras tanto viven copiados en `claude/primigenia-bootstrap-nGvO9`.
