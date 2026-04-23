---
tipo: roadmap
estado: en-proceso-sprint-aureo
fecha: 2026-04-23
base: vision-primigenia.md + plan-sprint-aureo.md
---

# ROADMAP — Edad Primigenia & Transición Tribal

## Resumen ejecutivo

Evolucionar el loop básico de supervivencia hacia una simulación de
cultura material y estructura social profunda. El objetivo es que el
clan no solo sobreviva, sino que se especialice mediante herramientas,
linajes y castas, preparando el terreno para la Era Tribal.

**Objetivos de la era (Ampliados)**:

1. **Cultura Material**: Separación de Edificios e Items (herramientas).
   Sistema "Eureka" de descubrimiento por necesidad.
2. **Estructura Social**: Castas funcionales (Elegido, Ciudadano, Esclavo),
   linajes activos y ciclo de reproducción con herencia de skills.
3. **Especialización (Arquetipos)**: 7 roles definidos por herramientas
   (Cazador, Pescador, Tallador, etc.) que filtran la intención divina.
4. **Observabilidad Total**: HUD de inventario comunal, NpcSheet con
   biografía y skills, y capas de mapa para relaciones sociales.
5. **Loop Divino & Monumento**: El monumento como hito final que exige
   especialización y herramientas para su construcción.

---

## Fases

| # | Fase | Dependencias | Entregable testeable | Días | Estado |
|-|-|-|-|-|-|
| 1-4| **Infraestructura Base** | — | Mundo, NPCs, Movimiento y Economía autónoma operativa. | — | listo |
| 5 | **Susurro y Fe** | Fase 4 | Verbo divino persistente, Fe y Gratitud v2. | — | listo |
| 6 | **Monumento (Core)** | Fase 5 | Lógica de desbloqueo y construcción básica. | — | listo |
| 6.5| **Sprint Áureo** | Fase 6 | **Especialización y Sociedad**. Herramientas, linajes, castas y UI expandida. | 15-20 | en progreso |
| 7 | **Era Tribal (Apertura)** | Fase 6.5 | Migrantes, Rival (Pilar 4) e IA reactivada. | 15-20 | pendiente |

**Totales**:

- Edad Primigenia (Fases 1-6): Contract-complete.
- Sprint Áureo (Transición): Implementando cultura material y sociedad.
- Fase 7 (Era Tribal): En cola de diseño.

---

## Próximos Pasos: Sprint Áureo

1. **Módulo Social**: Implementar reproducción, linajes y el peso
   mecánico de las castas (Elegidos vs Esclavos).
2. **Módulo de Herramientas**: Refactor de `crafting.ts`, sistema
   Eureka y herencia de Legados Divinos.
3. **Arquetipos Activos**: Especialización de tareas mediante skills
   y filtrado de intención por herramienta.
4. **UI de Observabilidad**: NpcSheet expandida (Biografía/Skills) y
   HUD de inventario comunal.

---

## Criterio de Cierre de Transición

1. **Especialización Demostrable**: Un NPC con Lanza prefiere cazar;
   un NPC con Cesta prefiere recolectar, de forma autónoma.
2. **Ciclo de Vida**: Los NPCs nacen, heredan linaje y skills, y mueren
   dejando sus herramientas de prestigio como legado.
3. **Legibilidad**: El jugador puede ver el inventario total del clan
   y la ficha completa de cada NPC sin ambigüedad.
4. **Construcción Especializada**: El Monumento requiere herramientas
   específicas y trabajadores especializados para avanzar.


---

## Orden de ejecución recomendado

El grafo de dependencias es casi lineal — cada fase consume las
anteriores. La paralelización posible es lateral, no del camino
crítico.

**Camino crítico (estrictamente secuencial)**:

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → (Fase 7 diferida)
```

Ninguna fase del camino crítico arranca sin la anterior cerrada con
gate verde (`pnpm test` + `test:e2e` + `tsc --noEmit` + `eslint` +
`pnpm build`). Esto no es negociable — está escrito en §8 de la
visión y en `CLAUDE.md`.

**Tareas paralelizables** (pueden avanzar en background sin bloquear
el camino crítico, siempre que no muten contratos §A4):

- **Assets de arte pixel** (tiles, sprites NPC, iconos de recurso,
  placeholder de monumento): pueden generarse/integrarse en paralelo
  a Fases 1-4 sin tocar lógica. Decisión #9 ya firmada.
- **Suite de coherencia `tests/design/`**: los 10 dominios crecen
  incrementalmente; añadir `describe` blocks en paralelo a sprints
  de features, siempre sobre capas ya cerradas.
- **Balance numérico** (costes de Fe, rates de gratitud, tiempos de
  crafting): iteración rápida sobre constantes **después** de que
  Fase 5 esté contract-complete; no bloquea Fase 6.
- **VERSION-LOG drafts**: el Director Creativo puede redactarlos
  mientras el ingeniero cierra el siguiente sprint.
- **Compresión de `vision-primigenia.md`** a `vision-compressed.md`
  (Hack #4 de `CLAUDE.md`): una sola pasada; reutilizable en toda
  la era.

**No paralelizable bajo ningún concepto**:

- Cualquier cambio que toque `lib/world-state.ts` (el shape del
  estado) — bloquea todo lo demás hasta que haya bump de
  `STORAGE_KEY` y migración de saves.
- Trabajo sobre Fase 5 sin Fase 4 verde, Fase 6 sin Fase 5, etc.
- Fase 7 antes de firma humana del cierre de primigenia.

**Playtest humano** es gating duro entre Fase 6 contract-complete y
"primigenia cerrada". No hay atajo técnico — la perspectiva del
jugador sólo la firma un humano jugando.

---

## Criterio de "primigenia completada"

La edad primigenia se declara cerrada cuando **todos** los
siguientes puntos están verdes. No hay parcial — si falta uno,
primigenia sigue abierta.

1. **Fases 1-6 shipped y gate verde** en `main`: `pnpm test` +
   `pnpm test:e2e` + `pnpm test:design` + `tsc --noEmit` + `eslint` +
   `pnpm build` todo a verde, sin `.skip`, sin `it.todo` abiertos en
   las suites de las 6 fases.
2. **VERSION-LOG firmado por Fase** (1-4 consolidado + 5 + 6), con
   las viñetas de "perspectiva del jugador" completas — sin
   marcadores `(pendiente playtest humano)`.
3. **Playtest humano validado**: el Director humano ha jugado al
   menos una partida completa desde draft hasta monumento +
   bendición, y ha firmado que la experiencia cumple §4.0 (cómo
   se siente jugar).
4. **Pilar 1 demostrable con datos**: existe un test de coherencia
   que mide divergencia de trayectorias entre (a) mismos rasgos
   bajo susurros distintos y (b) mismo susurro bajo composiciones
   distintas, y sus umbrales están calibrados, no hardcoded.
5. **Economía de Fe y gratitud sana**: partida de referencia
   (`CANONICAL_SEED`) muestra que en 60 minutos de juego real el
   jugador puede conceder 1-2 milagros sin farmeo y sin
   aburrimiento; el cap de 160 Fe nunca se satura pasivamente
   contra la voluntad del jugador; la gracia de 7 días se aplica
   correctamente.
6. **Determinismo extremo**: 1.000 ticks byte-idénticos con el
   mismo seed, incluyendo susurros, milagros y construcción del
   monumento. Cero uso de `Math.random` / `Date.now` en `lib/`.
7. **Cinemática de transición cerrada**: la transición al cartucho
   tribal existe como placeholder estable (no crashea, no pierde
   estado, la bendición de aldea elegida se persiste en el save
   para la siguiente era).
8. **Polish & Debug pass firmado**: el pase descrito en `CLAUDE.md`
   §"Sesiones autónomas" ejecutado y commiteado sobre 5 y 6
   (balance + TODOs + `any` + `eslint-disable` + regresiones
   visuales).

Cumplidos los 8 puntos, este roadmap pasa a `estado: cerrado` con
fecha de cierre, y la Fase 7 abre su propio roadmap bajo firma
humana.
