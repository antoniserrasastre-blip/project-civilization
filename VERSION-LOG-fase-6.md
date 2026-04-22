# VERSION-LOG · Fase 6 — Monumento y bendición de aldea

> Borrador del Director Creativo, 2026-04-21.
> Fase 6 contract-complete en commit `76ada22` (cierra el loop
> primigenia end-to-end). Este log espera playtest humano para
> pasar de **borrador** a **firmado**. Perspectiva del jugador
> con viñetas 3 y 4 en `(pendiente playtest humano)`.

## Qué hace esta Fase

Fase 6 **cierra el loop**. Hasta Fase 5 el jugador tenía un clan
autónomo, un verbo diario y un pool de gratitud que alimentaba
5 milagros. La partida no terminaba — solo existía. Fase 6
introduce el **hito que convierte una partida en una historia**:
el monumento al dios, la elección de una bendición de aldea que
marcará la era siguiente, y la transición a tribal.

Entregables visibles:

1. **Desbloqueo del monumento (Sprint 6.1)**: `monumentUnlockStatus`
   evalúa 3 condiciones. Los 5 crafteables umbral construidos
   (Fase 4), ≥ 10 noches consecutivas alrededor de la fogata
   (Fase 4), ≥ 1 creyente vivo de cada linaje drafteado. Si una
   falla, devuelve lista de razones legibles.
2. **Construcción del monumento (Sprint 6.2)**: coste 200 piedra
   + 50 leña + 60 días-hombre de trabajo. La obra consume el
   inventario del clan al arrancar y progresa 1 tick-hombre por
   NPC vivo por tick. Si el clan cae por debajo de 3 vivos, la
   obra colapsa a `ruin` — estado irreversible.
3. **Bendición de aldea (Sprint 6.3)**: al completar el monumento,
   el jugador elige 1 de 4 disponibles en primigenia (recolecta,
   fertilidad, salud, reconocimiento). Las otras 3 del catálogo
   (comercio, producción, longevidad) quedan reservadas para
   tribal. Sin reelección (decisión #25): una bendición por era,
   para siempre.
4. **Transición a tribal (Sprint 6.4)**: `canTransitionToTribal`
   exige `monument.phase='built'` + al menos 1 bendición elegida.
   `transitionToTribal` cambia `state.era` a 'tribal' **sin
   limpiar el resto del state** — tribal reconstruye sobre
   primigenia. Placeholder `components/era/TribalPlaceholder.tsx`
   con texto partisano de handoff.

Entregables a tests (gate):

- **301 tests verdes** al cerrar Fase 6 (commit `76ada22`,
  +32 tests desde Fase 5): 7 de `era-transition` + 9 de
  `village-blessings` + 16 de monumento.
- **`tests/integration/era-loop.test.ts`** — integración
  end-to-end: 14 NPCs (Tramuntana + Migjorn + Ponent) en mundo
  rico 24×24 con fogata pre-armada. 40k ticks autónomos.
  Construye los 5 crafteables, acumula ≥ 10 noches consecutivas,
  monumento **desbloqueable** al final.

## Por qué y cómo encaja con la visión

Referencia: `vision-primigenia.md §5` (monumento), `§6`
(bendición de aldea), `§7` (derrotas incluido "ruina"), `§8`
(orden de fases).

- **Pilar 1 — Mismo don, distinto resultado**. La bendición de
  aldea es categórica: "recolecta" actúa igual para todos. No
  opera sobre Pilar 1 — ese pilar sigue viviendo en los milagros
  individuales (Fase 5) y en la interpretación del mensaje. Fase
  6 es **dominio colectivo**, no individual.
- **Pilar 2 — Mundo cambia sin tocarlo**. La construcción del
  monumento **no pausa la simulación**. El clan sigue comiendo,
  cazando, tejiendo relaciones mientras la obra avanza.
  Explícito en `vision-primigenia.md §5`: "Durante la obra el
  clan sigue operativo (no se congela)". `tickMonumentProgress`
  respeta esto.
- **Pilar 3 — Fe como economía narrativa**. El monumento es el
  **destino físico** de la fe. Antes los creyentes rezaban en la
  fogata; ahora tienen templo. La bendición de aldea materializa
  la recompensa divina al culto vivo — lo que Fase 5 era
  individual (milagros a NPCs concretos), Fase 6 lo expande a
  clan.
- **Pilar 4 — Anti-presión** (diferido). Ningún hook a rival
  introducido. Clean.
- **Pilar 5 — Linaje reina**. Condición de desbloqueo "≥ 1
  creyente vivo de cada linaje presente": si un linaje se
  extingue, el monumento se bloquea hasta que el clan se repueble
  — refuerzo mecánico fuerte del pilar. La derrota "último
  Elegido sin hijo" de §7 sigue vigente, aquí no se modifica.

## Perspectiva del jugador

1. **Primer minuto de Fase 6**: el jugador lleva ya algunas horas
   de juego (Fase 4 + Fase 5). El clan tiene los 5 crafteables,
   ha dormido varias noches en la fogata, y el tracker muestra
   "noches consecutivas: 7/10" en una esquina del HUD. El jugador
   empieza a rezar por que nadie enferme esta semana — las
   condiciones se cuentan en ticks reales, no en decisiones, y eso
   genera espera. El primer minuto de Fase 6 es **ansiedad
   pasiva**: ver si el clan llega entero al umbral.
2. **Quinto minuto**: las 10 noches se han acumulado y el
   monumento se ha desbloqueado (notificación en la crónica con
   voz partisana). El jugador arranca la construcción, pagando
   200 piedra + 50 leña del inventario comunal. Durante los
   siguientes ~6 días in-game (1440 ticks-hombre ÷ 10 NPCs vivos
   = 144 ticks = ~6 días), el progreso avanza lineal. Si algún
   NPC muere por accidente (caza arriesgada, vejez), baja el
   ritmo. Si caen por debajo de 3, el monumento queda en ruina
   **irreversible** — el jugador ve la palabra `ruin` aparecer y
   entiende que esa partida acabó mal. Ver flag 🟠 abajo.
3. **Cuándo sonríe**: *(pendiente playtest humano)*.
   Hipótesis editorial: cuando el monumento se completa y el
   selector de 4 bendiciones aparece por primera vez. Es la
   primera vez que el jugador toma una decisión **irreversible
   para la era**. No es un milagro sobre un NPC, es un legado.
4. **Cuándo se aburre o frustra**: *(pendiente playtest humano)*.
   Hipótesis: si los 6 días de construcción se sienten vacíos
   (solo mirar una barra). O si la cinemática de transición
   primigenia → tribal entrega al jugador a un placeholder
   (`TribalPlaceholder`) y se rompe la ilusión de continuidad.

## Balance con números concretos

Todos provisionales salvo revalidación en playtest. Fuente:
`lib/monument.ts`, `lib/village-blessings.ts`, `lib/game-state.ts`.

- **Desbloqueo**:
  - 5 crafteables umbral (Fase 4).
  - `MIN_CONSECUTIVE_NIGHTS = 10` noches con ≥ 10 NPCs
    durmiendo en fogata.
  - ≥ 1 creyente vivo de cada linaje drafteado.
- **Coste de construcción**:
  - `MONUMENT_COST.stone = 200`.
  - `MONUMENT_COST.wood = 50`.
  - `MONUMENT_COST.daysWork = 60` → `BUILD_TICK_HOURS = 1440`
    ticks-hombre (60 × `TICKS_PER_DAY=24`).
- **Ritmo de obra**: 1 tick-hombre por NPC vivo por tick.
  - Con **10 vivos**: 144 ticks = **6 días in-game**.
  - Con **6 vivos**: 240 ticks = **10 días in-game**.
  - Con **3 vivos** (mínimo): 480 ticks = **20 días in-game**.
- `MIN_WORKERS = 3`. Por debajo → `phase='ruin'`, irreversible.
- **Bendición de aldea**: 4 disponibles primigenia. Sin
  reelección. Compounding tribal declarado (no implementado aún
  porque tribal no existe).

Integration sanity: `tests/integration/era-loop.test.ts` con 14
NPCs en mundo rico llega al umbral en **< 40k ticks** = **~1666
días in-game** con `TICKS_PER_DAY=24`. Es un upper bound laxo;
el tiempo medio real del jugador dependerá del balance de caza
y de cuántos NPCs mantiene productivos.

## 🚩 Flags para supervisión humana

- 🚩 **Ruina irreversible por caída puntual a < 3 vivos**.
  Si un accidente (epidemia modelada en el futuro, caza fatal,
  migración) baja el clan a 2 vivos **por un solo tick** mientras
  el monumento está en fase `building`, el estado pasa a `ruin`
  sin camino de vuelta. Es coherente con §7 "el monumento queda
  a medias como ruina", pero la irreversibilidad **por un único
  mal tick** puede sentirse arbitraria. **Acción sugerida**: o
  bien (a) introducir un buffer de 24 ticks antes de declarar
  ruina — da chance a que nazca alguien o vuelva un NPC del otro
  lado del mapa; o (b) aceptar la irreversibilidad como narrativa
  y documentarla explícita en la UI ("quedan 2 vivos — el
  monumento no sobrevive"). Validar en playtest cuál se siente
  mejor.
- 🚩 **Fase 'building' sin UI de progreso confirmada**. El motor
  avanza el contador `monument.progress` por tick, pero no consta
  que el HUD muestre barra de progreso al jugador. Si no la tiene,
  los 6 días in-game de construcción son oscuridad total.
  **Acción sugerida**: componente `<MonumentProgressBar />` con
  `data-testid="monument-progress"` mostrando
  `progress / BUILD_TICK_HOURS` + NPCs trabajando. Cubrir por E2E
  cuando Playwright desbloqueado.
- 🚩 **4 bendiciones sin signaling del compounding tribal**. El
  catálogo declara el efecto tribal en un campo
  `compoundingTribal`, pero el jugador elige en primigenia sin
  ver ese futuro. Si el modal al completar el monumento no lo
  expone, la elección pierde peso narrativo. **Acción sugerida**:
  al mostrar las 4 opciones, incluir tooltip "En la era tribal
  esta bendición se convertirá en X". Refuerza Pilar 5 (legado)
  y la reglita "no reelección" se justifica mejor.
- 🚩 **Transición preserva todo el state sin limpiar**.
  `transitionToTribal` cambia `state.era` pero mantiene
  `state.monument.phase='built'`, `state.village.gratitude`,
  `state.village.messageHistory`. Esto es correcto como base
  (tribal reconstruye sobre primigenia), pero **tribal necesitará
  decidir qué valores resetear**: ¿la gratitud transfiere con
  bonus?, ¿el monumento sigue visible pero inactivo?, ¿los
  milagros otorgados son permanentes o solo los hereditarios?
  **Acción sugerida**: abrir decisión #33+ en
  `DECISIONS-PENDING-primigenia.md` — "política de migración de
  estado primigenia → tribal" — antes de arrancar Fase 7.
- 🚩 **Cero E2E del loop de cierre**. El ingeniero lo declara
  explícito en el commit `76ada22`: "la construcción misma (Sprint
  6.2) y la cinemática UI llegan cuando Playwright esté
  disponible para E2E". Playwright sigue bloqueado por sandbox
  (ver `NOTES-OVERNIGHT.md` reintento 2026-04-20). Por tanto:
  - No hay golden test de la UI del selector de bendición.
  - No hay golden test de la cinemática de transición.
  - No hay golden test del `TribalPlaceholder` rindiendo con su
    `data-testid` correcto.
  **Acción sugerida**: cuando el Director humano tenga entorno
  con red, priorizar estos 3 specs E2E **antes** de abrir Fase 7.
  El loop no está cerrado sin ellos.
- 🚩 **`payBuildCost` ordena por id string**. Implementación
  determinista correcta, pero implica que el NPC con id
  lexicográficamente más bajo paga primero hasta agotar su
  inventario. Funcionalmente irrelevante (mismos recursos salen
  del clan), pero si una futura UI muestra "¿quién donó al
  monumento?", la respuesta estará sesgada. **Acción sugerida**:
  si la UI lo expone, recablar el orden a "proporcional al
  inventario" o "por linaje" para narrativa. Si no lo expone,
  ignorar.

## Cierre del loop primigenia

Con Fase 6 el **arco contract-complete de la edad primigenia** está
en su sitio:

```
Fase 1 — Mundo determinista
Fase 2 — Clan drafteado, recursos, fog
Fase 3 — Movimiento autónomo
Fase 4 — Economía emergente (necesidades → crafteables)
Fase 5 — Verbo del dios (mensaje diario + gratitud + milagros)
Fase 6 — Monumento + bendición + transición a tribal
```

**Lo que falta para firmar v1-primigenia** (no bloquea merge,
pero sí firma editorial):

1. Playtest humano cubriendo al menos 20 minutos — primer minuto
   hasta ver la bendición elegida.
2. Resolución (o aceptación documentada) de los 6 flags 🚩 de
   arriba + los 6 del `VERSION-LOG-fase-5.md`.
3. E2E Playwright del modal diario + monumento + cinemática.
4. Poblado de `tests/design/` con al menos los 3 dominios más
   críticos (economía de gratitud + ciclo de vida + determinismo
   extremo).
5. Borrador retroactivo `VERSION-LOG-fase-1-4.md` consolidado.

Hecho eso, este log pasa de **borrador** a **firmado** y Fase 7
(diferida: migrantes + rival) queda habilitada para planificación.

## Triado de flags — 2026-04-22 (Director Creativo)

> Barrido editorial de los 6 flags 🚩 de arriba. Uno ya está **cerrado
> por firma** del Director humano; el resto mantiene su carácter de
> deuda hasta el playtest o hasta que Playwright se desbloquee.

| # | Flag | Estado | Próxima acción / cierre |
|-|-|-|-|
| 1 | 🟠 Ruina irreversible por caída puntual a < 3 vivos | 🕐 vivo | Revalidar en playtest humano. Si se percibe arbitrario, introducir buffer de 24 ticks antes de declarar `phase='ruin'` (opción a del flag original) o reforzar el signaling UI ("quedan 2 vivos — el monumento no sobrevive", opción b). Decisión de diseño menor — no bloquea nada. |
| 2 | 🟠 Fase 'building' sin UI de progreso confirmada | 🕐 vivo | Se resuelve naturalmente con el trabajo de HUD que acompañe al Sprint **#2 LEGIBILIDAD-MVP** o en un sprint posterior de `<MonumentProgressBar />` dedicado. Requiere `data-testid="monument-progress"` y cobertura E2E cuando Playwright esté operativo. |
| 3 | 🟡 4 bendiciones sin signaling del compounding tribal | 🕐 vivo | Deuda UI pequeña: tooltip *"en la era tribal esta bendición se convertirá en X"* sobre las 4 opciones. Cabe en el mismo sprint de HUD de #2, o en un `BLESSING-TOOLTIPS` independiente. Refuerza Pilar 5. |
| 4 | 🟠 Transición preserva todo el state sin limpiar | ✅ cerrado | **Decisión #33 firmada por el Director humano 2026-04-21**: reset selectivo por naturaleza del dato (opción B). Queda pendiente el sub-bloque **#33.a** (mapa campo a campo del GameState) antes de que el ingeniero escriba el primer test de tribal — **no bloquea primigenia**, solo el arranque de Fase 7. |
| 5 | 🟠 Cero E2E del loop de cierre | 🕐 vivo | Bloqueado por sandbox (sin red a CDN de Playwright). Tres specs pendientes cuando el Director humano tenga entorno con red: selector de bendición, cinemática de transición, `TribalPlaceholder`. **Antes de abrir Fase 7**, estos 3 E2E deben correr en verde. |
| 6 | ⚠️ `payBuildCost` ordena por id string | 🕐 vivo (rebajado a ⚠️) | Funcionalmente irrelevante (mismos recursos salen del clan). Solo importa si una futura UI expone *"¿quién donó al monumento?"*. Se rebaja a ⚠️ aviso informativo. Si la UI lo expone, recablear a *proporcional al inventario* o *por linaje*. |

**Resumen**: 1 cerrado por firma del humano (#33), 4 vivos en deuda
razonable, 1 rebajado a ⚠️. Ninguno bloquea el Sprint #1.
El flag #5 (E2E del loop) sí bloquea el **cierre editorial de
primigenia** (criterio 3 del `ROADMAP-primigenia.md`).
