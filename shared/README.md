# `shared/`

Código y utilidades comunes a **varios agentes** de `agents/`.

## Relación con `lib/`

Ojo: `lib/` (raíz) ya es el **núcleo puro** de GODGAME bajo contrato
§A4 (pureza, determinismo, round-trip JSON). Ese núcleo NO se mueve
aquí. `lib/` sigue siendo la fuente de verdad del motor.

`shared/` cubre un caso distinto: helpers que varios **agentes**
(entradas bajo `agents/`) necesiten comparten entre sí y que NO
pertenecen al núcleo del juego. Ejemplos plausibles:

- Adaptadores de logging estructurado entre agentes.
- Plantillas de prompts reutilizables.
- Utilidades de I/O para artefactos de sesión.

## Cuándo `shared/` vs `lib/` vs `agents/<x>/`

| Caso | Va a |
|-|-|
| Función pura del motor (economía, lifecycle, PRNG) | `lib/` (§A4 obligatorio) |
| Helper reutilizado por 2+ agentes, sin relación con el motor | `shared/` |
| Código específico de un solo agente | `agents/<x>/` |

Si una utilidad empieza en `agents/<x>/` y un segundo agente la
necesita: **entonces** se promueve a `shared/`. No antes (YAGNI).

## Estado actual

Vacío. Con un único agente activo (Claude Code sobre GODGAME) no
hay nada que compartir todavía. Primera entrada cuando aparezca el
segundo agente.
