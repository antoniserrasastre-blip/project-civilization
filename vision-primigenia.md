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
gobierna: **bendice**. Cada bendición se traduce en un **rasgo** que
altera cómo los NPCs se comportan. El mundo hace el resto.

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
| Pilar 1 · Mismo don, distinto resultado | **intacto** | Catálogo de 8-12 bendiciones; rasgos hereditarios 50%. |
| Pilar 2 · Mundo cambia sin tocarlo | **intacto** | NPCs autónomos con pathfinding y necesidades. |
| Pilar 3 · Fe como economía narrativa | **reinterpretado** | Fe se materializa en **creyentes reales** (humanos), no en contador abstracto. |
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
3. **Pilar 3 · Fe como creyentes reales**. No hay más "puntos de Fe"
   abstractos. Cada humano del clan es un creyente; cada muerte es una
   pérdida real de economía divina. Atraer gente externa al culto es
   la única ruta de crecimiento.
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

### 3.7 Bendiciones → rasgos

El verbo del jugador. Único. No hay control directo de NPCs —
solo bendición.

**Catálogo fijo de 8-12 bendiciones** para primigenia. Número final
se fija en Fase 4+ del roadmap. Cada bendición:

- Se otorga a un NPC concreto seleccionado por el jugador.
- Paga un coste (economía divina — ver §5 y §6 para creyentes y
  bendiciones de aldea).
- Añade un **rasgo permanente** al NPC que altera su comportamiento.
- **Hereda 50% probabilidad** a descendientes directos; diluye por
  generación.
- **Máx 3 rasgos simultáneos** por NPC. El 4º reemplaza al más
  antiguo o exige confirmación del jugador.

**Ejemplos orientativos** (catálogo definitivo en `DECISIONS-PENDING`):

- **Hambre sagrada**: el NPC come menos pero comparte su ración con
  otros con socialización baja. Efecto emergente: glue social.
- **Ojo de halcón**: radio de visión +50%. Descubre recursos más
  rápido.
- **Manos que recuerdan**: skill de crafteo +20, con decaimiento
  si no cría a un aprendiz.
- **Sangre caliente**: +fuerza en caza y conflicto; socialización
  decrece más rápido con deudas no pagadas.
- **Voz de todos**: los NPCs cercanos a él ganan socialización
  extra cuando realizan rituales.

### 3.8 Vientos — los ocho linajes del archipiélago

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
es **observar, diagnosticar y bendecir**.

**El primer minuto**
- Pantallas de drafting encadenadas: 4 Elegidos con puntos, luego
  10 Ciudadanos con fases de calidad. Al acabar, el clan aparece en
  un punto costero del mapa.
- Una **fogata precaria** ya está encendida. No cuenta como
  asentamiento — es el bivouac nómada.

**El minuto cinco**
- Los 14 NPCs ya se han separado en grupos pequeños siguiendo
  necesidades. Algunos cazan, algunos buscan agua, algunos cargan leña.
- El jugador ve **indicadores de supervivencia por NPC** (barra de
  hambre/sed). Los primeros descubrimientos de recursos rellenan el
  mapa poco a poco.
- La **crónica** empieza a narrar en voz partisana: "los nuestros
  han encontrado una cueva con agua dulce al pie del Mestral".

**El minuto quince**
- Primer conflicto social: un Ciudadano de skill baja empieza a no
  producir; su socialización baja; los demás cuchichean. El jugador
  decide si bendecirle (Manos que recuerdan) o dejar que caiga.
- Primera muerte por hambre o herida. La Fe del jugador — medida en
  **creyentes vivos** — baja por primera vez.

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

### Fase 5 — Bendiciones y rasgos

Verbo del jugador: catálogo de bendiciones + rasgos hereditarios.
Fe-como-creyentes (contador = NPCs vivos del culto).

**Entregable testeable**: el mismo NPC con diferentes combinaciones
de rasgos produce trayectorias medibles distintas (Pilar 1).

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
