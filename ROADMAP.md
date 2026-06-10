# ROADMAP — Proyecto Civilización (Guerrilla Edition)

> Estado vivo del proyecto. Se reescribe, no se acumula. _Última actualización: 11-06-2026
> (sprint 05 "El Laboratorio" COMPLETO en código: flags + quickstart 🔬 + 5 fixes auditados +
> conexión; suite 858/858, e2e ciclo completo verde; falta el playtest de validación de Toni)._

## Dirección (decidida 10-06-2026): C — "El Loop primero"
Dos fases: **día** (simulación determinista) ↔ **preparación** (pausa al anochecer; el jugador
asigna designios/upgrades por NPC vía UI concreta = *susurro estructurado*). Sigue siendo
god-game; el LLM queda solo para prosa narrativa. Hook = arquitecto de arquetipos: personalizar
la estrategia y ver que se cumple. El detalle vive fuera del repo (nodo ICM, ver CLAUDE.md).

## Hitos Técnicos Prioritarios
- [x] **Fricción Divina (Crisis)**: tickFractures puro, 7 tipos, mitigación por susurros/milagros,
  dawn integration. Endurecido tras review adversarial: cascada de hambre solo con hambre real,
  terrainTags inmutable, colapso de obra mitigado conserva la obra. TDD: 21 tests de diseño + 6 de regresión.
- [x] **Rendimiento Visual (LOD)**: niveles de detalle en MapView para zoom out estratégico.
- [x] **Motor en Web Worker**: pipeline de simulación fuera del hilo principal de UI.
- [x] **Memoria Mecánica v2**: la crónica modula skills de forma TRANSITORIA — `effectiveSkill`
  puro en el punto de uso (harvest/build/decisiones); las skills almacenadas jamás incluyen el
  bonus (`computeMemorySkillBonuses` intacto; `applyMemoryBonusesToSkills` eliminado). §A4.
- [x] **Sprint 02 — Máquina de fases**: `phase: day|preparation` (+`phasedMode` compat),
  `applyAssignments` puro (3 dominios), pipeline del amanecer explícito (`DAWN_PIPELINE`,
  orden como dato), historial de designios (partida = seed + historial), UI mínima
  (toggle Fases + botón Amanecer). 16 tests de diseño; ciclo de 5 días byte-idéntico.
- [x] **Sprint 03 — XP por actividad**: `NPC.skillXP` (centésimas enteras) acumula práctica
  intra-día (harvest + construcción — muertos el redondeo y el float §A4); consolidación al
  amanecer (paso `consolidar-xp`); designio = foco ×1.5 en su dominio. Muerte social ya no es
  instantánea (3 amaneceres de tensión). Modelo completo: skill_efectiva = base(+xp) ± memoria.
- [x] **Sprint 04a — Informe + designios en el mapa (sim-side)**: skill `exploration` propia,
  `dailyActivity` por NPC, `DawnReport` como estado (paso `informe-amanecer` real), movimiento
  por designio = bias del tiempo libre (las urgencias mandan; sin designio → byte-idéntico).
- [x] **Sprint 04b — UI de preparación**: pantalla de preparación a pantalla completa (informe
  del amanecer + grid de cartas con retrato-linaje/edad/skill dominante + selector de designio +
  Amanecer), pausa REAL en preparación (mata una carrera worker-vs-amanecer), e2e del ciclo
  completo (4.3 min, lento a propósito) + test de tech-unlock real (sustituye al e2e tautológico).
- [x] **Sprint 05 — "El Laboratorio"** (redefinido 10-06-2026 tras playtest: "no sientes conexión;
  el MVP no es mínimo ni debuggeable"). Código completo 11-06-2026:
  - [x] `features` flags por subsistema (8 gates: climate/animals/reproduction/items/legends/
    miracles/influence/fractures; default todo ON, compat byte a byte; DAWN_PIPELINE declarativo;
    milagros OFF = no-op puro). 18 tests de diseño.
  - [x] Quickstart **🔬 Laboratorio**: `makeLaboratorioState(seed)` — pangea 32×32, 4 elegidos
    (2M/2F), phasedMode ON, los 8 flags OFF, solo núcleo del loop. Dos días en ~0.4s. Card en
    el draft. 13 tests de diseño + smoke browser.
  - [x] Fixes de needs auditados + revisión adversarial: miedo cíclico (se disipa de día),
    histéresis recolector (se suelta con inventario lleno), forrajeo nocturno (de noche al fuego;
    sin fogata se sigue forrajeando). Era-loop verde otra vez (la causa real: HEAD pasaba gracias
    al bug del miedo; el fix liberó al clan y destapó la economía deficitaria del mundo de test).
  - [x] Deadlock económico de arranque: la cola de construcción se bloqueaba en la cabecera (fogata
    in-construible en mundos sin madera tapaba todo) → primer kind ausente CONSTRUIBLE. Auditoría
    propia (seeds 7/11/13 del laboratorio).
  - [x] Agua: el seguidor de obra copiaba el vector del capataz sin validar (entraba al agua) y
    el A* no daba salida desde origen intransitable (varado hasta morir). Auditoría propia (3 contratos).
  - [x] CONEXIÓN: `cumplido` por NPC + contadores en DawnReport; el cumplimiento se juzga contra
    el designio de AYER (fix de atribución en applyAssignments); el informe se computa al ENTRAR
    en preparación (día recién cerrado, no el anterior); voz del clan en 2ª persona en la UI
    («Hicimos lo que pediste» / «Te fallamos en…») + ✓/✗ por NPC. e2e ciclo completo verde.
  - [ ] **Validación de los 10 días EN EL LABORATORIO** (playtest de Toni; criterios en el nodo ICM).
  - Diferido: TICK_BATCH (solo si el modo clásico lo pide), telemetría dev, consola divina (06).
- [ ] **Dioses Rivales** (Fase 7 original): pospuesto tras validar el loop.

## Estado Actual
- Motor Determinista (§A4): ✅ Operativo (suite 858/858, tsc=0, eslint=0 errores, e2e ciclo verde)
- Features-flags por subsistema: ✅ Operativo (laboratorio = casi todo OFF; clásico intacto)
- Sistema de Tech (unlocks por condición): ✅ Operativo · ⚠️ `tech.wisdom` es contador MUERTO
  (nada lo incrementa; la generación de sabiduría SHAMAN_HUT/curanderos no existe — deuda
  destapada al matar el e2e tautológico, candidata post-validación)
- Memoria Colectiva (Logs): ✅ Operativo (v2 transitoria vía effectiveSkill)
- Poda Burocrática: ✅ Completada
- Deuda de tipos (NPCStats/NPCInventory literals): ✅ Resuelta (SSOT defaultStats/makeEmptyInventory)
- Deuda registrada (reviews + auditorías 10/11-06-2026): stats float en estado (miedo ±0.5/0.25,
  supervivencia 0.15 — pre-existente, candidato a centésimas enteras como skillXP); test
  reproduction-OFF depende del seed del fixture (hoy no-vacuo, verificado); world-gen 32×32:
  seeds sin islas (2/20/22 lanzan en pickClanSpawn) y ~37% de pangeas sin madera (sin fogata
  posible); destino social sin filtro de alcanzabilidad (un varado se vuelve imán); anchor de
  findBuildSite puede caer en SHALLOW_WATER; perf A* (open.sort por expansión + maxExpand=1000
  quemado en cada fallo → sim >1000x más lenta en mapas acuosos; maxExpand < tiles del mundo
  puede dar null para destinos alcanzables en 512×512 — candidato al "clavado en tierra");
  tickAnimals muta stats in situ (violación §A4 señalada por la auditoría del agua);
  carrera UI toggle-vs-worker (updateState pisado por TICK_SUCCESS en vuelo, visible bajo carga).

**Meta: De protector de pantalla a juego de estrategia. Primero que enganche lo pequeño.**

## Derivas registradas (no activas)
- **LLM como Director**: dirección documentada en su día; el PoC **nunca llegó a código**
  (lib/divine-directives no existe). Absorbida por la decisión C: su "ritual del anochecer" ES
  la fase de preparación, con UI concreta en vez de LLM. El LLM queda para prosa de crónica.
- **Modelo espacial EU4** (regiones de recursos → administrativas → ciudad; mapa por overlays):
  dirección aceptada, construcción post-validación del loop. Registro en el nodo ICM.
