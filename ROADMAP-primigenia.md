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
| 5 | Bendiciones y rasgos | 5 | Fase 4 |
| 6 | Monumento + bendición de aldea + transición | 4 | Fase 5 |

Total: **31 sprints** antes de cerrar el loop primigenia. Orden
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
