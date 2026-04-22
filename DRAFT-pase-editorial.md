---
tipo: draft-editorial
estado: pendiente-firma-humana
autor: Director Creativo
fecha: 2026-04-22
scope: limpiar referencias a mecánica de mensaje-diario-obligatorio
base: vision-primigenia.md commit 73615a1
---

# DRAFT — Pase editorial post-firma susurro persistente

El merge del `73615a1` dejó §3.7/§3.7b/§3.8/§4.0 coherentes con el
nuevo modelo (susurro persistente + Fe + gratitud emergente). Pero
hay **6 sitios** del mismo doc que todavía describen la mecánica
antigua (modal diario obligatorio, Fe = creyentes sin moneda). Este
pase los alinea.

Cada edit abajo: qué dice hoy, qué dirá, y por qué (si no es trivial).

---

## Edit 1 — §1 Pilar 1 (línea 55)

**Antes**:
> Cada NPC interpreta el mismo **mensaje diario** de forma distinta; 5 milagros raros con rasgos hereditarios 50%.

**Después**:
> Cada NPC interpreta el **susurro activo** de forma distinta; 5 milagros raros con rasgos hereditarios 50%.

Trivial. Una palabra.

---

## Edit 2 — §1 Pilar 2 (línea 56)

**Antes**:
> NPCs autónomos con pathfinding y necesidades; la simulación avanza aunque **"guardes silencio hoy"**.

**Después**:
> NPCs autónomos con pathfinding y necesidades; la simulación avanza también bajo **Silencio persistente** — el mundo no se detiene por falta de voz.

Ajuste menor para reflejar que Silencio es un estado (no una elección diaria puntual).

---

## Edit 3 — §1 Pilar 3 (línea 57) — REWRITE MAYOR

**Antes**:
> Pilar 3 · Fe como economía narrativa | **reinterpretado** | La Fe se sustituye por **gratitud emergente** — los NPCs la generan al vivir un mensaje que les ayuda, y esa gratitud es la moneda de los milagros. Cuenta de creyentes vivos sigue siendo la métrica global del culto.

**Después**:
> Pilar 3 · Fe como economía narrativa | **reinterpretado** | **Dos monedas separadas**: la **gratitud** emerge cuando el susurro activo beneficia al clan (moneda de los milagros, §3.8); la **Fe** se acumula pasivamente según seguidores vivos (`sqrt(vivos)`) y es la moneda para cambiar susurros (§3.7b). Miracle ≠ pivote estratégico — dos verbos, dos rutas económicas.

**Razón**: la fila antigua decía que la Fe quedaba sustituida por gratitud. La firma del 73615a1 re-introduce Fe como moneda separada demográfica. La fila contradice el §3.7b nuevo y hay que alinearla.

---

## Edit 4 — §2 Pilar 3 expansión (líneas 75-78) — REWRITE MAYOR

**Antes**:
> 3. **Pilar 3 · Fe como creyentes reales**. No hay más "puntos de Fe" abstractos. Cada humano del clan es un creyente; cada muerte es una pérdida real de economía divina. Atraer gente externa al culto es la única ruta de crecimiento.

**Después**:
> 3. **Pilar 3 · Fe demográfica + gratitud emergente**. Dos economías divinas separadas: la **Fe** se genera pasivamente en función del número de creyentes vivos (`Fe/día = sqrt(vivos)`, §3.7b) y es la moneda del pivote estratégico — cambiar susurros. La **gratitud** emerge cuando el susurro activo beneficia tangiblemente al clan (§3.8) y es la moneda de los milagros. Cada muerte reduce Fe/día al instante: economía divina ligada a carne real. Atraer gente externa al culto (post-primigenia) sigue siendo la única ruta de crecimiento demográfico.

**Razón**: el bullet antiguo negaba explícitamente la existencia de puntos de Fe ("No hay más 'puntos de Fe' abstractos"). Ahora SÍ existen, con origen demográfico no arbitrario. El ajuste preserva el espíritu ("ligada a carne real") mientras actualiza la letra.

---

## Edit 5 — §4.1 Desglose por minuto (múltiples sub-edits)

### 5a — "El primer minuto" (líneas 488-489)

**Antes**:
> - Primer amanecer: modal con las **6 intenciones** (§3.7). Eliges una — o guardas silencio. La simulación arranca.

**Después**:
> - El clan aparece en el mapa y la simulación arranca inmediatamente. **Silencio** está activo por defecto; durante los **primeros 7 días** in-game el dios puede callar sin penalización mientras observa. Un botón **Hablar al clan** queda visible en el HUD desde el minuto 0 — el primer susurro es gratuito (§3.7).

### 5b — "El minuto cinco" (línea 498-499)

**Antes**:
> - Si la intención del día acertó con la necesidad del clan, la gratitud sube unos puntos. Si no, nada.

**Después**:
> - Si el susurro activo sigue alineado con una necesidad real del clan ese día, la gratitud sube unos puntos. Si el clan ya está saciado o el susurro no encaja, nada — la gratitud es emergente, no automática (§3.8).

### 5c — "El minuto quince" (líneas 502-508)

**Antes**:
> - Primer conflicto social: un Ciudadano de skill baja empieza a no producir; su socialización baja; los demás cuchichean. El jugador tiene dos opciones: pedir **Paciencia** en el mensaje del día, o — si ya tiene 60 puntos de gratitud — gastar un **milagro de Manos que recuerdan** para que ese Ciudadano se vuelva útil.

**Después**:
> - Primer conflicto social: un Ciudadano de skill baja empieza a no producir; su socialización baja; los demás cuchichean. El jugador tiene dos opciones: si ha acumulado **80 Fe** y el susurro activo no era Paciencia, pagar el cambio a **Paciencia** (§3.7b); si tiene **60 puntos de gratitud** y prefiere una solución directa sobre ese Ciudadano concreto, gastar un **milagro de Manos que recuerdan** (§3.8). Dos monedas, dos verbos — cambiar susurro empuja al clan entero, el milagro interviene sobre un individuo.

**Razón**: la versión antigua mezcla "pedir en el mensaje del día" (gratis) con "milagro" (60 gratitud). La nueva hace explícita la dualidad monetaria y el contraste de alcance (clan entero vs NPC concreto) — que es uno de los puntos fuertes del diseño nuevo.

---

## Edit 6 — §Fase 5 (líneas 652-671) — REWRITE

**Antes**:

```
### Fase 5 — Mensaje diario, gratitud y milagros

Verbo del jugador implementado completo:
- Modal diario con las 6 intenciones y "guarda silencio hoy".
- Motor de interpretación emergente por NPC (cada uno lee la
  intención según supervivencia/socialización/economía/linaje).
- Pool de gratitud a nivel clan con reglas de ganancia
  (mensaje acertado) y pérdida (silencio prolongado, muerte de
  creyente clave).
- 5 milagros con su catálogo de efectos y herencia 50%.
- Contador global de creyentes vivos como métrica del culto.

**Entregable testeable**:
1. El mismo NPC con diferentes combinaciones de rasgos produce
   trayectorias medibles distintas (Pilar 1).
2. La misma intención diaria se interpreta diferente en clanes con
   composiciones distintas (Pilar 1 versión social).
3. Una partida silenciada 20 días seguidos dispara semilla de
   herejía; un milagro concedido con 80 puntos de gratitud deja el
   pool al coste exacto.
```

**Después**:

```
### Fase 5 — Susurro persistente, Fe, gratitud y milagros

Verbo del jugador implementado completo:
- Botón **Hablar al clan** siempre disponible en el HUD; selector
  con las 6 intenciones + Silencio; susurro activo **persiste**
  hasta que el jugador lo cambie (§3.7).
- Motor de interpretación emergente por NPC (cada uno lee el
  susurro activo según supervivencia/socialización/economía/linaje).
- **Moneda Fe** (§3.7b): generación sublineal por seguidores vivos
  (`Fe/día = sqrt(vivos)`), coste 80 para cambiar de susurro, 40
  para silenciar deliberadamente, cap 160, Fe inicial 30. Primer
  susurro gratis. Módulo puro `lib/faith.ts`.
- **Pool de gratitud** a nivel clan con reglas de ganancia (susurro
  alineado a necesidad real del día) y pérdida (silencio prolongado,
  muerte de creyente clave).
- 5 milagros con su catálogo de efectos y herencia 50%, pagaderos
  **exclusivamente con gratitud** (§3.8).
- Contador global de creyentes vivos como métrica del culto y
  como generador directo de Fe.

**Entregable testeable**:
1. El mismo NPC con diferentes combinaciones de rasgos produce
   trayectorias medibles distintas bajo un mismo susurro (Pilar 1).
2. El mismo susurro persistente se interpreta diferente en clanes
   con composiciones distintas (Pilar 1 versión social).
3. Una partida silenciada 20 días seguidos (con Silencio elegido
   explícitamente o por defecto tras la gracia inicial) dispara
   semilla de herejía; un milagro de **Corazón fiel** concedido
   con 80 puntos de gratitud deja el pool al coste exacto.
4. Fe acumula según `sqrt(vivos)` de forma determinista en tick;
   cambio de susurro descuenta 80 Fe, silencio elegido 40 Fe;
   cap de 160 aplica; primer susurro no descuenta Fe; gracia de
   7 días cuenta solo desde Día 1 hasta primer susurro.
```

**Razón**: es la fase donde vive todo el sistema firmado. Rewrite obligatorio — tocando nombre, bullets y entregable testeable. Añadí item #4 en entregable para capturar los tests §A4 específicos del módulo `faith.ts` que necesita escribir el ingeniero.

---

## Fases que NO se tocan

- **§Fase 6 (Monumento y bendición)**: no referencia mecánicas diarias. Queda como está.
- **§Fase 1-4**: todas anteriores al mensaje. Ningún residuo.
- **§3.7 línea 311**: la mención al "pulso diario obligatorio de la primera iteración" es histórica, deliberada, parte de la justificación nueva. No es residuo.

---

## Sitios detectados pero que dejo explícitamente intactos

Ninguno. El grep fue exhaustivo: todos los matches de `mensaje diario`, `pulso diario`, `intención diaria`, `silencio hoy`, `al amanecer`, `modal diario`, `mensaje del día`, `intención del día`, `hablar al amanecer` están cubiertos por las Edits 1-6 (o son la referencia histórica del §3.7' que preserva contexto).

---

## Tras firma

1. Aplico las 6 edits a `vision-primigenia.md`.
2. Verifico con el mismo grep que queda limpio.
3. Borro `DRAFT-pase-editorial.md` del árbol (queda en git history).
4. Commit: `docs(vision): pase editorial post-firma susurro persistente`.

Con esto, `vision-primigenia.md` queda **internamente consistente**
y desbloquea la apertura de Sprint REFACTOR-SUSURRO-FE (el ingeniero
puede leer la visión de cabo a rabo sin chocar con contradicciones).

Dale la revisión. Si algo cruje en alguna Edit concreta, dime cuál
y afino. Si todo pasa, "firmo" → aplico y cierro.

