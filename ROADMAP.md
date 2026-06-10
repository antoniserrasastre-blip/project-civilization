# ROADMAP — Proyecto Civilización (Guerrilla Edition)

> Estado vivo del proyecto. Se reescribe, no se acumula. _Última actualización: 2026-06 (Fricción Divina + Memoria Mecánica integradas; gates limpios; PoC básico Deriva LLM Director implementado: ritual diario + agente de dominio con widgets y railguard).

## Hitos Técnicos Prioritarios

- [x] **Fricción Divina (Crisis)**: Sistema de Fracturas/Eventos negativos implementado (tickFractures puro, 7 tipos, mitigación por susurros/milagros, dawn integration, TDD con 21 tests de diseño).
- [x] **Rendimiento Visual (LOD)**: Implementar niveles de detalle en el MapView para permitir zoom out estratégico.
- [x] **Motor en Web Worker**: Mover el pipeline de simulación fuera del hilo principal de UI.
- [x] **Memoria Mecánica**: Expandido el impacto de la crónica en habilidades de NPCs (bonos globales puros ± de skills derivados de impacto activo de chronicle entries; computeMemorySkillBonuses + applyMemoryBonusesToSkills; integrados en tick/harvest/build con redondeo a enteros; §A4 puro/det; tests en chronicle/harvest/simulation).
- [ ] **Dioses Rivales**: Introducir entidades competidoras en el mapa (Fase 7 original).

## Estado Actual
- Motor Determinista (§A4): ✅ Operativo
- Sistema de Sabiduría/Tech: ✅ Operativo
- Memoria Colectiva (Logs): ✅ Operativo (v2 - impacto mecánico expandido a skills vía Memoria Mecánica)
- Poda Burocrática: ✅ Completada
- Deuda de tipos (NPCStats/NPCInventory literals): ✅ Resuelta (SSOT defaultStats/makeEmptyInventory + fixtures helper; tsc=0, eslint=0 errors)

**Meta: De protector de pantalla a juego de estrategia.**

## Derivas activas (jun 2026)
- **LLM como Director (PoC básico del flujo principal)**: Ritual diario al anochecer (chat + widget de enfoque) que se escribe en el Libro del Clan + badge para Agente de Dominio especializado (Exploración) con widgets interactivos. Mock agents + railguard puro + modulación de comportamiento visible en mapa. Implementado y pulido en GameShell + lib/divine-directives. Listo para prueba local y extensión. (No bloquea hitos principales; se mantiene aislado con comentarios PoC).
