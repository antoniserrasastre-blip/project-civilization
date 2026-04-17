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
  pixel-parser.ts Clasificación RGB → bioma.
app/page.tsx     Dashboard del jugador. Sin lógica de dominio —
                 sólo orquesta lib/* y React state.
components/ui/   shadcn primitives. No añadir lógica aquí.
components/*     Componentes de features (map-generator, futuros).
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
