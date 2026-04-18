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

### Sprint 10 — IA dioses rivales (✅)

- `lib/rival-ai.ts`: `decideRivalActions(state)` puro, determinista.
  Cada rival decide solo cada `RIVAL_DECISION_INTERVAL=500` días
  (respeta anti-presión Pillar 4). Perfiles: passive (25% act),
  aggressive (80% + x5 peso por ambición), opportunistic (55% + x3).
- Evento `rival_anoint { rival_group_id, npc_id }`: añade NPC al
  `chosen_ones` del rival + emite crónica.
- Evento `rival_decision_tick`: marca `last_decision_day` incluso si
  decidió no actuar (sino re-evaluaría cada tick tras el intervalo).
- Evento `rival_faith_gained`: Pase 6.5 del scheduler suma Fe pasiva
  por elegidos+descendientes del grupo rival (simétrico al player).
- `RivalGod` gana `last_decision_day`. Saves v3 ya invalidaban; no
  bump adicional.
- UI: `RivalPanel` lateral muestra nombre, perfil, mortales vivos,
  elegidos del rival, Fe. Elegidos rivales aparecen en el mapa con
  anillo discontinuo rojizo (`data-rival-chosen`).

**Resultado**: 207 unit+integration + 21 E2E verdes. Sprint 10 shipped.
