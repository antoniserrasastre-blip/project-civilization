---
tipo: sprints
estado: activo
fecha: 2026-04-24
---

# PLAN DE SPRINTS — Proyecto Civilización

Este documento detalla la ejecución táctica. Cada Sprint tiene un objetivo temático inspirado en mecánicas de Grand Strategy.

---

## 🟢 Sprints Completados (Cimientos)

### Sprint 11: OBSERVABILIDAD-TOTAL (WorldBox Style)
- ✅ **Mapa de Influencia**: Capa de territorio que visualiza el dominio del clan.
- ✅ **Dashboard de Sinergias**: Panel (TFT Style) que reporta bonos activos.
- ✅ **Divine Intelligence Console**: Panel de diagnóstico central (Ctrl + <) para logs invariantes.

### Sprint 12: CULTURA MATERIAL (AoE Style)
- ✅ **Librería de 85+ Assets**: SVGs estilo Píxel Art 16-bits para todo el juego.
- ✅ **Identidad Visual NPC**: Los NPCs muestran la herramienta equipada en sus manos.
- ✅ **Wobble Animation**: Efecto de balanceo vital para NPCs y estructuras.

### Sprint 13: GEOLOGÍA SAGRADA (Transición V2)
- ✅ **Generador Procedimental Puro**: Ruido Simplex Fractal (6 octavas) + Whitaker Matrix.
- ✅ **Biomas Realistas**: Jungla, Sabana, Desierto, Volcanes, Ártico.
- ✅ **Erosión Hidráulica**: Ríos deterministas que nacen en montañas y fluyen al mar.

### Sprint 14: AMBICIÓN Y ALMA (El Despertar)
- ✅ **Tercer Stat (Propósito)**: Activada la métrica de ambición/ganas de trabajar.
- ✅ **Metabolismo Sincronizado**: Decay de supervivencia ajustado a 2.0; curación en agua limitada a 40.
- ✅ **Wanderlust**: Los NPCs exploran y patrullan de forma proactiva si tienen provisiones.
- ✅ **Refactor de Robustez**: Centralización de actualización de stats (`updateNpcStats`).

---

## 🟡 Sprint Actual: Sprint 15 - LOGÍSTICA EMERGENTE

**Objetivo**: Romper el bloqueo de "mochilas llenas" y crear la primera infraestructura de ciudad.

- [ ] **Stockpile (Almacén Primitivo)**:
    - Estructura de drop-off donde los recolectores sueltan recursos.
    - El inventario del clan se centraliza visualmente en los hubs.
- [ ] **Rol Transportista**:
    - NPCs que priorizan mover recursos de inventarios ajenos o spawns lejanos al Stockpile.
- [ ] **Drop-off Logic**:
    - El NPC busca el Stockpile más cercano cuando su inventario está al 100%.
- [ ] **Especialización de Almacén**:
    - Capacidad de definir qué recursos acepta cada Stockpile (EU4/Settlers).

---

## ⚪ Sprints Futuros (Soberanía de Clan)

### Sprint 16: SABIDURÍA (La Choza del Chamán)
- [ ] **Eurekas Consolidados**: Los descubrimientos individuales se convierten en tecnología tribal.
- [ ] **Árbol Tecnológico**: Interfaz visual de progreso cultural.
- [ ] **Evolución Visual**: Las estructuras cambian de sprite al desbloquear "Masonería" o "Carpintería".

### Sprint 17: LÓGICA DE ESTADO (EU4 Style)
- [ ] **Directivas de Susurro**: Cambiar la "mentalidad" del clan (ej: "Priorizar Madera" o "Explorar Costa").
- [ ] **Estabilidad**: Métrica de cohesión que se gasta al emitir directivas.
- [ ] **Crisis de Liderazgo**: Desafíos internos cuando el Elegido muere o el propósito global cae.

---

## Métricas de Control
- **Tests Verdes**: 761/761.
- **Invariantes §A4**: Sin Math.random() en el motor.
- **Rendimiento**: < 16ms por tick de simulación.
