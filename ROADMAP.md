# ROADMAP — Edad Primigenia

Descomposición en sprints de las **Fases 1-6** de
`vision-primigenia.md §8`. La Fase 7 (migrantes externos + rival) queda
**diferida** y no se planifica aquí.

> **Regla dura**: ninguna fase arranca sin las anteriores cerradas con
> el gate verde (pnpm test + test:e2e + tsc + eslint + build).
> Ningún sprint pasa de 3 días; si pasa, se divide.
>
> Cada sprint lista **un entregable testeable** — el golden test que
> demuestra que el sprint está hecho. Si el entregable no se puede
> redactar como test, el sprint está mal definido.
>
> Todas las referencias `§N.M` son a `vision-primigenia.md`. Todas las
> referencias `decisión #N` son a `DECISIONS-PENDING-primigenia.md`.

## Resumen de fases

| Fase | Tema | Sprints | Dependencias |
|-|-|-|-|
| 1 | Mundo (mapa + render) | 5 | — |
| 2 | NPCs + recursos + fog | 6 | Fase 1 |
| 3 | Movimiento + pathfinding | 4 | Fase 2 |
| 4 | Economía (necesidades + crafting + grafo) | 7 | Fase 3 |
| 5 | Mensaje diario, gratitud y milagros | 4 | Fase 4 |
| 6 | Monumento + bendición de aldea + transición | 4 | Fase 5 |

Total: **30 sprints** antes de cerrar el loop primigenia. Orden
canónico; reordenar requiere firma del Director humano.

---

## Fase 1 — Mundo

**Objetivo**: generar y renderizar un archipiélago balear-ficticio
512×512 determinista. Sin NPCs, sin recursos recolectables aún — solo
el **tablero** donde todo lo demás vivirá. Consume decisiones #8
(mapa), #9 (assets), #21 (régimen de recursos para spawn estático),
#29 (CLAUDE-primigenia).

### Sprint 1.1 — PRNG extensions y tipos del mundo

**Entregable testeable**: `lib/world-state.ts` declara `WorldMap`,
`Tile`, `ResourceSpawn`, `WorldState` (solo mundo, sin NPCs aún). Test
de round-trip JSON del shape vacío.

- Nuevo módulo `lib/world-state.ts` con tipos puros (sin valores).
- Reutilizar `lib/prng.ts` tal cual.
- Añadir helpers en `lib/prng.ts` si hace falta (ej. `nextGaussian`
  determinista — **no** lo añadas si no lo pide el generador real).
- Test unit: `JSON.parse(JSON.stringify(emptyWorld))` estructuralmente
  idéntico.

**Dependencias**: ninguna. Primer sprint absoluto.

### Sprint 1.2 — Generador de archipiélago determinista

**Entregable testeable**: `lib/world-gen.ts` expone
`generateWorld(seed): WorldMap`. Test de regeneración byte-idéntica
1.000 veces con mismo seed. Test de distribución de recursos dentro
de rangos declarados. Test de conectividad intra-isla (A*
placeholder — BFS sobre tiles-tierra basta).

- 3-5 islas principales, siluetas balear-ficticias, tiles 32×32px.
- 6 recursos (leña, piedra, baya, caza, agua, pescado) distribuidos
  con régimen mixto según decisión #21 (agua + pescado continuo;
  leña/baya/caza regenerables; piedra agotable local).
- Generador 100% determinista: `generateWorld(42)` ≡
  `generateWorld(42)` byte a byte.
- NO renderiza. Solo devuelve la estructura.

**Dependencias**: Sprint 1.1.

**Golden test**:
```ts
it('mismo seed → mapa byte-idéntico 1000 veces', () => {
  const a = generateWorld(CANONICAL_SEED);
  for (let i = 0; i < 1000; i++) {
    expect(sha256(generateWorld(CANONICAL_SEED))).toBe(sha256(a));
  }
});
```

### Sprint 1.3 — Compile fixture del mundo

**Entregable testeable**: `scripts/compile-world.ts` ejecuta el
generador y escribe `lib/fixtures/world-map.v1.json`. Test que verifica
que el fixture checkeado en repo coincide con
`generateWorld(CANONICAL_SEED)` — si diverge, alguien tocó el
generador sin recompilar.

- Script standalone ejecutable con `pnpm compile:world`.
- Fixture serializado con tiles empaquetados (base64 de Uint8Array).
- Hash SHA-256 del contenido guardado en `meta.shaHash`.
- `initialState()` lee el fixture (import estático), no llama al
  generador en runtime.

**Dependencias**: Sprint 1.2.

### Sprint 1.4 — Registry de assets y tileset inicial

**Entregable testeable**: `assets/ORIGINS.md` con filas para los
tiles base (hierba, agua, piedra, bosque, playa, montaña) desde
Kenney CC0. Script `pnpm lint:assets` verifica que todo asset bajo
`assets/` tiene fila y hash correcto. Fail del lint si falta fila.

- Descargar tileset CC0 (Kenney "Tiny Town" o equivalente
  mediterráneo).
- Crear `assets/tiles/` y `assets/ORIGINS.md`.
- Lint script `scripts/check-asset-registry.ts` que parsea la tabla.
- Integrar lint en el gate (`pnpm test && pnpm lint:assets`).

**Dependencias**: Sprint 1.3 (necesita tiles definidos).

**Consume**: decisión #9.

### Sprint 1.5 — Render pixel art con zoom + drag

**Entregable testeable**: `app/page.tsx` renderiza el mapa del
fixture. E2E Playwright: carga página, verifica que canvas/imagen
presente, arrastra mouse para pan, scroll para zoom. Snapshot visual
del viewport inicial (test de regresión).

- Componente `components/map/MapView.tsx` con canvas HTML5 o SVG.
- Zoom continuo (rueda del ratón) con clamp [map-completo, 40
  tiles visibles].
- Drag libre con bordes clampados al mapa.
- Renderiza tiles desde el fixture + tileset CC0.
- Sin NPCs, sin recursos visibles (vendrán en Fase 2).
- Test E2E: `map-view.spec.ts` con drag + zoom + snapshot.

**Dependencias**: Sprint 1.4.

**Consume**: decisión #8.

**Gate de Fase 1**: los 5 sprints verdes, fixture compilado en repo,
mapa renderizado, E2E de pan/zoom verde. Si el render tiene lag
perceptible a 60fps con el mapa completo cargado, flag de
performance y posible sprint 1.6 de optimización antes de Fase 2.

---

## Fase 2 — NPCs, recursos, fog-of-war

**Objetivo**: el clan existe en el mapa. El jugador drafftea 14 NPCs,
los ve plantados, ve recursos solo donde ha descubierto, y el estado
es persistible round-trip. Nada de movimiento autónomo aún — eso es
Fase 3.

Consume decisiones #2 (drafting Elegidos), #3 (drafting Seguidores),
#4 (castas), #5 (herencia Elegido), #7 (niveles individuales), #10
(régimen recursos), #14 (linajes de viento), #28 (política esclavitud,
aviso inicial).

### Sprint 2.1 — Shape de NPC y tipos de clan

**Entregable testeable**: `lib/npcs.ts` declara `NPC`, `Archetype`,
`Casta`, `Linaje`, `Stats`. `state.npcs` añadido a `WorldState`. Test
de round-trip JSON con 14 NPCs de prueba. Test de invariantes de
casta (solo Elegido / Ciudadano / Esclavo).

- NPC con: `id`, `sex`, `casta`, `linaje`, `archetype` (solo Elegidos),
  `stats: { supervivencia, socializacion }` (economía relacional llega
  en Fase 4), `skills: { crafting, hunting, … }`, `position: {x,y}`,
  `visionRadius`, `parents: [id, id] | null`.
- Todos ids string estables; nada de referencias por objeto.

**Dependencias**: Fase 1 completa.

### Sprint 2.2 — Drafting Bloque A (4 Elegidos)

**Entregable testeable**: `lib/drafting.ts` expone `startDraft()` y
`pickArchetype(draft, slot, archetype): draft'`. Unit tests: 10 pt
totales, 2M+2F obligatorio, 8 arquetipos con coste 2-4, validación
del presupuesto. E2E de 4 pantallas encadenadas.

- 8 arquetipos: Cazador, Recolector, Curandero, Artesano, Líder,
  Scout, Tejedor, Pescador.
- Coste por arquetipo fijado en constante (2-4 pt).
- UI: `components/drafting/ChosenDraft.tsx`.

**Dependencias**: Sprint 2.1.

**Consume**: decisión #2.

### Sprint 2.3 — Drafting Bloque B (10 Ciudadanos)

**Entregable testeable**: `pickFollower(draft, tier, candidate): draft'`.
10 pantallas pick-1-of-10 con tiers 3/3/2/2 (excelentes, buenos,
regulares, malos). Los candidatos se generan determinísticamente desde
`draft.seed + tier + pantallaIdx`. Test de variedad: distribución de
stats entre tiers.

- Pool de nombres por linaje (catalán-balear) desde constante
  `LINAJES_NAMES`.
- Cada ciudadano arranca como Ciudadano (nunca Esclavo en drafting —
  decisión #6).
- Los 10 pertenecen a 2-4 linajes de viento (aleatorio por seed,
  Tramuntana reservado para Elegidos — decisión #14).
- UI: `components/drafting/FollowerDraft.tsx`.

**Dependencias**: Sprint 2.2.

**Consume**: decisiones #3, #14.

### Sprint 2.4 — Aviso inicial sobre esclavitud

**Entregable testeable**: pantalla de inicio antes del drafting con
aviso editorial sobre representación histórica de la esclavitud (#28).
E2E: el aviso aparece, requiere click explícito para continuar, no se
skipea con Escape.

- Copy del aviso pasa por el Director Creativo (placeholder editorial
  hasta firma explícita).
- Persiste dismissal: si el usuario ya la aceptó, no reaparece
  (`localStorage` key `primigenia.disclaimer.v1`).
- Test E2E que fuerza primera carga y verifica bloqueo.

**Dependencias**: Sprint 2.3.

**Consume**: decisión #28.

### Sprint 2.5 — Recursos con régimen y spawn estático

**Entregable testeable**: `lib/resources.ts` con tipos de recurso y
régimen (regenerable / agotable). `state.world.resources` poblado al
arrancar con los spawns del fixture. Tick puro avanza timers de
regeneración (sin movimiento de NPCs aún).

- 6 recursos con timers según decisión #21: leña 60d, baya 45d, caza
  1/100d por manada, agua infinito, pescado infinito con
  sobrepesca-check, piedra agotable local.
- Timer en enteros (días = N ticks simulación).
- Unit test: `tick(state)` 60 días avanza y vuelven a estar
  disponibles los regenerables.

**Dependencias**: Sprint 2.1.

**Consume**: decisión #21.

### Sprint 2.6 — Fog-of-war seedable

**Entregable testeable**: `lib/fog.ts` con `markDiscovered(fog, x, y,
radius): fog'`. Bitmap 512×512 empaquetado, round-trip JSON vía base64.
Idempotencia: marcar dos veces el mismo tile produce el mismo bitmap.
Test integration: 1.000 ticks con NPCs estáticos generan bitmap
byte-idéntico entre corridas.

- Vive en `state.world.fog` como `Uint8Array` serializado a base64.
- Al final de cada tick, `computeDiscoveries(state)` itera NPCs vivos
  y marca el círculo en torno a cada uno.
- Render del fog en `MapView`: capa semitransparente encima de tiles
  no descubiertos.

**Dependencias**: Sprints 2.1, 2.5, 1.5.

**Consume**: decisión #10.

**Gate de Fase 2**: partida iniciada con 14 NPCs plantados, recursos
distribuidos en el mapa, fog oculta lo no descubierto, persistencia
round-trip. Balance numérico: el clan arranca en un punto costero
con al menos 3 recursos dentro del radio inicial.

---

## Fase 3 — Movimiento y pathfinding

**Objetivo**: los NPCs se mueven autónomamente. El clan deriva por el
mapa según necesidades básicas (ir a recurso visible, volver a la
fogata). Sin crafting ni necesidades complejas aún — eso es Fase 4.

Consume decisión #29 (pathfinding determinista según CLAUDE-primigenia).

### Sprint 3.1 — A* determinista

**Entregable testeable**: `lib/pathfinding.ts` expone `findPath(map,
start, end, prngState): { path, prngState' }`. Unit tests:
- Mismo input → misma ruta byte a byte 1.000 veces.
- Ruta óptima sobre mini-fixture conocido.
- "Sin ruta" determinista cuando desconectado.
- Tie-breaking: dos nodos con mismo `f` desempatan por `h → (x,y) →
  prng`, nunca por inserción.

- Grid 4-conexo. Heurística Manhattan.
- Cap de 10.000 nodos expandidos.
- Priority queue ordenada por `(f, h, x, y)`.

**Dependencias**: Fase 2 completa.

**Consume**: CLAUDE-primigenia §2.

### Sprint 3.2 — Necesidades básicas y decisión de destino

**Entregable testeable**: `lib/needs.ts` expone
`decideDestination(npc, state): Position`. Unit tests: NPC hambriento
va al recurso comestible más cercano visible; NPC sin hambre vuelve a
la fogata o al grupo. Sin crafting — solo ir/volver.

- Supervivencia <40 → prioridad comida.
- Sed alta → prioridad agua.
- Noche → prioridad fogata.
- Otro caso → seguir al grupo (centroide de NPCs vivos).
- Determinismo: desempates via `prng_cursor`.

**Dependencias**: Sprint 3.1, Sprint 2.5.

### Sprint 3.3 — Tick de movimiento integrado

**Entregable testeable**: `lib/simulation.ts` `tick(state)` mueve cada
NPC 1 tile por tick en dirección de su destino computado. Test
integration: 10.000 ticks sin NPCs atrapados en bucles; clan se
desplaza de forma coherente tras agotar recurso local.

- Integra `decideDestination` + `findPath` + mover-1-tile.
- Caché de rutas intra-tick (se descarta al final).
- Colisión suave: si dos NPCs colisionan, uno espera (decidido
  determinísticamente por id).

**Dependencias**: Sprints 3.1, 3.2.

### Sprint 3.4 — Nomadismo visible (render + crónica básica)

**Entregable testeable**: E2E Playwright — arrancar partida, dejar
correr 30s de tiempo real, verificar que el grupo se movió en el
mapa. Snapshot visual del mapa post-movimiento distinto del inicial.

- NPCs rendrizados como sprites encima del mapa.
- Crónica placeholder: 3-5 plantillas partisanas ("los nuestros se
  movieron hacia el Mestral", "encontraron una cueva").
- Sin LLM aún — plantillas string con interpolación.

**Dependencias**: Sprint 3.3, Sprint 1.5.

**Gate de Fase 3**: 10.000 ticks deterministas sin atrascos. Clan se
mueve, descubre mapa, el jugador ve nomadismo emergente. Sin
objetivos aún — solo existir.

---

## Fase 4 — Economía (necesidades + crafting + grafo relacional)

**Objetivo**: el clan recolecta recursos, craftea, genera deudas y
favores entre NPCs. Los 5 crafteables umbral funcionan. Al cierre,
una partida de 20.000 ticks determinista construye los 5 crafteables
por sí sola sin intervención del jugador.

Consume decisiones #7 (niveles individuales con feed-forward), #10
(régimen recursos), #11 (crafting con skill + herencia 50%), #12 (5
crafteables umbral), #20 (costes concretos), #21 (regeneración), #26
(umbral fogata 10 noches), CLAUDE-primigenia §1 (grafo NPC×NPC).

### Sprint 4.1 — Necesidades conectadas a recolección

**Entregable testeable**: supervivencia y socialización varían por
tick según consumo real de recursos. Unit: NPC sin comida 3 días
baja supervivencia de 80 a ≤40. Unit: feed-forward hambre-alta →
irritabilidad → socialización cercanos baja.

- Hambre consume comida del NPC (piel/baya/caza).
- Sed consume agua.
- Frío consume refugio (si existe) o baja supervivencia.
- Acoplamientos declarativos en `lib/needs.ts`, no spaghetti en tick.

**Dependencias**: Fase 3 completa.

**Consume**: decisión #7.

### Sprint 4.2 — Recolección activa (recurso → inventario)

**Entregable testeable**: NPC sobre tile con recurso lo recoge al
tick. Inventario por NPC (entero, no stack infinito). Test
integration: 1.000 ticks, el clan acumula 50+ bayas en inventarios.

- `lib/resources.ts` expone `harvest(resource, collector, state):
  state'` puro.
- Inventario NPC limitado (capacity 5 items por slot, 4 slots).
- Cargas excedentes se quedan en el tile para otros.

**Dependencias**: Sprint 4.1.

### Sprint 4.3 — Skills individuales con herencia 50%

**Entregable testeable**: cada NPC tiene `skills: { hunting, crafting,
gathering, fishing }` (0-100). Hijo nace con skill = (padre + madre)/2
± ruido determinista. Unit: generación 1 (drafteada) vs generación 2
(nacida): correlación de skills > 0.3 sobre 100 NPCs.

- Decaimiento por desuso (tick-based).
- Skill afecta tasa de recolección / caza / crafteo.

**Dependencias**: Sprint 4.2.

**Consume**: decisión #11.

### Sprint 4.4 — Grafo de relaciones NPC×NPC

**Entregable testeable**: `state.relations: Array<Edge>` ordenada
canónicamente. Ops puras: `addDebt`, `settleFavor`, `recordSaved`.
Unit: round-trip JSON. Unit: orden canónico preservado tras cada op.
Integration: 10.000 ticks mantienen orden canónico (test sha256).

- Edge: `{ from, to, type: 'debt' | 'favor' | 'kinship' | 'saved',
  weight: int, createdAtTick: int, expiresAtTick?: int }`.
- Índice derivado en memoria (no persistido).
- Feed-forward: deuda impagada baja socialización de ambos
  extremos.

**Dependencias**: Sprint 4.3.

**Consume**: CLAUDE-primigenia §1, decisión #7.

### Sprint 4.5 — Recetas de crafting y árbol umbral

**Entregable testeable**: `lib/crafting.ts` con 5 recetas fijas
(refugio, fogata permanente, piel/ropa, herramienta sílex, despensa)
con los costes de decisión #20. Unit: recetas descubribles cuando el
NPC tiene los ingredientes. Unit: completar una receta consume
inventarios y añade el crafteable al mundo (o al NPC).

- Cada receta: `{ id, inputs: {leña, piedra, piel}, daysWork,
  minSkill, output }`.
- Crafteo descubrible: el NPC con skill suficiente y materiales a
  mano inicia la receta sin bendición.
- Los 5 costes son los de la tabla #20 (refugio 15L+8P+3piel 5d;
  fogata 5L+15P 3d; piel 2piel 2d; herramienta 2L+5P 2d; despensa
  10L+6P 4d).

**Dependencias**: Sprints 4.2, 4.3.

**Consume**: decisiones #11, #12, #20.

### Sprint 4.6 — Fogata permanente + 10 noches

**Entregable testeable**: el clan duerme alrededor de la fogata
permanente. Contador persistente `state.world.consecutiveNightsAtFire:
int` sube si ≥ 10 NPCs duermen en radio ≤ 3 tiles; se reinicia a 0 si
una noche falla. Integration: test con clan forzado a dormir 10
noches cumplido → contador = 10.

- "Dormir": NPC en radio ≤ 3 tiles de la fogata al cierre del día.
- Reinicio si rompe la cadena.
- Prepara el desbloqueo del monumento (§5 primigenia, Fase 6).

**Dependencias**: Sprint 4.5, Sprint 3.3.

**Consume**: decisión #26.

### Sprint 4.7 — Partida autónoma llega a los 5 crafteables

**Entregable testeable**: test integration heavy — 20.000 ticks con
clan drafteado por defecto y **sin bendiciones**, construye los 5
crafteables umbral. Asserción sha256 del estado final anclada al test
(regresión). Si falla, o se revalida el test (balance cambió) o se
arregla el código.

- Este es el **balance pass inicial** de Fase 4. Los costes de #20
  pueden requerir ajuste si ni con 20k ticks llega. Se flaguea en
  VERSION-LOG.

**Dependencias**: Sprints 4.1-4.6.

**Gate de Fase 4**: economía cerrada, grafo relacional vivo, partida
autónoma llega al umbral del monumento sin intervención del jugador.
Balance de costes validado o flagueado explícitamente.

---

## Fase 5 — Mensaje diario, gratitud y milagros

**Objetivo**: existe el verbo del jugador, en dos capas. La continua
(mensaje diario al amanecer, 6 intenciones + silencio) y la escasa
(5 milagros raros que cuestan gratitud acumulada del clan). Al
cierre: el mismo mensaje sobre NPCs con niveles distintos produce
trayectorias medibles distintas (Pilar 1), y los milagros son
accesibles solo si el clan agradece.

Consume decisiones **#30** (verbo = pulso diario fijo, supersede
#22), **#30.a/b/c** (plantilla de 6 intenciones, modal que pausa,
interpretación por NPC), **#31** (gratitud emergente, supersede
#23), **#32** (5 milagros raros con herencia 50%), **#18** (derrota
espiritual por último Elegido sin hijo).

### Sprint 5.1 — Modal diario + 6 intenciones + pausa determinista

**Entregable testeable**: al amanecer (tick `% TICKS_PER_DAY === 0`)
la simulación se pausa y emite un modal con las 6 intenciones +
"guarda silencio hoy". Unit: `prng_cursor` no avanza mientras el
modal está abierto; la intención elegida se graba en
`state.village.activeMessage`; recargar partida mid-modal re-abre
el modal sin avanzar tick.

- `lib/messages.ts` expone `MESSAGE_INTENTS` con los 6 ids
  (auxilio, coraje, paciencia, encuentro, renuncia, esperanza) +
  `'silence'`.
- `state.village.activeMessage: MessageIntent | 'silence' | null`
  (null fuera de modal, valor tras selección).
- `state.village.messageHistory: Array<{ day: number, intent:
  MessageIntent | 'silence' }>` en orden canónico ascendente.
- E2E Playwright: arrancar partida, llegar al primer amanecer,
  verificar aparición del modal, seleccionar "Coraje", verificar
  que el tick siguiente corre.

**Dependencias**: Fase 4 completa (la economía debe estar viva para
que las intenciones tengan sobre qué empujar).

**Consume**: decisiones #30, #30.a, #30.b. CLAUDE-primigenia §3.

### Sprint 5.2 — Motor de interpretación emergente por NPC (Pilar 1)

**Entregable testeable**: cada NPC "lee" la intención activa del día
según su estado individual (niveles 0-100 de supervivencia +
socialización + economía relacional) y su linaje. `lib/messages.ts`
expone `interpretIntent(intent, npc, state): NPCBehaviorBias`. Unit
de Pilar 1: mismo intent sobre dos NPCs con niveles/linajes
opuestos → `NPCBehaviorBias` medible-distintos. Integration: 5.000
ticks con mismo mensaje produce trayectorias finales divergentes
entre NPCs con perfil distinto.

- Tabla de interpretación puramente declarativa (`INTERPRETATION_RULES:
  Record<IntentId, Rule[]>`), no lógica hardcoded.
- `NPCBehaviorBias` modula `decideDestination`, `harvest`,
  `cohabitation`, etc. Hooks declarativos, mismos sitios donde en
  v1.0.1 entraban los rasgos.
- Crónica narra 2-3 interpretaciones más relevantes del día
  (§3.7 vision-primigenia); el resto se consulta vía ficha del NPC.

**Dependencias**: Sprint 5.1, Sprint 4.1 (niveles individuales).

**Consume**: decisión #30.c. vision-primigenia §3.7, §2 Pilar 1.

### Sprint 5.3 — Pool de gratitud (ganancia, pérdida, techo)

**Entregable testeable**: `lib/gratitude.ts` expone
`computeGratitudeDelta(tick, events, activeMessage, state): number`
puro. `state.village.gratitude: number` entero, clamp [0,
`GRATITUDE_CEILING`]. Unit: mismo evento benéfico a un NPC con
mensaje activo → delta positivo; sin mensaje → delta 0. Unit:
saturación en ceiling; clamp en 0 al restar más de lo disponible.
Unit: silencio acumulado N días drena según curva declarada.
Integration: 10.000 ticks con/sin mensajes dan pools finales
distintos medibles.

- Constantes (`GRATITUDE_CEILING`, deltas por tipo de evento, curva
  de silencio) en `lib/gratitude.ts`, auditables, sin spaghetti.
- Muerte de Elegido: `delta = -ELEGIDO_DEATH_PENALTY`.
- Suma determinista conmutativa sobre enteros; reordenar eventos
  del tick no cambia el pool final.
- HUD muestra `Gratitud: N / CEILING` en Sprint 5.4 (la UI la añade
  el siguiente sprint).

**Dependencias**: Sprint 5.1 (activeMessage existe), Sprint 4.1
(niveles + eventos "benéficos" identificables).

**Consume**: decisión #31. CLAUDE-primigenia §2.

### Sprint 5.4 — Los 5 milagros con coste en gratitud + herencia 50%

**Entregable testeable**: `lib/miracles.ts` expone `MIRACLES_CATALOG`
con los 5 milagros de decisión #32 (Hambre sagrada 30, Ojo de halcón
40, Voz de todos 50, Manos que recuerdan 60, Corazón fiel 80). Cada
entrada tiene `id`, `name`, `cost`, `effect: NPCModifier`,
`domain`. Unit: ejecutar un milagro gasta `cost` del pool si hay
suficiente, rechaza si no. Unit: milagro añade rasgo permanente al
NPC; máx 3 rasgos simultáneos, el 4º reemplaza al más antiguo con
confirmación. Unit: herencia 50% determinista vía `prng_cursor`
(1.000 nacimientos → ratio [0.45, 0.55]).

- Panel `components/miracles/MiraclePanel.tsx` (UI escasa — los
  milagros no son el verbo principal, el modal diario sí).
- HUD `components/hud/GratitudeMeter.tsx` muestra `Gratitud: N /
  CEILING`; warning si queda 1 Elegido sin descendiente (decisión
  #18, derrota espiritual).
- E2E: seleccionar un NPC, abrir panel, elegir milagro disponible,
  confirmar → gratitud baja, rasgo persiste, crónica narra.

**Dependencias**: Sprints 5.2 (bias declarativo sobre el que
enganchar rasgos), 5.3 (pool de gratitud funcional).

**Consume**: decisiones #18, #32. vision-primigenia §3.8.

**Gate de Fase 5**: pulso diario operativo (modal pausa determinista
+ 6 intenciones + silencio). Pilar 1 cuantificado: mismo mensaje,
NPCs con niveles distintos → trayectorias medibles-distintas.
Gratitud acumulable con economía predecible. Los 5 milagros
gastables con coste y herencia 50% funcionando. Derrota espiritual
rastreable aunque no dispare fin de partida.

---

## Fase 6 — Monumento y bendición de aldea (cierre del loop)

**Objetivo**: cerrar el loop primigenia. El clan cumple las 3
condiciones del monumento, lo construye, el jugador elige una
bendición de aldea (de las 4 disponibles en primigenia), y la partida
transiciona con cinemática a un placeholder de edad tribal.

Consume decisiones #15 (condiciones monumento), #16 (bendición aldea
compounding), #24 (4 bendiciones primigenia), #25 (sin reelección),
#26 (coste del monumento).

### Sprint 6.1 — Desbloqueo del monumento

**Entregable testeable**: `lib/monument.ts` expone
`isMonumentUnlocked(state): boolean` puro. Unit: las 3 condiciones se
verifican (5 crafteables + 10 noches + 1 creyente por linaje
presente). Unit: quitando cualquiera de las 3, devuelve false.
Integration: partida autónoma de Fase 4.7 con 10 noches extra
desbloquea el monumento.

**Dependencias**: Fase 5 completa.

**Consume**: decisiones #15, #26.

### Sprint 6.2 — Construcción del monumento

**Entregable testeable**: cuando está desbloqueado, el clan arranca
la construcción. Consume 200 piedra + 50 leña + 60 días-hombre
(decisión #26). El clan sigue operativo durante la obra. Integration:
test que corre construcción y verifica progreso por tick. Test de
interrupción: si el clan colapsa (§7 derrotas), el monumento queda
como ruina (flag en `state.world.ruin`).

- Progreso trackeable en HUD.
- Ruina como elemento narrativo preservado entre partidas futuras
  (en esta versión, solo flag en estado).

**Dependencias**: Sprint 6.1.

**Consume**: decisión #26, vision-primigenia §5.

### Sprint 6.3 — Selección de bendición de aldea + compounding

**Entregable testeable**: al completar el monumento, el jugador ve
pantalla de elección con **4 bendiciones disponibles** (recolecta,
fertilidad, salud, reconocimiento — decisión #24). No hay reelección
(decisión #25). Unit: la bendición elegida se guarda en
`state.village.blessings: BlessingId[]` y aplica su efecto primigenia
al tick siguiente.

- `lib/village.ts` con el catálogo de 4 bendiciones primigenia.
- Efecto primigenia aplicado (no compounding aún — compounding
  activo al pasar a la siguiente era, que en primigenia es
  placeholder).
- Reservadas tribal+ (comercio, producción, longevidad) no
  aparecen en la UI.

**Dependencias**: Sprint 6.2.

**Consume**: decisiones #16, #24, #25.

### Sprint 6.4 — Cinemática de transición + placeholder tribal

**Entregable testeable**: E2E completo del loop primigenia —
desde drafting hasta cinemática de transición. El E2E corre en <
2min simulados (no real-time), construye el monumento acelerado y
verifica que aparece la cinemática + placeholder "Edad Tribal —
en construcción".

- Cinemática: 3-5 frames de texto en voz partisana, configurable.
- Placeholder tribal: pantalla con `data-testid="tribal-placeholder"`
  que confirma la transición. La edad tribal real (re-construcción
  sobre la base de sistemas primigenia) es trabajo post-MVP.

**Dependencias**: Sprint 6.3.

**Gate de Fase 6 y cierre primigenia**: un jugador puede pasar de
drafting a cinemática en una partida completa. Suite de coherencia
(§tests/design) escrita y verde. VERSION-LOG redactado. Balance pass
final. Si pasa: v1-primigenia shipable en beta pública.

---

## Guardrails globales

- **Orden canónico inviolable**. Fase N+1 no arranca si Fase N no
  está en verde (gate completo: pnpm test + test:e2e + tsc + eslint
  + build + lint:assets).
- **Tamaño de sprint**: si un sprint necesita > 3 días, se divide en
  N.M-a / N.M-b antes de empezarlo. Nunca un sprint abierto varios
  días.
- **Rival diferido**: no reintroducir hasta Fase 7 (post-primigenia).
  Si Fase 4-6 "pide" un rival, se deja hook vacío documentado sin
  implementación.
- **Balance revalidable**: los números de decisiones #20, #21, #26
  son provisionales. Primer playtest real tras Fase 4 revisa
  costes/tiempos; cambios quedan anclados en `DECISIONS-PENDING-primigenia.md`.
- **CLAUDE-primigenia.md es ley**: pathfinding, fog, fixture, grafo
  NPC×NPC, assets registry — no se adelantan convenciones, no se
  inventan mecánicas fuera del doc.
- **Batches anti-timeout** (CLAUDE.md §Ejecución por batches): todo
  sprint que escriba docs extensos, suites de tests largas o refactor
  cross-módulo se corta en batches con los thresholds duros.

## Próximos pasos (post-Fase 6)

- **Polish & Debug pass v1-primigenia**: gate completo, revisión de
  TODOs, balance desde perspectiva del jugador, VERSION-LOG
  redactado.
- **Fase 7 (diferida)**: migrantes externos, reaparición del dios
  rival, edad tribal reconstruida sobre la base primigenia.
- **Edades posteriores** (bronce, clásica, medieval, industrial,
  atómica): fuera de scope de este ROADMAP. Cada una tendrá su
  propio doc cuando toque.

