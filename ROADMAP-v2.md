# Roadmap v2 — Más allá de v1.0

Rama provisional (`claude/v2-roadmap`) para trabajar el contenido
post-v1.0 sin mergear a la rama principal hasta que el Director
Creativo lo valide.

Contexto: `ROADMAP.md` original proyecta dos esfuerzos tras v1.0:

- **Sprints 14-17 — contenido**: eras clásica y medieval + sus
  mecánicas.
- **Sprints 18-20 — contenido**: industrial + atómica (dilema
  nuclear final).
- **v2.0 — arquitectura**: multijugador (8-12 sprints).

Este roadmap trata las tres líneas como un plan unificado con dos
modos alternativos: **content-first** (14 → 20 → v1.9 → v2.0) o
**multiplayer-first** (saltar a v2.0 y dejar contenido para después).
Por defecto seguimos **content-first** — es lo que el jugador ve.

---

## v1.1 — Era Clásica

### Sprint 14 — Clásica básica
Pool tecnológico de la era clásica: escritura cursiva, rueda, ejército
regular. Nuevo don contextual: **Estratega** (boost a resolución de
conflictos con el grupo siguiendo al Elegido — primer don condicionado
al contexto).

### Sprint 15 — Clásica mecánicas avanzadas
Unidades abstractas: cada pueblo tiene un "ejército" abstracto
equivalente a `floor(Σ fuerza de adultos sanos / 10)`. Conflictos
grupo-vs-grupo resueltos por fuerza + estrategias + relieve.

→ v1.1 shipped cuando Sprint 15 + Polish queden verdes.

## v1.2 — Era Medieval

### Sprint 16 — Medieval básica
Feudalismo: los seguidores se convierten en "vasallos" con jerarquía.
Maldiciones se enriquecen: plagas, desheredamientos.

### Sprint 17 — Medieval comercio
Intercambio de bienes entre grupos → tercer eje de Fe (fe comercial).

## v1.3 — Era Industrial

### Sprint 18 — Industrial
Pool: máquina de vapor, imprenta mecánica, nacionalismo. NPCs pueden
migrar en masa: la deriva dinástica se vuelve diáspora.

## v1.4 — Era Atómica (dilema)

### Sprint 19 — Atómica pre-bomba
La tensión entre grupos sube. Una tech nueva: `bomba` — si algún
grupo la descubre primero, una crisis activa cuenta atrás.

### Sprint 20 — Dilema final
Modal moral: "¿Concedes la tecnología de destrucción a tu pueblo?"
Escala de consecuencias. Esta es la pregunta narrativa de cierre del
juego.

→ v1.4 single-player concluido.

---

## v2.0 — Multijugador

### Sprint 21-22 — Backend del mundo compartido
Servidor autoritativo que mantiene `WorldState` como fuente de verdad.
Los clientes envían acciones (anoint, grant, curse) que el server
aplica si son válidas y publica a los peers. Determinismo se respeta
porque el server corre el mismo tick.

### Sprint 23 — 2 jugadores vs IA
2 dioses humanos + 1 rival IA en el mismo mundo. Partida asimétrica.

### Sprint 24 — N jugadores
Lobby, matchmaking básico. 3-6 dioses humanos por mundo.

### Sprint 25-27 — Cross-play
Persistencia de partidas multiturno (empezar hoy, seguir mañana).
Espectadores sin dios.

### Sprint 28+ — Escalabilidad
Rate limiting, anticheat (server-side validation), métricas en vivo.

---

## Metodología

- Cada sprint: TDD (red → green → refactor → gate → commit → push).
- **Polish & Debug + VERSION-LOG-vX.Y.md al cerrar cada versión**.
- Balance general > features nuevas. Si una versión no juega bien,
  NO se construye la siguiente encima.
- Esta rama vive hasta que el Director valide el plan y decida qué
  hacer con v1.x vs v2.0. Si aprueba v1.1 first, se hace cherry-pick
  a una rama `release/v1.1` y se mergea.

## 🚩 Decisiones abiertas (requieren Director Creativo)

1. ¿Content-first (v1.1 → v1.4 → v2.0) o multiplayer-first?
2. ¿La era atómica cierra el single-player o abre un "endgame loop"
   con repeticiones?
3. ¿El multijugador es *competitivo* (dioses enfrentados con objetivos
   contradictorios) o *cooperativo* (dioses colaborando contra IA
   rivales)?
4. ¿El servidor de v2.0 lo hostea el Director (privado) o se abre
   como open-source?
