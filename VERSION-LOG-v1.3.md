# VERSION LOG — v1.3 Contenido post-v1.0 (clásica → industrial)

**Estado**: ✅ shipped en rama `claude/v2-roadmap` (commit pendiente)
**Sprints**: 14 (clásica pool), 15 (ejércitos abstractos), 16 (medieval
pool), 17 (industrial pool + cadena completa).

## Qué hace esta versión

- Pools de 4 eras nuevas: clásica (escritura cursiva, rueda, ejército),
  medieval (feudalismo, caballería, castillo), industrial (vapor,
  imprenta, nacionalismo), atómica (solo fisión nuclear como
  placeholder).
- Cadena completa de transiciones probada: un mundo que descubre todas
  las tech pasa de tribal → bronce → clásica → medieval → industrial
  → atómica sin refactorizar el scheduler.
- `lib/army.ts` nuevo: ejércitos abstractos. `armyStrength(state,
  group)` devuelve un entero; `resolveGroupBattle(state, attacker,
  defender, { strategistBoost })` decide un ganador determinista
  dando un boost multiplicativo por estratega.

## Por qué y cómo encaja con la visión

v1.3 prueba que **el motor escala por siglos** sin deuda. Añadir una
era = modificar el pool + tests. El jugador ve que la partida puede
durar 6 eras completas (~45 min a 100×) si quiere.

Los ejércitos abstractos son la pieza de v2.0 para que el MP tenga
batallas sin necesitar de un engine táctico. Hoy solo se expone la
función — no está cableada a la simulación continua (flag).

## Perspectiva del jugador

> Cerré v1.0. Vuelvo un día después. Mi partida sigue en bronce.
> Acelero a 100×. A los 15 minutos: "Los nuestros han descubierto
> Ejército regular." Modal: "La era bronce cae. Llega la era
> clasica." Nuevo día, la ventana "Tecnología" muestra 3 pendientes
> otra vez. Me siento avanzando, no estancado.
>
> Sigo jugando. Tras otra hora, cae "Imprenta mecánica". Veo la
> cinemática industrial. La última tech que podría descubrir es
> "Fisión nuclear". El modal aparece, mi pueblo lo descubre… y la
> crónica dice que estoy en la era atómica. Pero no hay nada más.
> Mi héroe medieval todavía es ambicioso y quiere guerra. Pido el
> veredicto. Sigo ganando. El juego se cierra.

## Balance

No hay balance nuevo — el ritmo de descubrimiento (0.0008 + intel×0.002
por tick) da ~1 tech cada 2-4 minutos a 1×, ~1.5s a 100×. Completar
las 6 eras desde fresco: ~30-45 minutos a 100×, horas a 1×.

Ejércitos: `armyStrength` para un grupo típico (12 adultos × 50
fuerza / 10) ≈ 60. Con estratega (+20%) = 72. Una batalla cerrada
cambia de resultado.

## 🚩 Flags para supervisión humana

- 🔴 **La era atómica está VACÍA de mecánicas**. Sprint 19-20 del
  ROADMAP-v2 hablaba del "dilema nuclear final" — decisión narrativa
  crítica del juego. Aquí solo he dejado la tech `fision_nuclear` y
  un placeholder. La UI NO presenta ningún dilema. Esto necesita
  **decisión de diseño** del Director antes de implementarse:
  - ¿La bomba es una tech más, o una decisión explícita del jugador?
  - ¿Su uso implica derrota narrativa automática?
  - ¿Los rivales IA compiten por conseguirla primero?
- 🔴 **Ejércitos abstractos NO cableados**: `armyStrength` y
  `resolveGroupBattle` existen en `lib/army.ts` pero nada en el
  scheduler los invoca. Una partida de v1.3 no vive batallas
  automáticas. Ver Sprint 15 del ROADMAP-v2 — cableado requiere
  decisión sobre agresividad de la IA rival.
- ⚠️ **Feudalismo (medieval) sin mecánica**: el tech existe pero los
  "vasallos" del ROADMAP-v2 no se implementan. Hoy los seguidores
  son iguales en era tribal y medieval. Decisión pendiente: ¿cambiar
  el modelo de follower a vassal en esta era?
- ⚠️ **Nombres de tech en latín vulgar / catalán**: son placeholders.
  Revisar con Director — algunos podrían sentirse "forced" (ej.
  "nacionalismo" para era industrial balear).
- ⚠️ **No hay UI específica para eras nuevas**: el mapa y las
  silhouettes no cambian con la era. Un jugador en era industrial
  ve exactamente el mismo pergamino que uno en era tribal.
