---
tipo: puntero
estado: reemplazado durante la Edad Primigenia
fecha-reemplazo: 2026-04-22
reemplazado-por: ROADMAP-primigenia.md + SPRINTS-primigenia.md
---

# ROADMAP.md — reemplazado durante la Edad Primigenia

Este fichero contenía la descomposición inicial en 30 sprints de las
Fases 1-6 de primigenia. Tras el pase editorial de `vision-primigenia.md`
(commit `1c643f2`, firma del susurro persistente + §3.7b) y el
playtest humano del 2026-04-22 (expuso el *spawn fantasma* con el
gate en verde, commit `11f2e95`), la planificación se reorganizó en
dos ficheros con separación explícita entre estratégico y táctico:

| Fichero | Nivel | Fuente de verdad para |
|-|-|-|
| [`ROADMAP-primigenia.md`](./ROADMAP-primigenia.md) | estratégico | Fases 1-7, dependencias, criterio de *"primigenia cerrada"*, estado por fase |
| [`SPRINTS-primigenia.md`](./SPRINTS-primigenia.md) | táctico | Queue ordenada de sprints pendientes con archivos, tests Red primero, criterios de cierre |

**Durante la edad primigenia, el canónico es `ROADMAP-primigenia.md`**.
La queue accionable que el ingeniero consume es `SPRINTS-primigenia.md`.
Ambos conviven sin contradicción: ninguno de los dos gana sobre el otro.

Este `ROADMAP.md` se conserva como puntero para no romper las
referencias históricas por nombre que aún viven en `CLAUDE.md`,
`CLAUDEDIRECTOR.md`, `README.md` y en mensajes de commit antiguos.
Cuando primigenia cierre (ver punto 8 del *Criterio de
"primigenia completada"* en `ROADMAP-primigenia.md`), el ROADMAP
genérico de la siguiente era puede reescribir este fichero.

> **Nota histórica**: el texto original de este ROADMAP (30 sprints
> nivel-detalle, Fases 1-6, ~700 líneas) vive en git previo al commit
> que introdujo este puntero. Se sustituyó porque divergía tanto del
> pase editorial post-playtest que confundía más de lo que ayudaba.
