# CLAUDE-primigenia.md

Anexo de convenciones específicas de la **edad primigenia** (ver
`vision-primigenia.md`). Extiende `CLAUDE.md` — no lo reemplaza. La
metodología TDD, el gate de commit, los contratos §A4 generales y las
reglas de sesión siguen vigentes tal cual. Aquí solo se documentan las
convenciones que **no existían** en el scaffolding de v1.0.1 porque la
edad primigenia introduce sistemas nuevos:

1. Extensión de §A4 para grafos NPC×NPC (economía relacional).
2. Extensión de §A4 para el pool de gratitud del clan (decisión #31).
3. Extensión de §A4 para el modal diario determinista — pausa sin
   consumir PRNG (decisión #30.b).
4. Pathfinding determinista sobre grid 512×512.
5. Fog-of-war reproducible seed-driven.
6. Mapa del mundo como fixture JSON versionada (no procedural por
   partida).
7. Registry de assets gráficos (`assets/ORIGINS.md`) con licencia CC0
   por sprite.

Ante contradicción con `CLAUDE.md`, gana `CLAUDE.md` **salvo que la
contradicción sea específica de mecánicas primigenia**, en cuyo caso
gana este anexo y se deja nota en el commit.

---

## 1. §A4 extendido — grafos NPC×NPC (economía relacional)

La edad primigenia añade un **grafo dirigido con pesos** entre NPCs
(deudas, favores, parentesco por linaje, vínculos de salvar-la-vida).
Los tres contratos duros de §A4 — pureza, determinismo, round-trip
JSON — se aplican al grafo con estas reglas operativas:

### 1.1 Representación canónica

- **Nunca** referencias cruzadas con punteros de objeto. El grafo vive
  como lista de aristas indexadas por `npcId` (string estable) en
  **orden canónico** (ambos extremos ordenados lexicográficamente en
  aristas no dirigidas; por `from` → `to` en dirigidas).
- El grafo se serializa como `Array<Edge>` dentro de `state.relations`.
  Sin `Map`, sin `Set`, sin clases. `JSON.parse(JSON.stringify(state))`
  debe devolver un estado **estructuralmente igual byte a byte** al
  original tras re-serializar.
- Cualquier consulta `O(1)` sobre el grafo (vecinos de un NPC, peso
  entre dos NPCs) se construye en memoria **desde** la lista canónica
  en cada tick, no se persiste. El índice derivado es transitorio.

### 1.2 Determinismo de mutaciones

- Los pesos del grafo se actualizan **solo** en funciones puras
  invocadas desde `tick`. Cada mutación es `grafo → grafo'` sin side
  effects. Igual que `world-state.ts` en v1.0.1 pero aplicado al grafo.
- **Orden estable de iteración**: cuando un tick itera sobre todas las
  aristas (p.ej. para propagar intereses de deuda) el orden debe
  derivarse de la lista canónica, NO de inserción. `for (const e of
  sortedEdges)`, nunca `for (const e of edges)` sin orden explícito.
- Los "favores" o "deudas" nacen de eventos (comer con otro, curar a
  otro, trabajar para otro). Cada evento que toque el grafo consume
  del `prng_cursor` o es 100% determinista por estado → no hay ruido
  no-seedeable.

### 1.3 Round-trip JSON — invariante en tests

Todo módulo que escribe sobre el grafo tiene un test de round-trip:

```ts
const after = applyEvent(before, event);
expect(JSON.parse(JSON.stringify(after))).toEqual(after);
```

Si esto falla, el módulo mete un objeto no-serializable (Map, clase,
función, referencia circular). Es un bug de §A4, no un flake.

### 1.4 Regla de oro

> El grafo NPC×NPC es **otra forma del estado del mundo**, no una capa
> aparte. Si un feature necesita algo que el grafo canónico no puede
> expresar (pesos con historia, aristas con expiración), ese algo se
> codifica en la propia `Edge` (p.ej. `expiresAtTick: number`), no en
> una estructura paralela.

---

## 2. §A4 extendido — pool de gratitud del clan

Decisión #31 introduce **gratitud** como moneda emergente del clan
que financia los 5 milagros (decisión #32). No es per-NPC: es un
contador único del clan (`state.village.gratitude`).

### 2.1 Representación canónica

- **Entero**, nunca float. Los floats intermedios se redondean al
  mezclar con el estado (`Math.floor` o `Math.round`, nunca truncar
  implícitamente).
- Vive en `state.village.gratitude: number`. Sin contadores
  paralelos por NPC; si alguna mecánica necesita "gratitud personal",
  se modela como peso en el grafo de relaciones (§1), no como nueva
  columna del estado.
- Cap declarado en constante (`GRATITUDE_CEILING`). Sumar por encima
  satura — no desborda. La sustracción clamp-a a 0, nunca negativa.

### 2.2 Reglas de ganancia y pérdida

- **Ganancia**: un tick produce `+delta` al pool cuando un NPC vive
  un efecto que le beneficia tangiblemente (supervivencia salvada,
  conflicto evitado, deuda saldada, linaje restaurado) **Y** ese
  efecto es consecuencia causal del mensaje diario activo (decisión
  #31). Sin mensaje → sin ganancia.
- **Pérdida**: silencio acumulado (días seguidos sin mensaje),
  muerte de un Elegido, gasto explícito en milagro. Cada vía tiene
  su `delta` negativo en constante declarada.
- **Determinismo total**: `computeGratitudeDelta(tick, events,
  activeMessage, state)` es puro, y la suma al pool es idempotente
  por `tick`. Reordenar los eventos del tick no cambia el resultado
  (suma conmutativa sobre enteros).

### 2.3 Round-trip JSON

- Trivial: es un entero dentro de `state.village`. Los tests de
  round-trip del estado completo cubren el pool sin trabajo
  adicional. No necesita test propio.

### 2.4 Tests mínimos

- Unit: ganancia condicional — mismo evento, **con** mensaje activo
  suma al pool; **sin** mensaje activo, 0.
- Unit: pérdida por silencio acumulado — N días sin mensaje drenan
  pool según la curva declarada.
- Unit: cap — sumar por encima del `GRATITUDE_CEILING` satura.
- Unit: clamp en 0 — restar más de lo disponible deja el pool en 0,
  no negativo.
- Integration: 10.000 ticks con y sin mensajes tienen pools finales
  distintos medibles (sanity del feed-forward).

### 2.5 Regla de oro

> La gratitud NO es una variable interna de balance que el
> ingeniero retoca en runtime. Es **lectura del estado del mundo**:
> si el clan vive, el pool sube; si el clan colapsa, baja. Toda
> constante numérica (deltas, ceiling, curva de silencio) vive en
> un solo módulo (`lib/gratitude.ts`) auditable.

---

## 3. §A4 extendido — modal diario determinista

Decisión #30.b: al amanecer de cada día in-game, la simulación se
pausa y aparece un modal con las 6 intenciones + "guarda silencio
hoy". Hasta que el jugador elige, **el tiempo no corre**. El
determinismo exige reglas específicas para no romper §A4.

### 3.1 Pausa sin consumir PRNG

- El modal se abre en el tick K donde `K % TICKS_PER_DAY === 0`
  (o equivalente de "amanecer"). Esa detección es una función pura
  sobre el tick actual, no consume PRNG.
- Mientras el modal está abierto, **no se llama a `tick(state)`**.
  La UI queda congelada en el estado del tick K. El `prng_cursor`
  no avanza ni un paso.
- Si el jugador cierra la pestaña y recarga, la partida se
  deserializa en el mismo tick K con el modal reabierto. El cursor
  y el estado son idénticos al momento de guardar.

### 3.2 La intención elegida es parte del estado

- `state.village.activeMessage: MessageIntent | 'silence'` persiste.
  Se setea en el instante de la elección, antes de llamar a
  `tick(state)` para K+1.
- El mensaje activo **modula** los ticks siguientes pero **no
  consume PRNG por sí mismo**. Los efectos sobre NPCs consumen PRNG
  normalmente cuando sus funciones puras lo pidan.
- Al amanecer del siguiente día, `activeMessage` se archiva en
  `state.village.messageHistory: Array<{ day, intent }>` (orden
  canónico por `day` ascendente) y se limpia para el nuevo modal.

### 3.3 Testing determinista del modal

- Unit: abrir modal → `prng_cursor` inalterado. Seleccionar
  intención → `activeMessage` poblado, `prng_cursor` aún inalterado.
  Llamar `tick` post-selección → `prng_cursor` avanza según la
  lógica normal.
- Unit: misma seed + mismo mensaje elegido → misma trayectoria
  byte-idéntica sobre los N ticks siguientes.
- Unit: misma seed + mensaje distinto → trayectorias distintas
  medibles (test del Pilar 1).
- Integration: simular partida con scripted choices (array de
  intenciones por día) + correr 10.000 ticks → resultado
  determinista, hash estable entre corridas.

### 3.4 Qué NO se permite

- **Nunca** consumir PRNG para "precalcular" lo que pasará si el
  jugador elige X. La simulación no adelanta futuros — si el modal
  necesita preview ("si eliges Coraje, los NPCs leerán así"), ese
  preview se genera a partir del estado **actual** sin tocar el
  cursor.
- **Nunca** avanzar tick mientras el modal está abierto por
  "timeout de UX" o similar. El silencio es una elección explícita
  del jugador, no un fallback automático.
- **Nunca** meter el mensaje activo en el grafo de relaciones ni
  en otros sub-estados — vive SOLO en `state.village`.

### 3.5 Regla de oro

> El modal es un **punto de sincronización** entre jugador y
> simulación. La regla mental: "el mundo se congela mientras el
> dios habla; cuando el dios se calla, el mundo resume con la
> nueva intención grabada". Cualquier tentación de "mejorar la
> fluidez" haciendo que algo pase durante el modal rompe
> determinismo.

---

## 4. Pathfinding determinista (A*)

Los NPCs en primigenia se mueven autónomamente sobre un grid 512×512.
El pathfinding **debe ser reproducible** tick a tick con el mismo seed.

### 2.1 Algoritmo

- **A*** sobre grid 4-conexo (8-conexo si el playtest lo pide; decisión
  diferida a Fase 3 del ROADMAP).
- **Heurística**: distancia Manhattan (o Chebyshev si 8-conexo). No
  Euclidean — introduce floats y abre la puerta a divergencia entre
  máquinas (ARM vs x86) por redondeo.
- **Coste de tile**: entero, derivado del terreno. Enteros obligatorios
  para evitar el problema de floats.
- **Cap de iteraciones**: explícito (p.ej. 10.000 nodos expandidos).
  Si se supera, el NPC devuelve "sin ruta" y toma el fallback de
  comportamiento (quedarse, errar brevemente). Nunca bucles infinitos.

### 2.2 Tie-breaking seedable

El punto de fragilidad del A*: cuando dos nodos tienen `f = g + h`
idéntico, el orden de expansión decide el camino. Si ese orden depende
de inserción en la priority queue, dos corridas con mismo seed pueden
diverger por detalles de implementación de la queue.

**Regla**: el tie-breaking se resuelve **exclusivamente** con una clave
secundaria determinista derivada del estado:

1. Prioridad por `f` (menor primero).
2. Empate → prioridad por `h` (menor primero, prefiere avanzar).
3. Empate → prioridad por coordenada lexicográfica `(x, y)` del nodo.
4. Empate final (imposible en práctica) → consumir `prng_cursor` una
   vez para desempatar. Esto SÍ consume del flujo — así el pathfinding
   queda ligado al cursor global y no abre un canal paralelo.

**Nunca** usar la identidad del objeto, el hashCode del puntero, ni
`Date.now()` para desempatar.

### 2.3 Caching de rutas

- Se permite cachear rutas **dentro del mismo tick** como optimización
  (varios NPCs pidiendo la misma ruta A→B).
- El caché se **descarta al final del tick**. Nunca persiste entre
  ticks — sería estado oculto no-round-trip.
- Si se demuestra (en Fase 3) que el caché inter-tick es necesario, se
  codifica como parte de `state.pathCache` con reglas de invalidación
  explícitas y se añade test de round-trip.

### 2.4 Tests mínimos para A*

- Unit: mismo seed + mismo mapa + mismos start/end → misma ruta byte a
  byte.
- Unit: ruta óptima (longitud mínima) sobre mapas de fixture conocidos.
- Unit: "sin ruta" determinista cuando start y end están desconectados.
- Integration: 10.000 queries consecutivas en un tick no divergen con
  dos corridas independientes.

---

## 5. Fog-of-war reproducible

El clan no ve todo el mapa al arrancar. Los recursos aparecen a medida
que los NPCs los descubren (§3.5 de `vision-primigenia.md`). El
fog-of-war **es parte del estado del mundo**, no una capa de render.

### 3.1 Representación del fog

- Bitmap 512×512 **empaquetado en bits** (1 = descubierto, 0 = velado).
  Cabe en `Uint8Array(512*512/8)` = 32.768 bytes. Serializable como
  `base64` dentro del JSON del estado, con round-trip verificado en
  test.
- **Un único bitmap por clan**. No hay "visión por NPC" — lo descubre
  uno, lo sabe todo el clan (metáfora narrativa: el dios comparte la
  visión entre creyentes).
- El bitmap vive en `state.world.fog` y **nunca** se reconstruye desde
  histórico — es la fuente de verdad.

### 3.2 Reglas de descubrimiento

- Cada NPC tiene `visionRadius` (default ≈ 6 tiles; bendición "Ojo de
  halcón" suma +50%). Al final de cada tick se marca como descubierto
  todo tile dentro de ese radio para **al menos un** NPC vivo.
- La operación de marcar es **idempotente y conmutativa** — no importa
  en qué orden se procesen los NPCs. Esto es crítico para
  determinismo: "descubro luego descubro" = "descubro" sin consumir
  PRNG.
- **No se des-descubre**. Un tile visto queda visto para siempre en
  esta partida. Si la memoria colectiva del clan debe decaer, se
  codifica como **capa separada** (`state.world.fogFreshness`) con
  reglas propias.

### 3.3 Determinismo

- El bitmap **no consume PRNG**. Es puramente geométrico: NPC en (x,y)
  con radio r descubre un círculo discreto en torno a (x,y).
- Dos partidas con mismo seed y misma secuencia de movimientos tienen
  bitmaps byte-idénticos. Test de hash: `sha256(state.world.fog)` en
  los ticks 100, 1000, 10000 debe coincidir entre corridas.

### 3.4 Fog y render

- Los componentes React consumen `state.world.fog` y dibujan el velo
  encima del mapa. La UI **no** tiene su propio bitmap — siempre el
  del estado. Si la UI necesita "olvidar" por razones visuales (niebla
  que vuelve de noche), se codifica como feature de render derivado
  del fog real, no modificando el fog.

### 3.5 Tests mínimos

- Unit: `JSON.parse(JSON.stringify(state)).world.fog` byte-idéntico.
- Unit: tick puro con NPCs en posiciones conocidas genera bitmap
  esperado (fixture).
- Integration: bitmap en tick 1000 byte-idéntico entre dos corridas
  con mismo seed.

---

## 6. Mapa del mundo como fixture JSON versionada

**Un único mapa por versión de producción**. No procedural por partida.
Se compila una vez con el generador (Fase 1 Sprint 1) y se congela como
fixture.

### 4.1 Formato del fixture

- Ruta: `lib/fixtures/world-map.v1.json` (bump de versión al cambiar
  shape o seed).
- Estructura: `{ seed, width: 512, height: 512, tiles: Array<TileId>,
  resources: Array<ResourceSpawn>, meta: {...} }`. Todos enteros y
  strings — sin floats.
- **Tiles empaquetados** en `Uint8Array` base64 para reducir tamaño.
  Round-trip JSON obligatorio.
- **Metadata**: `meta.generatorVersion`, `meta.compiledAt` (ISO string
  puesta en build, no en runtime — NO es `Date.now()` en
  `initialState`), `meta.shaHash` del contenido.

### 4.2 Pipeline de generación

1. `lib/world-gen.ts` expone `generateWorld(seed: number): WorldMap`
   puro y determinista. Mismo seed → mismo mapa byte a byte.
2. Un script `scripts/compile-world.ts` llama al generador con el
   seed canónico de la versión, serializa a JSON y escribe
   `lib/fixtures/world-map.v1.json`.
3. `initialState()` **lee** el fixture, no llama al generador en
   runtime. Esto desacopla la fuente de verdad del mapa del código
   que puede cambiar entre versiones.
4. Test de coherencia: `generateWorld(CANONICAL_SEED)` produce lo
   mismo que `require('./fixtures/world-map.v1.json')`. Si diverge
   es que alguien tocó el generador y no recompiló — fail del gate.

### 4.3 Versionado

- Cambio de **seed canónico** → bump de versión del fixture y del
  `STORAGE_KEY` de persistencia (invalida saves antiguos como en
  v1.0.1).
- Cambio en el **shape** de la estructura (nuevos campos obligatorios,
  tipos renombrados) → lo mismo: bump de versión del fixture + bump
  del storage.
- Cambios compatibles (campos opcionales nuevos con default) → no
  necesitan bump, pero se documenta en commit.

### 4.4 Determinismo del generador

El generador vive bajo las mismas reglas §A4 que el resto de `lib/`:
puro, sin `Math.random`, sin `Date.now`. El seed entra como parámetro
y el output depende **solo** de él y del código del generador.

### 4.5 Tests del generador

- Unit: `generateWorld(seed)` es byte-idéntico a sí mismo 1.000 veces
  consecutivas.
- Unit: seeds distintos producen mapas distintos (sanity — no es una
  constante).
- Unit: el fixture checkeado en el repo coincide con
  `generateWorld(CANONICAL_SEED)`.
- Unit: distribución de recursos dentro de rangos declarados por el
  régimen (§3.5 vision-primigenia).
- Unit: conectividad — toda isla es alcanzable por pathfinding
  elemental desde cualquier otra isla (con tiles de agua si aplica
  embarcación; para primigenia v1, cada isla es independiente y se
  accede solo la inicial).

---

## 7. Registry de assets gráficos (`assets/ORIGINS.md`)

Prioridad CC0 (Kenney, OpenGameArt). IA generativa **solo como relleno
de huecos**, registrada explícitamente. Decisión #9 del
`DECISIONS-PENDING-primigenia.md`.

### 5.1 Estructura del registry

Fichero `assets/ORIGINS.md` en la raíz del repo. Tabla markdown con
una fila por sprite/tile/sfx:

| Fichero | Origen | Licencia | Autor | URL de origen | Hash SHA-256 |
|-|-|-|-|-|-|
| `assets/tiles/grass.png` | Kenney | CC0 | Kenney.nl | https://... | `<sha>` |
| `assets/sprites/npc-hunter.png` | IA (local) | CC0 (prompt propio) | — | — | `<sha>` |

### 5.2 Reglas operativas

- **Ningún asset entra al repo sin fila en `ORIGINS.md`**. Sin fila →
  fail de lint customizado (`scripts/check-asset-registry.ts`) que
  corre en el gate.
- El hash SHA-256 **se verifica** en el lint. Si cambia el contenido
  del fichero sin actualizar el hash, fail: obliga a decisión explícita
  ("actualicé el sprite, reviso licencia").
- **CC0 es obligatorio para v1 pública**. Cualquier otra licencia
  (CC-BY, CC-BY-SA, comercial) se rechaza en el lint salvo override
  explícito del Director humano con nota en commit.
- IA generativa con licencia ambigua (modelos entrenados sobre
  datasets no-CC0) **se marca como pendiente** y se flaguea en el
  VERSION-LOG. No bloquea MVP, sí bloquea distribución comercial.

### 5.3 Reusabilidad

- Los tiles base (hierba, agua, piedra, bosque) vienen del **mismo
  tileset** cuando es posible, para que el estilo visual sea coherente
  sin arte propio.
- Si un tileset CC0 aporta 80% de lo necesario y el 20% restante
  requiere relleno IA, se prefiere **elongar con IA** vía prompt
  "pastiche del estilo de <tileset>" y se registra en `ORIGINS.md` con
  referencia al tileset origen.

### 5.4 Tests / lint

- `pnpm lint:assets` — script que parsea `ORIGINS.md` y verifica:
  - Cada fichero bajo `assets/` tiene fila en el registry.
  - El hash SHA-256 del fichero coincide con el declarado.
  - La licencia es CC0 (lista blanca).
- Entra en el gate de commit junto con `pnpm exec eslint .`.

---

## 8. Estructura de directorios de la edad primigenia

Actualización del layout. Conserva lo reutilizable de v1.0.1 (harness
de tests, PRNG, shadcn UI) y añade las capas nuevas:

```
lib/
  prng.ts              [reutilizado de v1.0.1 — mulberry32 seedable]
  utils.ts             [reutilizado — cn() de shadcn]
  world-gen.ts         [Fase 1] Generador del archipiélago (puro).
  pathfinding.ts       [Fase 3] A* determinista con tie-breaking.
  fog.ts               [Fase 2] Ops sobre el bitmap del fog.
  resources.ts         [Fase 2] Régimen regenerable/agotable.
  npcs.ts              [Fase 2] Shape de NPC: stats, casta, linaje.
  relations.ts         [Fase 4] Grafo NPC×NPC (economía relacional).
  crafting.ts          [Fase 4] Recetas + skills + crafteables umbral.
  blessings.ts         [Fase 5] Catálogo de bendiciones + rasgos.
  village.ts           [Fase 6] Bendiciones de aldea + compounding.
  monument.ts          [Fase 6] Desbloqueo + construcción + transición.
  world-state.ts       [Fase 1] Tipos globales + initialState().
  simulation.ts        [Fase 2+] tick() puro integrador.
  persistence.ts       [Fase 2+] localStorage round-trip con storage key.
  fixtures/
    world-map.v1.json  [Fase 1] Mapa compilado determinista.

scripts/
  compile-world.ts     [Fase 1] Compila fixture desde generateWorld().
  check-asset-registry.ts  [Fase 2+] Lint de assets/ORIGINS.md.

assets/
  ORIGINS.md           Registry obligatorio (§7).
  tiles/               Tileset del mapa.
  sprites/             NPCs, recursos, construcciones.

app/page.tsx           Dashboard — orquesta lib/* y render del mapa.
components/
  map/                 Render pixel art con zoom + drag.
  drafting/            Pantallas de drafting Elegidos + Seguidores.
  hud/                 Indicadores de supervivencia, fe, crónica.
  ui/                  Primitives shadcn (reutilizado).

tests/
  unit/                Un fichero por módulo de lib/.
  integration/         Flujos multi-módulo (tick completo, persistencia).
  fixtures/            Mundos + estados de partida para fixture tests.
  design/              Suite de coherencia (Fase 6+, cross-dominio).
  e2e/                 Playwright. Un spec por flujo de usuario.
```

Regla: los directorios se crean al arrancar el sprint que los llena,
no antes. Carpetas vacías = ruido.

---

## 9. Convenciones de testing específicas de primigenia

### 7.1 Fixtures de mundo

- Los tests que necesitan un mapa usan el fixture real
  (`lib/fixtures/world-map.v1.json`) o un **mini-fixture** 16×16
  declarado inline en el test. Nunca generan mapas random en cada
  corrida — rompe el principio de fixture.
- Los mini-fixtures viven como literales TypeScript para legibilidad.
  Para mapas grandes (>32×32) se externalizan a `tests/fixtures/*.json`.

### 7.2 Determinismo de ticks largos

- **Sprint gate en cualquier fase que toque simulación**: correr 10.000
  ticks con seed fijo y verificar `sha256(state)` al final contra un
  hash guardado en el test. Si el hash cambia, o bien cambia el test
  con justificación explícita, o el código rompió determinismo.
- Estos tests son lentos; viven en `tests/integration/determinism/` y
  se ejecutan en todo el gate (no skippeables).

### 7.3 Tests del grafo de relaciones

Para cada operación que toque `state.relations` (añadir deuda, saldar
favor, propagar herencia):

1. Test unit de pureza: input-output sin mutación.
2. Test de round-trip JSON.
3. Test de orden canónico: la lista de aristas sigue ordenada tras
   la operación.
4. Test de determinismo: mismo input 1.000 veces = mismo output.

### 7.4 Tests del drafting

El drafting inicial (§3.1) es un flujo multi-pantalla con estado
intermedio. Se testea así:

- Unit de cada paso como función pura: `selectArchetype(draftState,
  pick) → draftState'`.
- Unit de invariantes: al acabar el drafting siempre hay 4 Elegidos
  (2M+2F) y 10 Ciudadanos, ni uno más ni uno menos.
- E2E de la UI: el usuario hace 14 selecciones y el clan queda
  plantado en el mapa.

---

## 10. Qué NO hacer en primigenia (específico)

- **No procedural por partida**. El mapa es fixture versionado. Si
  un feature quiere "variantes", se expresan como seeds alternativos
  compilados como fixtures separados, no como randomización en runtime.
- **No reintroducir rival** antes de Fase 7. Está explícitamente
  diferido. Si un módulo de Fase 2-6 "podría usar un rival para tal",
  no — se deja como hook documentado sin implementación.
- **No atajar por pathfinding "suficientemente bueno"**. Si el A*
  diverge entre máquinas, rompe determinismo y bloquea toda la suite.
  Es mejor un A* lento y correcto que uno rápido y no-reproducible.
- **No meter floats en las estructuras de estado**. Coordenadas,
  pesos, costes: todo entero. Los cálculos internos pueden usar
  floats transitorios, pero lo que se persiste es entero.
- **No crear clases ES6 en `lib/`**. Hasta v1.0.1 se respetó — se
  mantiene. El round-trip JSON lo exige.
- **No `fetch` ni `localStorage` dentro de `lib/`**. La persistencia
  entra por `lib/persistence.ts` que expone `serialize(state)` /
  `deserialize(blob)`; el componente React es quien llama a
  `localStorage`.

---

## 11. Cuándo actualizar este anexo

- Al introducir una nueva mecánica cross-módulo que requiera regla
  §A4 extendida (como el grafo de relaciones).
- Al cambiar el pipeline de fixtures o el contrato del generador.
- Al añadir nuevos tipos de assets con licencia no trivial.
- Al bumpear la versión del storage / del fixture del mundo.

Cambios aquí se commitean como `docs(primigenia): <qué convención>`
para que sean triviales de filtrar en blame.

