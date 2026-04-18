# VERSION LOG — v0.2 Second Era

**Estado**: ✅ shipped (commit `1c7132e`)
**Sprints**: 8 (Second Era).

## Qué hace esta versión

- Sistema de tecnología con pools por era (`lib/tech.ts`). Tribal:
  `fuego` (inicial), `herramientas_piedra`, `escritura_primitiva`.
  Bronce: `metalurgia_bronce`, `agricultura_intensiva`,
  `navegacion_costera`.
- Descubrimiento tecnológico automático vía scheduler (Pase 7):
  probabilidad base + bonus por inteligencia media del pueblo vivo.
- Transición de era: cuando el pool de la era actual queda completo,
  el scheduler emite `era_transition` que cambia `state.era`.
- Cinemática de fin de era: modal pergamino "La era X cae. Llega la
  era Y." detectada en UI via `useRef`.
- Panel de tecnología en la aside: era actual, tech conocidas, número
  de pendientes.

## Por qué y cómo encaja con la visión

- Prueba de que **la arquitectura escala**. El motor de v0.1 era capaz
  de sostener un estado determinista con 1 grupo; ahora admite
  transiciones globales sin refactor. La clave es el polymorfismo del
  evento `LifecycleEvent`: añadir `tech_discovered` y `era_transition`
  no requirió tocar nada fuera del scheduler.
- Habilita las eras posteriores (clásica, medieval, industrial,
  atómica) como simple extensión de `TECH_POOLS`.

## Perspectiva del jugador

> Llevo una hora acelerando a 100×. El panel de Tecnología dice "2
> pendientes". De pronto, un día cualquiera, cae una línea en la
> crónica: "Los nuestros han descubierto herramientas de piedra." Unos
> cientos de ticks más tarde, "escritura primitiva". Y entonces
> aparece un modal grande sobre el mapa: "La era tribal cae. Llega la
> era bronce." Pulso "Seguir observando". El HUD cambia. Algo en la
> música (que aún no hay — flag) debería cambiar también.

## Balance

| Parámetro | Valor | Racional |
|-|-|-|
| `TECH_DISCOVERY_BASE_PROB` | 0.0008 | ~1 descubrimiento cada 1250 ticks ignorando inteligencia. |
| `TECH_DISCOVERY_INTEL_WEIGHT` | 0.002 | Con intel media ≈50, extra ~0.001 → prob total ~0.0018. |

A ritmo de 100× (500 ticks/s), una tech cada ~2 segundos. A 1×
(5 ticks/s), una cada ~4 minutos. La era tribal (3 tech) se cierra en
unos 12 minutos reales a 1× — aceptable como primera partida.

## 🚩 Flags para supervisión humana

- ⚠️ **Transición de era sin UX adicional**: solo cambia `state.era` y
  aparece el modal. No hay efectos mecánicos (stats, dones nuevos) en
  la era bronce todavía — solo el pool de tech. Sprint 14+ debería
  añadir unidades/dones específicos de cada era.
- ⚠️ **Pool de eras clásica/medieval/industrial/atómica VACÍO**: el
  catálogo las enumera pero sin tech. Una partida que progrese a
  bronce se queda ahí sin posibilidad de avanzar.
- ⚠️ **Música/sonido ausente**: la transición de era pide un momento
  sonoro. Fuera de scope técnico hasta decisión del Director.
