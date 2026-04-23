---
tipo: sprint-queue
estado: abierta Fase 6.5 (Sprint Áureo)
fecha: 2026-04-23
---

# SPRINTS — Proyecto Civilización

Cola táctica de ejecución. Los sprints se ejecutan bajo TDD estricto y gate verde.

## Sprints en Progreso: Sprint Áureo (Fase 6.5)

### 8. MODULO-SOCIAL (COMPLETADO)
**Meta**: Reproducción, linajes activos y efectos de casta.
- `lib/reproduction.ts`, `lib/inheritance.ts`, `lib/casta-effects.ts`.

### 9. CULTURA-MATERIAL (COMPLETADO)
**Meta**: Items equipables, recursos raros y sistema Eureka.
- `lib/items.ts`, `lib/crafting.ts`, `lib/eureka.ts`.

### 10. ARQUETIPOS-ACTIVOS (COMPLETADO)
**Meta**: 7 roles operativos que filtran la intención divina.
- `lib/roles.ts`, `lib/simulation.ts`.

### 11. OBSERVABILIDAD-TOTAL (ACTUAL) · Pilar 3
**Meta**: UI que exponga la profundidad social y técnica sin micromanagement.
**Archivos**: `components/era/HUD.tsx`, `components/era/NpcSheet.tsx`, `components/map/MapView.tsx`.
- **HUD**: Inventario Comunal (total de recursos del clan).
- **NpcSheet expandida**: Skills, Biografía (historia personal) e Inventario Físico.
- **Capas de Mapa**: Relaciones y Píxel de Oficio (marcador visual).
- **Tests**: `tests/e2e/observabilidad.spec.ts`.

---

## Próximos Sprints — Era Tribal (Fase 7)

### 12. MIGRANTES-Y-RIVAL (Pendiente) · Pilar 4
**Meta**: NPCs externos atraídos por el monumento y reaparición del Dios Rival.

---

## Historial de Sprints (Completados 1-7)
- **1. REFACTOR-SUSURRO-FE**
- **2. LEGIBILIDAD-MVP**
- **3. FICHA-AVENTURERO**
- **4. NPC-NAMES**
- **5. SPAWN-COSTERO**
- **6. MONUMENTO-LOGIC**
- **7. ASSETS-PROCEDURAL**
