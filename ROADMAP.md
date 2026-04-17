# Roadmap — Proyecto Civilización

Plan de sprints desde el MVP hasta v1.0 y más allá. Cada sprint es un
objetivo testeable, no una lista de tareas. El orden importa: cada
sprint desbloquea los siguientes.

---

## v0.1 MVP — playable por ti y quizá un amigo

### Sprint 1 — Foundation ✅ done
Núcleo puro, PRNG, ungimiento, plantillas de crónica, persistencia, tests.

### Sprint 2 — NPC Lifecycle + Basic Procedural Map
Muerte, nacimiento, emparejamiento, conflicto básico. Costa procedural
semillada (sine-wave layered, determinista). NPCs renderizados como
círculos de color sobre canvas. Click → character card overlay (solo
texto). **Pillar 2** pasa a ser testeable.

### Sprint 3 — Gifts with Real Mechanics
Fuerza Sobrehumana, Aura de Carisma, mecánica `follower_of`, herencia de
dones. La character card crece para mostrar linaje + dones. **Pillar 1**
pasa a ser testeable.

### Sprint 4 — Faith Economy
Tres verbos (descendencia, enemigo caído, rezar). Herencia de Fe. Coste
de dones (el primero gratis, luego 30 Fe). Panel lateral de Fe. **Pillar
3** pasa a ser testeable.

### Sprint 5 — Onboarding + Victory Condition
Intro coreografiada de 90 segundos (§A1). Métrica de influencia (§A4).
UI de veredicto de fin de era. Controles de velocidad según visión
(0/1/10/100). **Pillars 4 & 5** shipean.

### Sprint 6 — Visual Polish Pass
Estética hand-drawn en el mapa (símbolos de montaña/bosque, textura de
pergamino, líneas de costa a tinta). Retratos de NPCs (aunque sean
siluetas SVG). Panel de crónica actualizado en vivo. Exportar crónica a
texto.

### Sprint 7 — Balance + Playtest Hardening
Jugar de verdad a la cosa. Afinar costes de Fe. Verificar **Pillar 1**
(mismo don, NPC distinto = resultado distinto). Verificar **Pillar 2**
(el mundo cambia en 1 hora sin tocar nada). Arreglar lo que se rompa.

→ **v0.1 MVP shipped.**

---

## v0.2 — Second Era

### Sprint 8 — Second Era
Lógica de transición Tribal → Bronce. Sistema de tecnología/descubrimiento
(fuego ya está; añadir herramientas, escritura). Cinemáticas de fin de
era. Esto valida que la arquitectura escala entre eras.

---

## v0.3 — Rival Gods (flagship feature)

### Sprint 9
Menú selector de grupos (§A5), 3 grupos en el mapa, cada uno con 10-15
NPCs.

### Sprint 10
Ciclo de decisión de la IA dios rival (10-15 min por decisión — ver
regla anti-presión de **Pillar 4**).

### Sprint 11
Mecánicas cross-grupo (intermatrimonio, deriva dinástica, maldiciones
con costes por niveles).

---

## v0.4 — Generative Chronicle

### Sprint 12
Integración LLM (Claude/Gemini) en la capa de crónica. El `.env.example`
ya lo insinúa. Voz partisana mantenida vía system prompt.

---

## v1.0 — Feature-complete single-player

### Sprint 13 — Export & Share
Exportar el códice a PDF o HTML. Compartir semillas para que otros
repliquen tu mundo. Analytics básicos sobre qué pilares sostienen.

→ **v1.0 feature-complete single-player game.**

---

## Más allá (no son sprints sueltos, son esfuerzos aparte)

- **Sprints 14-17:** Más eras (Clásica, Medieval) + mecánicas asociadas.
- **Sprints 18-20:** Eras Industrial + Atómica (dilema nuclear final).
- **v2.0:** Multijugador — probablemente 8-12 sprints por sí mismo.

---

## 🔍 Realidades honestas

- **Sprints 2 y 10 son los más duros.** El ciclo de vida toca todo; la
  toma de decisiones del dios IA es conceptualmente complicada porque
  tiene que sentirse como un par, no como un oponente.
- **Sprints 8-11 (v0.2 + v0.3)** es donde el proyecto pasa de "prototipo
  interesante" a "juego de verdad". Si la motivación flaquea, flaqueará
  aquí. Presupuestar en consecuencia.
- **13 sprints hasta v1.0** son aproximadamente 6-12 meses de trabajo a
  tu ritmo. La era Atómica + todo el contenido es otro año por encima.
- **No hacer v0.4 (crónica con LLM) antes de v0.3.** Tentador porque es
  glamuroso, pero sin dioses rivales la crónica no tiene nada dramático
  que narrar.
