---
tipo: review
sprint: ENSAMBLAJE-UI
commit_auditado: 686c83f
rama_origen: claude/wire-playable-game-7A2OH
fecha: 2026-04-22
auditor: Director Creativo (CLAUDEDIRECTOR.md §Auditoría técnica)
estado_merge: ya en main (merge hecho por Director humano antes de esta auditoría)
---

# REVIEW — Sprint ENSAMBLAJE-UI

Auditoría post-merge. El merge ya está hecho; los findings son
follow-ups ejecutables, no bloqueantes. Severidades por protocolo:

- 🔴 regresión / contrato roto → fix inmediato
- 🟠 bug latente / contradicción comportamental → fix en sprint próximo
- 🟡 cosmético / tech debt → fix cuando se toque la zona
- ⚠️ vigilar sin acción

## Resumen ejecutivo

**Veredicto general**: aprobado. §A4 intacto, loop determinista bien
cableado, server/client split correcto, 7 opciones del modal mapeadas
a `MESSAGE_INTENTS` reales (no inventadas), detección defensiva de
`era === 'tribal'` para la migración #33 futura.

**Correcciones honestas del ingeniero al prompt original**: dos, ambas
acertadas. `drafting.ts` → `messages.ts` para composición del mensaje
diario; `state.chronicle` → `village.messageHistory`. Flaggeadas en
el commit, no silenciadas. Comportamiento revisor: hizo lo correcto.

**Findings abiertos**: 2 (1 🟠, 1 🟡). Cero 🔴.

---

## Finding #1 — Header del E2E contradice su comportamiento real

> [Revisor] 2026-04-22: `tests/e2e/ensamblaje.spec.ts` tiene
> cabecera explícita:
>
> ```
> ESTADO: ready-for-future. No se ejecuta en el sandbox actual
> (chromium no descargable — ver NOTES-OVERNIGHT.md § Bloqueo
> Sprint 1.5 E2E). Entra automáticamente al gate cuando
> `pnpm exec playwright install chromium` tenga red.
> ```
>
> Sin embargo el spec NO tiene `test.skip`, `test.fixme`, ni
> condicional de arranque. Es un `test(...)` plano que corre siempre
> que playwright tenga chromium disponible. El handoff reporta `4/4
> playwright` — matemáticamente consistente (map-view: 3 tests +
> ensamblaje: 1 test = 4). O sea: **el test SÍ se ejecuta**, la
> cabecera miente.
>
> **Severidad**: 🟠. No es regresión, pero un lector que confíe en
> el header asume que el spec es placeholder aspiracional. Si alguien
> lo toca creyendo que "no corre aún", puede romper el gate sin darse
> cuenta hasta CI.
>
> **Causa probable**: el patrón `ready-for-future` se copió de Sprint
> 1.5 (`map-view.spec.ts`) donde efectivamente se escribió antes de
> tener chromium. Aquí el chromium ya estaba disponible (vía
> `PLAYWRIGHT_CHROMIUM_PATH` del fix de Sprint FIX-GATE-PRIMIGENIA),
> así que el spec se ejecuta, pero el header se copió mecánicamente.
>
> **Acción sugerida**: reemplazar la cabecera por una descripción
> honesta del flujo que cubre (lo que ya dice el `test.describe`
> basta). O mantener la nota pero añadir:
>
> ```ts
> test.describe.configure({ mode: 'serial' });
> // Si chromium no está disponible, skip ordenado:
> test.skip(!process.env.PLAYWRIGHT_CHROMIUM_PATH && !process.env.CI,
>   'requiere chromium instalado');
> ```
>
> para que el spec diga la verdad en ambos entornos.

---

## Finding #2 — Comentario de `default-clan.ts` tiene rastro de proceso

> [Revisor] 2026-04-22: el docstring de `lib/default-clan.ts`
> (líneas 9-13 aprox.) enseña el razonamiento iterativo de budget
> en voz alta:
>
> ```
> Bloque A: Lider M (4) + Cazador F (3) + Curandero F (3) =
> 10 puntos, 4 slots, 2M + 2F. Cuarto slot: Artesano M (pero
> excedería budget 4+3+3+3=13 >10). Reajuste: Lider M +
> Cazador F + Recolector F + Scout M = 4+3+2+2=11 >10 también.
> Budget 10: Lider(4) + Cazador(3) + Recolector(2) + Scout(2)
> = 11 — excede. Usamos: Cazador M + Cazador F + Recolector M
> + Recolector F = 3+3+2+2 = 10. 2M+2F exacto.
> ```
>
> Muestra el pensamiento del agente al llegar al pick canónico,
> no el *why* del pick resultante. Un lector futuro tiene que leer
> cuatro combinaciones descartadas antes de encontrar la vigente.
>
> **Severidad**: 🟡. Cosmético. No afecta comportamiento, no afecta
> tests.
>
> **Contrato violado**: `CLAUDE.md` §Convenciones —
>
> > Comentarios: sólo cuando el *why* no es obvio. Nunca describir
> > *qué hace el código* si los identificadores ya lo dicen.
>
> **Acción sugerida**: reemplazar por versión condensada —
>
> ```ts
> /**
>  * Picks canónicos de Bloque A: 2 Cazadores + 2 Recolectores
>  * (3+3+2+2 = 10, cumple budget exacto y 2M+2F equilibrado).
>  * Deja margen para rebalance futuro sin comerse el cap.
>  */
> ```

---

## Mea culpa del Director (no es finding contra el ingeniero)

Dos errores míos al escribir el prompt del sprint, documentados aquí
para auditoría propia:

1. **`state.chronicle` no existe**. Escribí como criterio de cierre:
   *"La crónica en `state.chronicle` crece con cada día"*. El campo
   real es `village.messageHistory` poblado por `archiveAtDawn`. El
   ingeniero lo corrigió sin silenciarlo (flag en handoff). Lección:
   verificar shape real antes de escribir criterios; no fiarme del
   recuerdo de Fases anteriores.

2. **Casi mando un finding falso sobre `generateCandidates`**.
   Al ver `generateCandidates(seed, tier, 0)` hipoteticé que el `0`
   era cursor PRNG reutilizado → correlación entre tiers. **Falso**.
   El 3er arg es `pantalla` (reroll index) y se compone vía
   `candidateSeed(baseSeed, tier, pantalla)` → seed independiente
   por tier. Los streams son ortogonales. Lección: el protocolo de
   auditor ("verificar antes de mandar hipótesis al ingeniero")
   funciona. Leí `drafting.ts:273` antes de escribir este review y
   el finding se cayó solo. Dejar constancia.

---

## Lo que NO es un finding (pero el ingeniero debe saber que lo miré)

- **Modal como panel inferior en vez de overlay**: decisión aprobada.
  El razonamiento (preservar drag/zoom del canvas) es correcto;
  además es un patrón UX más sobrio que un overlay modal para un
  "verbo diario". Confirmado para próximos sprints salvo que Claude
  Design proponga lo contrario.

- **Miracles fuera del modal**: decisión aprobada. Requiere selector
  NPC, es legítimo scope creep. Futuro sprint dedicado (posible
  nombre: `MIRACLES-UI` — requiere decisión de diseño sobre cómo se
  selecciona objetivo: click directo en NPC del mapa, lista lateral,
  etc.). No abrir todavía.

- **Inline styles con hex hardcodeados en `DailyModal`**: tech debt
  conocido. `#0e0e0e`, `#f5f5dc`, `#1e1e1e` en vez de tokens oklch
  de `app/globals.css`. Aceptable como placeholder hasta firma de
  paleta final por Claude Design. No finding — entra en el bundle
  de "DESIGN-INTEGRATION" cuando llegue.

- **Wheel fix de `MapView.tsx:179`**: no se tocó. Era opcional y
  sigue 🟠 abierto del review anterior. Sprint dedicado cuando haya
  hueco o cuando Claude Design valide que el warning molesta.

---

## Acciones para el ingeniero

1. **Finding #1 (🟠)**: decidir entre reescribir header honesto o
   añadir `test.skip` condicional. Cualquiera resuelve.
2. **Finding #2 (🟡)**: edit cosmético del docstring. 5 minutos.

Ambos caben en un commit `fix: review-ensamblaje — header e2e +
comentario default-clan` sin abrir sprint nuevo. Post-commit hook
auto-pushea.

Si hay dudas sobre severidad o acción, preguntar al Director antes
de actuar. El review queda archivado como constancia aunque los
findings se cierren.
