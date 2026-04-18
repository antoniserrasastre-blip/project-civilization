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

### Sprint 11 — cross-group + maldiciones (✅)

- Scheduler Pase 3 (pairing): ahora admite cross-group. Pool ponderado
  con factor `CROSS_GROUP_PAIRING_FACTOR=0.25` (same-group pesa 4×
  cross). El intermatrimonio emerge raro pero posible.
- Deriva dinástica: el flag `descends_from_chosen` ya se propagaba
  hereditariamente sin checks de grupo. Un descendiente del Elegido
  del jugador que vive en grupo rival sigue generando Fe al jugador
  (dinastía sagrada infiltrando fronteras — ver Pase 6).
- `lib/curses.ts`: 3 niveles (simple 20 Fe, strong 50 Fe, fatal 150 Fe).
  `curseNpc` es puro y no toca PRNG. Rechaza `own_group` y Fe
  insuficiente. `curse_fatal` mata + rompe vínculos.
- UI: `CharacterCardOverlay` ahora recibe `isPlayerGroup` y si es
  rival + vivo muestra panel de maldiciones con 3 botones.

**Resultado**: 216 unit+integration + 23 E2E verdes. v0.3 sprints
9-11 completos. Toca Polish & Debug v0.3 antes de v0.4 (Sprint 12).

### Polish & Debug v0.3 (✅)

- **Crónicas de pairings cross-grupo**: ahora los matrimonios entre
  grupos emiten una entrada dramática (partisana) — las mismas dentro
  de un grupo siguen silenciosas para no saturar.
- **Extinción**: `decideRivalActions` ignora rivales cuyo grupo no
  tiene ya ningún mortal vivo — evita que un dios sin pueblo siga
  "decidiendo" sobre el vacío.
- **Docstring de world-state.ts** actualizado a v0.3.
- **Flakes E2E estabilizados**: waitFor explícito en `verdict-flow`
  y `group-selector.spec.ts` reset. 22/22 E2E limpios (1 flaky
  auto-reintentado resuelto).

v0.3 consolidado. Listo para empezar v0.4 (Sprint 12 — LLM chronicle).

### Sprint 12 — provider layer de la crónica (✅)

Clave de diseño: **el estado no cambia**. Los `ChronicleEntry` siguen
siendo deterministas emitidos por las plantillas de `chronicle.ts`. El
provider solo transforma EN RENDER. Swap del provider no rompe
determinismo ni replays.

- `lib/chronicle-provider.ts`: interfaz + 3 providers.
  - `templateProvider`: identidad.
  - `mockLLMProvider`: prepende fórmulas partisanas preescritas
    (determinista en función del día).
  - `claudeProvider`: **scaffold disabled**. Requiere:
    1. Crear `.env.local` con `ANTHROPIC_API_KEY=sk-...`.
    2. Añadir route handler `app/api/chronicle/enhance/route.ts`
       que haga el fetch server-side y devuelva JSON.
    3. En `claudeProvider.enhance` hacer fetch a ese endpoint.
    4. Poner `claudeProvider.enabled = true`.
- UI: `ChroniclePanel` añade `<select>` con los 3 providers y
  re-renderiza asincrónicamente (cache-barrier básico via
  `useEffect`+`cancelled` flag).

**BLOCKER ACTIVO**: para activar Claude real, el usuario debe cablear
el endpoint y configurar la env var. He dejado el provider scaffolded
y el selector enumera las 3 opciones. La opción `claude` cae al texto
plantilla hasta que el endpoint responda. Ver checklist arriba.

**Resultado**: 225 unit+integration + 24 E2E verdes. Sprint 12 shipped.

### Polish & Debug v0.4 (✅)

- `app/api/chronicle/enhance/route.ts`: endpoint stub que devuelve 501
  hasta que `ANTHROPIC_API_KEY` esté configurado. Así `claudeProvider`
  tiene un destino real para fetch — cuando caiga 501 cae silencioso
  al texto plantilla.
- `claudeProvider.enhance` ahora hace `fetch('/api/chronicle/enhance')`
  con body JSON. Sigue enabled=false hasta que el usuario configure
  la key Y active explícitamente.
- Persistencia de preferencia: `chronicleProviderId` se guarda en
  `localStorage` bajo `godgame.chronicle-provider` — persiste el
  selector entre recargas sin contaminar el state del mundo.
- Fix React 19: `setRendered` inicial sacado del cuerpo del effect
  (ESLint `react-hooks/set-state-in-effect`). Uso `entriesRef`.

**Resultado**: 225 unit+integration + 24 E2E verdes. v0.4 consolidado.
Listo para Sprint 13 (v1.0 export & share).

### Sprint 13 — export HTML + share seed + URL boot (✅)

- `lib/export.ts` gana `exportCodexHtml(state)` — devuelve HTML
  standalone con CSS inline, tipografía serif, pergamino. Sin deps
  externas (PDF cae fuera de scope de v1.0; podría añadirse post).
  `shareUrl(state, base)` construye `?seed=X&group=Y`.
- `app/page.tsx` lee `?seed=&group=` al boot si no hay snapshot. Así
  las URLs compartidas recrean mundos idénticos sin configuración.
- UI: ChroniclePanel añade botones `.txt`, `.html`, "Compartir" al
  lado del selector de provider.
- Escape HTML defensivo en `exportCodexHtml` (tests cubren XSS básico).

**Resultado**: 230 unit+integration + 26 E2E verdes. v1.0 feature-
complete single-player game shipped.

### Polish & Debug v1.0 (✅)

- VERSION-LOG-v0.1…v0.4 + v1.0 creados retroactivos.
- CLAUDE.md: sección "Sesiones autónomas" reescrita con:
  - TDD estricto explícito (sin excepción por velocidad).
  - VERSION-LOG-vX.Y.md OBLIGATORIO al cerrar versión mayor.
  - Polish & Debug pass NO arranca sprint siguiente si balance roto.
  - Perspectiva de jugador + análisis de balance específico a
    economía en cada VERSION-LOG.
- Sin cambios de código ni balance — polish de documentación.

---

## Rama `claude/v2-roadmap` — Post-v1.0

### Sprints 14-17 (v1.3 contenido) (✅)

Rama provisional sin mergear a `claude/update-claude-md-mPM1k` hasta
que el Director valide. Ver `ROADMAP-v2.md`.

- **Sprint 14** (clásica pool): escritura cursiva, rueda, ejército
  regular. Test cadena completa.
- **Sprint 15** (`lib/army.ts`): ejércitos abstractos como entero
  `floor(Σ fuerza_adultos / 10)`. `resolveGroupBattle` con
  strategistBoost. NO cableado aún al scheduler (flag).
- **Sprint 16** (medieval pool): feudalismo, caballería, castillo.
- **Sprint 17** (industrial pool): vapor, imprenta, nacionalismo.
  Atómica queda con placeholder `fision_nuclear` para permitir la
  transición; el dilema es decisión de diseño pendiente.

**Resultado**: 252 unit+integration + 26 E2E verdes. v1.3 en rama.
