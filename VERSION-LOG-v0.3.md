# VERSION LOG — v0.3 Rival Gods

**Estado**: ✅ shipped (commit `e85e42d` tras polish)
**Sprints**: 9 (3 grupos + selector), 10 (IA dioses rivales), 11
(cross-group + maldiciones) + Polish.

## Qué hace esta versión

- **3 grupos de NPCs** con nombres de vientos baleares: Tramuntana
  (azul), Llevant (rojo), Migjorn (verde). Cada uno con 12 mortales
  distribuidos cerca de su centro territorial.
- **Selector de grupos al boot**: overlay con 3 botones, el jugador
  elige qué pueblo observar. Reset reabre el selector.
- **Dioses rivales IA** con 3 perfiles (`passive`, `aggressive`,
  `opportunistic`). Deciden cada 500 días (~100s a 1×). Acumulan Fe
  pasiva como el jugador y pueden ungir Elegidos propios.
- **Intermatrimonio** cross-grupo con probabilidad reducida (factor
  0.25 vs same-group): el Elegido infiltra su linaje en otros pueblos
  generación a generación. La crónica registra el matrimonio mixto
  con voz dramática.
- **Maldiciones**: tres niveles (simple 20 Fe, strong 50 Fe, fatal
  150 Fe) lanzables sobre NPCs de grupo rival vivos. Panel en la
  character card overlay para NPCs rivales.
- Panel lateral "Dioses rivales" muestra perfil, mortales vivos,
  Elegidos del rival, Fe acumulada.
- Elegidos rivales destacados en el mapa con anillo rojizo discontinuo.

## Por qué y cómo encaja con la visión

v0.3 es el **primer paso del "prototipo interesante" a "juego de
verdad"** que el ROADMAP avisaba. El jugador deja de ser un dios
solitario y entra en una **dialéctica** — con IAs que tienen sus
propios intereses, con la posibilidad de maldecir, con linajes que
cruzan fronteras.

- Pillars 1-5 siguen sosteniéndose.
- §A5 (menú selector de grupos) implementado literal.
- §13 recomendaciones (intermatrimonio, maldiciones con niveles)
  aplicadas como punto de partida — el ROADMAP dice que se re-abren
  con datos de playtest, así que estos valores SON provisionales.

## Perspectiva del jugador

> Arranco la partida. Un overlay me pregunta qué pueblo quiero. Elijo
> Llevant (rojo). El mapa se puebla: mis mortales en el noreste,
> Tramuntana al noroeste (azul), Migjorn al sur (verde). El tutorial
> me señala al más ambicioso de los míos — es Joan Tous, 28 años,
> ambición 88. Lo unjo. Acelero a 10×.
>
> 1 minuto después, la crónica susurra: "Los hijos de Tramuntana
> vieron un halo descender sobre Aina Serra. Su dios la ha marcado."
> Mi rival Tramuntana (aggressive) ha actuado. Tres minutos después,
> otro halo en Migjorn (opportunistic — va más lento).
>
> A los diez minutos, un matrimonio cruzado: Mateu Moll (mío) y
> Francina Vidal (de Tramuntana). El cronista: "Las viejas dividen
> la sangre nueva con dedos inquietos." Sé que su hijo, si nace, me
> seguirá dando Fe aunque viva en terreno enemigo.
>
> Veo que Aina Serra (elegida rival) está cerca del territorio
> Migjorn. Me apetece castigar. Abro su character card: botones
> rojos de maldición. No tengo los 150 Fe para matarla, pero sí 20
> para debilitarla. Lanzo `curse_simple`. La crónica: "Cayó la
> sombra sobre Aina Serra, de los hijos de Tramuntana. Los nuestros
> no lloran." Sonrisa maligna. Esto empieza a ser un juego.

## Balance

| Parámetro | Valor | Nota |
|-|-|-|
| `RIVAL_DECISION_INTERVAL` | 500 días | ~100s a 1×. Anti-presión Pillar 4: el jugador siempre ve tiempo entre acciones del rival. |
| `CROSS_GROUP_PAIRING_FACTOR` | 0.25 | Same-group pesa 4× cross. Intermatrimonio raro pero presente. |
| Perfil `passive` | 25% actProb | Queda casi como adorno. |
| Perfil `aggressive` | 80% + x5 peso ambición | Notorio desde los primeros minutos. |
| Perfil `opportunistic` | 55% + x3 peso | Ritmo intermedio, impredecible. |
| Curses: simple/strong/fatal | 20/50/150 Fe | Simple accesible en ~7 min a 1×; fatal requiere >50 min si solo hay 1 Elegido generando Fe. |

**Sano**: el rival `aggressive` se hace ver; el `passive` deja
respirar. Las maldiciones de mayor nivel exigen partidas largas, lo
que incentiva al jugador a CUIDAR su Elegido (si muere, adiós Fe).

**Cuestión abierta**: la Fe del rival no se gasta — acumula sin
tope. El rival no "lanza" acciones caras. Solo ungir. ¿Debería el
rival conceder dones? Flag abajo.

## 🚩 Flags para supervisión humana

- ⚠️ **Rivales solo unjen, no conceden dones ni maldicen**: la
  asimetría con el jugador es grande. Para que el juego sea un
  diálogo real, el rival debe poder conceder `fuerza_sobrehumana` a
  su Elegido y/o maldecir a los nuestros. Queda pendiente para v1.1
  o v2 — requiere decisión de diseño.
- ⚠️ **Perfil `aggressive` puede saturar**: con actProb 0.8 el
  rival casi siempre unge. Partidas largas llenan su `chosen_ones`
  de 12+ NPCs. Puede querer un cap.
- ⚠️ **`curse_fatal` a 150 Fe**: tras ~50 min a 1× un jugador solo
  puede matar 1 rival/vida. Si se quiere que la partida sea
  dramática, bajar a 100 Fe o permitir "kills múltiples" con
  decay de coste.
- ⚠️ **Deriva dinástica invisible**: un descendiente mío en grupo
  rival me genera Fe, pero la UI no lo distingue del resto. La
  character card dice "descendiente" pero no resalta "miembro del
  enemigo con mi sangre". Flag UX.
