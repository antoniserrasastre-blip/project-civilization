# VISIÓN — Edad Primigenia

> **Anexo** a `../vision-godgame.md`. Este documento refina la primera
> edad del juego (del clan nómada al primer asentamiento) con el detalle
> de diseño acordado en la sesión del Director Creativo + Director
> humano del 19 de abril de 2026.
>
> **Autoridad**: sobre la edad primigenia, manda este anexo. Ante
> contradicción con `vision-godgame.md`, el anexo gana **solo para
> mecánicas primigenia**; los Pilares 1-5 y §A4 siguen siendo fuente
> de verdad global y no se tocan aquí.
>
> **Estado**: borrador editorial. Ningún sprint arranca hasta que este
> documento + `DECISIONS-PENDING-primigenia.md` estén firmados por el
> Director humano.

---

## 0. Identidad de la edad primigenia

El jugador es un dios incipiente. Sus primeros hijos — **los Hijos de
Tramuntana** — son un **clan nómada de 14 personas** que recorren un
archipiélago balear-ficticio buscando dónde arraigar. El dios no
gobierna: **habla**. Cada amanecer escribe **un mensaje al clan**
(una profecía, una intención, una palabra), y los mortales lo
interpretan como pueden — cada uno según quién es. Esa es la
totalidad de tu verbo diario. No hay más presión posible.

Cuando tu voz ayuda, los mortales sienten **gratitud**. La gratitud
se acumula en el clan y, de tiempo en tiempo, te da poder para un
**milagro**: un don concreto a un NPC que altera cómo se comporta
para el resto de su vida. Los milagros son raros, caros y
hereditarios. Son la **parte escasa** del verbo del dios; el mensaje
diario es la parte continua.

**Inspiración declarada**: *The NPCs in this Village Sim Game Must
Be Real!* (Murazukuri Game no NPC ga Namami no Ningen to Shika
Omoenai), de Hirukuma. El bucle diario del mensaje, la gratitud
como moneda de milagros y la interpretación emergente son deuda
directa con esa obra.

El objetivo mecánico de la edad es **dejar de ser nómadas**: construir
un **monumento al dios** que ancle al clan a un punto del mapa. Ese
monumento dispara el paso a la siguiente era (la edad tribal, cubierta
por la v1.0.1 previa que queda archivada como continuación natural).

Esta es la **primera edad que sale a producción** en la beta pública.
Las demás (tribal, bronce, clásica, medieval, industrial, atómica) se
reconstruirán encima de la base de sistemas que aquí se asienta.

## 1. Relación con la visión madre

| Elemento | `vision-godgame.md` | Primigenia |
|-|-|-|
| Pilar 1 · Mismo don, distinto resultado | **intacto** | Cada NPC interpreta el **susurro activo** de forma distinta; 5 milagros raros con rasgos hereditarios 50%. |
| Pilar 2 · Mundo cambia sin tocarlo | **intacto** | NPCs autónomos con pathfinding y necesidades; la simulación avanza también bajo **Silencio persistente** — el mundo no se detiene por falta de voz. |
| Pilar 3 · Fe como economía narrativa | **reinterpretado** | **Dos monedas separadas**: la **gratitud** emerge cuando el susurro activo beneficia al clan (moneda de los milagros, §3.8); la **Fe** se acumula pasivamente según seguidores vivos (`sqrt(vivos)`) y es la moneda para cambiar susurros (§3.7b). Miracle ≠ pivote estratégico — dos verbos, dos rutas económicas. |
| Pilar 4 · Anti-presión del dios rival | **diferido** | No hay rival en primigenia. Reaparece en tribal. |
| Pilar 5 · Linaje reina | **intacto** | Casta Elegido hereditaria por un solo progenitor. |
| §A4 pureza/determinismo/round-trip | **intacto** | Obligatorio. Mapa y PRNG seedables; sin `Math.random`. |
| §9 voz partisana de la crónica | **intacto** | "Los nuestros" / "los hijos de Tramuntana" — sin narrador neutral. |
| §11 scope balear | **intacto** | Archipiélago balear-ficticio; nombres de viento como linajes internos. |

## 2. Los cinco pilares en primigenia

1. **Pilar 1 · Mismo don, distinto resultado**. Una misma bendición
   sobre un NPC con supervivencia alta tiende a cazador-solitario; sobre
   un NPC con socialización alta tiende a líder-de-grupo. El resultado
   emerge de la combinación con el estado individual, no del texto de
   la bendición.
2. **Pilar 2 · Mundo cambia sin tocarlo**. El jugador puede no
   bendecir en 10 minutos y el clan seguirá moviéndose, cazando,
   comiendo, muriendo, emparejándose. La partida no se congela por
   inacción — se empobrece.
3. **Pilar 3 · Fe demográfica + gratitud emergente**. Dos economías
   divinas separadas: la **Fe** se genera pasivamente en función del
   número de creyentes vivos (`Fe/día = sqrt(vivos)`, §3.7b) y es la
   moneda del pivote estratégico — cambiar susurros. La **gratitud**
   emerge cuando el susurro activo beneficia tangiblemente al clan
   (§3.8) y es la moneda de los milagros. Cada muerte reduce Fe/día
   al instante: economía divina ligada a carne real. Atraer gente
   externa al culto (post-primigenia) sigue siendo la única ruta de
   crecimiento demográfico.
4. **Pilar 4 · Anti-presión**. En primigenia se cumple por ausencia
   (no hay rival). El enemigo real es el ambiente: hambre, frío,
   conflicto interno.
5. **Pilar 5 · Linaje reina**. La casta Elegido se hereda por un solo
   progenitor. El linaje del dios se propaga por contagio — pero con
   ello se multiplican los puntos de fallo (cada Elegido muerto es un
   golpe al legado).

## 3. Sistemas base

### 3.1 Drafting inicial (14 personas)

El primer minuto de partida es una **cadena de decisiones de drafting**.
No hay partida aleatoria: el clan arranca tal como el jugador lo
construya. Dos bloques encadenados:

**Bloque A — Elegidos (4 personas, 2M + 2F)**
- **10 puntos totales** a repartir entre 4 slots.
- **8 arquetipos** disponibles, cada uno con coste 2-4 puntos según
  potencia relativa:
  - Cazador, Recolector, Curandero, Artesano, Líder, Scout, Tejedor, Pescador.
- **Género libre** por arquetipo (sin arquetipos generizados).
- Restricción fija: **2 hombres + 2 mujeres** (exige mezcla, permite
  reproducción hetero desde el inicio).
- Los 4 Elegidos son la **nobleza fundacional**: todos sus descendientes
  directos heredarán la casta Elegido.

**Bloque B — Seguidores (10 personas, ciudadanos)**
- 10 slots divididos en **4 tiers de calidad decreciente**:
  - **Excelentes** — 3 picks de 10 candidatos cada uno.
  - **Buenos** — 3 picks de 10 candidatos cada uno.
  - **Regulares** — 2 picks de 10 candidatos cada uno.
  - **Malos** — 2 picks de 10 candidatos cada uno.
- Total: **10 pantallas de elección** (pick-1-of-10) en orden
  descendente de calidad. Forzar tiers malos garantiza variedad social
  y evita que el clan sea una élite uniforme.
- Los 10 seguidores arrancan como **Ciudadanos**. Ninguno como esclavo
  — la esclavitud en primigenia emerge por eventos (§3.2).

**Futuro**: este es el **primer inicio de producción**. En versiones
siguientes habrá otros arranques (nómada empobrecido, clan disidente,
colonos náufragos…), cada uno con su propia curva. El sistema de tiers
+ puntos es la plantilla reutilizable.

### 3.2 Castas sociales

Tres estratos, cerrados por ascendencia:

| Casta | Cómo se entra | Cómo se sale | Verbos permitidos |
|-|-|-|-|
| **Elegido** | Drafting inicial o hijo de un Elegido | Solo muriendo | Decide rumbo del clan, elige objetivos de caza, recibe bendiciones del dios primero |
| **Ciudadano** | Drafting inicial o hijo de Ciudadanos | Por evento: crimen grave, deuda impagada, hambre extrema (se cae a Esclavo) | Ejecuta trabajo, puede ser bendecido, vota objetivos secundarios |
| **Esclavo** | Caída desde Ciudadano por evento, o por nacimiento de madre esclava | Irreversible en primigenia | Trabaja forzado, no recibe bendiciones directas, su muerte no es duelo |

**Reglas de herencia**:
- **Elegido × cualquiera → hijo Elegido**. Basta un progenitor de casta
  para transmitir. Refuerza Pilar 5 (el linaje del dios se propaga por
  contagio).
- **Esclavo × Ciudadano → hijo Esclavo** (la casta baja domina).
- **Esclavo × Esclavo → hijo Esclavo**.
- **Ciudadano × Ciudadano → hijo Ciudadano**.

**Rutas de caída a esclavitud** (eventos emergentes, no selección del
jugador en drafting):
1. **Crimen grave**: asesinato intra-clan. Los Elegidos sentencian.
2. **Deuda**: Ciudadano que no produce lo exigido por su linaje en
   varios ciclos queda en deuda con otro Ciudadano; si no paga, se
   esclaviza.
3. **Hambre extrema**: auto-venta para garantizar ración. Decidido por
   el propio NPC cuando cae por debajo de un umbral de supervivencia.

**No hay ruta de ascenso**. La casta es destino. Esto es duro pero
coherente con mundos pre-modernos y con la frase "linaje reina" del
Pilar 5.

### 3.3 Niveles individuales (3 dimensiones continuas 0-100)

Cada NPC, sin importar su casta, tiene tres barras de estado que se
calculan tick a tick y determinan su comportamiento:

1. **Supervivencia**: proxy de salud física. Sube con comida, agua,
   refugio, descanso. Baja con hambre, sed, frío, heridas, edad.
   A <20 el NPC prioriza comida sobre todo. A 0 muere.
2. **Socialización**: proxy de integración al clan. Sube con
   convivencia, rituales, cumplir rol, relaciones estables. Baja con
   soledad, conflicto, pérdida de allegados, injusticia percibida
   (castas afectan).
3. **Economía** (relacional): matriz NPC×NPC de deudas/favores/vínculos.
   No es un stat individual puro — es un grafo. La economía entre
   personas modela quién le debe a quién, quién le salvó la vida a
   quién, qué linajes están enlazados por favores.

**Feed-forward entre dimensiones**:
- Hambre alta (supervivencia baja) → NPC más irritable → socialización
  de los que están cerca baja.
- Deuda impagada (economía tensa) → baja socialización de los
  involucrados.
- Socialización media del clan <20 → conflictos fatales probabilísticos
  → derrota por violencia interna.

No se modela Maslow completo. Tres dimensiones suficientes para que
emerja drama sin explotar complejidad.

### 3.4 Mapa del archipiélago

**Un único mundo pregenerado determinista por seed**. No procedural
por partida — se compila una vez, se versiona como fixture, se
congelan sus propiedades (coordenadas de islas, distribución de
recursos, accidentes geográficos).

**Especificaciones técnicas**:
- **512 × 512 tiles**, 3-5 islas principales en formación de
  archipiélago balear-ficticio.
- **Tile 32×32 px** en pixel art top-down (vista cenital estilo
  RimWorld, no 2.5D).
- **Zoom**: mínimo = mapa completo en pantalla; máximo ≈ 40 tiles
  visibles. Zoom intermedio continuo con drag libre.
- **Navegación**: arrastrar (drag) con bordes clampados.
- **Determinismo obligatorio**: la generación vive bajo PRNG seedable
  (§A4 del vision-godgame). El seed del mundo es fijo para la versión
  de producción; cambiarlo invalida saves y se bumpa storage version.

**Referencia lore**: el archipiélago evoca Baleares (Mallorca,
Menorca, Ibiza, Formentera) sin ser copia literal. Los nombres
internos son ficticios. El clima, la flora y la costa deben sentirse
mediterráneos.

**Assets gráficos**: prioridad **Kenney / OpenGameArt (CC0)** en v1.
IA generativa solo como relleno de huecos, registrando cada asset con
origen en `assets/ORIGINS.md`. Arte propio contratado llega
post-validación del loop.

### 3.5 Recursos

**Seis tipos primigenia** distribuidos deterministamente por el seed
del mundo. Cada tipo tiene régimen propio (regenerable o agotable),
visibilidad progresiva (no se ve lo que no se ha descubierto) y
recolectores válidos según stat individual.

| Recurso | Régimen | Recolector ideal | Uso primario |
|-|-|-|-|
| **Leña** | Regenerable (árbol rebrota en N días) | Artesano, Leñador emergente | Fogata, refugio |
| **Piedra** | Agotable local (la cantera se vacía) | Artesano fuerte | Herramienta, refugio, monumento |
| **Baya** | Regenerable estacional | Recolector | Alimento ligero |
| **Caza** | Regenerable con población dinámica (manadas) | Cazador | Alimento rico, piel |
| **Agua** | Regenerable continuo (ríos, fuentes) | Cualquiera | Supervivencia diaria |
| **Pescado** | Regenerable continuo (zonas costeras) | Pescador | Alimento alternativo en islas pequeñas |

**Descubrimiento**: al arrancar la partida, el clan **no ve** los
recursos del mapa. Los NPCs exploran autónomamente según necesidades;
cuando un tile con recurso entra en su radio de visión, queda
registrado en el conocimiento del clan (fog-of-war parcial).

**Regeneración**: los recursos regenerables tienen su propio contador
determinista. Un árbol talado vuelve a crecer en ~60 días; una
cantera no vuelve — el clan tendrá que moverse o encontrar otra.
Esta asimetría fuerza decisiones de asentamiento: quedarse cerca de
la cantera hasta agotarla, o moverse con la caza.

### 3.6 Crafting y recetas

**Recetas fijas diseñadas**, descubiertas por los NPCs al combinar
recursos que tienen a mano. El crafteo emergente puro (No Man's Sky)
se descarta: sin diseño autor el árbol colapsa en ruido.

**Skill individual por NPC**, herencia parcial 50% al descendiente
directo. Un cazador de skill 60 engendra un hijo con ~30 al nacer
(modulado por stats de la madre). Esto da la **deriva dinástica
tipo Kenshi**: generaciones que se especializan.

**Árbol primigenia** — 5 crafteables umbral que disparan la
transición "ya no somos nómadas":

1. **Refugio** — piel + leña + piedra. Protege de frío; aumenta
   supervivencia pasiva al dormir dentro.
2. **Fogata permanente** — piedra + leña. Ancla geográfica del clan;
   los NPCs vuelven a ella cada noche.
3. **Piel / ropa** — piel de caza + tiempo de Tejedor. Resistencia
   al frío individual.
4. **Herramienta de sílex** — piedra + habilidad de Artesano. Bonus
   a recolección de leña, caza, piedra.
5. **Despensa** — leña + piedra + techo. Almacén compartido del
   clan; permite acumular comida para días sin caza.

**Condición de fin de nomadismo**: **los 5 crafteables construidos**
+ **fogata permanente con ≥ 10 noches consecutivas durmiendo
alrededor**. Dispara la disponibilidad del **monumento** (§5).

### 3.7 El mensaje persistente — el verbo continuo del dios

El dios habla **una vez** y su palabra sobrevive semanas. Este es
su único verbo continuo: un susurro global al clan que permanece
activo hasta que el dios decide cambiarlo. El mundo no se detiene
al elegirlo — el tiempo corre, los NPCs viven, el susurro reverbera
en cada jornada sin necesidad de volver a pronunciarlo.

**Las seis intenciones + Silencio** (plantilla fija; texto libre
llegará post-primigenia cuando se active LLM real):

| Intención | Cuándo encaja | Tonalidad que empuja |
|-|-|-|
| **Auxilio** | Clan hambriento, herido, cansado | Supervivencia primero; reparto de recursos |
| **Coraje** | Decisión difícil, migración, caza arriesgada | Acción, asumir riesgos, salir del confort |
| **Paciencia** | Conflicto interno, deuda tensa, relaciones rotas | Aguardar, negociar, reparar antes que castigar |
| **Encuentro** | Soledad, NPCs separados, linajes desconectados | Buscar al otro; pairing; reconciliación |
| **Renuncia** | Recurso agotado localmente, apego a un lugar insostenible | Soltar; migrar; dejar ir |
| **Esperanza** | Baja moral generalizada, herejía incipiente | Mirar al futuro; reforzar fe; perseverar |
| **Silencio** | Estado por defecto o elección explícita | Sin empuje — el mundo corre sin voz |

**Interpretación emergente (Pilar 1)**: cada NPC lee el susurro
activo **según sus niveles individuales y su linaje**. Un "coraje"
en un NPC con supervivencia alta puede leerse como "lanzarse a
cazar"; en uno con economía tensa, como "no robar al vecino"; en
uno del linaje Gregal (inestable), como "provocar el conflicto que
estaba evitando". La crónica narra las **2-3 interpretaciones más
relevantes** de la jornada; el jugador abre la ficha del NPC
concreto si quiere ver qué leyó él.

**Estado inicial del susurro**: el clan nace con **Silencio** activo.
El primer susurro explícito del jugador es **gratuito** — se concede
como "estrenar la voz".

**Gracia inicial del Silencio**: durante los **primeros 7 días** (una
semana in-game) sin haber susurrado, el Silencio no penaliza — el
clan está en bivouac, orientándose. A partir del octavo día sin
susurro elegido, el Silencio activa sus efectos: gratitud pasiva
disminuye, probabilidad de semilla de herejía aumenta.

**Volver a Silencio explícitamente** (tras haber susurrado algo) es
una elección que **cuesta Fe** (§3.7b). Silenciar deliberadamente
es un acto, no una omisión.

**Por qué el susurro persiste**: el pulso diario obligatorio de la
primera iteración resolvía el vacío del jugador contemplativo pero
introducía click-spam — una decisión cada amanecer diluye el peso
de cada decisión. El susurro persistente lo invierte: **pocas
decisiones con mucho peso**. El jugador decide cuándo hablar y paga
por cada cambio; entre susurro y susurro observa al clan vivir la
consecuencia. El problema del jugador-mudo se resuelve por la
penalización del Silencio acumulado y por los indicadores visibles
del mundo (Fe, gratitud, necesidades emergentes), no por un modal
forzoso.

### 3.7b Fe como moneda de cambio

Segunda moneda, separada funcionalmente de la gratitud (§3.8). La
Fe **no desbloquea milagros** — eso es dominio exclusivo de la
gratitud. La Fe sirve para una cosa: **cambiar el susurro activo**.

**Generación**: Fe se acumula pasivamente según el tamaño actual del
clan, con fórmula sublineal para que crecer demográficamente acelere
suavemente el acceso a cambios sin hacerlos triviales:

```
Fe/día = sqrt(seguidores vivos)
```

Seguidores vivos = NPCs con `alive === true`. Elegidos y Ciudadanos
cuentan igual.

**Ritmo sostenido** (desde Fe=0 tras gastar):

| Seguidores vivos | Fe/día | Días a 80 (cambio) | Días a 40 (silencio) |
|-|-|-|-|
| 5 | 2.24 | ~36 (punitivo) | ~18 |
| 14 (arranque) | 3.74 | ~21 (≈ 3 semanas) | ~11 |
| 20 | 4.47 | ~18 | ~9 |
| 50 | 7.07 | ~11 | ~6 |
| 100 | 10 | 8 | 4 |

**Coste y cap**:
- **Cambiar a susurro activo** (Auxilio ↔ Coraje ↔ Paciencia ↔ …):
  **80 Fe** fijo, no escala con cambios previos.
- **Silenciar deliberadamente** (susurro activo → Silencio elegido):
  **40 Fe**. Asimetría intencional — silenciar es emergency-stop o
  pausa táctica, no pivote. Silenciar y volver a hablar (40 + 80 =
  120) sigue siendo más caro que un cambio directo (80), así que no
  se puede explotar.
  - **Silencio elegido NO dispara el drain de gratitud** del §3.7.
    La Fe pagada ES la penalidad de silenciar — añadir drain encima
    sería doble castigo y rompería la función de emergency-stop.
    El drain solo aplica al **silencio por default** (clan antes de
    su primer susurro, tras los 7 días de gracia). Implicación de
    estado: el tick debe distinguir *silencio-por-default* de
    *silencio-elegido* al decidir si drena.
- **Cap de acumulación**: **160 Fe** (2× coste de cambio). Anti-banking.
  Excedente sobre el cap se pierde.
- **Fe inicial**: **30**. Colchón de arranque que evita el "HUD seco"
  pero no alcanza para un cambio (ni para silencio). Con 14 vivos,
  acorta el primer cambio de 21 a ~13 días.

**Efectos de borde**:
- **Muerte de seguidores**: Fe/día se ajusta al vuelo (función de
  vivos actuales). Epidemia o hambruna te deja con menos voz.
- **Migrantes** (post-primigenia): aumentan generación al instante.
- **Rival** (post-primigenia): no afecta Fe propia — contamina
  gratitud vía herejía.

### 3.8 Milagros y gratitud — el verbo escaso del dios

Los milagros son **dones raros y costosos** a un NPC concreto que
alteran permanentemente su comportamiento. Sustituyen al catálogo
antiguo de "bendiciones como verbo central" y quedan relegados a
la parte escasa de la economía divina.

**Gratitud** (moneda emergente):
- Se acumula en un **pool del clan** (no por NPC individual).
- La generan los NPCs cuando viven el **susurro activo** en un
  momento que les **beneficia tangiblemente** — supervivencia
  salvada, conflicto evitado, linaje restaurado, deuda saldada.
- Se evalúa **cada día** sobre el susurro activo: día con susurro
  alineado a una necesidad real del clan = pulso de gratitud. Día
  con susurro activo pero sin necesidad compatible (clan en
  equilibrio, o susurro inadecuado al momento) = **cero gratitud**.
- No hay retornos decrecientes artificiales — los hay **emergentes**:
  si el clan ya está saciado con Auxilio activo, mañana no hay
  hambre que calmar, no hay gratitud. **Rotar susurro no es
  obligatorio, es útil** — el jugador experto rota cuando la
  situación cambia, no por un temporizador.
- Se pierde parcialmente al silenciar días seguidos o cuando muere
  un creyente clave (cada Elegido muerto drena pool).

**Los 5 milagros primigenia** (costes en gratitud — provisionales,
revalidables en playtest Fase 5):

| Milagro | Coste | Efecto | Hereda 50% |
|-|-|-|-|
| **Hambre sagrada** | 30 | El NPC come menos y comparte ración con NPCs de socialización baja. Glue social emergente. | Sí |
| **Ojo de halcón** | 40 | Radio de visión +50%; descubre recursos antes. | Sí |
| **Voz de todos** | 50 | Los NPCs cercanos ganan socialización extra al hacer rituales juntos. | Sí |
| **Manos que recuerdan** | 60 | Skill de crafteo +20 con decaimiento si no cría un aprendiz. | Sí |
| **Corazón fiel** | 80 | Nunca abandona a su linaje; bonus de socialización al protegerlo. | Sí |

**Reglas del milagro**:
- Máx **3 rasgos simultáneos** por NPC. El 4º reemplaza al más
  antiguo con confirmación del jugador.
- Herencia 50% a descendientes directos; diluye por generación.
- **Sin retroceso**: una vez concedido el milagro, no se retira.

### 3.9 Vientos — los ocho linajes del archipiélago

Dentro de los **Hijos de Tramuntana** (nombre del clan completo)
conviven hasta ocho **linajes internos**, cada uno nombrado por un
viento balear. Son casas extendidas, no facciones rivales — la
competición es política interna, no guerra abierta.

| Viento | Dirección | Carácter narrativo sugerido |
|-|-|-|
| **Tramuntana** | N | Linaje del dios; de aquí salen los 4 Elegidos iniciales. |
| **Llevant** | E | (reservado — aparece como rival en edades posteriores). |
| **Migjorn** | S | Linaje paciente, asociado a la pesca y la costa. |
| **Ponent** | O | Linaje hacia el poniente — atardeceres, caza nocturna. |
| **Xaloc** | SE | Calor del desierto; linaje de artesanos de fuego. |
| **Mestral** | NO | Viento frío seco; linaje duro, supervivencia alta. |
| **Gregal** | NE | Tormentas; linaje inestable, pero fértil. |
| **Garbí** | SO | Brisas suaves; linaje contemplativo, curanderos. |

En primigenia, los 10 Ciudadanos drafteados pertenecen a **2-4 de
estos linajes** (distribución aleatoria por seed entre los
disponibles). Los Elegidos son todos Tramuntana por convención
fundacional. Los hijos de Ciudadanos de diferentes linajes heredan
el linaje materno.

**No bloquea ingeniería**: los vientos son etiqueta de `state.npcs[i].linaje`
con efectos narrativos (nombres, crónica) y acoplamientos débiles al
gameplay (endogamia preferente dentro del linaje, sin obligación).
Llevant queda en reserva para la edad tribal.

## 4. Loop del jugador

El jugador **no mueve NPCs**. El juego corre solo. El rol del jugador
es **observar, elegir cuándo susurrar y gastar los milagros que se
ha ganado**.

### 4.0 Cómo se siente jugar

Empiezas creando tu clan de 14 personas. En menos de un minuto ya
estás en el mapa viendo cómo se mueven 14 puntitos por la isla.

Al principio solo observas. El clan caza, discute, se empareja.
Poco después aparece el botón **Hablar al clan**. Eliges tu primer
susurro gratis y se activa para todo el mundo.

Mientras pasa el tiempo, ves dos barras en el HUD: **Fe** y
**Gratitud**.

- La **Fe** sube sola según cuánta gente tienes viva. Te sirve para
  cambiar de susurro cuando quieras.
- La **Gratitud** la ganas cuando tu susurro actual realmente ayuda
  al clan. Esa gratitud la gastas en milagros.

Los milagros son lo más emocionante: clicas en un NPC concreto, abres
su ficha y le puedes dar un poder permanente. Por ejemplo, *Ojo de
halcón* para que vea mucho más lejos, o *Manos que recuerdan* para
que sea mucho mejor artesano. Ese poder se queda con él para siempre
y se hereda parcialmente a sus hijos.

Ver cómo un personaje que estaba flojo de repente se vuelve importante
gracias a un milagro que tú le diste — eso se siente muy bien.

El objetivo final es que el clan construya cinco cosas básicas, duerma
muchas noches seguidas en la fogata y levante el monumento al dios.
Cuando lo consigues, terminas la primera era.

Es un juego tranquilo, donde observas mucho, hablas poco, pero cuando
actúas (ya sea con un susurro o con un milagro) sientes que realmente
estás moldeando el destino de tu clan.

### 4.1 Desglose por minuto

**El primer minuto**
- Pantallas de drafting encadenadas: 4 Elegidos con puntos, luego
  10 Ciudadanos con fases de calidad. Al acabar, el clan aparece en
  un punto costero del mapa.
- Una **fogata precaria** ya está encendida. No cuenta como
  asentamiento — es el bivouac nómada.
- El clan aparece en el mapa y la simulación arranca inmediatamente.
  **Silencio** está activo por defecto; durante los **primeros 7 días**
  in-game el dios puede callar sin penalización mientras observa. Un
  botón **Hablar al clan** queda visible en el HUD desde el minuto 0 —
  el primer susurro es gratuito (§3.7).

**El minuto cinco**
- Los 14 NPCs ya se han separado en grupos pequeños siguiendo
  necesidades. Algunos cazan, algunos buscan agua, algunos cargan leña.
- El jugador ve **indicadores de supervivencia por NPC** (barra de
  hambre/sed) y un **pool de gratitud** en la cabecera.
- La **crónica** empieza a narrar en voz partisana: "los nuestros
  han encontrado una cueva con agua dulce al pie del Mestral".
- Si el susurro activo sigue alineado con una necesidad real del
  clan ese día, la gratitud sube unos puntos. Si el clan ya está
  saciado o el susurro no encaja, nada — la gratitud es emergente,
  no automática (§3.8).

**El minuto quince**
- Primer conflicto social: un Ciudadano de skill baja empieza a no
  producir; su socialización baja; los demás cuchichean. El jugador
  tiene dos opciones: cambiar el susurro activo a **Paciencia** si
  tiene **80 Fe**, o — si tiene **60 puntos de gratitud** y prefiere
  una solución directa sobre ese Ciudadano concreto — gastar un
  **milagro de Manos que recuerdan** (§3.8). Dos monedas, dos verbos
  — cambiar susurro empuja al clan entero, el milagro interviene
  sobre un individuo.
- Primera muerte por hambre o herida. El pool de gratitud cae
  porque el clan ha perdido a un suyo.

**El minuto treinta**
- El clan ha construido los primeros 1-2 crafteables umbral. El
  jugador decide si el asentamiento va a ser estable aquí o si conviene
  moverse (la cantera se está agotando).
- Momento de decisión de alta tensión: quedarse con despensa acumulada
  o iniciar migración con comida portátil.

**El final de era**
- Los 5 crafteables están, el clan ha dormido ≥10 noches alrededor
  de la fogata permanente. Se desbloquea el **monumento** (§5).

## 5. Condición de progresión: el monumento

**El monumento al dios ancla al clan a un lugar y dispara la
transición a la siguiente era**. Su función no es estatua — es la
**materialización mecánica de "ya somos un pueblo con fe"**.

**Desbloqueo del monumento**:
1. 5 crafteables umbral construidos (§3.6).
2. ≥ 10 noches consecutivas alrededor de la fogata permanente.
3. ≥ **un creyente de cada linaje presente en el clan**. Evita que una
   casa domine el monumento sola.

**Construcción del monumento**:
- Coste en recursos: **piedra masiva + leña sostenida + trabajo
  humano durante N días**. Números concretos se fijan en Fase 4 del
  roadmap tras ver el ritmo de recolección real.
- Durante la construcción el clan sigue vivo: los NPCs no-ocupados
  siguen cazando, cuidando, pariendo.
- **Riesgo**: si durante la construcción el clan colapsa
  (§7 derrotas), el monumento queda a medias como ruina — elemento
  narrativo para partidas futuras.

**Al completar el monumento**:
1. **Cinemática de transición** a la edad tribal.
2. El jugador **elige una bendición de aldea** (§6) del catálogo
   disponible. Esta bendición persiste en eras futuras.
3. El mundo externo "despierta": a partir de aquí, migrantes pueden
   acercarse al monumento (mecánica diferida a v1.1+ de la rama
   primigenia — ver fases).

## 6. Bendiciones de aldea (compounding entre eras)

Una bendición de aldea es **categórica, no individual**. No toca a un
NPC — toca al clan entero y persiste como rasgo colectivo que modula
todos los ticks futuros.

**Catálogo propuesto para primigenia** (subset a fijar en
`DECISIONS-PENDING`):

| Bendición | Efecto primigenia | Compounding en tribal+ |
|-|-|-|
| **Bendición del comercio** | Migrantes ocasionales comercian pieles/piedra con el clan | Caravanas regulares, rutas, dinero primitivo |
| **Bendición de la producción** | Crafteo +10% más rápido | Talleres especializados, línea de producción |
| **Bendición de la recolecta** | Regeneración de recursos +20% | Granja primitiva, domesticación |
| **Bendición del reconocimiento** | Otros clanes reconocen al nuestro como culto legítimo | Diplomacia, alianzas, tratados |
| **Bendición de la fertilidad** | Partos más frecuentes, menos mortalidad infantil | Explosión demográfica, primera ciudad |
| **Bendición de la salud** | Supervivencia pasiva +10 | Medicina emergente, menos muertes por enfermedad |
| **Bendición de la longevidad** | Edad de muerte +20 años | Ancianos como consejeros, transmisión de saber |

**Regla de compounding**:
- **Una bendición activa** por era. Se elige al completar el
  monumento correspondiente.
- La bendición **persiste** al pasar a la siguiente era con su
  efecto primigenia intacto.
- Al completar el monumento de la siguiente era, se elige una nueva
  bendición; la anterior gana su **efecto de compounding** (tabla
  arriba).
- Elegir "comercio" en primigenia y "reconocimiento" en tribal crea
  un perfil distinto al de "producción" + "fertilidad". El jugador
  esculpe su civilización con el paso de las eras.

**Decisión pendiente**: si se permite reelegir una bendición ya
tomada en una era posterior (acumulación vs diversidad forzada).
Ver `DECISIONS-PENDING-primigenia.md`.

## 7. Derrotas

Sin rival, el enemigo es el entorno y la cohesión social. Tres rutas
de fin prematuro de partida:

1. **Extinción por hambre**: despensa vacía + 10 días sin caza exitosa.
   Los NPCs mueren en cadena por supervivencia 0.
2. **Extinción por frío**: invierno sin refugio construido + 5 días
   consecutivos de tiempo extremo. Supervivencia decrece rápido en
   todos los NPCs sin techo.
3. **Colapso social**: socialización media del clan < 20 durante 30
   días. Se dispara evento de **conflicto fatal**: muere 1 NPC cada
   N días hasta que la media sube o el clan se extingue.

**Derrota espiritual específica**: **el último Elegido muere sin
hijo nacido**. El culto pierde su sangre divina. La partida puede
continuar mecánicamente, pero con **veredicto pírrico asegurado** —
ningún Ciudadano puede heredar el rol de portador del culto.

**Sin timeout**: si el clan sobrevive pero nunca construye monumento,
la partida sigue. Quedarse en primigenia 10 horas reales es una
opción válida de juego contemplativo. No se fuerza progresión.

## 8. Fases de construcción

Orden canónico, aprobado por el Director humano. **Ninguna fase
arranca sin las anteriores cerradas con TDD verde**. Esto es la
columna vertebral del `ROADMAP-primigenia.md` que escribirá el
ingeniero.

### Fase 1 — Mundo

Generación determinista del archipiélago 512×512 con recursos
distribuidos. Render pixel art con zoom + drag. Sin NPCs aún.

**Entregable testeable**: fixture JSON del mundo + snapshot visual.
Round-trip JSON verde. Regeneración byte-idéntica con mismo seed.

### Fase 2 — NPCs y recursos

Drafting completo (4 Elegidos + 10 Ciudadanos por tiers). Colocación
inicial del clan en el mapa. NPCs con stats, castas, linajes. Recursos
con régimen (regenerable/agotable). Fog-of-war de descubrimiento.

**Entregable testeable**: partida iniciada con 14 NPCs en el mapa,
recursos visibles cuando descubiertos. Determinismo de stats iniciales
por seed.

### Fase 3 — Movimiento y pathfinding

Los NPCs se mueven autónomamente según necesidades. Pathfinding A* o
equivalente sobre los 512×512 tiles. Nomadismo real: el grupo deriva
en el mapa según recursos disponibles.

**Entregable testeable**: 10.000 ticks en verde sin NPCs atrapados.
Clan se mueve de forma coherente tras agotar un recurso local.

### Fase 4 — Economía

Necesidades (hambre, sed, frío) conectadas a recolección. Crafting
con recetas y skills. Matriz de economía relacional NPC×NPC.
Crafteables umbral funcionando. Condición de fogata permanente.

**Entregable testeable**: clan capaz de llegar a los 5 crafteables
umbral por sí solo en una partida de 20.000 ticks determinista.

### Fase 5 — Susurro, Fe y gratitud

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

### Fase 6 — Monumento y bendición de aldea

Condiciones de desbloqueo, construcción con coste y tiempo, cinemática
de transición, selección de bendición de aldea. Cierre del loop de
era primigenia.

**Entregable testeable**: partida que llega al monumento en
condiciones normales (no edge case extremo), selecciona una bendición
y transiciona a "cartucho tribal" (placeholder — la v1.0.1 archivada
se rehará sobre esta base).

### Fase 7 (diferida, post-primigenia) — Migrantes externos y rival

Aparición de NPCs externos al culto que pueden ser atraídos por el
monumento. Reaparición del dios rival (reactivando Pilar 4). Esto
abre la puerta a la edad tribal completa y al resto del roadmap.

---

**Estado de este documento**: borrador editorial del Director
Creativo, fechado 2026-04-19. Próximos pasos:
1. Director humano firma los huecos pendientes listados en
   `DECISIONS-PENDING-primigenia.md`.
2. Ingeniero (`CLAUDE.md`) arranca `ROADMAP-primigenia.md` desde las
   fases 1-6 con entregables testeables.
3. v1.0.1 existente se archiva en rama `claude/v1.0.1-archivada`
   como referencia histórica — se reconstruirá sobre primigenia cuando
   llegue la edad tribal.
