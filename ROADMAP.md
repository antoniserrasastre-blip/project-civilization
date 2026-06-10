# ROADMAP — Proyecto Civilización (Guerrilla Edition)

> Estado vivo del proyecto. Se reescribe, no se acumula. _Última actualización: 10-06-2026
> (consolidación: Fricción Divina + Memoria Mecánica v2 commiteadas tras review adversarial;
> gates verdes 780/780; dirección C decidida)._

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
- [ ] **Sprint 05 — "El pulso del día"** (habilita la validación): TICK_BATCH en el worker
  (hoy ~3 min/día en browser por clonado de estado por tick) + botón "correr hasta el anochecer"
  (juego opcionalmente por turnos). Tras cerrar: **validación de los 10 días** ("¿el día 11 te
  apetece?" + criterios prefijados en el nodo ICM).
- [ ] **Dioses Rivales** (Fase 7 original): pospuesto tras validar el loop.

## Estado Actual
- Motor Determinista (§A4): ✅ Operativo (suite 780/780, tsc=0, eslint=0 errores)
- Sistema de Tech (unlocks por condición): ✅ Operativo · ⚠️ `tech.wisdom` es contador MUERTO
  (nada lo incrementa; la generación de sabiduría SHAMAN_HUT/curanderos no existe — deuda
  destapada al matar el e2e tautológico, candidata post-validación)
- Memoria Colectiva (Logs): ✅ Operativo (v2 transitoria vía effectiveSkill)
- Poda Burocrática: ✅ Completada
- Deuda de tipos (NPCStats/NPCInventory literals): ✅ Resuelta (SSOT defaultStats/makeEmptyInventory)

**Meta: De protector de pantalla a juego de estrategia.**

## Derivas registradas (no activas)
- **LLM como Director**: dirección documentada en su día; el PoC **nunca llegó a código**
  (lib/divine-directives no existe). Absorbida por la decisión C: su "ritual del anochecer" ES
  la fase de preparación, con UI concreta en vez de LLM. El LLM queda para prosa de crónica.
- **Modelo espacial EU4** (regiones de recursos → administrativas → ciudad; mapa por overlays):
  dirección aceptada, construcción post-validación del loop. Registro en el nodo ICM.
