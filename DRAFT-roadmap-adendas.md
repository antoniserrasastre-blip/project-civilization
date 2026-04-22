---
tipo: draft-roadmap-adenda
estado: pendiente-clasificación-ingeniero + firma
autor: Director Creativo
fecha: 2026-04-22
scope: tres adendas al ROADMAP-primigenia.md (post review editorial)
base: ROADMAP-primigenia.md commit a73e2c1
---

# DRAFT — Adendas al ROADMAP-primigenia

Tres adendas surgidas de la review editorial del 2026-04-22.
Cada una se inserta como subsección nueva en `ROADMAP-primigenia.md`;
ninguna reemplaza contenido existente salvo donde se indica.

---

## Adenda 1 — Estado real de Fases 1-4: contract-complete vs playtest-validated

**Inserción**: tras la tabla de fases, antes de la sección "Totales".

**Texto**:

> **Caveat importante sobre el estado "listo"**: las Fases 1-4 están
> contract-complete (gate verde: `pnpm test`, `test:e2e`, `tsc`,
> `eslint`, `build`) pero **ninguna había sido playtest-validated
> por un humano** hasta el 2026-04-22. El primer playtest real, tras
> el merge del Sprint ENSAMBLAJE-UI y del Sprint RENDER-NPCS, expuso
> que Fase 2 tenía un gap de flujo severo — los 14 NPCs vivían en
> `position: {x:0, y:0}`, apilados off-screen — que los tests
> unitarios no detectaban porque cada módulo se testeaba aislado,
> no el dataflow desde `initialGameState`. Ese gap se parcheó en
> commit `11f2e95` (quick patch de spawn sobre el fixture visible)
> y el spawn proper queda como sprint pendiente (ver Adenda 2).
>
> **Regla derivada**: a partir de esta firma, una fase se considera
> "cerrada" solo si cumple **(a)** contract-complete **Y (b)**
> playtest-validated por humano, no una sola de las dos. Hasta que
> una partida real las valide end-to-end, las Fases 1-4 pasan al
> estado **"contract-complete / playtest pendiente"**. El Criterio
> de "primigenia completada" punto #3 (playtest humano firmado) se
> ejecuta al cierre; el nuevo caveat exige chequeos de playtest
> **por fase**, no solo al final.

---

## Adenda 2 — Backlog de sprints descubiertos (2026-04-22)

**Inserción**: tras "Totales", como subsección nueva.

**Texto**:

> En la sesión editorial del 2026-04-22 (firma del susurro
> persistente + pase editorial + RENDER-NPCS + playtest fallido +
> quick patch de spawn) se identificaron siete sprints no listados
> en la v1 del roadmap. No están al mismo nivel: unos reabren una
> fase con gap de flujo, otros son desglose explícito de la
> "re-alineación" ya mencionada para 5-6, y otros son cross-fase
> de UI que no pertenecen a ninguna fase singular.
>
> **Clasificación** (a rellenar por el ingeniero antes de firma;
> tres etiquetas válidas: `reabre: fase N` | `parte-de: re-alineación
> fase N` | `cross-fase: UI`):
>
> | Sprint | Descripción breve | Clasificación |
> |-|-|-|
> | **SPAWN-COSTERO proper** | Selección automática de tile costero por seed; principio "una civ = una isla" hacia Fase 7. Reemplaza el patch quick de `11f2e95`. | _____ |
> | **NPC-NAMES** | Pool catalano-balear §9; shape `NPC` gana campo `name`. Gap descubierto por RENDER-NPCS — el tooltip cayó de vuelta a `npc.id`. | _____ |
> | **REFACTOR-SUSURRO-FE** | Implementación del §3.7'/§3.7b firmado: susurro persistente + módulo `lib/faith.ts` + UI botón "Hablar al clan" + bump de storage v2→v3. | _____ |
> | **ASSETS-IMPORT** | Decisión #34 pendiente; importar Ancient Greeks terrain + units filtrados (CC BY 4.0 marceles + cimeto). Reemplaza placeholders procedurales y sprites primitivos. | _____ |
> | **FICHA-AVENTURERO** | Card al clicar NPC: stats + milagros + heridas + linaje. UX crítica para el verbo "milagro" — user explícito el 2026-04-22. | _____ |
> | **RENDER-VIDA extendido** | Sprites de recursos, animales (salvajes/tameables), barcos, edificios, crafteables en progreso. User: *"recursos, animales, todo recolectable, animales tameables, otros salvajes, barcos, edificios..."* | _____ |
> | **LEGIBILIDAD-MVP** | Contexto pre-decisión en el selector de susurros + tooltips por intención + feed de crónica visible en HUD. Sin esto el jugador elige a ciegas. | _____ |
>
> **Efecto sobre el camino crítico**: los sprints clasificados como
> `reabre: fase N` o `parte-de: re-alineación fase N` bloquean el
> cierre de esa fase. Los `cross-fase: UI` pueden arrancar en
> paralelo al camino crítico si no tocan `lib/world-state.ts` ni
> otros contratos §A4.

---

## Adenda 3 — Estimate real ajustado

**Inserción**: reemplaza el párrafo "Efecto remanente" al final de
la sección "Totales".

**Texto antiguo** (reemplazar):

> **Efecto remanente** (lo que queda para declarar primigenia
> cerrada, no un rebuild): **~4–6 días** de ajustes sobre 5 y 6 +
> playtest. El estimado de 15-20 días de Fase 7 **no cuenta**
> aquí.

**Texto nuevo**:

> **Efecto remanente** (lo que queda para declarar primigenia
> cerrada, no rebuild): **~15–20 días** de ingeniería full-time
> bajo TDD estricto, distribuidos entre los siete sprints
> descubiertos (Adenda 2) + ajustes finales sobre Fases 5-6 +
> playtests humanos iterativos sobre las Fases 1-4 (Adenda 1).
> El estimate de 15-20 días de Fase 7 **no cuenta** aquí — se
> mantiene fuera del scope primigenia per decisión firmada.
>
> **Calibración vs v1 del roadmap**: el anterior ~4–6 días
> reflejaba únicamente la re-alineación literal del §3.7 firmado
> sobre el código de Fase 5 existente, ignorando (a) los gaps de
> flujo de Fases 1-4 no detectados hasta el playtest del
> 2026-04-22, (b) los sprints de UI cross-fase
> (FICHA-AVENTURERO, RENDER-VIDA, LEGIBILIDAD-MVP) que el juego
> necesita para ser jugable tal como lo describe la visión
> firmada, y (c) la deuda de assets (decisión #34 abierta).

---

## Tras clasificación + firma del ingeniero

1. Aplicar las tres adendas a `ROADMAP-primigenia.md` en un
   único commit: `docs(roadmap): adendas 1-3 post-review editorial`.
2. La tabla de clasificación de Adenda 2 se copia ya rellenada —
   no queda ningún `_____`.
3. Borrar este DRAFT del árbol (queda en git history en este commit).
4. Firma implícita: el commit de merge es la firma; el humano puede
   revisar tras pushear.

## Orden sugerido tras cierre de las adendas

Basado en dependencias del grafo (sin conocer aún la clasificación
de #2):

- **Inmediato**: REFACTOR-SUSURRO-FE (bloquea cierre formal de Fase 5
  y todo lo downstream que depende de Fe).
- **Paralelo al anterior**: LEGIBILIDAD-MVP (cross-fase UI, puede
  arrancar en cuanto se firme shape de texto en el modal nuevo).
- **Después de REFACTOR-SUSURRO-FE**: playtest humano de Fase 5
  completa. Si hay flags, iterar.
- **Después**: FICHA-AVENTURERO + NPC-NAMES en paralelo.
- **En cualquier momento sin bloquear**: SPAWN-COSTERO proper,
  ASSETS-IMPORT, RENDER-VIDA (este último post-ASSETS-IMPORT).

Este orden es recomendación del Director. El ingeniero puede
proponer otro si detecta dependencias técnicas no visibles aquí.
