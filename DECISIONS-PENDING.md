# Decisiones pendientes del Director Creativo

> Antes de abrir v1.1 — responde a los 5 bloques de abajo. Cada uno
> bloquea código concreto: sin tu respuesta, el siguiente sprint se
> construye sobre un supuesto (y eso es barro).

Formato: lee, marca una opción (A/B/C), añade comentarios si quieres.
Yo implemento los cambios del bloque con TDD en el sprint siguiente.

---

## 1. 🟡 Cap/decay de Fe

**Hoy**: `faith_points` crece sin tope. A 100× con varios descendientes,
puede superar 1000 Fe en 30 min reales. Esto inflaciona la economía.

**Opciones**:
- **A. Cap duro** (p.ej. `faith_points ≤ 200`). Sencillo, invita a
  gastar. Riesgo: convierte la Fe en "úsala-o-piérdela", menos
  contemplativa.
- **B. Decay suave** (p.ej. −1% por día si no se gasta en X ticks).
  Más orgánico pero añade botón oculto de "tiempo es oro".
- **C. No tocar**. La acumulación es "recompensa por paciencia";
  jugadores que acumulen mucho simplemente tienen opciones épicas.

**Default sugerido**: **A** con cap alto (~500 Fe) — permite un
`curse_fatal` (150) sin vaciarte pero limita hoarding infinito.

**Marca**: [A / B / C] · Comentario:

---

## 2. 🟡 NPCs tienen sexo/género o siguen siendo asexuales

**Hoy**: los NPCs no tienen atributo de sexo. Pairing ignora género y
cualquier par fértil puede engendrar (modelo simplificado).

**Opciones**:
- **A. Binario {M, F}** asignado al nacer, pairing requiere M+F. Más
  realista, abre ritual/cultura de género en mecánicas futuras.
- **B. Ternario {M, F, X}** con X fértil con ambos. Inclusivo, más
  combinaciones, pero añade complejidad sin ROI narrativo claro.
- **C. Sin sexo** (mantener). Simplicidad, paridad implícita. Pierde
  un eje dramático (matrilinealidad/patrilinealidad, dinastías).

**Default sugerido**: **A**. Pairing binario es el modelo que CK3,
Crusader Kings, y Dwarf Fortress usan como base. Fácil de extender a
X o roles no-reproductivos si aparece demanda.

**Marca**: [A / B / C] · Comentario:

---

## 3. 🟡 Veredicto "limbo" — Elegido solo sin linaje

**Hoy**: `lineageInTop3` devuelve `true` si el Elegido está en top-3,
aunque no tenga descendientes ni seguidores vivos. Un Elegido solitario
en top-3 cuenta como **victoria**.

**Opciones**:
- **A. Mantener** (victoria). "Estar ahí" basta; la influencia del
  Elegido es suficiente para reinar.
- **B. Cambiar a empate/neutro** si solo el Elegido está vivo de su
  linaje. "Reinar en el vacío" no es reinar.
- **C. Victoria pírrica** — nueva categoría del veredicto, UI lo
  muestra como tercer estado ("reinaste, pero tu linaje se extingue").

**Default sugerido**: **C**. Es la mecánica más narrativa de las tres;
el jugador entiende el matiz. Coste: más test + UI.

**Marca**: [A / B / C] · Comentario:

---

## 4. 🟠 Simetría rival — ¿los rivales conceden dones y maldicen?

**Hoy**: el dios rival solo unge. No concede dones ni maldice. El
jugador tiene 3 acciones (anoint + grant gift + curse), el rival
tiene 1.

**Opciones**:
- **A. Simetría plena**. Rival acumula Fe, gasta en dones a sus
  Elegidos y maldiciones a los nuestros. Pelea real entre dioses.
- **B. Simetría parcial**. Rival concede dones (acumula su Fe y la
  usa), pero NO maldice. La agresión activa queda como privilegio
  del jugador.
- **C. Mantener asimetría**. El rival es un "árbitro pasivo" del
  mundo; solo define a quién mira. El jugador es la única fuerza
  activa del relato.

**Default sugerido**: **B**. La mejor relación complejidad/impacto:
el rival se siente vivo (te manda surprise gifts a su Elegido) pero
no se convierte en un adversario de ping-pong. Maldiciones rivales
son mecánica de v2 multijugador.

**Marca**: [A / B / C] · Comentario:

---

## 5. 🔴 Dilema nuclear — cierre de era atómica

**Hoy**: era atómica tiene UNA tech placeholder (`fision_nuclear`) y
ninguna mecánica asociada. El `ROADMAP.md` original prometía un
"dilema nuclear final" como cierre narrativo de v1.4.

**Opciones**:
- **A. Decisión-del-Elegido**. Cuando se descubre `fision_nuclear`,
  aparece un modal preguntando al jugador: "¿Concedes la tecnología
  de destrucción a tu pueblo?" SÍ→victoria inmediata pero derrota
  narrativa; NO→el rival la consigue en 5 min.
- **B. Carrera**. Todos los dioses compiten por descubrirla primero;
  el primero que la tiene activa "cuenta atrás" — si nadie se
  retracta en X minutos, todos los grupos mueren a la mitad.
- **C. Cerrar sin dilema**. La era atómica es simbólica; al entrar
  aparece un modal "La historia termina" y punto. Evita diseño
  complejo por ahora.

**Default sugerido**: **A**. Respeta el ROADMAP, es la mecánica
mínima para que el juego tenga cierre narrativo. B es más
interesante pero pide 2-3 sprints adicionales.

**Marca**: [A / B / C] · Comentario:

---

## Si contestas los 5...

Preparo una rama `claude/v1.0.1-polish` con implementación TDD de los
cambios. Commit + PR a main. Tiempo estimado: 1 sesión (2-3h reales
míos). Después de eso, v1.1 arranca sobre terreno firme.

Si marcas solo algunos, se implementa lo que haya decidido y el resto
queda en `DECISIONS-PENDING.md` para siguiente iteración.
