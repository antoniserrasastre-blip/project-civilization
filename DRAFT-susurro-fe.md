---
tipo: draft-visión
estado: pendiente-firma-humana
autor: Director Creativo
fecha: 2026-04-22
scope: reemplazo §3.7 + nueva §3.7b + patch §3.8
base: vision-primigenia.md (commit 064f4ca)
---

# DRAFT — Susurro persistente y Fe como moneda de cambio

## Decisiones aplicadas (pre-llenadas por el Director)

Corrige lo que no cuadre antes de firmar:

- **Fórmula de Fe**: `Fe/día = sqrt(seguidores vivos)`.
- **Coste de cambiar a susurro activo**: `80 Fe`.
- **Coste de silenciar deliberadamente**: `40 Fe` (mitad — es pausa
  táctica / emergency-stop, no pivote estratégico).
- **Cap de Fe**: `160` (2× coste de cambio, anti-banking).
- **Fe inicial**: `30` (colchón de arranque; no alcanza para cambiar
  de susurro, pero sí acorta el primer cambio a ~13 días).
- **Primer susurro**: gratis (un "estrenar la voz" sin coste).
- **Estado inicial**: Silencio con **gracia de 7 días** (una semana
  in-game) sin penalización.
- **Gratitud bajo susurro persistente**: emerge diariamente *solo*
  cuando el susurro activo beneficia a NPCs reales ese día.

Tras firma, este contenido reemplaza §3.7 completo de
`vision-primigenia.md`, añade §3.7b, y patchea §3.8.

---

## §3.7' — El mensaje persistente (reemplaza §3.7)

El dios habla **una vez** y su palabra sobrevive semanas. Este es
su único verbo continuo: un susurro global al clan que permanece
activo hasta que decida cambiarlo. El mundo no se detiene al elegir
— el tiempo corre, los NPCs viven, el susurro reverbera en cada
jornada sin necesidad de volver a pronunciarlo.

**Vocabulario** (6 intenciones + Silencio, intacto respecto al §3.7
original — ver tabla ahí). La **interpretación emergente** de
Pilar 1 también queda intacta: cada NPC lee el susurro activo
según sus niveles y su linaje, y la crónica narra las 2-3
lecturas más relevantes de la jornada.

**Estado inicial**: el clan nace con **Silencio** activo. El primer
susurro explícito del jugador es **gratuito** — no consume Fe. Se
concede como "estrenar la voz".

**Gracia inicial del Silencio**: durante los **primeros 7 días** (una
semana in-game) sin haber susurrado, el Silencio no penaliza — el clan
está en bivouac, orientándose. A partir del octavo día sin susurro
elegido, el Silencio activa sus efectos: gratitud pasiva disminuye,
probabilidad de semilla de herejía aumenta (semántica del §3.7 original
aplicada al acumulado de días sin voz, no al día concreto).

**Volver a Silencio explícitamente** (tras haber susurrado algo) es
una elección que **cuesta Fe como cualquier otro cambio** (§3.7b).
Silenciar deliberadamente es un acto.

**Por qué el susurro persiste**: el pulso diario obligatorio del §3.7
original resolvía el vacío del jugador contemplativo pero introducía
click-spam — una decisión cada amanecer diluye el peso de cada
decisión. El susurro persistente lo invierte: **pocas decisiones con
mucho peso**. El jugador decide cuándo hablar y paga por cada cambio;
entre susurro y susurro observa al clan vivir la consecuencia. El
problema del jugador-mudo se resuelve por la penalización del Silencio
acumulado y por los indicadores visibles del mundo, no por un modal
forzoso.

---

## §3.7b — Fe como moneda de cambio (sección nueva)

Segunda moneda, separada funcionalmente de la gratitud (§3.8). La
Fe **no desbloquea milagros** — eso sigue siendo dominio exclusivo
de la gratitud. La Fe sirve para una cosa: **cambiar el susurro
activo**.

### Generación

Fe se acumula **pasivamente** según el tamaño actual del clan.
Fórmula sublineal para que crecer demográficamente acelere suavemente
el acceso a cambios sin hacerlos triviales:

```
Fe/día = sqrt(seguidores vivos)
```

Seguidores vivos = NPCs con `alive === true`. Elegidos y Ciudadanos
cuentan igual.

Ritmo sostenido (desde Fe=0 tras gastar, sin contar Fe inicial):

| Seguidores vivos | Fe/día | Días a 80 (cambio) | Días a 40 (silencio) |
|-|-|-|-|
| 5 | 2.24 | ~36 (punitivo) | ~18 |
| 14 (arranque) | 3.74 | ~21 (≈ 3 semanas) | ~11 |
| 20 | 4.47 | ~18 | ~9 |
| 50 | 7.07 | ~11 | ~6 |
| 100 | 10 | 8 | 4 |

**Primer cambio tras arranque** (con Fe=30 inicial): `(80 − 30) / Fe_día`.
A 14 vivos → ~13 días (casi 2 semanas). A 50 vivos → ~7 días.

Curva intencional: clan pequeño se compromete; clan grande se ha
ganado flexibilidad. El crecimiento demográfico le da más voz al
dios, literalmente.

### Coste y cap

- **Coste de cambiar a susurro activo** (Auxilio ↔ Coraje ↔ Paciencia
  ↔ …): `80 Fe` fijo, no escala con cambios previos.
- **Coste de silenciar deliberadamente** (susurro activo → Silencio
  elegido): `40 Fe`. La asimetría refleja función: silenciar es
  **emergency-stop** o pausa táctica, no pivote. Útil cuando tu susurro
  actual hace daño y no tienes 80 para pivotar directamente a otro.
  Nota: silenciar y luego volver a hablar (40 + 80 = 120 Fe) sigue
  siendo más caro que un cambio directo (80 Fe), así que no se puede
  explotar como atajo.
- **Cap de acumulación**: `160 Fe` (2× coste de cambio).
- **Fe inicial**: el clan nace con **`Fe = 30`** — colchón de arranque
  que evita el "HUD seco" pero no alcanza para un cambio (ni para
  silencio). Con 14 vivos, acorta el primer cambio de 21 a ~13 días.

Cap anti-banking: el jugador no puede almacenar diez cambios pendientes
para soltarlos en una crisis. Excedente sobre el cap se pierde —
incentivo suave a gastar cuando estás lleno.

### Silencio como elección vs. Silencio como estado

Punto fino — el Silencio puede estar activo por dos vías:

1. **Silencio por default** (desde nacimiento del clan, antes del
   primer susurro): sin penalización durante gracia de **7 días**,
   luego empieza a drenar.
2. **Silencio elegido** (jugador paga **40 Fe** para silenciar tras
   haber susurrado): activa efectos inmediatamente, sin gracia. Coste
   reducido respecto al cambio (80) porque funciona como emergency-stop,
   no como pivote.

Preserva la semántica del §3.7 original (silenciar *deliberadamente*
tiene consecuencias) sin imponerla sobre el arranque natural.

### Interacciones de bordes

- **Muerte de seguidores**: Fe/día se ajusta al vuelo (función de
  vivos actuales). Epidemia o hambruna te deja con menos voz.
- **Migrantes** (post-primigenia): aumenta generación al instante.
- **Rival** (post-primigenia): no afecta Fe propia — solo contamina
  gratitud vía herejía.

---

## §3.8 — Patch sobre gratitud (no reemplazo completo)

El §3.8 actual define gratitud como emergente cuando el mensaje
diario beneficia tangiblemente. Con susurro persistente se ajusta
una sola dimensión: **cadencia de generación**.

**Antes** (§3.8 original, asumía pulso diario):
> "Se acumula en un pool del clan (...) La generan los NPCs cuando
> viven un mensaje diario que les beneficia tangiblemente."

**Ahora** (con susurro persistente):
- La gratitud se evalúa **cada día** sobre el susurro activo.
- Día con susurro alineado a una necesidad real del clan = pulso
  de gratitud ese día.
- Día con susurro activo pero sin necesidad compatible (clan en
  equilibrio, o susurro inadecuado al momento) = **cero gratitud**.
- No hay retornos decrecientes artificiales — hay retornos
  decrecientes **emergentes**: si el clan ya está saciado con Auxilio,
  mañana no hay hambre que calmar, no hay gratitud. El jugador
  experto nota y rota.

Efecto estratégico: **rotar susurro no es obligatorio, es útil**. Un
Coraje mantenido toda una estación puede generar gratitud continua
si hay cacerías riesgosas que salen bien, o puede no generar nada
si la situación demanda Paciencia. El jugador no está castigado por
perseverar — está castigado por desalinearse.

Lo demás del §3.8 (costes de milagros, herencia 50%, 3 rasgos máx
por NPC, sin retroceso) queda **intacto**.

---

## Contrato para ingeniería (post-firma)

Cuando firmes, este draft se merge a `vision-primigenia.md` y se
abre **Sprint REFACTOR-SUSURRO-FE**:

- **Estado**: añadir `village.faith: number` (inicial 0) y
  `village.silenceGraceDaysRemaining: number` (inicial 3).
- **Módulo nuevo** `lib/faith.ts`: `faithPerDay(aliveCount)`,
  `FAITH_COST_CHANGE = 80`, `FAITH_CAP = 160`, pura y determinista.
- **`village.activeMessage`**: cambia semántica — ya no se resetea
  al amanecer. Solo al cambiar explícitamente o silenciar.
- **`archiveAtDawn`** → `archiveOnChange`: se invoca al cambiar
  susurro, no en tick de amanecer.
- **UI**: modal obligatorio al amanecer → botón "Hablar al clan"
  siempre disponible. Mostrar Fe actual, coste de cambio, estado
  actual del susurro y, si aplica, días de silencio acumulados.
- **Tests §A4**: `tick()` sigue determinista byte-a-byte; Fe acumula
  según vivos actuales; cap aplica; primer susurro no descuenta Fe;
  gracia del Silencio cuenta solo desde Día 1 hasta primer susurro.
- **Bump de storage**: `STORAGE_KEY .v2 → .v3` al meter campos nuevos
  en `village`.

Tracks independientes que siguen en paralelo sin esperar a éste:
- **RENDER-NPCS**: sprites visibles en mapa (bug ortogonal).
- **FICHA-AVENTURERO**: card al clicar NPC (stats + milagros +
  heridas + linaje). Campos exactos a decidir en su propio DRAFT.

---

## Preguntas abiertas (vaciar antes de firma)

### Respondidas por el humano (2026-04-22)

1. ✅ **Fe inicial = 30** (colchón suave, se desmarca del default Fe=0).
4. ✅ **Silencio elegido = 40 Fe** (se desmarca del default 80 Fe —
   silenciar es pausa táctica, no pivote).

Ajuste adicional fuera de la lista original:
- ✅ **Gracia del Silencio = 7 días** (antes 3). Alinea con la
  sensación pedida de *"al principio solo observas"*.

### Abiertas (defaults asumidos salvo que marques otro)

2. **¿El cap de 160 también gatea la gracia inicial?** ¿Fe acumula
   durante los 7 días de gracia sin susurrar? *Default: sí, acumula
   desde Día 1 — no bloquear por no-interacción. Combinado con Fe
   inicial=30 y 14 vivos, al final de la semana de gracia tendrías
   ~56 Fe. No alcanza para cambiar (80), cerca de alcanzar silencio
   elegido (40) — coherente con la función de orientación.*

3. **¿Eventos narrativos que regeneren Fe excepcionalmente?**
   Nacimiento de niño, completar estructura, muerte de rival. *Default:
   no, Fe solo por generación pasiva. Simple y legible. Si quieres
   picos, abrimos como mecánica post-primigenia.*

5. **Feedback visual de Fe**: barra en HUD, número puro, icono
   pulsante al llegar al coste. *Default: número + barra con marca
   en 80 (coste cambio) y 40 (coste silencio). Pero esto es territorio
   de Claude Design — lo delegamos al handoff de diseño.*

### Además se merge al mismo commit

- La **narrativa del humano sobre "cómo se siente jugar"** entra como
  `vision-primigenia.md §4.0 — Cómo se siente jugar`, antes del
  desglose por minuto existente del §4. Texto del humano con mínima
  edición editorial.

Confirma defaults de Q2/Q3/Q5 (o marca cambios) y redacto el commit
que:
1. Funde este draft a `vision-primigenia.md §3.7' / §3.7b / §3.8`.
2. Añade `§4.0` con la narrativa del humano.
3. Archiva `DRAFT-susurro-fe.md` (queda en historial git, ya no en
   el árbol).

