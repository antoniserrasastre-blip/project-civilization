# Decisiones — Edad Primigenia

> Registro de decisiones de diseño para la nueva edad primigenia
> (ver `vision-primigenia.md` para el contexto completo). Este
> archivo vive **en paralelo** a `DECISIONS-PENDING.md` (que guarda
> el historial de v1.0.1 actual, archivado) y lo reemplaza como
> bandeja activa del Director humano.

## Resueltas — sesión 2026-04-19

Acuerdo entre Director humano y Director Creativo. Quedan registradas
aquí para auditoría; cualquier cambio futuro exige bloque nuevo.

| # | Tema | Decisión | Referencia en vision-primigenia |
|-|-|-|-|
| 1 | Alcance de la edad primigenia | **Reemplaza** la edad temprana actual. v1.0.1 se archiva como "edad tribal posterior". | §0 |
| 2 | Drafting — Elegidos | **4 NPCs, 2M + 2F, 10 puntos, 8 arquetipos** (Cazador, Recolector, Curandero, Artesano, Líder, Scout, Tejedor, Pescador), coste 2-4 pt, género libre. | §3.1 bloque A |
| 3 | Drafting — Seguidores | **10 NPCs, 4 tiers (3-3-2-2)**, pick-1-of-10 por fase en calidad descendente (excelente/bueno/regular/malo). Todos arrancan Ciudadanos. | §3.1 bloque B |
| 4 | Castas | **Elegido / Ciudadano / Esclavo**, cerradas por ascendencia. Afectan verbos. | §3.2 |
| 5 | Herencia Elegido | **Uno basta**: Elegido × cualquiera → hijo Elegido. | §3.2 |
| 6 | Origen Esclavo | **Nadie arranca esclavo**. Emerge por crimen grave, deuda, hambre extrema. | §3.2 |
| 7 | Niveles individuales | **3 dimensiones 0-100**: supervivencia, socialización, economía relacional. Feed-forward entre ellas. | §3.3 |
| 8 | Mapa | **512×512 tiles**, archipiélago balear-ficticio, pregenerado determinista, **top-down 2D pixel art 32×32**, zoom + drag. | §3.4 |
| 9 | Assets gráficos | **Kenney / OpenGameArt (CC0) primero**, IA como relleno, registro en `assets/ORIGINS.md`. | §3.4 |
| 10 | Recursos | **6 tipos**: leña, piedra, baya, caza, agua, pescado. Mix regenerable/agotable. Fog-of-war de descubrimiento. | §3.5 |
| 11 | Crafting | **Recetas fijas descubribles por combinación**, skill individual, herencia 50% parcial. | §3.6 |
| 12 | Crafteables umbral | **5** (refugio, fogata permanente, piel, herramienta sílex, despensa) + 10 noches en fogata permanente → desbloquea monumento. | §3.6 |
| 13 | Bendiciones individuales | **Catálogo fijo 8-12**, máx 3 rasgos simultáneos, herencia 50%. | §3.7 |
| 14 | Vientos — lore | **Linajes internos** (casas del clan). Tramuntana = Elegidos. Llevant reservado para tribal. | §3.8 |
| 15 | Monumento | Desbloquea cuando se cumplen crafteables + fogata + representación de linajes. Dispara cinemática + elección de bendición de aldea. | §5 |
| 16 | Bendición de aldea | **Una por era**. Persiste con efecto primigenia; gana compounding al pasar a la siguiente era. | §6 |
| 17 | Rival | **Fuera de primigenia**. Reaparece en la fase 7 (diferida) o en tribal. | §2, §8 |
| 18 | Derrotas | 3 físicas (hambre, frío, conflicto social) + 1 espiritual (último Elegido sin hijo). Sin timeout de monumento. | §7 |
| 19 | Orden de implementación | **Fases 1-6**: mundo → NPCs+recursos → movimiento → economía → bendiciones → monumento. Fase 7 (migrantes externos + rival) diferida. | §8 |

## Pendientes — bloquean Fase 4 (economía)

### 1. 🟠 Coste exacto de los 5 crafteables umbral

**Hoy**: la visión fija los 5 crafteables pero no sus costes en recursos
ni en tiempo-hombre. Sin números, la Fase 4 no puede probar TDD contra
"el clan llega al monumento en 20.000 ticks".

**Opciones**:
- **A. Costes bajos** (refugio = 5 leña + 3 piedra + 1 piel). Clan
  medio llega al monumento en 5.000 ticks. Jugador contemplativo
  progresa sin intervenir.
- **B. Costes medios** (refugio = 15 leña + 8 piedra + 3 pieles).
  ~12.000 ticks al monumento. Requiere alguna bendición inteligente
  del jugador para no quedarse atrás.
- **C. Costes altos** (refugio = 30 leña + 20 piedra + 6 pieles).
  ~25.000 ticks al monumento. Obliga a usar el verbo bendecir
  activamente. Riesgo de frustración en playtests.

**Default sugerido**: **B**. Es el único que soporta los dos
arquetipos declarados (contemplativo y activo) sin romper ninguno.
Ajuste fino en Fase 4 con telemetría real.

**Marca**: [A / B / C] · Comentario:

---

### 2. 🟠 Régimen exacto de regeneración de recursos

**Hoy**: la visión dice leña regenera ~60 días, piedra no vuelve, baya
es estacional, caza es manada dinámica. Faltan los números precisos
para el simulador.

**Opciones**:
- **A. Parámetros generosos** (leña 30 días, baya 20 días, caza
  regenera 1 individuo cada 50 días por manada). Mundo abundante.
- **B. Parámetros medios** (leña 60 días, baya 45 días, caza 1 por
  100 días). Obliga a migrar cuando una zona se sobreexplota.
- **C. Parámetros escasos** (leña 90 días, baya 60 estacional, caza
  1 por 150 días). Mundo hostil; migración continua.

**Default sugerido**: **B**. Alineado con la intención "nómadas
reales" — se asientan, agotan, migran. C puede ser un modo
"superviviente" opcional en el futuro.

**Marca**: [A / B / C] · Comentario:

---

## Pendientes — bloquean Fase 5 (bendiciones)

### 3. 🟡 Catálogo final de bendiciones individuales

**Hoy**: vision-primigenia propone 5 ejemplos (Hambre sagrada, Ojo
de halcón, Manos que recuerdan, Sangre caliente, Voz de todos).
Faltan 3-7 más para llegar al rango 8-12.

**Opciones**:
- **A. Catálogo de 8** minimalista. Cada bendición muy diferenciada.
- **B. Catálogo de 10** equilibrio. Cubre los tres niveles
  individuales (supervivencia/socialización/economía) con 3-4 cada
  uno.
- **C. Catálogo de 12** variado. Incluye bendiciones "de apoyo" que
  sólo tienen efecto combinadas con otras.

**Default sugerido**: **B**. Suficiente variedad para descubrimiento
de combos sin explotar árbol de decisiones en partidas tempranas.
Catálogo propuesto se fija aquí cuando se cierre la decisión.

**Marca**: [A / B / C] · Comentario:

---

### 4. 🟡 Economía divina — coste de bendecir

**Hoy**: la Fe ya no es contador numérico (se materializa en creyentes
vivos). Falta decidir **qué gasta el jugador** al conceder una
bendición.

**Opciones**:
- **A. Sin coste directo**. Las bendiciones son libres; el límite es
  el techo de 3 rasgos por NPC.
- **B. Coste simbólico** (el creyente bendecido sacrifica algo:
  pierde supervivencia temporal, o dedica N días al ritual).
- **C. Coste de creyentes** (la bendición drena socialización en el
  clan; si baja mucho, algún NPC pierde fe y deja de contar como
  creyente). Simetría con la idea "Fe = creyentes reales".

**Default sugerido**: **C**, pero es la decisión más arriesgada de la
edad — necesita playtest. Si C no funciona, caer a A es trivial.

**Marca**: [A / B / C] · Comentario:

---

## Pendientes — bloquean Fase 6 (monumento)

### 5. 🟡 Catálogo y número de bendiciones de aldea primigenia

**Hoy**: vision-primigenia propone 7 (comercio, producción,
recolecta, reconocimiento, fertilidad, salud, longevidad). Falta
validar que las 7 son todas relevantes en primigenia o si algunas
deberían ser exclusivas de eras posteriores.

**Opciones**:
- **A. Las 7 disponibles en primigenia**. Máxima libertad de
  diseño para el jugador.
- **B. 4 disponibles en primigenia** (recolecta, fertilidad, salud,
  reconocimiento), las otras 3 llegan en tribal. Justificación:
  "comercio" y "producción" necesitan estructura post-asentamiento;
  "longevidad" pide medicina primitiva.
- **C. 3 disponibles en primigenia** (recolecta, fertilidad, salud).
  Curaduría extrema.

**Default sugerido**: **B**. Mantiene decisión significativa sin
marear al jugador en su primera partida.

**Marca**: [A / B / C] · Comentario:

---

### 6. 🟡 Bendiciones de aldea — ¿reelección en eras posteriores?

**Hoy**: una bendición por era (primigenia → tribal → bronce…). Al
acabar una era, la bendición gana compounding. Falta decidir si en
la siguiente era se puede **volver a elegir** la misma.

**Opciones**:
- **A. Sin reelección**. Cada bendición se toma una sola vez en toda
  la partida. Fuerza diversidad. El jugador esculpe civilización
  distintiva era a era.
- **B. Reelección permitida** con doble compounding (efecto primigenia
  ×2). Convierte una bendición en la "especialidad" del culto.
- **C. Reelección permitida solo una vez** en toda la partida. Híbrido.

**Default sugerido**: **A**. Más legible y ataca el problema de
"todas las partidas se parecen si siempre eliges la mejor". Si el
playtest dice que los jugadores quieren especialización, caer a C.

**Marca**: [A / B / C] · Comentario:

---

### 7. 🟡 Condiciones del monumento — rigor de los umbrales

**Hoy**: la visión pide ≥10 noches en fogata permanente + al menos
un creyente de cada linaje presente. Falta validar los dos números.

**Opciones**:
- **A. Números relajados**: 5 noches + 1 creyente. Fácil de cumplir
  en partida corta.
- **B. Números medios**: 10 noches + 1 creyente por linaje presente.
  (El default actual.)
- **C. Números estrictos**: 20 noches + 2 creyentes por linaje +
  despensa con 60 días. Dificulta el monumento — primera era puede
  durar 1-2h reales.

**Default sugerido**: **B**. Ajustable tras primer playtest.

**Marca**: [A / B / C] · Comentario:

---

## Pendientes — estructurales y operacionales

### 8. 🔴 Archivo de v1.0.1 actual

**Hoy**: v1.0.1 está en la rama principal con 314+26 tests verdes,
documentado en `VERSION-LOG-v1.0.1.md`. Al ser reemplazada por
primigenia, hay que decidir qué hacer con ella.

**Opciones**:
- **A. Rama `claude/v1.0.1-archivada`** + tag `v1.0.1-archive`. Se
  conserva íntegra; la rama principal arranca nueva desde commit
  vacío con scaffolding primigenia.
- **B. Carpeta `legacy/`** dentro del repo activo con todo el código
  de v1.0.1 intacto pero no ejecutado por los tests. Permite consultar
  sin cambiar ramas.
- **C. Borrado total**. v1.0.1 sólo queda en historia de git.

**Default sugerido**: **A**. Rama archivada es el estándar git sano.
`legacy/` infla el repo activo y B genera ruido en IDE.

**Marca**: [A / B / C] · Comentario:

---

### 9. 🔴 Política editorial sobre esclavitud

**Hoy**: la mecánica de castas incluye Esclavo emergente por eventos.
Temáticamente sensible. Antes de producción hay que decidir cómo se
maneja editorialmente.

**Opciones**:
- **A. Implementar tal como está descrito**. La esclavitud emerge
  por crimen, deuda, hambre. Parte de la verosimilitud pre-moderna.
  Aviso explícito en pantalla de inicio.
- **B. Suavizar terminología**: "siervo" en lugar de "esclavo";
  mecánica idéntica pero menos áspera.
- **C. Eliminar**: dos castas (Elegido / Ciudadano) en primigenia.
  Perdemos profundidad social pero evitamos riesgo editorial.

**Default sugerido**: **A**. El juego lo dirige un Director humano
que ya ha decidido realismo pre-moderno — el realismo incluye lo
incómodo. El aviso en inicio cubre sensibilidades. Pero la decisión
final es del Director humano, no del Director Creativo.

**Marca**: [A / B / C] · Comentario:

---

### 10. ⚠️ Extensión del `CLAUDE.md` para la nueva arquitectura

**Hoy**: `CLAUDE.md` describe la arquitectura de v1.0.1 (scheduler
9-pass, `lib/*.ts` puros, round-trip JSON). Primigenia necesita
añadidos: pathfinding determinista, fog-of-war reproducible,
serialización de mapa pregenerado, assets gráficos.

**Opciones**:
- **A. Reescritura completa** tras cerrar las decisiones anteriores.
- **B. Anexo `CLAUDE-primigenia.md`** que extienda, sin tocar el
  original, con convenciones específicas de esta rama.
- **C. Delegar al ingeniero** que escriba la extensión en el primer
  sprint real.

**Default sugerido**: **B**. Anexo permite referenciar desde el
original sin invalidar lo que ya funciona. El ingeniero lo completa
cuando abra Fase 1.

**Marca**: [A / B / C] · Comentario:

---

## Formato de decisiones futuras

Cuando aparezcan nuevas preguntas de diseño primigenia se añade un
bloque aquí con el mismo patrón:

```markdown
### N. <icono> <título>
**Hoy**: …
**Opciones**: A/B/C con tradeoff concreto.
**Default sugerido**: **<letra>**. <1-2 frases>
**Marca**: [A / B / C] · Comentario:
```

Iconos: 🔴 bloqueante · 🟡 diseño · 🟠 balance · ⚠️ menor.

Resueltas una decisión, se archiva en la tabla "Resueltas" arriba
con referencia al `vision-primigenia.md` o a la implementación.
