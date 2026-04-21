# VERSION-LOG · Fase 5 — Mensaje diario, gratitud y milagros

> Borrador del Director Creativo, 2026-04-21.
> Fase 5 contract-complete en commit `21c612f`. Este log cierra
> editorialmente la Fase tras insumos técnicos del ingeniero
> (`68c4aaf`). La perspectiva del jugador queda **parcial** hasta
> que el Director humano juegue — viñetas 3 y 4 marcadas
> `(pendiente playtest humano)`.

## Qué hace esta Fase

Fase 5 introduce **el verbo del dios**. Hasta Fase 4 el jugador era
un observador que había drafteado su clan y lo veía sobrevivir. A
partir de Fase 5 el jugador **habla**, y el clan **interpreta**.

Entregables visibles:

1. **Modal diario (Sprint 5.1)**: al amanecer (tick múltiplo de
   `TICKS_PER_DAY=24`), la simulación pausa y presenta 6
   intenciones + "guarda silencio hoy". La elección se archiva en
   `village.messageHistory` en orden canónico. Pausa 100%
   determinista — el PRNG no se consume mientras el modal está
   abierto.
2. **Motor de interpretación emergente (Sprint 5.2)**: cada NPC
   lee la intención según sus niveles individuales
   (supervivencia/socialización) y su linaje. Misma intención,
   sesgos diferentes por NPC — es el sustento mecánico del Pilar 1.
3. **Pool de gratitud (Sprint 5.3)**: los NPCs generan gratitud
   pasiva cuando el mensaje del día los toca bien (supervivencia
   ≥ 50 + intención distinta de SILENCE). El pool es del clan,
   entero, clamp `[0, GRATITUDE_CEILING]`.
4. **Los 5 milagros (Sprint 5.4)**: catálogo revisado tras pivot
   manga (decisiones #30-32). Cada milagro cuesta gratitud
   acumulada y añade un rasgo permanente al NPC elegido. Cap de 3
   rasgos por NPC (el 4º reemplaza al más antiguo). Herencia 50%
   via `lib/inheritance.ts`.

Entregables a tests (no visibles al jugador, sí al gate):

- 269 tests verdes al cerrar Fase 5 (commit `21c612f`). 13
  tests nuevos de milagros + 13 de gratitud + 9 de interpretación
  + modal y archivado.
- Pureza §A4 sostenida en los 4 módulos nuevos: sin PRNG en
  selección, sin `Date.now`, sin mutación de estado.

## Por qué y cómo encaja con la visión

Referencia: `vision-primigenia.md §3.7` (mensaje diario), `§3.8`
(rasgos hereditarios), `§3.9` (interpretación emergente).

- **Pilar 1 — Mismo don, distinto resultado** (intacto). El motor
  de interpretación (Sprint 5.2) es la primera prueba mecánica del
  pilar en primigenia. Dos NPCs con la misma intención "CORAJE"
  salen con `riskAppetite` distinto si sus linajes difieren
  (Gregal +risk vs Garbi +restraint) o si su supervivencia es
  distinta. Esto se ve en `tests/unit/interpret.test.ts`.
- **Pilar 2 — Mundo cambia sin tocarlo** (intacto). Si el jugador
  elige "guarda silencio hoy", la simulación avanza igual: los
  NPCs siguen autónomos. El silencio **drena** gratitud (2/día)
  pero no bloquea la partida.
- **Pilar 3 — Fe como economía narrativa** (reinterpretado). La
  firma #31 superseded el drenaje pasivo: la gratitud emerge
  **positiva** de vivir un mensaje que ayuda, no negativa de un
  coste ritual. Es la conversión literal del pilar al vocabulario
  manga (Yoshio → gratitud de los villagers).
- **Pilar 4 — Anti-presión** (diferido). Cero rival en Fase 5, por
  diseño. Ningún hook especulativo introducido.
- **Pilar 5 — Linaje reina** (intacto). Los rasgos de milagros
  heredan 50% a descendientes directos vía `inheritTraits`
  (Sprint 4.3, reutilizado). El Elegido muerto sin hijo bendecido
  sigue drenando futuro — Fase 5 no lo modifica, solo lo penaliza
  con `-20` gratitud cuando muere.

## Perspectiva del jugador

1. **Primer minuto de Fase 5**: tras drafting (Fase 2), el clan
   vive su primer día en silencio. Al amanecer del día 2, el modal
   interrumpe la simulación con las 6 intenciones. El jugador
   descubre que "no decir nada" es una opción legítima — pero
   empieza a gastar gratitud que aún no tiene. La primera elección
   se siente como un acto ritual, no estratégico: el jugador no
   sabe todavía qué significa "PACIENCIA" para un cazador de
   Gregal.
2. **Quinto minuto**: ya hay 3-4 días archivados en
   `messageHistory`. La gratitud del clan debería estar entre 30
   y 60 (basado en 10-15 NPCs thriving × 5 días × 24 ticks × 1 =
   hasta 1800 teóricos — **FLAG 🟠 número sospechoso**, ver abajo).
   En teoría el jugador ya podría otorgar su primer milagro
   "Hambre sagrada" (30 gratitud). La decisión es política: ¿a
   qué NPC se lo das? ¿al Elegido más socializado para reforzar
   el culto, o al cazador más aislado para regenerarlo?
3. **Cuándo sonríe**: *(pendiente playtest humano)*.
   Hipótesis editorial: cuando otorga su primer milagro y ve el
   rasgo propagarse a un hijo vía herencia 50%. O cuando un NPC
   interpreta "RENUNCIA" de forma inesperada por su linaje — la
   crónica lo narra en voz partisana.
4. **Cuándo se aburre o frustra**: *(pendiente playtest humano)*.
   Hipótesis: si 6 intenciones se perciben como "todas parecidas"
   (no se ve la diferencia mecánica a simple vista, solo agregada
   en el comportamiento del clan). O si la gratitud sube tan lento
   que el primer milagro tarda días reales. O si el modal
   interrumpe cada amanecer y rompe el ritmo contemplativo de
   Fase 4.

## Balance con números concretos

Todos **provisionales**, revalidación obligatoria tras playtest
humano. Fuente: `lib/messages.ts`, `lib/gratitude.ts`,
`lib/miracles.ts`.

- `TICKS_PER_DAY = 24` (heredado de Fase 4).
- `GRATITUDE_CEILING = 200`.
- `GRATITUDE_RATES.perThrivingNpcWithMessage = 1` por tick.
- `GRATITUDE_RATES.thrivingThreshold = 50` supervivencia.
- `GRATITUDE_RATES.elegidoDeathPenalty = 20`.
- `GRATITUDE_RATES.silenceDailyDrain = 2`.
- `MAX_TRAITS_PER_NPC = 3`.
- Costes milagros (gratitud): **30 / 40 / 50 / 60 / 80**
  (hambre_sagrada / ojo_de_halcon / voz_de_todos /
  manos_que_recuerdan / corazon_fiel).

Ritmo esperado — escenario con 10 NPCs thriving y mensaje
distinto de SILENCE cada día:

- +10 gratitud por tick → **techo (200) en 20 ticks = <1 día**.
- Esto es aproximadamente **CEILING en menos de un día de juego**
  si el clan está sano. Ver flag 🟠 abajo.

## 🚩 Flags para supervisión humana

- 🚩 **Velocidad de acumulación de gratitud sospechosa**.
  Con 10 NPCs thriving, llegar al techo (200) en 20 ticks (< 1
  día in-game) convierte todos los milagros en triviales: incluso
  "Corazón fiel" (80) se paga en 8 ticks. **Acción sugerida**:
  bajar `perThrivingNpcWithMessage` a `0.25` (o exigir que el
  NPC haya completado alguna acción "aprovechada" en el tick, no
  solo estar vivo con sv ≥ 50). Validar en playtest antes de
  cerrar v1-primigenia.
- 🚩 **Cap de 3 rasgos sin signaling al jugador**. Si el jugador
  otorga un 4º milagro a un NPC con 3 rasgos, el más antiguo
  desaparece silenciosamente. Es política correcta mecánicamente
  pero **la UI debe avisar** antes de confirmar. **Acción
  sugerida**: pasar por `canGrantMiracle` un segundo método
  `wouldReplaceTrait(npc)` que la UI use para mostrar warning.
- 🚩 **6 intenciones pueden leerse como "todas iguales"**. La
  diferencia mecánica entre AUXILIO y PACIENCIA sale en los bias
  de `interpret.ts`, pero el jugador no la ve sin narrativa
  explícita. **Acción sugerida**: la crónica del día debería
  contrastar "lo que el clan habría hecho sin tu mensaje" vs "lo
  que hizo con él" — al menos en los primeros 5 días. Puede
  generar deuda de UI/chronicle para polish pass.
- 🚩 **`elegidoDeathPenalty = 20`** es 1/10 del techo, 2/3 de un
  milagro barato. Tal vez se siente suave para el peso narrativo
  de perder un Elegido. **Acción sugerida**: revalidar tras ver la
  primera muerte de Elegido en un playtest. Si el jugador no se
  siente castigado, subir a 50.
- 🚩 **Interacción gratitud + silencio no testeada end-to-end**.
  El drenaje de 2/día si eliges SILENCE está implementado en
  constantes pero no consta que el `tick()` lo aplique
  automáticamente. Revisar en polish pass si la cadena
  `selectIntent(SILENCE)` → día siguiente → −2 gratitud está
  realmente cerrada. Si no, es un bug de integración Fase 5
  aunque los unit tests pasen.
- 🚩 **Sin E2E del modal**. Sprint 5.1 definió la pausa
  determinista y el archivado, pero Playwright sigue bloqueado
  por sandbox (ver `NOTES-OVERNIGHT.md`). El verbo central del
  dios (decisión #30) no tiene golden test visible. **Acción
  sugerida**: cuando el Director humano tenga entorno con red,
  `pnpm exec playwright install chromium` + spec nueva
  `tests/e2e/daily-message.spec.ts` cubriendo: modal aparece al
  amanecer, elegir intención despausa, archivado persiste al
  recargar.

## Estado para decidir siguiente paso

Fase 5 está contract-complete con 269 tests verdes, pero **no
está editorialmente cerrada** hasta que:

1. El Director humano juegue 5-10 minutos y rellene las viñetas
   3 y 4 del bloque "Perspectiva del jugador".
2. Se valide (o se ajuste) el ritmo de acumulación de gratitud.
3. Al menos el primer flag 🚩 de arriba esté resuelto o
   aceptado como deuda consciente documentada.

Con eso, este log pasa de **borrador** a **firmado**.
