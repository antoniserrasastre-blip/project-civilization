# Notas nocturnas — sesión overnight Sprints 9→13

Claude Code ha trabajado solo durante la noche ejecutando el ROADMAP
de `v0.3` → `v1.0`. Este documento registra decisiones no triviales,
blockers encontrados, y acciones pendientes por parte del Director
Creativo al despertar.

**Regla general durante la sesión**: flag + seguir. Nada se commitea
roto. Todo en la rama `claude/update-claude-md-mPM1k`.

## Acción requerida (leer primero)

- **Revocar la API key de Anthropic que se pegó en el chat** antes de
  seguir usando cualquier tool que la toque. Está en logs de sesión.
  `https://console.anthropic.com/settings/keys`

## Bitácora por sprint

### Sprint 9 — Group selector + multi-grupo (✅)

- `lib/world-state.ts`: expone `GROUPS` (3 pueblos baleares con centros
  y colores), `DEFAULT_GROUP_ID`. `initialState` acepta `playerGroupId`;
  en modo multi-grupo reparte 12 NPCs por grupo con clustering territorial
  ±9u del centro, y puebla `rival_gods` para los otros 2 con `profile:
  'passive'`. Compat v0.1: sin `playerGroupId` sigue dando 50 NPCs en
  Tramuntana.
- `lib/persistence.ts`: bump a `godgame.state.v3` para invalidar saves
  sin `rival_gods` poblados.
- `components/map-view.tsx`: color por grupo (azul/rojo/verde) en vez
  de negro uniforme para mortales no-elegidos.
- `app/page.tsx`: nuevo `GroupSelectorOverlay` al arrancar si no hay
  snapshot. Reset también reabre selector. `tutorial-skip` ahora tiene
  ids diferenciados (`tutorial-skip-intro` y `tutorial-skip-banner`)
  para evitar strict-mode violation.
- `tests/e2e/helpers.ts`: helper compartido `goHomeFresh` que despacha
  selector + tutorial por defecto. `{ keepTutorial: true }` para
  tutorial-flow.
- `playwright.config.ts`: `workers: 1` + `retries: 1` para estabilidad
  con shared dev server.

**Resultado**: 200 unit+integration + 20 E2E verdes. v0.3 Sprint 9
shipped. Sprints 10-13 por delante.
