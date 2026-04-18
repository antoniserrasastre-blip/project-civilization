# VERSION LOG — v1.0.1 Polish & Decisions

**Estado**: ✅ shipped (commits `517d0df` → último)
**Alcance**: 5 decisiones del Director Creativo capturadas en
`DECISIONS-PENDING.md` + balance de conflicto heredado de la suite
de coherencia.

## Qué hace esta versión

No añade eras ni pilares nuevos. **Completa v1.0 antes de seguir** —
resuelve 5 preguntas de diseño que quedaban pendientes y que
habrían contaminado cualquier v1.1 si se construyera encima.

| # | Feature | Decisión | Archivos clave |
|-|-|-|-|
| 1 | Fe cap 500 | A (cap duro) | `lib/faith.ts` nuevo |
| 2 | Victoria pírrica | C (tercer estado) | `lib/verdict.ts` extendido |
| 3 | Rival concede dones | B (sin maldiciones) | `lib/rival-ai.ts`, scheduler |
| 4 | NPCs con sexo | A (binario M/F) | `lib/world-state.ts`, schema v4 |
| 5 | Dilema nuclear | A (decisión del Elegido) | `lib/nuclear.ts` nuevo |

Plus: `CONFLICT_BASE_PROB_PER_TICK` reducido de 0.0015 a 0.0005 tras
la suite de coherencia — los conflictos eran guerra campal 2:1 sobre
muertes por edad, ahora son la minoría dramática.

## Por qué y cómo encaja con la visión

- **Pillar 3 (economía de Fe)** ahora tiene techo claro. El jugador
  siente el coste real de cada decisión — antes, acumular 1000 Fe
  trivializaba maldiciones fatales. Ahora 500 Fe permite ~16
  maldiciones fatales máximo a lo largo de la partida.
- **Pillar 4 (anti-presión)** se refuerza con la simetría parcial:
  el rival concede dones (se siente vivo) pero no maldice (evita
  guerra de atrición).
- **Pillar 5 (linaje reina)** gana el matiz pírrico — reinar solo ya
  no es una victoria plana.
- El sexo binario abre matrilinealidad/patrilinealidad para v1.1+.
- El dilema nuclear deja a v1.4 un cierre narrativo mínimo viable.

## Perspectiva del jugador

> Vuelvo a la partida. En la cabecera: "Fe 500" con un tono naranja
> que antes no veía — me dice "ya no va a subir más". Gasto 30 Fe en
> un don para mi Elegida, mi Fe baja pero a los pocos segundos vuelve
> al cap. Siento que el juego me empuja a GASTAR, no a contemplar.
>
> El rival de Llevant, que es aggressive, me envía un halo a uno de
> los suyos — normal. Un rato después, el HUD del rival muestra que
> ha perdido 30 Fe: ha dotado a su Elegido de Fuerza Sobrehumana. Ya
> no siento que estoy jugando contra un autómata; hay alguien al otro
> lado que también toma decisiones.
>
> A los 45 minutos (velocidad 100×), una línea en la crónica: "Los
> nuestros han descubierto fisión nuclear." Un modal negro con borde
> rojo aparece: "¿Concedes la tecnología de destrucción?" Respiro.
> Click. "Guardar el secreto." La partida continúa — pero ya no me
> siento tan cómodo con mi victoria.

## Balance

### Fe con cap 500

| Con 1 sagrado vivo | Con 3 sagrados vivos (Elegido + 2 descendientes) |
|-|-|
| Alcanza cap en ~2000 ticks = ~400s a 1× = ~6.7 min | Alcanza cap en ~670 ticks = ~134s a 1× = ~2.2 min |

A 100× (500 ticks/s), el cap se llena en 4-5 segundos. En partidas
aceleradas el jugador vive cerca del techo casi siempre — eso es
exactamente el comportamiento deseado: la Fe deja de ser
"acumulable indefinida" y se convierte en "úsala o se pierde".

### Rival gasto de Fe

Rival con chosen unánime + Fe al cap entra en ciclo de 500 días.
50% prob de grant cuando puede. Gasta 30 Fe por grant. En 5 ciclos
(~2500 días): ~2.5 grants → 75 Fe gastados. Regenera ~125 Fe en ese
tiempo → saldo positivo. Rival no quiebra, pero tampoco acumula
infinito — el cap lo obliga a gastar.

## 🚩 Flags para supervisión humana (post-v1.0.1)

- 🟡 **Microconsecuencia nuclear pendiente para v1.4**. Tu propio
  aviso cuando tomaste la decisión: un SÍ-o-NO sin coste previo
  puede sentirse hueco. Diseñar una "radiation tech" en era
  industrial/atómica que debilite stats del pueblo poco a poco es
  lo natural — ahora mismo el dilema pesa narrativamente pero no
  mecánicamente. Hooks necesarios:
  1. Nueva tech `radiacion_ambiental` en era industrial.
  2. Pase del scheduler que reduce `stats.fuerza` -1/año a todos los
     NPCs si la tech está descubierta.
  3. Crónica recurrente con la palabra "envenenamiento".
- 🟡 **El rival aggressive en cap puede parecer "infinito"**. Si
  sostiene 500 Fe durante horas, cada 500 días puede grant + anoint
  alternadamente. Con 3 dones y ~4 chosen esperables, en 6000 días
  queda cubierto. A partir de ahí la decisión 50/50 grant/anoint le
  hace gastar en repeticiones fallidas. No es bug — es diseño
  intencional por ahora. Playtest decidirá si hace falta añadir
  curses al rival (decisión que quedó flag ámbar).
- ⚠️ **Storage v4 invalida saves v3**. Cualquier partida anterior a
  v1.0.1 arrancará desde cero al cargar. Esperado — no hay migración
  porque los NPCs v3 no tienen sex y añadirlo retroactivamente
  rompería el determinismo del seed.
- ⚠️ **Tests de cross-group pairing de v0.3 pueden ser menos
  probables ahora** — requerir M+F en distancia extendida es más
  restrictivo. El test de coherencia "cross-group pairing aparece"
  usa 15k ticks y sigue verde, pero con margen menor.

## Estado de los tests

| Capa | v1.0 | v1.0.1 | Delta |
|-|-|-|-|
| Unit + integration + design | 273 | 314 | +41 |
| Todos flags | 4 | 4 | 0 |
| E2E | 26 | 26 | 0 |

Nuevos archivos de test:
- `tests/unit/faith-cap.test.ts` (9 tests)
- `tests/unit/verdict-pyrrhic.test.ts` (8 tests)
- `tests/unit/rival-gifts.test.ts` (7 tests)
- `tests/unit/sex.test.ts` (7 tests)
- `tests/unit/nuclear-dilemma.test.ts` (10 tests)
