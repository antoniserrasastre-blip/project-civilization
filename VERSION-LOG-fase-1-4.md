# VERSION-LOG · Fases 1-4 — Mundo, clan, movimiento, economía

> Borrador retroactivo del Director Creativo, 2026-04-21.
> Log consolidado de las 4 Fases sin gameplay-divino (pre-Fase 5).
> Son las capas infraestructurales + autónomas que hacen posible
> que el verbo del jugador (Fase 5) y el cierre del loop (Fase 6)
> existan. Fases cerradas en commits `b9f0b0c` (1) / `6378dd8` (2)
> / `90f66c9` (3) / `dfa4bbc` (4). Sin playtest humano bloqueante
> — son capas técnicas; la perspectiva del jugador aplica sobre
> todo a Fases 2 y 4.

## Qué hacen estas Fases

### Fase 1 — Mundo determinista (5 sprints)

El tablero. Sin NPCs, sin recursos recolectables — solo el
archipiélago balear-ficticio 512×512 generado por `generateWorld`,
renderizado en pixel art 32×32 con pan + zoom. Assets CC0
procedurales propios (placeholders — acción humana pendiente
para reemplazar por tileset Kenney cuando haya red).

- `lib/prng.ts` mulberry32 seed+cursor (reutilizado).
- `lib/world-gen.ts` 100% determinista — mismo seed → mapa
  byte-idéntico 1000 veces.
- Fixture del mundo compilada a `lib/fixtures/world-map.v1.json`
  para que tests y UI arranquen sin regenerar.
- Registry de assets en `assets/ORIGINS.md` + `pnpm lint:assets`
  valida hash SHA-256 y licencias.
- `components/map/MapView.tsx` con viewport pan + zoom + clamp;
  lógica extraída en `lib/viewport.ts` con 14 unit tests.

### Fase 2 — Clan, recursos, fog (6 sprints)

Pobladores. El mundo deja de estar vacío: el jugador dibuja su
clan via drafting de 2 bloques (4 Elegidos + 10 Ciudadanos),
los recursos spawnean con régimen decidido (#21), y la fog-of-war
cubre el mapa hasta que los NPCs lo revelan.

- `lib/npcs.ts` NPC shape: id, nombre (pool catalano-balear),
  sexo, casta, linaje, `stats` (supervivencia / socialización /
  economía), `traits[]`, inventario, position, alive.
- `lib/drafting.ts` bloque A (4 Elegidos): 2M+2F, 10 puntos a
  repartir entre 8 arquetipos, coste 2-4 pt por arquetipo.
  `CHOSEN_SLOTS=4`, `CHOSEN_BUDGET=10 pt`.
- Bloque B (10 Ciudadanos): 4 tiers decrecientes (3-3-2-2
  candidatos), `TIER_CANDIDATE_COUNT=10`. Pick-1-of-N por tier.
- `lib/resources.ts` 6 recursos con régimen mixto (ver Balance).
- `lib/fog.ts` bitmap seedable, revelado dinámico según
  posiciones vistas.
- `lib/disclaimer.ts` disclaimer editorial sobre esclavitud
  (decisión #28) — splash al arrancar partida nueva, dismissible
  pero no ocultable.

### Fase 3 — Movimiento y pathfinding (4 sprints)

Los NPCs cobran vida. Hasta Fase 2 eran tokens en (0,0); Fase 3
les da patas y cerebro mínimo.

- `lib/pathfinding.ts` A* 4-conexo con tie-breaking seedable
  (no por `Math.random`) para que 2 rutas empatadas se resuelvan
  determinista.
- `lib/needs.ts` decisión de destino basada en necesidades
  básicas (hambre, sed, frío) + `DestinationContext` — primer
  "quiero ir a X" autónomo del clan.
- `lib/simulation.ts` `tick()` integra movimiento, recursos
  (harvest placeholder), y fog — los NPCs nómadas revelan el
  mapa según pasan.
- `lib/chronicle.ts` crónica partisana inicial (plantillas
  "los hijos de Tramuntana llegaron al río"). LLM provider
  diferido a post-primigenia.
- Render: NPCs visibles como puntos de color por linaje en
  `MapView`.

### Fase 4 — Economía (7 sprints)

El loop emergente. Los NPCs dejan de andar a lo loco y empiezan
a sostenerse a sí mismos: recolectan → tienen inventario
individual → craftean cosas → se relacionan → duermen juntos.

- `lib/needs.ts` ampliado — necesidades conectadas a recolección
  activa (feed-forward: hambre baja → busca baya o caza).
- `lib/harvest.ts` recolección con inventario por NPC (cap
  individual) + consumo interno.
- `lib/inheritance.ts` herencia de skills + traits 50%
  determinista — el PRNG del state decide, byte-idéntico.
- `lib/relations.ts` grafo NPC×NPC con 3 tipos de arista
  (familia, compañía, deuda).
- `lib/crafting.ts` 5 recetas umbral con coste (leña + piedra
  + pieles) + días-hombre + skill mínimo.
- `lib/nights.ts` fogata permanente + contador de noches
  consecutivas con ≥ 10 NPCs durmiendo alrededor (pre-requisito
  para el monumento de Fase 6).
- **Integration test canario**: `tests/integration/autonomous-building.test.ts`
  — clan de 14 en mundo rico construye los 5 crafteables en
  < 20k ticks SHA-anclado (post-Fase 6 polish:
  `6fd15afa42b854984a13cfcc76f866b9acf753a045073a6660fd1eec52069bb0`).

## Por qué y cómo encajan con la visión

Referencia: `vision-primigenia.md §3.1-3.6` (drafting + mapa +
recursos + crafting) y §A4 de la visión global (contratos duros).

- **Pilar 1 — Mismo don, distinto resultado** (germen plantado).
  Fase 4 introduce skills individuales con herencia 50%. El
  pilar no "opera" todavía (aún no hay don del dios — llega en
  Fase 5), pero la maquinaria está: dos hermanos con mismo padre
  heredan rasgos distintos según el tiro del PRNG.
- **Pilar 2 — Mundo cambia sin tocarlo** (probado). El
  integration test de Fase 4 corre 20k ticks sin **ninguna
  intervención divina** y produce un clan que construye cosas.
  Es la validación mecánica del pilar.
- **Pilar 3 — Fe como economía narrativa** (pospuesto). Fases
  1-4 no tienen fe/gratitud — llega en Fase 5. Aquí se construye
  solo el *sustrato demográfico* (creyentes reales vivos).
- **Pilar 4 — Anti-presión del rival** (diferido). Cero
  referencias en código. Clean.
- **Pilar 5 — Linaje reina** (plantado en Fase 2). Los linajes
  de los 14 fundadores (Tramuntana, Migjorn, Ponent, Gregal,
  Garbi, Mestral, Xaloc, Llevant) nacen con el drafting y se
  propagan por `relations.ts` (familia). La casta Elegido
  hereda por un progenitor (decisión #5) — implementado en
  inheritance.

## Perspectiva del jugador

Aplica parcialmente: Fase 1 no es jugable sin NPCs; Fase 3 es
jugable como espectáculo (ver el clan moverse) pero sin toma de
decisión; Fase 2 y Fase 4 sí dan momentos accionables.

1. **Primer minuto** (Fase 2 en adelante):
   - Fase 1: *(no jugable aún en esta Fase)* — solo un mapa
     bonito con pan/zoom.
   - Fase 2: el jugador ve el disclaimer editorial sobre
     esclavitud, lo lee o lo cierra, y entra al **drafting**.
     Reparte 10 puntos entre 8 arquetipos con presupuesto duro.
     Después pick-1-of-10 por 4 tiers de Ciudadanos. La primera
     decisión densa del juego.
   - Fase 3-4: los 14 drafteados aparecen en el archipiélago y
     empiezan a moverse por su cuenta. La primera vez que el
     jugador ve un NPC ir a buscar agua sin instrucción genera
     el "ah, vale, esto vive" — **es la promesa del Pilar 2
     materializándose por primera vez**.
2. **Quinto minuto**:
   - Fase 3: el clan se dispersa buscando recursos. Crónica
     narra "los hijos de Tramuntana llegaron al río" en voz
     partisana. El jugador solo observa.
   - Fase 4: los NPCs empiezan a recolectar, el inventario
     comunal sube, aparece el primer refugio. El jugador ve el
     contador "noches consecutivas en fogata: 2/10" y empieza
     a seguir el progreso. **Aún no tiene ningún verbo** — el
     mensaje diario llega hasta Fase 5.
3. **Cuándo sonríe**: *(parcial, pendiente playtest humano)*.
   Hipótesis confirmada por el integration test: cuando el clan
   construye el primer crafteable (refugio) sin que el jugador
   haya dicho nada. Prueba mecánica de autonomía.
4. **Cuándo se aburre o frustra**: *(parcial, pendiente playtest
   humano)*. Hipótesis: en Fase 3-4, sin verbo del jugador, el
   "observar" se puede volver largo. Es intencionado por diseño
   (Pilar 2), pero el tempo importa. En Fase 5 se añade el modal
   diario que rompe la contemplación — por eso esas fases son
   consecutivas en el ROADMAP, no intercambiables.

## Balance con números concretos

Fases 1 y 3 no introducen balance numérico. Fase 2 y 4 sí.

### Fase 2 — drafting

- `CHOSEN_SLOTS = 4` (Elegidos).
- `CHOSEN_BUDGET = 10 pt` (puntos a repartir).
- 8 arquetipos de Elegido con coste `2-4 pt`.
- `TIER_CANDIDATE_COUNT = 10` (Ciudadanos) distribuidos en 4
  tiers (3-3-2-2 candidatos, pick 1).
- Reparto de género en Elegidos: **2M + 2F** forzado.

### Fase 4 — economía

- `TICKS_PER_DAY = 24`. Unidad base temporal.
- Régimen de regeneración (decisión #21):
  | Recurso | Régimen | Tiempo |
  |-|-|-|
  | Leña | Regenerable | 60 días/árbol |
  | Baya | Regenerable estacional | 45 días/cosecha |
  | Caza | Regenerable dinámico | 1 individuo / 100 días |
  | Piedra | Agotable local | — (no regenera) |
  | Agua | Continuo | Infinito |
  | Pescado | Continuo | Infinito (con zona sana) |
- Recetas umbral (wood/stone/pieles, daysWork, minSkill):
  | Crafteable | W | S | P | Días | Skill |
  |-|-|-|-|-|-|
  | Refugio | 15 | 8 | 3 | 5 | 10 |
  | Fogata permanente | 5 | 15 | 0 | 3 | 5 |
  | Piel / ropa | 0 | 0 | 2 | 2 | 10 |
  | Herramienta sílex | 2 | 5 | 0 | 2 | 15 |
  | Despensa | 10 | 6 | 0 | 4 | 10 |
  | **Total clan** | **32** | **34** | **5** | **16** | — |
- **Canario**: 14 NPCs en mundo rico construyen los 5 en
  < 20k ticks autónomos (~833 días in-game con `TICKS_PER_DAY=24`).

## 🚩 Flags para supervisión humana

Agrupados por Fase. Los que más impactan al jugador van con
🟠 balance; los estructurales con 🟡 diseño.

- 🚩 🟡 **Fase 1 — Assets placeholders procedurales**
  (`NOTES-OVERNIGHT.md` §Bloqueo Sprint 1.4). Los 6 tiles
  (water/shore/grass/forest/mountain/sand) son SVGs procedurales
  CC0 propios. El diseño canónico era tileset Kenney. **Acción
  sugerida**: cuando el Director humano tenga entorno con red,
  descargar Kenney-medieval o similar, sustituir SVGs,
  actualizar hashes en `ORIGINS.md` y re-correr
  `pnpm lint:assets`. Hasta entonces el render funciona pero
  se ve "de juego de colegio".
- 🚩 🟡 **Fase 1 — E2E del MapView ready-for-future**.
  `tests/e2e/map-view.spec.ts` escrito pero jamás ejecutado
  (sandbox sin red a `cdn.playwright.dev`). Reintentado
  2026-04-20, sigue 403. **Acción sugerida**: igual que arriba
  — correr `pnpm test:e2e` cuando haya red. Si algún test falla,
  son bugs latentes de pan/zoom, no del harness.
- 🚩 🟠 **Fase 2 — Balance del drafting sin playtest**.
  10 pt entre 4 Elegidos con costes 2-4 pt: el mínimo posible
  (4 × 2 = 8) deja 2 pt ociosos; el máximo (4 × 4 = 16) no se
  puede pagar. El sweet spot fuerza al jugador a renunciar a un
  arquetipo caro. **Acción sugerida**: validar en playtest si
  la decisión se siente densa o asfixiante. Si asfixia, subir
  presupuesto a 12 pt.
- 🚩 🟡 **Fase 3 — Crónica sin variedad narrativa**. Las
  plantillas de `chronicle.ts` son fijas; con 20k ticks el
  jugador ve la misma frase muchas veces. El LLM provider real
  está diferido a post-primigenia (v1.1+). **Acción sugerida**:
  si el playtest reporta "la crónica se repite", añadir 3-5
  plantillas adicionales por evento sin tocar el provider.
- 🚩 🟠 **Fase 4 — Recetas con skill mínimo 15 (herramienta
  sílex)**. Si el drafting produce un clan con todos skills < 15,
  la herramienta no se fabrica y bloquea los 5 crafteables. El
  integration test arrancó con clan "rico" — no se ha probado
  un clan adverso. **Acción sugerida**: introducir un test de
  "clan con skill medio 8" y confirmar que progresa (la skill
  sube con la práctica) o flaguear que el drafting debe
  garantizar ≥ 1 NPC con skill ≥ 15 inicial.
- 🚩 🟡 **Fase 4 — Grafo de relaciones sin efecto visible aún**.
  `lib/relations.ts` registra familia/compañía/deuda, pero
  ningún sistema todavía actúa sobre esas aristas (Sprint 4.4
  las pobla; 4.5-4.7 no las consumen explícitamente). Es un
  germen para Fase 5+ (socialización, rituales). **Acción
  sugerida**: ninguna — es deuda válida. Solo confirmar en
  Fase 7+ que se consume.
- 🚩 🟠 **Fase 4 — 20k ticks / 833 días es medida de mundo
  rico**. Con mundo medio o escaso podría duplicarse. El
  jugador esperando ~3h reales (asumiendo tick ~= 0.5s) para ver
  el monumento desbloquearse puede ser demasiado. **Acción
  sugerida**: primer playtest mide "minutos reales hasta ver los
  5 crafteables en un run típico"; si supera 30 min, bajar
  costes de crafting o subir caps de inventario.

## Cierre

Las Fases 1-4 son la **infraestructura silenciosa** del juego.
Son poco cinematográficas pero todo lo que sigue (verbo divino,
monumento, era tribal) se apoya en ellas. Con este log
consolidado + los borradores de Fase 5 y Fase 6, la serie
editorial de cierre v1-primigenia está **completa en borrador**.

Para firmar v1-primigenia (recordatorio desde
`VERSION-LOG-fase-6.md`):

1. Playtest humano ≥ 20 min con reporte en `NOTES-OVERNIGHT.md`.
2. Resolución o aceptación documentada de los flags 🚩 acumulados
   (este log + Fase 5 + Fase 6).
3. E2E Playwright corrido en entorno con red.
4. `tests/design/` poblado con al menos 3 dominios críticos.
5. Esta serie de borradores promovida a **firmados** (cambio de
   cabecera y eliminación de las marcas `(pendiente playtest
   humano)` en las viñetas).

Hecho eso, Fase 7 (diferida: migrantes + rival) queda habilitada
para planificación con `DECISIONS-PENDING.md #33`
resuelta por delante (política de migración de estado primigenia
→ tribal — abierta en paralelo a este log).

## Triado de flags — 2026-04-22 (Director Creativo)

> Barrido editorial de los 7 flags 🚩 de arriba. Estados:
> **✅ cerrado** (resuelto por implementación o decisión posterior),
> **🔧 programado** (hay sprint pendiente que lo aborda),
> **🕐 vivo** (sigue abierto, requiere playtest o acción futura).

| # | Flag | Estado | Próxima acción / cierre |
|-|-|-|-|
| 1 | 🟡 Fase 1 — Assets placeholders procedurales | 🔧 programado | Sprint **#6 ASSETS-IMPORT** (`SPRINTS.md`), pausado hasta firma humana de **decisión #34** (recién abierta 2026-04-22 con default B = CC BY 4.0 + atribución). |
| 2 | 🟡 Fase 1 — E2E del MapView ready-for-future | 🕐 vivo | Parcialmente mitigado: el gate local se reproduce con `PLAYWRIGHT_CHROMIUM_PATH` (commit `claude/fix-gate-primigenia`). Cierre real cuando el entorno con red ejecute `pnpm exec playwright install chromium`. No bloquea Sprint #1. |
| 3 | 🟠 Fase 2 — Balance del drafting sin playtest | 🕐 vivo | Revalidar en el **playtest humano** post Sprint #1.5 / #2. Si el sweet spot 10 pt asfixia, subir a 12 pt en un commit de balance puntual. |
| 4 | 🟡 Fase 3 — Crónica sin variedad narrativa | 🕐 vivo | Tocable en Sprint **#2 LEGIBILIDAD-MVP** (introduce `ChronicleFeed`). Si el jugador reporta repetición, añadir 3-5 plantillas por evento sin esperar al LLM provider real. |
| 5 | 🟠 Fase 4 — Recetas con skill mínimo 15 (herramienta sílex) | 🕐 vivo | Test adverso pendiente (clan con skill medio 8). No bloquea; cabe dentro del Polish & Debug pass entre versiones mayores. |
| 6 | 🟡 Fase 4 — Grafo de relaciones sin efecto visible | 🕐 vivo | Deuda válida de diseño. Se consume realmente en Fase 7+ (migrantes, rituales). No requiere acción durante primigenia. |
| 7 | 🟠 Fase 4 — 20k ticks / 833 días puede ser demasiado lento | 🕐 vivo | Instrumentar *"minutos reales hasta ver los 5 crafteables en un run típico"* durante el playtest del humano. Si > 30 min, bajar costes de crafting o subir caps de inventario. |

**Resumen**: 0 cerrados, 1 programado (#1 con #34 + Sprint #6), 6
vivos — todos requieren playtest humano o entorno con red para su
cierre definitivo. Ninguno bloquea el Sprint #1 REFACTOR-SUSURRO-FE.
