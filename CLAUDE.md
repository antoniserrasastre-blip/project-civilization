# CLAUDE.md

Instrucciones para los **cuatro roles especializados** que trabajan sobre
este repo (Ingeniería/Producción, Diseño, Edición, Director Creativo —
ver sección "Agentes especializados" más abajo). Ejecutan
`SPRINTS.md` (queue táctica) +
`ROADMAP.md` (mapa estratégico) bajo TDD estricto y
respetando los contratos del núcleo.

## Identidad del proyecto

GODGAME (nombre interno) / Proyecto Civilización (nombre público). Motor
determinista de simulación de civilizaciones. El jugador es un dios
observador sobre los **Hijos de Tramuntana** en un archipiélago
balear-ficticio.

Fuentes de verdad, por orden de prioridad:

1. **`SPRINTS.md`** (táctico) + **`ROADMAP.md`**
   (estratégico) — qué sprint toca y en qué orden.
2. **`../vision-godgame.md`** (fuera del repo, en `GODGAME/`) — contrato
   de diseño. Los comentarios del código referencian secciones como §A1,
   §A4, §A5, o Pilares 1-5. Cuando veas una de esas referencias, asume
   que es una constraint de diseño no negociable extraída de ahí.
3. **Tests existentes en `tests/`** — el comportamiento documentado. Si
   un cambio los rompe, o bien los tests están mal o el cambio está mal;
   decide cuál antes de borrar assertions.

## Contratos duros (§A4 — no negociables)

Todo módulo bajo `lib/` cumple tres invariantes:

1. **Pureza** — recibe estado, devuelve estado nuevo. Sin side effects,
   sin mutación del input.
2. **Determinismo** — mismo input → mismo output, byte a byte. Toda
   aleatoriedad pasa por `state.prng_cursor`. Nunca uses `Math.random()`,
   `Date.now()`, ni nada no-seedable dentro de `lib/`.
3. **Round-trip JSON** — `JSON.parse(JSON.stringify(state))` debe ser
   estructuralmente idéntico al estado original. Sin clases, sin
   referencias circulares, sin `undefined` en campos, sin funciones.

Si un test de determinismo falla, **no se mergea hasta arreglarlo**. No
es un flake: es un bug de correctitud.

## Agentes especializados

Tres roles. Cada agente que trabaja aquí opera dentro de **uno** y no
cruza de rol en el mismo PR. Los tres respetan los contratos §A4 sin
excepción — §A4 está por encima de cualquier conveniencia de rol.

### 1. Ingeniería / Producción

**Responsabilidad**: el núcleo técnico. Motor determinista, lógica de
simulación, persistencia, tests. Todo lo que el jugador no ve pero hace
que el juego corra y sea reproducible.

**Puede tocar**:
- `lib/**` — núcleo puro bajo contrato §A4. Territorio exclusivo.
- `tests/unit/**`, `tests/integration/**`, `tests/design/**`.
- Configs técnicas: `next.config.ts`, `vitest.config.ts`,
  `playwright.config.ts`, `tsconfig.json`, `eslint.config.mjs`,
  `postcss.config.mjs`, `package.json` (scripts, deps).
- `scripts/**`, `hooks/**` (los hooks de repo, no componentes React).
- Docs de sprint: `ROADMAP*.md`, `SPRINTS*.md`, `NOTES-OVERNIGHT.md`,
  `VERSION-LOG-*.md`.
- Constantes de balance en `lib/*`. Diseño puede **pedir** ajustes
  con rationale de feel; la ejecución (y la validación vía
  `tests/design/`) es de Ingeniería.

**Necesita handoff con Diseño antes de tocar**:
- `components/**` o `app/**` salvo para añadir `data-testid` ya
  acordados o cablear un hook nuevo a un componente existente
  sin alterar markup/estilo.
- Copy visible al jugador fuera de `lib/chronicle.ts` (la voz
  partisana sí es territorio de Ingeniería/Edición — ver §9 de la
  visión).

**Necesita handoff con Edición antes de tocar**:
- Renombrado de APIs públicas de `lib/*` motivado por legibilidad,
  no por corrección (si el rename arregla un bug, es de Ingeniería
  sin consulta).
- Reescritura de comentarios/docstrings largos.

**Método**: TDD estricto (ver sección "Metodología" más abajo). Red →
Green → Refactor, gate completo antes de commit. Nunca se salta el
Red "porque el cambio es pequeño".

### 2. Diseño

**Responsabilidad**: UI/UX, identidad visual, experiencia del jugador
momento a momento. Traduce Pilares 1-5 a decisiones visibles y a ritmo
jugable. Propone ajustes de balance con rationale de feel; no los
implementa en `lib/`.

**Puede tocar**:
- `app/**` — layout, páginas, estructura del dashboard. Siempre que
  **no** añada lógica de dominio (la orquestación del estado vive
  en `lib/`, los componentes sólo la consumen vía props/hooks).
- `components/**` (features) y `components/ui/**` (primitives shadcn).
- Estilos Tailwind, tokens, utility classes, `components.json`.
- `assets/**`.
- `docs/**` cuando documente decisiones visuales, tokens, o
  experiencia (moodboards, specs de interacción).
- `tests/e2e/**` para cubrir flujos jugables nuevos que introduce.
  Los `data-testid` los define Diseño — son contrato con Ingeniería
  y Edición.

**NO puede tocar** (hard stop):
- `lib/**`. Nunca. Si una feature de UI necesita nueva lógica de
  dominio, Diseño abre issue/handoff `[design→eng]` con el contrato
  deseado; Ingeniería implementa bajo §A4 y Diseño integra.
- `tests/unit/**`, `tests/integration/**`, `tests/design/**`.
- Configs de build/test runners, constantes numéricas de balance.
- `vision-*.md` — son del Director Creativo.

**Método**: maquetar con datos mock primero, luego conectar a `lib/`
vía props/hooks existentes. Si el hook que necesitas no existe, **no
lo creas** — abre handoff a Ingeniería.

### 3. Edición

**Responsabilidad**: saneamiento técnico transversal. Typos,
lints, imports huérfanos, warnings, inconsistencias de
nomenclatura técnica, drift obvio entre docstrings y firmas.
**No es revisión editorial** — esa pertenece al Director Creativo
(§4). Edición es el ojo que limpia; Director es el ojo que firma.

**Puede tocar (con cuidado quirúrgico)**:
- Cualquier fichero — pero sólo para: typos, lint/warnings, imports
  huérfanos, null-checks obvios, claridad de comentarios,
  consistencia de nomenclatura.
- Docs de raíz (`README.md`, `ROADMAP*.md`, `VERSION-LOG-*.md`,
  `NOTES-OVERNIGHT.md`, `REVIEW-*.md`) para corregir redacción o
  formato — nunca para introducir decisiones de diseño nuevas.
- `tests/**` sólo para arreglar flakes evidentes o descripciones
  (`it("...")` / `describe("...")`) mal redactadas. Cambios de
  aserción son de Ingeniería.

**NO puede tocar**:
- Lógica de `lib/` que modifique comportamiento observable, aunque
  "parezca más limpio". Si un refactor cambia un solo tick en un
  solo escenario, es cambio de Ingeniería.
- Estilos visuales, paleta, componentes de UI por criterio estético.
  Es territorio de Diseño.
- `vision-*.md` ni docs del Director Creativo (`CLAUDEDIRECTOR.md`,
  `DECISIONS-PENDING-*.md`). Puede sugerir en comentarios de PR;
  nunca reescribe sin OK humano explícito.

**Método**: PRs pequeños y quirúrgicos. Un PR de Edición nunca mezcla
fix de lint con reescritura de sección de docs. Cuando dude entre
"esto es un bug" y "esto es ruido estético", abre handoff (ver abajo)
en lugar de arreglarlo.

**Relación con Director Creativo**: Edición no corrige prosa de
`vision-*.md`, `DECISIONS-*.md`, `REVIEW-*.md` ni docs de firma.
Si ve un typo en uno de esos, abre handoff `[edit→director]`.

### 4. Director Creativo

**Responsabilidad**: guardián de la visión. Firma decisiones §A4
irreversibles. Redacta DRAFTs editoriales para firma humana. Audita
PRs de los otros tres roles desde la perspectiva "¿esto cumple la
visión firmada?". Protocolo completo en `CLAUDEDIRECTOR.md` — este
punto es resumen, no contrato.

**Puede tocar**:
- `vision-*.md`, `CLAUDEDIRECTOR.md`, `DECISIONS-PENDING-*.md`,
  `REVIEW-*.md`, `DRAFT-*.md`, bloques `> [Director]:` en
  `NOTES-OVERNIGHT.md`.
- `ROADMAP-*.md` y `SPRINTS-*.md` cuando hay firma que actualizar
  (adendas, cambios de orden, nuevas decisiones §A4).
- Commits al `CLAUDE.md` y `CONVENTIONS.md` cuando afectan
  contrato editorial (no cuando afectan código).

**NO puede tocar**:
- `lib/**`, `components/**`, `tests/**`. Cero. Si el Director detecta
  bug o regresión, abre handoff `[director→eng]` — no parchea.
- Assets o tokens visuales (territorio de Diseño).

**Método**: hold-the-line editorial. Bloquea merges que contradigan
la visión o que introduzcan contratos §A4 sin firma. No escribe
código.

### Reglas anti-conflicto entre roles

1. **Un PR, un rol.** Scope de un solo agente. Si Ingeniería ve una
   oportunidad de polish visual, abre handoff a Diseño — no lo toca.
   Si Diseño detecta un bug de lógica, handoff a Ingeniería.
2. **Zonas compartidas** (ambigüedad de territorio):
   - `tests/e2e/**` — lo escribe **quien introduce la feature**
     (Diseño para flujos visuales, Ingeniería para flujos técnicos
     tipo persistencia/PRNG). Edición sólo ajusta flakes y
     redacción de descripciones.
   - `docs/**` — abierto a los tres; prevalece el rol del autor
     original del documento.
   - `package.json` — deps técnicas son de Ingeniería; deps de UI
     (primitives shadcn, iconos) las pide Diseño a Ingeniería vía
     handoff para que valide que no rompen el build.
3. **§A4 prevalece sobre cualquier rol.** Si un cambio de Diseño o
   Edición requiere romper pureza/determinismo/round-trip JSON del
   núcleo, se rechaza. La UI y la prosa se adaptan al motor, no al
   revés.
4. **Handoffs explícitos.** Cuando un agente necesita trabajo de
   otro, se documenta en el PR o issue con prefijo:
   - `[design→eng]` — Diseño pide a Ingeniería un hook, dato, API.
   - `[eng→design]` — Ingeniería expone mecánica nueva y pide
     decisión visual.
   - `[edit→eng]` / `[edit→design]` — Edición señala algo para
     decisión del rol competente.
   Handoffs sin resolver bloquean el merge del PR que los introduce.
5. **Revisión cruzada obligatoria.** Todo PR se revisa por un rol
   **distinto** al del autor antes de mergear. Diseño no aprueba
   Diseño; Ingeniería no aprueba Ingeniería. Edición puede revisar
   a los otros dos y ser revisada por cualquiera de ellos. El
   criterio "rol distinto" es sobre la etiqueta del rol, no sobre
   quién lo encarne (humano o Claude).
6. **Fast-path de Edición**: cambios triviales (typos, lint
   auto-fix, imports huérfanos) con diff < 20 líneas y sin cambiar
   lógica observable pueden mergear con review de cualquier otro
   agente. Cualquier cambio de Edición con diff mayor entra por el
   flujo normal de revisión cruzada.

### Extensión multi-agente — slots diferidos

Cuando aparezca un segundo agente con scope persistente distinto
(p.ej. `balancer` tuneando constantes, `narrador` curando crónica
LLM-generada), se crea `agents/<nombre>/` con su propio `CLAUDE.md`
hijo del raíz. Hasta que exista el primero, esas carpetas **no**
se pre-crean. Código común entre agentes vive en `shared/` cuando
haya al menos dos consumidores — mientras tanto, no existe.
Docs transversales de workflow van a `docs/` cuando haya al menos
uno — mientras, viven en la raíz.

Este repo sigue siendo **monorepo**; lo que cambia con agentes
nuevos es dónde cuelgan los subárboles, no la raíz.

## Metodología: TDD estricto

Todo sprint del roadmap se ejecuta así:

### 1. Red — tests primero

Antes de escribir una línea de producción, escribe los tests que capturan
el contrato del sprint:

- **Unit tests** (`tests/unit/`) para cada función pura nueva. Cubrir
  happy path + sad paths + invariantes (determinismo, round-trip JSON).
- **Integration tests** (`tests/integration/`) cuando el sprint conecta
  módulos existentes (p.ej. lifecycle + chronicle).
- **E2E tests** (`tests/e2e/`) cuando hay un flujo nuevo visible al
  jugador (click, toast, reload, persistencia).

Los tests deben fallar con un error que describa el gap. `pnpm test`
debe mostrar claramente "esto no existe aún".

### 2. Green — mínima implementación

Código justo suficiente para que pase. Nada de:

- Funcionalidad que los tests no exigen.
- Abstracciones especulativas "por si acaso".
- Sistemas de plugins, hooks, o configuración que no pide el sprint.

Si te aburre lo simple, es que lo estás haciendo bien.

### 3. Refactor — sólo con verde estable

Una vez todos los tests pasan, limpia. Mueve helpers, renombra, borra
duplicación. Tras cada refactor, `pnpm test` debe seguir en verde. Si un
refactor rompe tests, era parte de la API contractual, no ruido.

### 4. Gate antes de commit

Antes de commitear cualquier cambio no trivial:

```bash
pnpm test            # unit + integration (Vitest)
pnpm test:e2e        # Playwright — si tocaste UI o persistencia
pnpm exec tsc --noEmit   # tipos limpios
pnpm exec eslint .   # lint limpio
pnpm build           # Next.js build pasa
```

Todos verdes. Cualquier fallo → NO commit. Arréglalo primero.

## Reglas de ejecución de sprints

1. **Lee `SPRINTS.md` primero** para saber qué sprint toca y seguir su queue: meta, archivos a tocar, tests Red primero, criterio de cierre. `ROADMAP.md` es el mapa estratégico (fases + criterios globales de cierre); la queue táctica vive en `SPRINTS.md`. Ambos son fuente de verdad; ninguno contradice al otro.
2. **Lee las secciones relevantes de `../vision-godgame.md` y de
   `vision-primigenia.md`**. Los sprints referencian Pillars 1-5,
   anexos A1-A5 y §3.X de la visión primigenia (p.ej. §3.7 susurro
   persistente, §3.7b Fe como moneda, §3.8 gratitud y milagros).
3. **NO adelantes sprints**. Si el sprint activo trata susurro y Fe,
   no añadas ficha de aventurero (sprint siguiente) aunque "quede
   bien". El scope creep mata este proyecto — está advertido
   explícitamente en la queue.
4. **NO inviertas el orden canónico** de `SPRINTS.md` sin
   justificación técnica documentada en `NOTES-OVERNIGHT.md`. El orden
   está calibrado por dependencias y por feel de jugador.
5. **Al terminar un sprint**: actualizar la marca de estado en
   `SPRINTS.md` (si aplica), commitear con mensaje
   `sprint NOMBRE: <entregable>`, y abrir PR — no auto-merge durante
   primigenia salvo instrucción explícita del Director humano.
6. **Gate humano tras sprints críticos**: cuando `SPRINTS.md`
   marca un sprint como gate de playtest (p.ej. #1.5 PLAYTEST-SUSURRO),
   no arrancar el siguiente sprint sin que el humano firme. El gate
   no es opcional; es parte del camino crítico.

## Convenciones de código

Aprende el patrón leyendo un módulo existente antes de escribir uno
nuevo. Resumen:

- **Comentarios en castellano** (el proyecto es bilingüe; los docstrings
  largos son en castellano, los identificadores en inglés salvo nombres
  propios del dominio como `fuerza`, `ambicion`).
- **Nombres de NPCs**: pool catalano-balear (§9 de la visión). No
  "John Smith". Si añades nombres nuevos, respeta el pool existente en
  `lib/world-state.ts`.
- **Crónica en voz partisana**: "los nuestros" / "los hijos de X" —
  nunca narrador neutral. Ver `lib/chronicle.ts` como referencia.
- **TypeScript estricto**: no `any` salvo en límites externos justificados
  con comentario.
- **Prefer data-testid en componentes** para cualquier elemento que el
  E2E necesite seleccionar. No testees por texto visible (se rompe al
  cambiar copy).
- **Comentarios**: sólo cuando el *why* no es obvio. Nunca describir
  *qué hace el código* si los identificadores ya lo dicen.

## Ejecución por batches pequeños (anti-timeout — reglas duras)

Los timeouts a mitad de tool call pierden progreso **sin rastro
recuperable**. Esta sección **no es orientativa** — son thresholds
numéricos duros que aplican a todo el trabajo del agente.

### 5 thresholds, sin excepciones

1. **`Write`: ≤ 150 líneas por llamada.** Si el fichero final pasa
   de eso, se crea con cabecera + primer bloque (≤ 150 líneas) y se
   rellena con `Edit` append sucesivos.
2. **`Edit`: ≤ 100 líneas de `new_string`.** Un edit grande se parte
   en múltiples edits contiguos con anclas estables distintas.
3. **`Bash`: `timeout` explícito siempre**. Nunca el default
   silencioso. Para operaciones potencialmente > 30s (`pnpm install`,
   `pnpm build`, `pnpm test:e2e`), **`run_in_background: true`** y
   espera por notificación — no por polling.
4. **Multi-fichero: ≤ 10 ficheros por tool call.** `git rm`, `git
   add`, renames masivos — lotes por categoría (lib primero, tests
   después, docs al final). Nunca un solo comando de 50+ rutas.
5. **Checkpoint commit intermedio**. Un entregable que necesita > 2
   tool calls grandes para producirse se commitea parcial con prefijo
   `wip:`. Los `wip` son costura interna; se dejan en el historial
   sin squashear — la prioridad es **no perder trabajo**, no la
   limpieza del log.

### Protocolo de recuperación tras corte

Si una tool call se corta a mitad:

1. Primer acto **siempre** `git status --short` + `Read` del fichero
   tocado (o `wc -l`) para verificar qué parte llegó al disco.
2. Reanudar desde la última línea verificada, nunca desde el
   principio. Si no hay forma de saber dónde paró, rebobinar con
   `git checkout -- <file>` al último commit limpio y rehacer en
   batches más pequeños que la tentativa fallida.
3. Nunca asumir "seguro que se guardó". La única fuente de verdad
   es `git status` + `Read`.

### Anuncio previo obligatorio

Antes del primer batch de una tarea larga, el agente anuncia **en
una línea**: qué va a escribir, en cuántos batches, qué es cada
batch. Ejemplo: "redacto ROADMAP en 3 batches: (1) Fase 1-2, (2)
Fase 3-4, (3) Fase 5-6 + cierre". Esto le da al humano visibilidad
del progreso esperado y sirve de ancla si un batch falla.

### Aplica / no aplica

- **Aplica**: docs extensos (ROADMAP, VERSION-LOG, CLAUDE-*),
  suites de tests (`describe` a `describe`), refactors cross-módulo,
  wipes de scaffolding, cualquier tarea estimada en > 300 líneas de
  output o > 20 ficheros tocados.
- **NO aplica**: edit de una constante, fix de un test, cambio
  localizado a un fichero corto. Ahí batchear es ceremonia.

## Comandos

```bash
pnpm install
pnpm dev              # Next dev en :4747
pnpm test             # Vitest unit + integration
pnpm test:unit        # Sólo unit
pnpm test:integration # Sólo integration
pnpm test:e2e         # Playwright (arranca Next en :3100)
pnpm test:coverage    # Cobertura v8 sobre lib/
pnpm test:watch       # Watch mode
pnpm build            # Next build
pnpm lint             # ESLint
```

## Estructura

```
lib/             Núcleo puro — cumple §A4. No toca DOM, localStorage, ni LLMs.
  prng.ts        mulberry32 con seed+cursor.
  world-state.ts Tipos + initialState(seed). Fuente de verdad del shape.
  simulation.ts  tick() puro. Aquí crece el lifecycle en Sprint 2.
  anoint.ts      Filtro "sólo tu grupo" + anoint(). Listo para v0.3.
  chronicle.ts   Plantillas partisanas. En v0.4 pasa a LLM.
  persistence.ts localStorage round-trip. Cuando cambie el shape, bump
                 STORAGE_KEY a .v2 para invalidar saves antiguos.
  scheduler.ts   (Sprint 2) Eventos forzados del onboarding §A1 y del
                 tick. Consume el mismo PRNG que `simulation.ts`.
app/page.tsx     Dashboard del jugador. Sin lógica de dominio —
                 sólo orquesta lib/* y React state.
components/ui/   shadcn primitives. No añadir lógica aquí.
components/*     Componentes de features. Vacío tras archivar
                 `map-generator` (fuera de scope §11).
tests/unit/      Un fichero por módulo de lib/.
tests/integration/  Flujos multi-módulo.
tests/e2e/       Playwright. Un spec por flujo de usuario.
drafts/          DRAFTs editoriales activos (pendientes de firma o
                 integración). Se borran al mergear su contenido. Las
                 reviews cerradas quedan en la raíz como `REVIEW-*.md`
                 porque son registros históricos, no artefactos a
                 integrar.
```

## Qué NO hacer

- **No tocar `../vision-godgame.md`** desde Claude Code. Es documento
  del Director Creativo; si hay ambigüedad, pregunta al usuario.
- **No usar `Math.random()`, `Date.now()`, `crypto.randomUUID()` dentro
  de `lib/`**. Toda aleatoriedad pasa por el PRNG seedable.
- **No introducir side effects en `tick()`** (logging, fetch,
  localStorage). El tick debe ser reproducible offline 1000 veces
  consecutivas.
- **No `git push --force` ni `git push` a `main` sin pasar el gate de
  tests**. El repo es público.
- **No merges especulativos**: si no tienes tests que describan el
  comportamiento, no está hecho.
- **No avanzar sprint sin que el anterior esté verde**.
- **No pedir al usuario que arranque/pare servidores sin razón**. Si
  necesitas un dev server para verificar algo, arráncalo tú en
  background y mátalo al terminar.

## Sesiones autónomas (overnight / multi-sprint)

Cuando se pide ejecutar varios sprints seguidos sin supervisión, la
metodología es:

1. **TDD estricto, SIEMPRE**. Sin excepción por "ir rápido". Test Red
   antes de la línea de producción. Si una función pura no tiene
   unit test cubriendo su contrato, está mal. Si un flujo de UI no
   tiene E2E, está mal. Ver sección "Metodología: TDD estricto" arriba.
2. **Un commit por sprint completado**. Nada se empuja si el gate
   (`pnpm test`, `test:e2e`, `tsc --noEmit`, `eslint .`, `pnpm build`)
   no está en verde. Si un sprint no pasa el gate, se rebobina al
   último commit limpio y se deja nota en `NOTES-OVERNIGHT.md`.
3. **Flag y sigue** ante bloqueos no triviales: falta de API key,
   dependencia nativa rota, decisión de diseño ambigua, rutas que
   tocan secrets. Se documenta en `NOTES-OVERNIGHT.md` y se continúa
   con el siguiente sprint si el anterior no bloquea estructuralmente.
4. **`NOTES-OVERNIGHT.md`** (raíz del repo) bitácora interna técnica:
   entregable, decisiones tomadas, blockers activos, acciones
   requeridas por el Director Creativo.
5. **Polish & Debug pass entre versiones** — antes de empezar la
   siguiente versión, se pasa por cada versión mayor completada:
   - Suite al completo verde (unit + integration + e2e + lint + tsc + build).
   - Revisión de TODOs, `any`, `eslint-disable`, warnings.
   - Detectar regresiones visuales/UX (overlays que bloquean clicks,
     toasts duplicados, test-ids colisionando, etc.).
   - **Análisis de balance** desde perspectiva de jugador. En especial
     la economía de Fe y el ritmo: ¿tiene sentido el coste de los
     dones frente a la Fe acumulable en 1h de juego? ¿El jugador
     muere de aburrimiento o de presión? ¿Los rivales son visibles
     sin ser agobiantes?
   - Si el balance es malo, el sprint siguiente NO arranca. Se
     arregla primero. No se construye sobre barro.
   - Commit `polish: vX.Y debug + balance pass` + push.
6. **`VERSION-LOG-vX.Y.md` obligatorio** al cerrar cada versión mayor,
   en la raíz del repo. Formato log-style para lectura humana:
   - **Qué hace esta versión**: entregables visibles al jugador.
   - **Por qué y cómo encaja con la visión**: referencia a Pilares
     1-5 y al vision document. ¿Esta versión acerca al juego que
     queremos construir?
   - **Perspectiva del jugador**: 3-5 frases narrando cómo se siente
     jugarlo en esta versión. Escribir DESDE el jugador, no desde el
     ingeniero. Qué hace el primer minuto. Qué ve el quinto. Cuándo
     se divierte. Cuándo se aburre.
   - **Balance (especial foco en economía)**: costes, rates,
     cantidades con números concretos. Si algo está obvio-roto,
     flagearlo aquí.
   - **🚩 Flags para supervisión humana**: bullets con decisiones
     que requieren validación del Director Creativo antes de la
     siguiente versión. Cada flag lleva acción concreta sugerida.
7. **No tocar la API de Anthropic con claves pegadas en chat**. Si el
   usuario pega una key, se le pide revocarla y se sigue con provider
   mock hasta que configure su key por vía segura (env var, secret
   store). Ver notas en `NOTES-OVERNIGHT.md`.
8. **Ramas provisionales para trabajo especulativo**: si se avanza
   sobre una versión futura (ej. v2.0) sin que el usuario haya
   validado la anterior, se hace en una rama propia (`claude/v2-...`)
   con su propio ROADMAP y sin mergear a la rama principal activa.

## Suite de coherencia de diseño (`tests/design/`)

Independiente de los unit/integration/e2e que cubren **features
nuevas**, la carpeta `tests/design/` contiene una suite **transversal**
que revisa coherencia mecánica, de economía, de world-state y
narrativa. Su objetivo no es aceptar features — es encontrar
*chirridos de diseño*: gotchas que los tests por sprint no detectan
porque cada uno vive en su silo.

**Cuándo se actualiza / ejecuta**:

- Obligatorio pasarla verde al cerrar cada versión mayor. Entra en
  el gate del Polish & Debug pass.
- Ejecución: `pnpm test:design` (script dedicado en `package.json`).
- Tests nuevos se añaden cuando aparece una mecánica cross-módulo
  que los unit tests aislados no cubrirían. Si una expectativa
  requiere dato numérico (p.ej. "fe pasiva en 30s no supera GIFT_COST")
  se calcula a partir de las constantes, no se hardcodea.

**10 dominios** (un `describe` por dominio):

1. **Economía de Fe** (§Pillar 3) — Fe no acumula si Elegido muere;
   simetría Fe rival/player; costes de dones/maldiciones sanos en
   tiempos reales concretos (calculados desde constantes).
2. **Población & pairing** (§Pillar 2) — no explota ni colapsa;
   cross-group raro pero posible; huérfanos conservan linaje.
3. **Ciclo de vida** — distribución de edad al morir; ratio muertes
   por conflicto vs edad; la crónica registra muertes importantes.
4. **Determinismo extremo** — 1000 ticks byte-idénticos; PRNG cursor
   monotónico; ausencia de `Math.random()` verificada vía
   reproducibilidad.
5. **Dones & traits** (§Pillar 1) — mismo don sobre traits opuestos
   produce outcomes cuantitativamente distintos; herencia persiste.
6. **IA dios rival** (§Pillar 4) — cadencia anti-presión; perfiles
   con `actProb` observado dentro del rango esperado; extinción del
   rival con grupo vacío no emite eventos.
7. **Veredicto & influencia** (§Pillar 5) — fórmula exacta; top-3
   con/sin descendiente; edge case "limbo" (Elegido solo, sin
   descendientes) flagueado explícitamente.
8. **Crónica coherencia** — no menciona NPCs muertos post-muerte;
   pairings cross-group narrados; export HTML escapa acentos.
9. **UI mechanics** — halo tutorial solo sobre señalado; click en NPC
   muerto no crashea; URL compartible reconstruye mundo idéntico.
10. **Edge cases enredados** — mundo con 1 NPC, extinción casi total,
    orden ungir/maldecir/rival-decide, propagación de dones tras
    muerte fatal del portador.

**Regla de oro cuando un test de coherencia falla**:

No se revierte el test. El test es el contrato. Dos opciones:

1. **Bug de código** → se arregla el código.
2. **Expectativa de diseño equivocada** → se actualiza el test Y se
   documenta el *why* en comentario encima del `it(...)`. La
   corrección queda auditable.

Jamás se marca un test como `.skip` para librarse. Si una expectativa
requiere decisión humana, se convierte en `it.todo("...")` con
explicación y se flaguea en el VERSION-LOG en curso.

**Escritura incremental — un `describe` a la vez**:

Cuando añadas o reescribas la suite de coherencia (y en general
cualquier test file grande), escribe **un `describe` block por turno**,
no el archivo entero de golpe. Razones:

1. **Evita timeouts** del agente cuando el fichero supera ~400 líneas.
2. **Iterable**: cada bloque se ejecuta nada más escribirse
   (`pnpm test:design -- -t "<descripción>"`) y se clasifica como
   pass / bug / expectativa equivocada antes de pasar al siguiente.
3. **Commits más chicos**: si algo peta, sabes qué bloque lo causó.
4. **Mantiene frescura de contexto**: cada bloque se escribe con la
   lógica concreta del dominio en cabeza, no mezclada con los otros
   nueve.

Procedimiento:
- `Write` el test file con los `describe` cabecera + el primer
  bloque completo.
- `pnpm test:design -- -t "<dominio>"` para correr solo ese `describe`.
- Clasificar fallos inmediatamente (bug / expectativa / todo).
- `Edit` el fichero para añadir el siguiente `describe`.
- Repetir hasta los 10 dominios.
- Gate final + commit único del archivo completo.

**Inspiración** (referencias para calibrar balance):
- Stardew Valley: economía estable, loops no explotables.
- CK3: dinastías emergentes trait-driven, no random puro.
- Dwarf Fortress: mundos deterministas con eventos narrativos.

## Eficiencia de Contexto y Tokens

Esta sección es del ingeniero ejecutor (el contrapeso editorial vive
en `CLAUDEDIRECTOR.md`). Aplica al flujo real de sprints: evitar
gastar tokens en ruido cuando la tarea es "implementar Sprint N con
TDD" y el output natural es código + tests + commit.

### Hack #1 — Modo Caveman

System prompt para respuestas concisas durante sprints activos:
"Responde en ≤3 frases. Mínimo preamble. Solo código y decisiones.
Las justificaciones van en comentarios dentro del código, no en chat."
Apaga el acompañamiento narrativo y deja la tubería tests → Edit →
gate correr sola.

**Aplica**: implementación Red/Green/Refactor, fixes de balance
numéricos (tocar constantes), correr el gate, ajustes de flakes E2E
mecánicos.

**NO aplica**: tests Red que deben describir el gap (`"Fe no existe
aún"` es el mensaje que el ingeniero necesita leer fallar), redacción
de `VERSION-LOG` (la perspectiva del jugador no cabe en caveman),
análisis de balance previo a tocar constantes, decisiones §A4 donde
un comentario corto no explica el porqué.

### Hack #2 — Code Review Graph

Herramienta: `github.com/tirth8205/code-review-graph`. Reduce el
contexto de revisión a un grafo de dependencias entre ficheros
tocados, no el repo entero.

**Aplica**: antes de tocar `lib/` (validación del contrato §A4:
pureza, determinismo, round-trip JSON), refactors que cruzan 2-3
módulos del núcleo, verificar que un evento nuevo no rompe la rama
correspondiente de `applyEvents`.

**NO aplica**: cambios aislados a un único componente de UI, ajustes
de balance dentro de un solo fichero, nuevos tests que no introducen
imports nuevos.

**Regla de inyección**: solo los ficheros afectados por el cambio y
sus imports directos. Nunca el repo completo, la historia git ni
`CHANGELOG`. Si el cambio toca `scheduler.ts`, entra `scheduler.ts`
+ `world-state.ts` (sus tipos) + los tests que lo cubren; nada más.

### Hack #3 — Modelo correcto para cada tarea

Empieza con el modelo más barato que cumpla el contrato. Si el gate
no pasa dos veces seguidas con Haiku, escala a Sonnet. Opus se
reserva para bugs de determinismo y decisiones §A4 irreversibles.

| Tarea | Modelo | Razón |
|-|-|-|
| Unit test de función pura nueva | Haiku | Patrón repetitivo, contrato explícito, sin ambigüedad |
| Ajuste de constante de balance | Haiku | Single-file edit, test ya escrito |
| Sprint completo (Red + Green + Refactor) | Sonnet | Flujo multi-fichero, tests + implementación |
| Arquitectura cross-módulo (nuevo evento, bump de storage version) | Sonnet | Lectura de 3-5 ficheros + coordinación de cambios |
| Redacción de `VERSION-LOG` / `REPORT.md` | Sonnet | Perspectiva del jugador pide tono, no solo listado |
| Debugging de determinismo roto | Opus | Trace multi-tick, error sutil, decisión fina §A4 |
| Decisión §A4 irreversible (shape del estado) | Opus | Impacto amplio, bump de storage obligatorio |

**Aplica**: al arrancar cualquier tarea, elige el modelo *antes* del
primer prompt.

**NO aplica**: cambios de modelo a mitad de sprint por capricho —
si Haiku arrancó el sprint, termínalo con Haiku salvo bloqueo duro.
Saltar a Opus "por si acaso" quema tokens sin ROI.

### Hack #4 — No inyectar `vision-godgame.md` entero

El documento de visión es el más pesado del repo. Pegarlo entero en
cada sesión gasta 15-25% del contexto sin ROI — la mayoría del ruido
son analogías y prosa de contexto que el ingeniero no necesita para
implementar un sprint.

Pasa la visión por Haiku una vez, con este prompt de compresión:

> Lee `../vision-godgame.md` y devuélveme SOLO: (1) claims
> factuales numerados, (2) Pilares 1-5 en una frase cada uno,
> (3) §A1-A5 resumidos a 2-3 frases cada anexo, (4) instrucciones
> accionables ("nunca X", "siempre Y"). Descarta: prosa de
> contexto, repeticiones, analogías con otros juegos. Output en
> Markdown.

Pega al siguiente agente solo el texto condensado (objetivo: 20-30%
del original). Guárdalo como `vision-compressed.md` fuera del repo
y reúsalo entre sesiones si la visión no se ha actualizado.

**Aplica**: cualquier sprint que referencie Pilares o §A (es decir,
casi todos).

**NO aplica**: si el sprint toca una sección concreta de 2-3 párrafos
— cita solo esos. Tampoco tiene sentido comprimir para ajustes de
UI o flakes E2E que no dependen de la visión.

### Hack #5 — Session Timing

Aplicado al flujo overnight (ver sección "Sesiones autónomas"):

- **No abrir sesión** sin leer `SPRINTS.md` e identificar
  el sprint activo *antes* del primer prompt.
 Quema 500-1000 tokens
  menos que preguntar al agente "¿qué toca?".
- **Concentra los sprints pesados** (muchos módulos tocados, E2E
  nuevos, refactors §A4) en la primera mitad de la ventana de tu
  sesión. Cuando llevas 3-4 sprints encadenados, el contexto
  acumulado hace que el gate empiece a consumir más tokens por
  cada ajuste pequeño.
- **Cierra la sesión tras cerrar versión mayor** aunque tengas más
  sprints planeados. El `VERSION-LOG` + Polish & Debug pass son el
  corte natural; la siguiente versión se abre con sesión limpia y
  sin arrastre de decisiones ya resueltas.

**Aplica**: sesiones de más de 2 sprints consecutivos o cualquier
overnight.

**NO aplica**: intervenciones de 1 sprint corto (polish, fix de
flake). En esos casos el timing no cambia nada.

### Hack #6 — Compact Conversation Skill

Antes de abrir chat nuevo (sesión pausada, rehome tras límite de
contexto, entrega entre agentes), comprime el estado con este
prompt estándar:

> Resume el estado actual en este formato exacto:
> 1. **Sprint activo**: número, entregables pendientes, fase
>    (Red/Green/Refactor).
> 2. **Decisiones de implementación tomadas** en esta sesión:
>    lista breve; cada una con el archivo tocado.
> 3. **Código / config clave en code blocks verbatim**: bloques
>    exactos que el próximo agente debe preservar (constantes de
>    balance, types nuevos, `data-testid` añadidos, shape del
>    estado).
> 4. **Estado del gate**: qué pasa (`pnpm test: 330/330`), qué
>    falla y por qué, qué se ignoró temporalmente.
> 5. **Próximos pasos concretos**: los 3 siguientes `Edit` /
>    `Write` / `Bash` que corresponden.

Pega ese resumen como primer mensaje al nuevo chat. Onboarding de
5k tokens → ~1.5k.

**Aplica**: cambio de sesión a mitad de sprint, rehome de contexto,
entrega entre Ingeniero y Director (y viceversa).

**NO aplica**: fin de versión mayor — ahí el compacto obligatorio es
el `VERSION-LOG`, no este resumen técnico.

### Hack #7 — Avoid Peak Hours

Planifica la carga según ventana horaria:

- **Sprints más largos** (E2E nuevos, refactors cross-módulo, bumps
  de storage version, nuevas mecánicas completas) → noches,
  madrugadas, fines de semana. Mismo coste en tokens, sin rate
  limits interrumpiendo a mitad de gate.
- **Sprints de balance / polish** (ajustes de constantes, fixes de
  flakes E2E, redacción de `VERSION-LOG`) → aptos para peak hours
  porque cada intervención es de vuelta corta y rebobinable.
- **Nunca arrancar un refactor §A4** a pocas horas del límite de
  ventana diario. Si el gate se cae a mitad, necesitas contexto
  fresco para rebobinar sin perder el árbol de decisiones.

**Aplica**: cualquier sesión sin urgencia fuerte; el proyecto es
asíncrono por defecto.

**NO aplica**: fixes bloqueantes (main roto, E2E en CI fallando) —
ahí se corre cuando haga falta, con el modelo que toque.

## Workflow de monorepo (reglas globales)

Este repo es un **monorepo** con raíz igual al código de la app GODGAME
(`lib/`, `app/`, `components/`, `tests/`, ...). Los subárboles
`agents/`, `shared/` y `docs/` son **slots diferidos** — se crean sólo
cuando aparece el primer consumidor real (ver §Agentes especializados
→ "Extensión multi-agente — slots diferidos"). Mientras no exista ese
consumidor, esos directorios no existen; no hay placeholders ni README
fantasmas.

### Reglas de git (no negociables)

1. **Nunca push directo a `main`**. Ni siquiera con gate verde. `main`
   sólo recibe commits vía Pull Request mergeado.
2. **Toda rama de trabajo es temporal** y sigue el patrón
   `feature/<rol>-<descripción-corta>`, donde `<rol>` es uno de los
   cuatro roles definidos en la sección "Agentes especializados":
   - `feature/eng-sprint-legibilidad`     (Ingeniería / Producción)
   - `feature/eng-tune-fe-passive`        (balance numérico en `lib/`)
   - `feature/design-dashboard-halo`      (Diseño)
   - `feature/design-tokens-paleta`       (Diseño)
   - `feature/edit-typos-chronicle`       (Edición)
   - `feature/director-firma-decision-34` (Director Creativo)
   - `feature/director-review-sprint-1`   (Director Creativo)
   Ramas de agente iniciadas por el harness (`claude/...`) son
   equivalentes y válidas; el patrón `feature/...` aplica a ramas
   creadas manualmente. El prefijo de rol **debe** corresponder al
   único rol que actúa en la rama (regla "Un PR, un rol").
3. **Todo cambio abre un Pull Request contra `main`**. Sin PR no hay
   merge, aunque sea un typo.
4. **Un PR sólo mergea con**:
   - Gate completo en verde: `pnpm test`, `pnpm test:e2e` (si tocó
     UI/persistencia), `pnpm exec tsc --noEmit`, `pnpm exec eslint .`,
     `pnpm build`.
   - Revisión aprobada (humano o agente reviewer designado).
5. **Si cambian reglas de comportamiento de un agente**, se actualiza
   el `CLAUDE.md` correspondiente en el mismo PR que introduce el
   cambio. Nunca en un PR posterior "de limpieza".
6. **Todos los agentes viven en este repo** (bajo `agents/`) para
   compartir contexto y que ningún cambio rompa a otro sin quedar
   registrado en el historial común.
7. **Política de branches: un único nivel de ramas**. Todo PR tiene
   `main` como base y toda rama de trabajo sale directamente de
   `main`. **No se permiten ramas intermedias de integración** (tipo
   `phase-N-xxx`, `integration-...`, `release-train-...`, o
   cualquier rama que sirva de base a otros PRs). Si un trabajo
   depende de cambios aún no mergeados, se espera al merge en `main`
   o se cherry-pickea el commit concreto sobre la rama del PR. Todo
   sale de `main` y se mergea directamente a `main`.

### Relación con reglas existentes

Esta sección **refuerza y hace explícitas** reglas que ya aparecían
en "Qué NO hacer" (no `git push` a `main` sin gate) y en "Sesiones
autónomas" (un commit por sprint, gate antes de commitear). Si hay
conflicto aparente, esta sección prevalece: `main` se actualiza
**sólo vía PR mergeado**, nunca por push directo aunque el gate pase.

## Cuándo pausar y preguntar

- Ambigüedad entre lo que pide el roadmap y lo que pide la visión.
- Decisión de diseño que no está en la visión (añadir pilar, cambiar
  scope, reordenar sprints).
- Riesgo de romper contrato §A4 por un atajo.
- Acciones con blast radius: `git push`, crear releases, abrir PRs
  públicas, cambiar nombre del repo, borrar ficheros fuera de
  `node_modules/.next/coverage/test-results`.

En todos los demás casos: **sigue el roadmap bajo TDD y commitea cuando
esté verde**.
