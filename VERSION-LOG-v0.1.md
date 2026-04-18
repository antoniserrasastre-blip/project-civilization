# VERSION LOG — v0.1 MVP

**Estado**: ✅ shipped (commit `5548424`)
**Sprints**: 1 (Foundation), 2 (NPC Lifecycle + Mapa + Scheduler),
3 (Gifts), 4 (Faith Economy), 5a (Onboarding), 5b (Verdict), 6 (Polish
Visual), 7 (Balance + Hardening).

## Qué hace esta versión

- Motor puro determinista: `WorldState` JSON-serializable, PRNG
  seedable, tick funcional sin side effects (§A4 del Vision Document).
- Simulación de ciclo vital: muertes por edad, conflictos entre
  ambiciosos, emparejamientos por proximidad, nacimientos con herencia
  parcial de stats y dones.
- Economía de Fe de tres verbos: **rezar** (pasiva por cada
  sagrado vivo), **enemigo caído** (bono al matar a un no-sagrado),
  **descendencia** (bono por cada hijo de un sagrado).
- Dos dones canónicos: **Fuerza Sobrehumana** y **Aura de Carisma**.
  Primer don gratis, siguientes 30 Fe.
- Mecánica de seguidores: `aura_de_carisma` sobre un ambicioso
  atrae tímidos → Pillar 1 demostrado mecánicamente.
- UI dashboard con HUD, mapa SVG procedural (costa sine-wave + símbolos
  hand-drawn), character card overlay, panel de crónica, panel de Fe,
  panel de veredicto por era.
- Persistencia `localStorage` versioned (`godgame.state.v2`), auto-save
  cada 50 ticks y tras cada acción del jugador.
- Tutorial coreografiado de 30 días (~90s a 1×): intro → halo sobre el
  señalado → evento dramático forzado día 6 → fin.

## Por qué y cómo encaja con la visión

- **Pillar 1** (mismo don distinto resultado según traits) — shipped y
  testado en integración, resultado observable en el follower count.
- **Pillar 2** (el mundo cambia si no tocas nada) — shipped: 18k ticks
  sin intervención producen muertes, nacimientos, crónica viva.
- **Pillar 3** (Fe como economía narrativa) — shipped.
- **Pillars 4 & 5** (veredicto sin presión, linaje) — shipped via
  el modal "¿reina tu linaje?" y la métrica de influencia.
- La voz partisana del cronista es el ancla del tono del juego — se
  consolidó en v0.1 con plantillas deterministas (v0.4 añade LLM).

## Perspectiva del jugador

> Abro el juego. Un mapa de pergamino con NPCs dispersos, uno marcado
> con un halo dorado. Leo un texto de bienvenida, pulso "Comenzar".
> Unos segundos después un nombre cae en combate — el señalado —
> el cronista lo celebra. Hago click en él, veo que es Mateu Tous, un
> ambicioso. Lo unjo. Me siento dios por primera vez. Acelero a 10×
> y veo cómo engendra hijos, cómo alguno muere de viejo, cómo la
> crónica se llena. Pido veredicto al final de la era: "SÍ, reina tu
> linaje". Sonrisa. Exporto la crónica a .txt y la leo como si fuera
> un libro.

Primer minuto: **atmósfera + un evento dramático**. El tutorial
hace su trabajo. A los 5 minutos: la Fe empieza a acumularse, puedo
conceder un segundo don si acumulo 30. A los 15 minutos: varias
generaciones han pasado, decido si mi Elegido original sigue vivo o
si hay que ungir a un descendiente.

## Balance (especial foco en economía)

Con valores tras tuning de Sprint 7:

| Parámetro | Valor | Racional |
|-|-|-|
| `PAIRING_PROB_PER_TICK` | 0.004 | ~1.5 pair/año por NPC elegible. |
| `BIRTH_PROB_PER_TICK` | 0.0015 | Reducido de 0.003 en S7: evitaba explosión ≥599 NPCs a 10k ticks. |
| `CONFLICT_BASE_PROB_PER_TICK` | 0.0015 | Uno de cada 600 ticks un ambicioso hostil pelea. |
| `DEATH_START_AGE_YEARS` | 50 | Vida tribal dura. |
| `DEATH_GUARANTEED_AGE_YEARS` | 95 | Curva cuadrática ×5. |
| `FAITH_PER_TICK_PER_HOLY` | 0.05 | 1 sagrado ⇒ 0.25 Fe/s a 1× ⇒ 30 Fe en 2 min. |
| `FAITH_PER_ENEMY_FALLEN` | 10 | Bono claro pero no dominante. |
| `FAITH_PER_HOLY_BIRTH` | 5 | Premio a la fertilidad del linaje. |
| `GIFT_COST` (del 2º en adelante) | 30 | Primer don gratis; 2º cuesta ~2 min reales a 1×. |

**Sano**: primera ungida gratis; segundo don tras una espera
significativa pero accesible. Fe por kill (10) es inferior a Fe por 2
min de rezo pasivo (30) → no incentiva masacre gratuita.

**Tensión**: a 100×, 30 Fe se acumulan en ~6 segundos — el juego
puede sentirse "demasiado rápido" con Elegido ya asentado. Podría
querer un decay o un cap, pero para v0.1 es aceptable.

## 🚩 Flags para supervisión humana

- ⚠️ **Balance del coste de dones**: 30 Fe fijo a partir del 2º. El
  ROADMAP v0.2+ sugería "costes por niveles"; v0.1 no los tiene. Si
  el Director quiere progresión exponencial (2º=30, 3º=60, 4º=120…)
  hay que tocar `nextGiftCost` en `lib/gifts.ts`.
- ⚠️ **Vida media demasiado larga**: NPCs mueren cerca de los 95.
  Un pueblo tribal real tendría vida media ~40. Si se quiere más
  turnover dramático, bajar `DEATH_START_AGE_YEARS` a 35.
- ⚠️ **Onboarding coreografiado rígido**: evento forzado siempre en
  día 6. Si el jugador pausa el tutorial, la cinemática de fase
  avanza solo por ticks — pausa = tutorial congelado. Puede querer
  un timeout de wall-clock independiente.
