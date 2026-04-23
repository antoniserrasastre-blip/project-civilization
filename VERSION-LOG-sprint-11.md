# VERSION LOG — Sprint 11: Drafting Sistémico

**Fecha**: 2026-04-23
**Estado**: ✅ Shipped (contract-complete)

## Qué hace esta versión
Implementa la fase de Génesis de la civilización. El jugador ya no empieza con un grupo predefinido, sino que debe draftear a sus 14 fundadores (4 Elegidos + 10 Ciudadanos) gestionando un presupuesto unificado de puntos y asignando rasgos que alteran la lógica de la simulación.

### Cambios Clave
- `lib/traits.ts`: Catálogo de 6 rasgos iniciales (Glotón, Nocturno, Fuerte, Torpe, etc.) con costes y modificadores de stats.
- `lib/scenarios.ts`: Sistema de escenarios de inicio (Náufragos, Éxodo) que definen el spawn y recursos iniciales.
- `lib/drafting.ts`: Refactor completo para soportar el presupuesto de 15 puntos y la inyección de rasgos en el objeto NPC.
- `tests/design/draft-chaos.test.ts`: Suite de estrés que valida el colapso de clanes mal diseñados.

## Perspectiva del Jugador
1. **Primer minuto**: El jugador se enfrenta a la pool de 30 candidatos. Debe decidir si prefiere un líder fuerte pero glotón o varios seguidores mediocres pero eficientes.
2. **Quinto minuto**: El clan desembarca en el escenario elegido (ej: Náufragos en la costa). El jugador observa cómo los rasgos elegidos afectan a los primeros ticks (ej: el Nocturno se queda durmiendo mientras los demás recolectan).
3. **Cuándo sonríe**: Cuando logra una "build" de clan que sobrevive a los primeros 10 días gracias a una sinergia de rasgos que él mismo diseñó.
4. **Cuándo se aburre o frustra**: Si agota el presupuesto demasiado pronto y se ve obligado a elegir NPCs con rasgos negativos muy pesados para completar los 14 slots.

## Balance
- **Presupuesto**: 15 puntos unificados para los 4 Elegidos.
- **Rasgos**: Los rasgos negativos como *Glotón* (-4 pts) son esenciales para permitir rasgos de élite como *Fuerte* (+5 pts).

🚩 **Flags**:
- Los rasgos de nacimiento son permanentes; los rasgos de milagro (Fase 5) deberán convivir en el mismo array `traits: string[]` con un cap de 3 activos.
- El escenario "Náufragos" aumenta la dificultad inicial al eliminar la madera del inventario de arranque.
