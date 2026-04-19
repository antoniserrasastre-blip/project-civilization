# Decisiones — Edad Primigenia

> Registro de decisiones de diseño para la nueva edad primigenia
> (ver `vision-primigenia.md` para el contexto completo). Este
> archivo vive **en paralelo** a `DECISIONS-PENDING.md` (que guarda
> el historial de v1.0.1 actual, archivado) y lo reemplaza como
> bandeja activa del Director humano.

## Firmas de la sesión 2026-04-19

El Director humano **delegó explícitamente** al Director Creativo el
cierre de las 10 decisiones pendientes tras haber recibido opciones,
defaults sugeridos y plan de acción ("firmalo todo"). Quedan
firmadas como se recoge abajo, con tres reglas operativas:

1. Toda decisión firmada por el Director Creativo es **provisional y
   reversible**. Basta una palabra del Director humano para cambiarla.
2. Las decisiones de **balance numérico** (#1, #2, #7) se revalidarán
   en el primer playtest real tras Fase 4 (economía). Los números
   actuales son base, no verdad revelada.
3. La decisión **#9 (política editorial sobre esclavitud)** queda
   firmada por delegación, no por iniciativa del Director Creativo.
   Consta aquí para auditoría pública futura.

## Resueltas — sesión 2026-04-19 (firma Director Creativo por delegación)

| # | Tema | Decisión | Referencia |
|-|-|-|-|
| 1 | Alcance edad primigenia | **Reemplaza** la edad temprana actual. v1.0.1 se archiva. | vision-primigenia §0 |
| 2 | Drafting Elegidos | 4 NPCs, 2M+2F, 10 pt, 8 arquetipos, coste 2-4, género libre. | §3.1 A |
| 3 | Drafting Seguidores | 10 NPCs, 4 tiers (3-3-2-2), pick-1-of-10, todos Ciudadanos. | §3.1 B |
| 4 | Castas | Elegido / Ciudadano / Esclavo, cerradas por ascendencia. | §3.2 |
| 5 | Herencia Elegido | Uno basta: Elegido × cualquiera → hijo Elegido. | §3.2 |
| 6 | Origen Esclavo | Emerge por crimen grave / deuda / hambre extrema. | §3.2 |
| 7 | Niveles individuales | 3 dimensiones 0-100 con feed-forward. | §3.3 |
| 8 | Mapa | 512×512 tiles pregenerado determinista, pixel art 32×32. | §3.4 |
| 9 | Assets gráficos | Kenney/OpenGameArt (CC0) primero, IA como relleno. | §3.4 |
| 10 | Recursos | 6 tipos, régimen mixto regenerable/agotable, fog-of-war. | §3.5 |
| 11 | Crafting | Recetas fijas descubribles, skill individual, herencia 50%. | §3.6 |
| 12 | Crafteables umbral | 5 (refugio, fogata permanente, piel, herramienta, despensa). | §3.6 |
| 13 | Bendiciones individuales | Catálogo fijo, máx 3 rasgos simultáneos, herencia 50%. | §3.7 |
| 14 | Vientos | Linajes internos del clan, Tramuntana = Elegidos. | §3.8 |
| 15 | Monumento | Desbloquea con crafteables + 10 noches + linajes representados. | §5 |
| 16 | Bendición de aldea | Una por era, persiste con compounding al cambiar. | §6 |
| 17 | Rival | Fuera de primigenia. Reaparece en Fase 7 o tribal. | §2, §8 |
| 18 | Derrotas | 3 físicas + 1 espiritual (último Elegido sin hijo). | §7 |
| 19 | Orden implementación | Fases 1-6 canónicas, 7 diferida. | §8 |
| **20** | **Costes crafteables umbral** | **B medios** — refugio 15 leña + 8 piedra + 3 pieles (etc). ~12k ticks al monumento. Revalidar en playtest Fase 4. | §5 |
| **21** | **Régimen regeneración recursos** | **B medios** — leña 60d, baya 45d, caza 1 cada 100d, piedra agotable local. | §3.5 |
| **22** | **Catálogo bendiciones individuales** | **B = 10** con reparto 4-3-3 por nivel individual (ver abajo). | §3.7 |
| **23** | **Economía divina — coste de bendecir** | **C drena socialización del clan**. Opción arriesgada alineada con "Fe = creyentes reales". Fallback a A si el playtest la rompe. | §3.7, §6 |
| **24** | **Bendiciones de aldea primigenia (subset)** | **B = 4** disponibles en primigenia: recolecta, fertilidad, salud, reconocimiento. Las otras 3 llegan en tribal. | §6 |
| **25** | **Reelección de bendiciones de aldea** | **A sin reelección**. Cada bendición una sola vez en la partida. Fallback a C si el playtest pide especialización. | §6 |
| **26** | **Umbrales del monumento** | **B medios** — 10 noches en fogata + 1 creyente por linaje presente. | §5 |
| **27** | **Archivo de v1.0.1** | **A rama `claude/v1.0.1-archivada` + tag `v1.0.1-archive`**. Rama principal arranca scaffolding primigenia desde commit limpio. | — |
| **28** | **Política editorial esclavitud** | **A implementar tal como descrito + aviso en pantalla de inicio**. Firmado por delegación del Director humano; el Director Creativo recomendaba esta opción por coherencia con el realismo pre-moderno del proyecto. | §3.2 |
| **29** | **Anexo `CLAUDE-primigenia.md`** | **B anexo nuevo**. Lo redacta el ingeniero en Fase 1 con convenciones específicas (pathfinding determinista, fog-of-war seedable, assets registry). | — |

### Segunda pasada — inspiración del manga "The NPCs in this Village Sim Game Must Be Real!" (firma 2026-04-19)

Tras lectura del manga/novela que inspira el proyecto (Yoshio, dios
del destino, cuyo único verbo es un mensaje/profecía al día;
gratitud de los villagers → poder de milagros), el Director humano
firma paquete "B" para adaptar el verbo central sin reescribir el
diseño completo (opción B del análisis del Director Creativo).

| # | Tema | Decisión | Referencia |
|-|-|-|-|
| **30** | **Verbo central del dios** | **B pulso diario fijo**: el dios escribe **un mensaje/profecía al día** (1 por ciclo diario in-game, sin moneda). Es el verbo principal y siempre está disponible. Los milagros (bendiciones individuales) pasan a ser secundarios y costosos. | vision-primigenia §3.7, §3.9 (nueva) |
| **31** | **Gratitud como recurso** | **B gratitud emergente**: los NPCs generan **gratitud** cuando tu mensaje diario produce un resultado que les beneficia (supervivencia salvada, socialización reparada, conflicto evitado). La gratitud se **acumula** en un pool del clan y es la moneda de los milagros. **Deroga firma #23** (drenaje pasivo de socialización). | §3.7, §6 |
| **32** | **Catálogo de bendiciones individuales ante el cambio de verbo** | **B reducción a 5 milagros raros**. Se recorta el catálogo de 10 (firma #22) a **5 milagros potentes** que cuestan gratitud sustancial. Los 5 "desaparecidos" se recuperan como **modificadores del mensaje diario** (opciones de tonalidad del mensaje, no milagros separados). | §3.7 revisado |

### Decisiones derivadas — mecánica del mensaje diario

La firma #30 abre subdecisiones que quedan fijadas con defaults del
Director Creativo (provisionales, revalidables en playtest Fase 5):

**#30.a — ¿Qué contiene un mensaje?**
Texto libre (escrito por el jugador) vs selección de plantilla
fija. **Default: plantilla fija de 6 intenciones** (auxilio, coraje,
paciencia, encuentro, renuncia, esperanza) — tu tonalidad filtra la
interpretación del clan. Texto libre llega cuando se active el
provider LLM real (post-primigenia).

**#30.b — ¿Cuándo se entrega?**
Al amanecer del día in-game, con modal que pausa la simulación
hasta que elijas tu intención. Si saltas el día (botón "guarda
silencio hoy"), la simulación avanza sin tu voz — baja la
gratitud pasiva y sube la probabilidad de herejía.

**#30.c — ¿Los NPCs lo interpretan igual?**
No. Cada NPC interpreta el mensaje según sus niveles individuales
(supervivencia/socialización/economía) y su linaje. La crónica
narra **las 2-3 interpretaciones más relevantes** del día, no
todas. Un mensaje de "coraje" en un clan hambriento puede leerse
como "lanzarse a cazar" (supervivencia baja) o "no robar al
vecino" (economía tensa).

### Los 5 milagros (catálogo revisado de bendiciones individuales)

Sustituye la firma #22. Cada milagro cuesta **gratitud acumulada**
del clan (números provisionales — ajustables en Fase 5):

| Milagro | Coste (gratitud) | Efecto | Nivel individual afectado |
|-|-|-|-|
| **Hambre sagrada** | 30 | El NPC come menos y comparte ración con NPCs de socialización baja. Rasgo hereditario 50%. | Supervivencia / Socialización |
| **Ojo de halcón** | 40 | Radio de visión +50%, descubre recursos antes. Rasgo hereditario 50%. | Supervivencia |
| **Voz de todos** | 50 | Los NPCs cercanos ganan socialización al hacer rituales juntos. Rasgo hereditario 50%. | Socialización |
| **Manos que recuerdan** | 60 | Skill de crafteo +20 con decaimiento si no cría un aprendiz. Rasgo hereditario 50%. | Economía |
| **Corazón fiel** | 80 | Nunca abandona a su linaje. Bonus de socialización al protegerlo aunque sufra. Rasgo hereditario 50%. | Socialización / Linaje |

Las 5 bendiciones "desaparecidas" (Piel dura, Paso firme, Sangre
caliente, Vínculo de deuda, Vista de mercader) pasan a ser
**tonalidades del mensaje diario** que sesgan la interpretación
del clan sin gastar gratitud. El ingeniero las cablea como modos
del modal del mensaje en Fase 5.

### Impacto sobre decisiones anteriores

- **#22 (catálogo 10 bendiciones)**: **superseded**. El catálogo
  pasa a ser de 5 milagros (arriba) + 5 tonalidades del mensaje.
- **#23 (coste de bendecir = drena socialización)**: **superseded**.
  La gratitud es emergente y positiva, no drenaje.
- **#24 (4 bendiciones de aldea primigenia)**: **intacta**. Siguen
  siendo el premio del monumento (§6) y son categóricas
  (comercio/producción/recolecta/reconocimiento/fertilidad/salud/
  longevidad, 4 disponibles en primigenia).

Las firmas #22 y #23 quedan registradas como "superseded por #30-32"
— su texto original se conserva arriba para auditoría del cambio
de dirección.

## Catálogo de 10 bendiciones individuales — primigenia

Fijado por firma de la decisión #22. Cada bendición se otorga a un NPC
concreto y añade un rasgo permanente heredable 50% a descendientes
directos.

### Supervivencia (4)

- **Hambre sagrada**: come menos, comparte ración con NPCs de
  socialización baja. Efecto emergente: glue social.
- **Ojo de halcón**: radio de visión +50%. Descubre recursos antes.
- **Piel dura**: resistencia pasiva al frío y a heridas menores.
  Baja probabilidad de enfermar.
- **Paso firme**: velocidad de movimiento +30%. Útil en clan nómada.

### Socialización (3)

- **Voz de todos**: los NPCs cercanos a él ganan socialización extra
  al realizar rituales juntos.
- **Corazón fiel**: nunca abandona a su linaje — bonus de
  socialización al protegerlos aunque sufra.
- **Sangre caliente**: +fuerza en caza y conflicto; socialización
  decrece más rápido con deudas no pagadas. Doble filo.

### Economía relacional (3)

- **Manos que recuerdan**: skill de crafteo +20, con decaimiento si
  no cría a un aprendiz.
- **Vínculo de deuda**: los favores que hace generan deudas más
  fuertes; el grafo de economía se tensa a su alrededor.
- **Vista de mercader**: detecta oportunidades de trueque entre NPCs;
  cataliza intercambios espontáneos dentro del clan.

## Catálogo de bendiciones de aldea primigenia (decisión #24)

Solo 4 disponibles en primigenia. Las otras 3 quedan reservadas para
tribal+.

| Bendición | Efecto primigenia | Compounding en tribal+ |
|-|-|-|
| **Bendición de la recolecta** | Regeneración de recursos +20% | Granja primitiva, domesticación |
| **Bendición de la fertilidad** | Partos +30%, menos mortalidad infantil | Explosión demográfica, primera ciudad |
| **Bendición de la salud** | Supervivencia pasiva +10 | Medicina emergente |
| **Bendición del reconocimiento** | Otros clanes reconocen al culto como legítimo | Diplomacia, alianzas, tratados |

Reservadas para tribal (no seleccionables en primigenia):
- Bendición del comercio.
- Bendición de la producción.
- Bendición de la longevidad.

## Valores numéricos fijados (decisiones #20, #21, #26)

Todos **provisionales**, revalidación obligatoria en primer playtest
real tras Fase 4.

### Costes de los 5 crafteables umbral (#20)

| Crafteable | Leña | Piedra | Piel | Tiempo-hombre (días) |
|-|-|-|-|-|
| Refugio | 15 | 8 | 3 | 5 |
| Fogata permanente | 5 | 15 | 0 | 3 |
| Piel / ropa | 0 | 0 | 2 | 2 |
| Herramienta sílex | 2 | 5 | 0 | 2 |
| Despensa | 10 | 6 | 0 | 4 |
| **Total mínimo clan** | **32** | **34** | **5** | **16** |

### Régimen de regeneración (#21)

| Recurso | Régimen | Tiempo regen |
|-|-|-|
| Leña | Regenerable | Árbol rebrota en 60 días |
| Piedra | Agotable local | Cantera se vacía; no vuelve |
| Baya | Regenerable estacional | 45 días por cosecha |
| Caza | Regenerable dinámico | 1 individuo cada 100 días por manada |
| Agua | Regenerable continuo | Infinito salvo sequía (futura) |
| Pescado | Regenerable continuo | Infinito mientras zona costera no se sobrepesque (×2 sobre tasa natural acarrea escasez 30d) |

### Umbrales del monumento (#26)

- **Crafteables**: los 5 umbral construidos.
- **Fogata permanente**: ≥ 10 noches consecutivas con ≥ 10 NPCs
  durmiendo alrededor.
- **Linajes representados**: ≥ 1 creyente vivo de cada linaje
  presente en el clan.
- **Coste de construcción**: 200 piedra + 50 leña + 60 días-hombre
  trabajando. Durante la obra el clan sigue operativo (no se
  congela).

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

Resuelta una decisión, se archiva en la tabla "Resueltas" arriba con
referencia al `vision-primigenia.md` o a la implementación.
