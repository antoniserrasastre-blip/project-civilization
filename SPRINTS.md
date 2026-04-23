---
tipo: sprint-queue
estado: abierta Fase 6.5 (Sprint Áureo)
fecha: 2026-04-23
---

# SPRINTS — Proyecto Civilización

## BLOQUE I: GÉNESIS Y OBSERVABILIDAD (ACTUAL)

### 11. DRAFTING-SISTÉMICO (ACTUAL) · Pilares 1, 2 y 3
**Meta**: Implementar el Draft de 14 fundadores con rasgos (Zomboid) y escenarios (Kenshi).
**Contrato Técnico**:
- **lib/traits.ts**: Catálogo de rasgos con coste y modificadores (Glotón, Nocturno, Fuerte, etc.).
- **lib/drafting.ts**: Refactor para incluir sistema de puntos (Budget) y asignación de rasgos.
- **Escenarios**: Implementar "El Éxodo" (Interior/Pocos recursos) y "Náufragos" (Costa/Sin madera).
**Tests de Rotura (Obligatorios)**:
- `tests/design/draft-chaos.test.ts`: Un clan de "Glotones" en el desierto debe colapsar determinísticamente.
- `tests/unit/drafting.test.ts`: Validación de presupuesto y exclusión de rasgos incompatibles.
- `tests/integration/draft-persistence.test.ts`: Los rasgos deben persistir tras el `finalizeBlockA/B`.

### 12. CAPA-DE-INFLUENCIA (Pendiente) · WorldBox
**Meta**: Territorio dinámico y agotamiento de recursos.
- **Mecánica**: Heatmap de presencia en `state.world.influence`.
- **Fricción**: Los recursos tienen `reserva` finita y tiempo de regeneración.

### 13. EL-ANALISTA-DIVINO (Pendiente) · CK3/TFT
**Meta**: HUD de linajes y panel de sinergias.
- **Visual**: Líneas de intención de los NPCs en el mapa.
- **Sinergias**: Buffs globales por composición de clan (ej: 3 Pescadores).

---

## BLOQUE II: CULTURA MATERIAL (Próximamente)
- **14. IDENTIDAD-VISUAL**: Sprites de herramientas y senderos de desgaste.
- **15. HUBS-LOGÍSTICOS**: Acopio automático de recursos y roles de transporte.
- **16. SISTEMA-EUREKA**: Tecnologías desbloqueadas por geografía y uso.

---

## Historial de Sprints (Completados 1-10)
- **1-10**: Infraestructura base, Fe, Roles básicos, Monumento y Arquetipos.
