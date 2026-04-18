# CLAUDE.md

Instrucciones para agentes Claude Code trabajando en este repo. Ejecutan
el `ROADMAP.md` bajo TDD estricto y respetando los contratos del núcleo.

## Identidad del proyecto

GODGAME (nombre interno) / Proyecto Civilización (nombre público). Motor
determinista de simulación de civilizaciones. El jugador es un dios
observador sobre los **Hijos de Tramuntana** en un archipiélago
balear-ficticio.

Fuentes de verdad, por orden de prioridad:

1. **`ROADMAP.md`** — qué sprint toca y en qué orden.
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

1. **Lee `ROADMAP.md` primero** para saber qué sprint toca y cuáles son
   sus entregables testeables.
2. **Lee las secciones relevantes de `../vision-godgame.md`**. Los
   sprints del roadmap referencian Pillars 1-5 y anexos A1-A5.
3. **NO adelantes sprints**. Si el sprint 2 trata muerte/nacimiento, no
   añadas dones (sprint 3) aunque "quede bien". El scope creep mata
   este proyecto — está advertido explícitamente en el roadmap.
4. **NO inviertas el orden canónico** (v0.3 antes de v0.4, etc.). Hay
   restricciones escritas en el roadmap con su "why".
5. **Al terminar un sprint**: actualizar la marca ✅ en `ROADMAP.md`,
   commitear con mensaje `sprint N: <entregable>`.

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
