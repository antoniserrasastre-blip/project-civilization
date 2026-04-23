---
tipo: sprint-queue
estado: cerrada Fase 1-6 · abierta Fase 6.5 (Sprint Áureo)
fecha: 2026-04-23
base: ROADMAP-primigenia.md + plan-sprint-aureo.md
---

# Sprints de la Edad Primigenia ✅

Todos los objetivos técnicos básicos de la Edad Primigenia han sido cumplidos.

## Historial de Sprints Completados (Fases 1-6)

- **1. REFACTOR-SUSURRO-FE** — Economía de Fe y susurro persistente.
- **2. LEGIBILIDAD-MVP** — Contexto del clan y ChronicleFeed.
- **3. FICHA-AVENTURERO** — NpcSheet operativa con milagros.
- **4. NPC-NAMES** — Nombres catalano-baleares.
- **5. SPAWN-COSTERO** — Algoritmo de islas y spawn en costa.
- **6. MONUMENTO-LOGIC** — Lógica de desbloqueo y construcción básica.
- **7. ASSETS-PROCEDURAL** — SVGs procedurales y registro de assets.

---

# Próximos Sprints — Sprint Áureo (Transición Tribal)

### 8. MODULO-SOCIAL (4–6 días) · Pilar 5
**Meta**: Implementar reproducción (nacimientos), linajes activos y el peso mecánico de las castas.
**Archivos**: `lib/npcs.ts`, `lib/simulation.ts`, `lib/inheritance.ts` (nuevo).
- Los NPCs nacen, heredan linaje y promedian skills de los padres.
- Elegidos: +Fe/Moral. Esclavos: caída por deuda/hambre, sin herramientas.

### 9. CULTURA-MATERIAL (5–7 días) · Pilar 2
**Meta**: Refactor de crafteo para separar edificios de herramientas equipables. Sistema Eureka.
**Archivos**: `lib/crafting.ts`, `lib/items.ts` (nuevo), `lib/npcs.ts`.
- Herramientas con durabilidad y bonus de skill (Lanza, Cesta, Hacha).
- Sistema "Eureka": Descubrimiento por trauma o necesidad crítica.
- Legado Divino: Herencia automática de herramientas de prestigio.

### 10. ARQUETIPOS-ACTIVOS (4–6 días) · Pilar 1
**Meta**: Especialización de tareas basada en skills y herramientas.
**Archivos**: `lib/needs.ts`, `lib/simulation.ts`.
- `decideDestination` ponderado por el "filtro de intención" de la herramienta.
- Definición de los 7 roles iniciales (Tallador, Rastreador, Pescador, etc.).

### 11. OBSERVABILIDAD-TOTAL (3–5 días) · Pilar 3
**Meta**: UI que exponga la profundidad social y técnica sin micromanagement.
**Archivos**: `components/era/HUD.tsx`, `components/era/NpcSheet.tsx`, `components/map/MapView.tsx`.
- HUD de Inventario Comunal.
- NpcSheet expandida con Skills e Historia Biográfica.
- Capas de Relaciones y Píxel de Oficio en el mapa.

---

# Sprints Posteriores — Era Tribal (Fase 7)

### 12. MIGRANTES-BASIC (3–5 días)
**Meta**: NPCs externos atraídos por el monumento y la fama del clan.

### 13. RIVAL-REACTIVATION (5–7 días)
**Meta**: El dios rival reaparece como competencia directa (Pilar 4).
