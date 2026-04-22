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
- **Coste de cambio de susurro**: `80 Fe`.
- **Cap de Fe**: `160` (2× coste, anti-banking).
- **Primer susurro**: gratis (un "estrenar la voz" sin coste).
- **Estado inicial**: Silencio con **gracia de 3 días** sin penalización.
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

**Gracia inicial del Silencio**: durante los **primeros 3 días** sin
haber susurrado, el Silencio no penaliza — el clan está en bivouac,
orientándose. A partir del cuarto día sin susurro elegido, el Silencio
activa sus efectos: gratitud pasiva disminuye, probabilidad de semilla
de herejía aumenta (semántica del §3.7 original aplicada al acumulado
de días sin voz, no al día concreto).

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

Ritmo derivado (con coste 80):

| Seguidores vivos | Fe/día | Días por cambio |
|-|-|-|
| 5 | 2.24 | ~36 (~5 semanas, punitivo, clan en crisis) |
| 14 (arranque) | 3.74 | ~21 (≈ 3 semanas) |
| 20 | 4.47 | ~18 |
| 50 | 7.07 | ~11 |
| 100 | 10 | 8 |

Curva intencional: clan pequeño se compromete; clan grande se ha
ganado flexibilidad. El crecimiento demográfico le da más voz al
dios, literalmente.

### Coste y cap

- **Coste de cambio**: `80 Fe` fijo (no escala con nº de cambios previos).
- **Cap de acumulación**: `160 Fe` (exactamente 2× coste).

Cap anti-banking: el jugador no puede almacenar diez cambios pendientes
para soltarlos en una crisis. Excedente sobre el cap se pierde —
incentivo suave a gastar cuando estás lleno.

### Silencio como elección vs. Silencio como estado

Punto fino — el Silencio puede estar activo por dos vías:

1. **Silencio por default** (desde nacimiento del clan, antes del
   primer susurro): sin penalización durante gracia de 3 días, luego
   empieza a drenar.
2. **Silencio elegido** (jugador paga 80 Fe para silenciar tras
   haber susurrado): activa efectos inmediatamente, sin gracia.

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

Respóndelas y yo las integro al commit final:

1. **Estado inicial exacto**: ¿empiezas con Fe=0 o con pool inicial
   (p.ej. Fe=40 = medio cambio) para suavizar? *Mi default: Fe=0,
   el primer susurro gratis basta como onboarding.*

2. **¿El cap de 160 también gatea la gracia inicial?** Es decir:
   durante los 3 días de gracia sin susurrar, ¿Fe acumula normalmente
   aunque el jugador no haya hablado? *Mi default: sí, Fe acumula
   desde Día 1 — no bloquear por no-interacción.*

3. **¿Eventos narrativos que regeneren Fe excepcionalmente?** Muerte
   de un Elegido, nacimiento importante, completar monumento. *Mi
   default: no, Fe solo por generación pasiva. Simple y legible. Si
   quieres picos, abrimos como mecánica post-primigenia.*

4. **¿Silencio elegido cuesta 80 Fe igual que los demás susurros, o
   es gratis "dejar de hablar"?** *Mi default: cuesta 80 Fe.
   Silenciar deliberadamente es acto con peso.*

5. **Feedback visual de Fe**: ¿barra en HUD, número puro, icono
   pulsante al llegar al coste? *Mi default: número + barra con marca
   en 80. Pero esto es territorio de Claude Design realmente — lo
   delegamos al handoff de diseño.*

Responde las cinco (o confirma que los defaults valen) y redacto el
commit que aplica el merge a `vision-primigenia.md`.

