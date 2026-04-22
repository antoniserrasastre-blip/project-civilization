---
tipo: sprint-queue
estado: propuesta Director Creativo — ingeniero puede resecuenciar con justificación
fecha: 2026-04-22
base: ROADMAP-primigenia.md + playtest 2026-04-22 + pase editorial 1c643f2
---

# Sprints pendientes — Edad Primigenia

Queue secuencial. El ingeniero arranca por el #1 y baja; si detecta
dependencia técnica que invierte el orden, flag en `NOTES-OVERNIGHT.md`.

**Regla**: una fase se cierra solo con contract-complete **Y**
playtest humano. El playtest del 2026-04-22 expuso por qué (spawn
fantasma en Fase 2 con tests verdes — ver commit `11f2e95`).

---

## 1. REFACTOR-SUSURRO-FE (4–6 días) · crítico, cierra Fase 5

**Meta**: implementar §3.7'/§3.7b firmado. Reemplazar pulso diario
forzoso por susurro persistente + moneda Fe.

**Archivos**:
- `lib/world-state.ts` — añadir `village.faith: number` (init `30`),
  `village.silenceGraceDaysRemaining: number` (init `7`). Bump
  `STORAGE_KEY` `.v2` → `.v3`.
- `lib/faith.ts` **nuevo** — `faithPerDay(vivos) = sqrt(vivos)`;
  constantes `FAITH_COST_CHANGE = 80`, `FAITH_COST_SILENCE = 40`,
  `FAITH_CAP = 160`, `FAITH_INITIAL = 30`. Puro §A4.
- `lib/messages.ts` — `activeMessage` persiste entre ticks (ya no se
  resetea al amanecer); renombrar `archiveAtDawn` → `archiveOnChange`.
- `lib/simulation.ts` — acumular Fe por tick según vivos actuales,
  aplicar cap; mantener determinismo byte-idéntico.
- `components/era/DailyModal.tsx` — renombrar a `WhisperSelector.tsx`;
  ya no aparece forzado al amanecer; botón "Hablar al clan" siempre
  visible en HUD abre el selector.
- `components/era/HUD.tsx` — barra Fe con marcas visuales en 40 y 80.
- `components/era/GameShell.tsx` — tick automático (no forzado por
  click); flujo: botón → selector → susurro activo persistente.
- `lib/gratitude.ts` — **sub-ajuste obligatorio**: bajar
  `GRATITUDE_RATES.perThrivingNpcWithMessage` del `1` actual a algo
  del orden de `0.25` (o el rate que el ingeniero calibre). Con el
  rate actual, 10 NPCs thriving × 20 ticks = cap de 200 **en menos
  de un día in-game** — el playtest #1.5 se ensuciaría con findings
  sobre gratitud en vez de Fe. Target jugable: primer milagro barato
  (~30) alcanzable en 2-3 días de susurro alineado. El número final
  lo calibra #1.5; aquí pones uno razonable.
- **Distinción silencio-por-default vs silencio-elegido**: la lógica
  de drain de gratitud (§3.7 original) **solo aplica al primero**,
  no al segundo. El silencio elegido ya paga 40 Fe; añadir drain
  encima es doble castigo. Implementación sugerida: flag
  `village.silenceWasChosen: boolean` o análogo, consultado por el
  tick antes de drenar. Firma del Director en `vision-primigenia.md
  §3.7b` (bloque "Silencio elegido NO dispara el drain").

**Tests Red primero**:
- `tests/unit/faith.test.ts` — fórmula, cap, monotonic, aliveCount=0.
- `tests/unit/simulation.test.ts` (extensión) — Fe acumula en ticks,
  descuenta 80 al cambiar, 40 al silenciar, primer susurro gratis,
  gracia 7 días aplica solo con `messageHistory.length === 0`.
- `tests/unit/gratitude.test.ts` (extensión) — con el rate ajustado,
  cap de 200 se alcanza en ≥ N ticks (N dimensionado para 2-3 días
  in-game de susurro alineado, no 20 ticks); drain NO dispara con
  silencio elegido; drain SÍ dispara con silencio por default tras
  7 días de gracia.
- `tests/unit/messages.test.ts` (actualizar) — `activeMessage`
  persiste sin reset; `archiveOnChange` archiva al cambiar.
- `tests/e2e/susurro.spec.ts` — botón "Hablar al clan" siempre
  visible; selector con 7 opciones; susurro persiste entre ticks.

**Cierre**:
- Gate verde completo.
- Playtest humano: cargar, esperar 7+ días silencio → gratitud no
  baja (gracia). Día 8 → baja. Primer susurro gratis aplica.
  Intentar cambio sin 80 Fe → rechazo visible. Tras acumular 80,
  cambio aplica y susurro persiste.

---

## 1.5 PLAYTEST-SUSURRO (0.5 día + posible ajuste) · gate humano post-refactor

**Meta**: validar que la mecánica firmada del susurro persistente +
Fe se siente como la visión describe (*"pocas decisiones con mucho
peso"*, §3.7) antes de construir LEGIBILIDAD y FICHA encima. Sin
esto, los sprints siguientes se asientan sobre balance no verificado.

**Sin archivos que tocar, sin tests Red**. Es un gate de playtest
humano, no un sprint de coding. Los ajustes que surjan son commits
de constantes sobre `lib/faith.ts` o similar.

**Protocolo del Director humano**:
- Arranca `pnpm dev` sobre el commit de cierre de #1.
- Juega 30+ minutos reales. Observa específicamente:
  - Fe crece a ritmo razonable (no saturación rápida ni goteo seco).
  - Coste 80 para cambiar se siente pesado pero no punitivo.
  - Silencio deliberado (40 Fe) tiene uso táctico real — no solo es
    "cambio más barato".
  - Primer susurro gratis se explica solo sin tooltip.
  - Gracia de 7 días se nota (no hay presión al segundo día) pero no
    se estira (al octavo, la penalty se empieza a notar).
- Produce `PLAYTEST-susurro-fe.md` con formato:
  - ✅ Se siente bien: [list]
  - 🟡 Menor: [list con propuesta de ajuste numérico]
  - 🔴 Major: [list que bloquea avance a #2]

**Cierre**:
- Cero 🔴 findings en el playtest.
- 🟡 findings convertidos en commits de ajuste (constantes de
  `lib/faith.ts` o similar) antes de arrancar #2.
- Firma explícita del humano: *"la mecánica se siente como la visión
  describe"*.

**Si hay 🔴**: bucle de ajuste sobre #1 antes de seguir. El objetivo
del gate es no descubrir bugs de sensación con LEGIBILIDAD-MVP o
FICHA-AVENTURERO ya encima — son caros de rebobinar.

---

## 2. LEGIBILIDAD-MVP (2–3 días) · cross-fase UI · sin esto el juego no se explica

**Meta**: el jugador entiende qué susurro elegir y por qué. Hoy son
7 palabras abstractas sin contexto. Va antes que FICHA-AVENTURERO
porque el jugador necesita entender el verbo global antes de usar el
verbo individual (milagros).

**Archivos**:
- `components/era/WhisperSelector.tsx` — añadir tooltip en cada
  intención con su `tonalidad que empuja` (texto de §3.7 tabla).
- `components/era/ClanContext.tsx` **nuevo** — panel pequeño arriba
  del selector: "hambre media X%, Y NPCs heridos, Z días desde
  último nacimiento". Compuesto por helper puro sobre `GameState`.
- `components/era/ChronicleFeed.tsx` **nuevo** — feed lateral con
  `state.village.messageHistory` + eventos recientes de `chronicle.ts`
  si los hay en state.
- `lib/chronicle.ts` — verificar si `narrate(ev)` se está llamando
  durante `tick()` y si sus resultados se persisten en state. Si no,
  cablearlo (§A4 intacto, sin side effects).

**Tests Red primero**:
- `tests/unit/clan-context.test.ts` — helper `summarizeClanState`
  devuelve hambre media correcta, count de heridos, días desde
  último nacimiento.
- `tests/e2e/legibilidad.spec.ts` — hover sobre opción Coraje muestra
  tooltip con texto de §3.7.

**Cierre**:
- Gate verde.
- Playtest: el jugador puede responder *"¿por qué elegí Coraje?"*
  sin abrir la visión.

---

## 3. FICHA-AVENTURERO (2–3 días) · cross-fase UI · cierra UX milagro

**Meta**: card al clicar NPC con stats + milagros + heridas + linaje.
Sin esto el jugador no puede conceder milagros (son sobre un NPC
concreto). Va tras LEGIBILIDAD porque depende de que el jugador ya
entienda la mecánica global de susurros y gratitud.

**Archivos**:
- `components/era/NpcSheet.tsx` **nuevo** — modal lateral con ficha.
  Props: `npc: NPC`, `village: VillageState`, `onClose()`,
  `onGrantMiracle(miracleId)`.
- `components/era/GameShell.tsx` — cablear `onNpcClick` de MapView
  (prop ya existe por RENDER-NPCS) → abrir NpcSheet.
- `components/era/HUD.tsx` o `MiracleCatalog.tsx` — dentro de la
  ficha, sección "milagros disponibles" con los 5 de §3.8; coste en
  gratitud; botón habilitado solo si `village.gratitude >= cost` y
  NPC tiene < 3 rasgos.

**Tests Red primero**:
- `tests/unit/miracles.test.ts` (extensión) — aplicar milagro a NPC
  descuenta gratitud, añade rasgo, respeta max 3.
- `tests/e2e/ficha.spec.ts` — click NPC → ficha visible → intentar
  milagro sin gratitud = deshabilitado → con gratitud suficiente =
  se aplica y rasgo persiste.

**Cierre**:
- Gate verde.
- Playtest: clicar un NPC, ver stats, conceder "Ojo de halcón",
  verificar que el rasgo persiste en su ficha tras recargar.

---

## 4. NPC-NAMES (1 día) · reabre Fase 2 · gap de shape

**Meta**: NPCs tienen nombre del pool catalano-balear §9. Cierra el
compromiso honesto de RENDER-NPCS (tooltip cayó a `npc.id`).

**Archivos**:
- `lib/names.ts` **nuevo** — arrays por género con ~30-50 nombres
  catalano-baleares (Joan, Miquel, Antònia, Margalida, Bartomeu,
  Francina, Tomeu, etc.). Helper `pickName(seed, sex, cursor)` puro.
- `lib/npcs.ts` — añadir campo `name: string` a `NPC`. Bump
  `STORAGE_KEY` si no se ha bumpeado ya en sprint #1.
- `lib/drafting.ts` — asignar `name` en `finalizeBlockA` y
  `finalizeBlockB` usando `pickName` con cursor distinto por NPC.
- `components/map/MapView.tsx` — tooltip pasa a `${npc.name},
  ${npc.linaje}`.

**Tests Red primero**:
- `tests/unit/names.test.ts` — `pickName` determinista, sin colisión
  dentro de un mismo seed para 14 NPCs.
- `tests/unit/default-clan.test.ts` (extensión) — cada NPC tiene
  `name` no vacío, únicos entre sí.

**Cierre**:
- Gate verde.
- Playtest: hover sobre un NPC muestra "Joan, tramuntana" (no id).

---

## 5. SPAWN-COSTERO proper (2–3 días) · reabre Fase 2 · reemplaza patch quick

**Meta**: spawn de NPCs en tile de costa elegido automáticamente por
seed, respetando principio "una civ = una isla" hacia Fase 7. Sustituye
el hardcode `(85, 73)` del patch `11f2e95`.

**Archivos**:
- `lib/spawn.ts` **nuevo** — `findIslands(worldMap)` detecta
  componentes conexos de tiles non-water; `pickClanSpawn(seed, islands)`
  selecciona UNA isla y dentro de ella un tile `shore` o costero.
  API pensada para Fase 7 (pedir otra isla distinta al rival).
- `lib/default-clan.ts` — eliminar constante `SPAWN_CENTER`; llamar
  a `pickClanSpawn(seed, WORLD)` para obtener centro y distribuir
  los 14 NPCs en tiles de tierra alrededor.
- `components/map/MapView.tsx` — eliminar `offsetX/Y: -300` hardcoded;
  computar offset inicial dinámicamente para centrar el spawn del
  clan (pasa como prop desde `GameShell`).

**Tests Red primero**:
- `tests/unit/spawn.test.ts` — `findIslands` sobre fixture detecta
  N islas esperadas; `pickClanSpawn` determinista por seed; dos seeds
  distintos producen islas distintas en ≥80% de los casos.
- `tests/unit/default-clan.test.ts` (actualizar) — posiciones de
  NPCs son todas land (no water) sobre fixture.

**Cierre**:
- Gate verde.
- Playtest: `/?seed=1` vs `/?seed=2` → el clan aparece en islas
  visibles distintas.

---

## 6. ASSETS-IMPORT (2–3 días) · bloqueado hasta firma decisión #34

**Meta**: importar Ancient Greeks terrain + units filtrados (CC BY 4.0)
para sustituir placeholders procedurales y markers primitivos.

**Pre-requisito**: firma humana de decisión #34 en
`DECISIONS-PENDING-primigenia.md`. Hasta entonces sprint en pausa.

**Archivos** (post-firma):
- `assets/terrain/` — PNGs de Ancient Greeks tileset_32px/terrain_32px.
- `assets/units/` — subset de units filtrados (farmers, workers,
  animals, boats, carts; **excluir** heavy/light infantry y cavalry
  por scope creep Pilar 4).
- `assets/ORIGINS.md` — filas con SHA-256, autoría (marceles, cimeto),
  licencia CC BY 4.0, URL fuente.
- `scripts/lint-assets.mjs` — verificar ya existe; validar nuevos.
- `components/map/MapView.tsx` — renderer de terreno carga tileset
  en lugar de colores planos de `tile-colors.ts`.
- `lib/npc-marker.ts` — opcional: flag para usar sprite en vez de
  shape geométrica (retrocompatible).

**Tests Red primero**:
- `pnpm lint:assets` verde sobre los nuevos assets.
- `tests/unit/asset-registry.test.ts` (existente) — hashes nuevos
  validan.

**Cierre**:
- Gate verde.
- Playtest: mapa ya no se ve en colores planos; NPCs con sprites
  reales.

---

## 7. RENDER-VIDA extendido (3–5 días) · cross-fase UI · depende de #6

**Meta**: sprites visibles de recursos recolectables, animales
(salvajes/tameables), barcos, edificios, crafteables en construcción.
Hoy el mapa solo muestra terreno + NPCs — el resto del mundo es
invisible.

**Depende**: ASSETS-IMPORT (#6) cerrado.

**Archivos** (scope — el ingeniero decide layout exacto):
- `lib/resource-marker.ts` **nuevo** — helper análogo a `npc-marker.ts`
  para recursos cosechables.
- `lib/structure-marker.ts` **nuevo** — helper para edificios/crafteables.
- `components/map/MapView.tsx` — añadir capas de render sobre terreno:
  resources, structures, animals, boats. Orden z predecible.
- Helpers de hit-testing para click sobre cada capa (abre pop-up con
  info del recurso / edificio).

**Tests Red primero**:
- `tests/unit/resource-marker.test.ts` — análogos a `npc-marker.test.ts`.
- `tests/unit/structure-marker.test.ts` — ídem.
- `tests/e2e/mundo-vivo.spec.ts` — cargar `/?seed=42`, verificar que
  el canvas muestra múltiples tipos de entidad, no solo NPCs.

**Cierre**:
- Gate verde.
- Playtest: "el mundo parece vivo" — hay que ver qué está creciendo,
  dónde están los recursos, cómo avanza la construcción.

---

## Totales

**8 sprints** (7 de ingeniería + 1 gate humano), ~15–20 días
ingeniería full-time bajo TDD + ~0.5–1.5 días de playtest del humano
sobre #1.5.

**Orden propuesto**: 1 → 1.5 → 2 → 3 → 4 → 5 → (firmar #34) → 6 → 7.
Legibilidad antes que ficha porque el jugador entiende el verbo
global (susurro) antes de usar el verbo individual (milagro).

**Paralelizable** tras cerrar #1 y #1.5: #2 y #3 pueden solaparse si
el ingeniero tiene bandwidth, vigilando conflicto en
`components/era/GameShell.tsx`. **#4 NO se paraleliza** con #1 —
ambos bumpean `STORAGE_KEY` y colisionarían; #4 arranca solo tras
merge de #1.

### Matriz de compatibilidad concurrente

Cuando hay múltiples agentes activos, esta tabla define qué sprints
pueden correr en paralelo y cuáles no. Pares no listados son ✅
(territorios disjuntos).

| Par | Status | Razón |
|-|-|-|
| #1 ↔ #4 | ❌ serial | Ambos bumpean `STORAGE_KEY`. Uno a la vez. #4 arranca tras merge de #1. |
| #1 ↔ #6 | ❌ | #6 bloqueado por firma decisión #34. No aplica. |
| #1 ↔ #7 | ❌ | #7 depende de #6. |
| #5 ↔ #6 | ❌ | Ídem #6 bloqueado. |
| #6 ↔ #7 | ❌ | #7 depende de #6. |
| #1 ↔ #2 | ⚠️ coordinar | Ambos tocan `components/era/WhisperSelector.tsx` (#1 lo renombra, #2 añade tooltips). #2 arranca idealmente tras #1. |
| #1 ↔ #3 | ⚠️ coordinar | Ambos tocan `components/era/GameShell.tsx` y `HUD.tsx`. Rebases frecuentes o serializar. |
| #2 ↔ #3 | ⚠️ coordinar | Comparten `GameShell.tsx`. |
| #4 ↔ #5 | ⚠️ coordinar | Comparten `components/map/MapView.tsx`. |

**Regla derivada**: dos ❌ no arrancan al mismo tiempo bajo ningún
concepto. Dos ⚠️ pueden arrancar en paralelo si los agentes acuerdan
explícitamente (comentario en NOTES-OVERNIGHT.md bajo bloque
`> [Coordinación N↔M]:`). Cualquier par ✅ corre libre.

**Playtest humano obligatorio** entre #1 y #2 (sprint 1.5 lo
formaliza), y al cierre de cada sprint downstream. Gate de tests
solo certifica que no rompiste nada; playtest certifica que lo
nuevo funciona.
