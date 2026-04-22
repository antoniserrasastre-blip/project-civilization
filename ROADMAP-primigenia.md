---
tipo: roadmap
estado: pendiente-firma-humana
fecha: 2026-04-22
base: vision-primigenia.md (commit 73615a1 + pase editorial 1c643f2)
---

# ROADMAP — Edad Primigenia

## Resumen ejecutivo

Construir la primera edad jugable de GODGAME al nivel de fase: un
archipiélago determinista donde 14 personas drafteadas sobreviven,
interpretan el susurro persistente del jugador, generan Fe y gratitud,
y cierran el loop levantando el monumento que desbloquea una
bendición de aldea.

**Objetivos de la era**:

1. Un mundo 512×512 reproducible byte a byte desde `seed`.
2. Un clan de 14 NPCs (4 Elegidos + 10 Ciudadanos) autónomo: se mueve,
   recolecta, craftea, muere y se reproduce sin intervención.
3. El verbo del dios implementado: susurro persistente (6 intenciones
   + Silencio), economía de Fe (`sqrt(vivos)/día`, cap 160, coste 80
   por cambio), pool de gratitud y 5 milagros (§3.7, §3.7b, §3.8).
4. Loop cerrado: monumento construible, bendición de aldea elegible,
   transición al cartucho tribal (placeholder).
5. Pilar 1 demostrable: mismos rasgos bajo susurros distintos (y
   mismo susurro bajo composiciones distintas) producen trayectorias
   medibles diferentes.

---

## Fases

Las 7 fases son las definidas en `vision-primigenia.md §8`. Orden
canónico; reordenar requiere firma del Director humano. Estimaciones
en días-calendario de un ingeniero full-time bajo TDD estricto.

| # | Fase | Dependencias | Entregable testeable | Días | Estado |
|-|-|-|-|-|-|
| 1 | **Mundo** — generación determinista 512×512 + render pixel art con zoom/drag | — | Fixture JSON del mundo + snapshot visual. Regeneración byte-idéntica 1.000× con mismo seed. Round-trip JSON verde. | 5–7 | listo |
| 2 | **NPCs y recursos** — drafting 4+10 por tiers, castas, linajes, recursos con régimen, fog-of-war | Fase 1 | Partida iniciada con 14 NPCs en el mapa y recursos visibles al descubrirlos. Stats iniciales deterministas por seed. | 8–10 | listo |
| 3 | **Movimiento y pathfinding** — A* sobre tiles, nomadismo real del clan tras agotamiento local | Fase 2 | 10.000 ticks en verde sin NPCs atrapados. Clan deriva coherentemente tras agotar un recurso local. | 5–7 | listo |
| 4 | **Economía** — necesidades (hambre/sed/frío), crafting con recetas y skills, matriz relacional NPC×NPC, fogata permanente | Fase 3 | Clan alcanza los 5 crafteables umbral por sí solo en partida determinista de 20.000 ticks. | 10–14 | listo |
| 5 | **Susurro, Fe y gratitud** — verbo del dios completo: susurro persistente + 6 intenciones, `lib/faith.ts`, pool de gratitud, 5 milagros con herencia 50% | Fase 4 | (1) Mismos rasgos bajo susurros distintos → trayectorias medibles distintas. (2) Mismo susurro → lecturas distintas según composición. (3) 20 días silenciados → semilla de herejía; milagro Corazón fiel a 80 de gratitud deja pool a 0. (4) Fe acumula `sqrt(vivos)` determinista, cambio descuenta 80, silencio deliberado 40, cap 160, primer susurro gratis, gracia 7 días. | 6–8 | en progreso |
| 6 | **Monumento y bendición de aldea** — condiciones de desbloqueo, construcción con coste/tiempo, cinemática de transición, selección de bendición | Fase 5 | Partida que llega al monumento en condiciones normales, selecciona bendición y transiciona al cartucho tribal (placeholder). | 6–8 | en progreso |
| 7 | **Migrantes externos y rival** (diferida, post-primigenia) | Fase 6 cerrada + firma humana | NPCs externos al culto atraíbles por el monumento. Reaparición del dios rival (Pilar 4). Abre la edad tribal. | 15–20 | pendiente |

**Totales**:

- Fases 1–4 (infraestructura + clan autónomo): contract-complete en
  commits `b9f0b0c` / `6378dd8` / `90f66c9` / `dfa4bbc`.
- Fases 5–6 (gameplay divino + cierre del loop): contract-complete
  en commits `21c612f` / `76ada22` pero **pendientes de**: (a)
  re-alineación con la firma del susurro persistente y economía de
  Fe (§3.7 reescrito y §3.7b nuevo en commit `73615a1`), (b)
  playtest humano que valide las viñetas 3 y 4 de los VERSION-LOGs
  correspondientes.
- Fase 7: fuera de scope de la edad primigenia. Se planifica en un
  roadmap propio cuando el Director humano firme el cierre de
  primigenia.

**Efecto remanente** (lo que queda para declarar primigenia cerrada,
no un rebuild): **~4–6 días** de ajustes sobre 5 y 6 + playtest.
El estimado de 15-20 días de Fase 7 **no cuenta** aquí.

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
