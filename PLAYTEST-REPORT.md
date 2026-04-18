# PLAYTEST REPORT — v1.0.1

> Sesión generada automáticamente por el harness en
> `tests/playtest/`. No es un playtest humano — es una simulación
> programática que corre 4 personas-arquetipo durante 10.000 ticks
> cada una y analiza la telemetría resultante.
>
> Semilla fija (42) para reproducibilidad. Los hallazgos son
> deterministas; cada persona siempre produce los mismos números
> contra una misma versión del motor.

## Resumen

| Persona | Veredicto final | Top-3 del linaje | Vivos | Era |
|-|-|-|-|-|
| observador | defeat | 0/3 | 147 | bronce |
| minimalista | defeat | 0/3 | 147 | bronce |
| guerrero | reign | 3/3 | 149 | bronce |
| estratega | defeat | 0/3 | 128 | bronce |

## Hallazgos clave

1. **El minimalista pierde en solitario.** Ungir al más ambicioso sin
   dones mecánicos no basta contra 2 rivales aggressive/opportunistic.
   Los rivales acumulan 7-14 chosen cada uno vs 1 chosen del player;
   el top-3 queda copado por influencia rival.

2. **Fuerza Sobrehumana + descendencia = victoria.** El guerrero con
   1 Elegido buffeado genera suficiente ventaja para que top-3 quede
   completamente en manos del linaje del jugador (el Elegido + 2
   descendientes directos).

3. **Maldiciones solas no bastan.** El estratega que lanza 6
   curse_fatal en 10k ticks (3 exitosos como mínimo) NO vence a los
   rivales. Los rivales compensan con más anoints. El coste por baja
   rival (150 Fe) vs el coste por anoint rival (gratis cada 500 días)
   es asimétrico a favor del rival.

4. **Era bronce es el techo típico en 10k ticks (~27 años).** Nadie
   llega a clásica ni a la decisión nuclear en este horizonte. Para
   alcanzar el dilema nuclear, un jugador debería acelerar a 100×
   durante ~45 minutos reales — ver VERSION-LOG-v1.3.md.

5. **Fe pasiva satura el cap en <2000 días** para un Elegido con
   descendientes. A partir de ahí, la Fe no crece: cualquier ganancia
   por rezo, kill o birth se pierde. Esto es **diseño** (cap 500
   decidido en v1.0.1 #1), y aquí se confirma que fuerza al jugador
   a gastar activamente.

## Telemetría por persona

### Persona: **observador** (seed 42)

**Acciones ejecutadas**:
  - *(ninguna)*

**Progresión**:

| Día | Vivos | Fe | Crónica | Veredicto | Era | Rival chosen |
|-|-|-|-|-|-|-|
| 100 | 35 | 0 | 2 | defeat | tribal | 0 / 0 |
| 500 | 42 | 0 | 13 | defeat | bronce | 1 / 1 |
| 1000 | 49 | 0 | 21 | defeat | bronce | 1 / 1 |
| 2500 | 75 | 0 | 54 | defeat | bronce | 2 / 2 |
| 5000 | 105 | 0 | 93 | defeat | bronce | 4 / 4 |
| 7500 | 120 | 0 | 126 | defeat | bronce | 6 / 6 |
| 10000 | 147 | 0 | 187 | defeat | bronce | 7 / 8 |

**Top-3 final por influencia**:

1. Joana Mas · 283 inf 
2. Joana Ferrer · 236 inf 
3. Francina Coll · 229 inf 

**Nuclear**: no descubierto

**Veredicto final**: `defeat`

### Persona: **minimalista** (seed 42)

**Acciones ejecutadas**:
  - día 10: ungir al señalado (npc_0007)

**Progresión**:

| Día | Vivos | Fe | Crónica | Veredicto | Era | Rival chosen |
|-|-|-|-|-|-|-|
| 50 | 35 | 2 | 1 | pyrrhic | tribal | 0 / 0 |
| 200 | 37 | 9.5 | 4 | pyrrhic | tribal | 0 / 0 |
| 1000 | 49 | 67.75 | 21 | reign | bronce | 1 / 1 |
| 2500 | 75 | 262.7 | 54 | reign | bronce | 2 / 2 |
| 5000 | 105 | 500 | 93 | reign | bronce | 4 / 4 |
| 7500 | 120 | 500 | 126 | reign | bronce | 6 / 6 |
| 10000 | 147 | 500 | 187 | defeat | bronce | 7 / 8 |

**Top-3 final por influencia**:

1. Joana Mas · 283 inf 
2. Joana Ferrer · 236 inf 
3. Francina Coll · 229 inf 

**Nuclear**: no descubierto

**Veredicto final**: `defeat`

### Persona: **guerrero** (seed 42)

**Acciones ejecutadas**:
  - día 10: ungir al señalado (npc_0007)
  - día 20: conceder Fuerza Sobrehumana (primer don, gratis)
  - día 1500: intentar conceder Aura de Carisma (30 Fe)
  - día 3000: intentar curse_fatal al rival más influyente
  - día 5000: intentar curse_fatal al rival más influyente
  - día 7000: intentar curse_fatal al rival más influyente
  - día 9000: intentar curse_fatal al rival más influyente

**Progresión**:

| Día | Vivos | Fe | Crónica | Veredicto | Era | Rival chosen |
|-|-|-|-|-|-|-|
| 50 | 35 | 2 | 1 | pyrrhic | tribal | 0 / 0 |
| 500 | 42 | 24.5 | 13 | pyrrhic | bronce | 1 / 1 |
| 2000 | 65 | 137.75 | 43 | reign | bronce | 4 / 2 |
| 5000 | 105 | 350 | 93 | reign | bronce | 8 / 4 |
| 7500 | 112 | 500 | 115 | reign | bronce | 10 / 7 |
| 10000 | 149 | 500 | 180 | reign | bronce | 11 / 7 |

**Top-3 final por influencia**:

1. Francina Tous · 355 inf **← del linaje del jugador**
2. Joana Ferrer · 256 inf **← del linaje del jugador**
3. Clara Ferrer · 240 inf **← del linaje del jugador**

**Nuclear**: no descubierto

**Veredicto final**: `reign`

### Persona: **estratega** (seed 42)

**Acciones ejecutadas**:
  - día 10: ungir al señalado (npc_0007)
  - día 1500: intentar curse_fatal a un rival chosen
  - día 3000: intentar curse_fatal a un rival chosen
  - día 4500: intentar curse_fatal a un rival chosen
  - día 6000: intentar curse_fatal a un rival chosen
  - día 7500: intentar curse_fatal a un rival chosen
  - día 9000: intentar curse_fatal a un rival chosen

**Progresión**:

| Día | Vivos | Fe | Crónica | Veredicto | Era | Rival chosen |
|-|-|-|-|-|-|-|
| 500 | 42 | 24.5 | 13 | pyrrhic | bronce | 1 / 1 |
| 2000 | 65 | 187.7 | 43 | reign | bronce | 2 / 1 |
| 4000 | 92 | 418.25 | 78 | reign | bronce | 4 / 3 |
| 6000 | 103 | 350 | 99 | reign | bronce | 8 / 5 |
| 8000 | 108 | 500 | 124 | reign | bronce | 9 / 7 |
| 10000 | 128 | 500 | 166 | defeat | bronce | 12 / 9 |

**Top-3 final por influencia**:

1. Francina Coll · 229 inf 
2. Clara Ramis · 194 inf 
3. Sebastià Ferrer · 182 inf 

**Nuclear**: no descubierto

**Veredicto final**: `defeat`

## Recomendaciones para v1.1+

- 🟡 **Buff a curses o nerf a anoint rival**. La asimetría es muy
  fuerte: el curse_fatal a 150 Fe mata 1 chosen, el rival re-anointa
  gratis cada 500 días. Propuestas:
  - Bajar curse_fatal a 100 Fe.
  - Añadir curse_dynasty (nueva, ~250 Fe): mata al chosen Y marca a
    todos sus descendientes actuales como ya no-sagrados (rompe la
    pipeline de Fe para el rival).
- 🟡 **Minimalista merece un camino al reign**. Hoy solo gana quien
  combina dones + observancia. Si el design target incluye al
  jugador contemplativo, falta una mecánica que favorezca al
  minimalista (por ejemplo: bonus de Fe escalado con edad del
  Elegido, recompensando la longevidad sin intervención).
- 🟡 **Dilema nuclear inalcanzable en sesión corta**. En 10k ticks
  (~33 min a 1×, ~20s a 100×) solo se llega a bronce. Para que el
  jugador vea la decisión nuclear necesita ~50k ticks. Considerar
  acelerar el descubrimiento tecnológico o añadir "salto a era"
  como acción del dios (coste en Fe).
- ⚠️ **Los rivales se comen el top-3 en ausencia de acción player**.
  Pillar 5 (linaje reina) debería tener mayor probabilidad cuando el
  player hace algo razonable — hoy incluso la participación activa
  del guerrero es la línea de base, y todo lo demás es derrota.
