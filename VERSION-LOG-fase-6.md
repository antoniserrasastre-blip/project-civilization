# VERSION LOG — Fase 6: Monumento y Transición

**Fecha**: 2026-04-23
**Estado**: ✅ Shipped (contract-complete)

## Qué hace esta Fase
Cierra el loop de la primera era. Una vez que el clan es próspero y estable, surge la necesidad de honrar a su divinidad. El **Monumento** es el proyecto final que permite elegir una **Bendición de Aldea** y transicionar a la Era Tribal.

### Cambios Clave
- `lib/monument.ts`: Lógica de desbloqueo (5 crafteables + 10 noches + linajes).
- `lib/monument.ts`: Proceso de construcción costoso (200 piedra, 50 leña, 60 días-hombre).
- `lib/game-state.ts`: Función `transitionToTribal` que cambia de era preservando el legado pero reseteando lo volátil (Decisión #33-B).
- `components/era/GameShell.tsx`: Soporte para el estado 'built' del monumento.

## Perspectiva del Jugador
1. **Primer minuto**: El jugador revisa los requisitos del monumento. Ve que le faltan "Pieles" y "Despensa".
2. **Quinto minuto**: El monumento está en fase 'building'. El jugador ve cómo los NPCs vivos restan horas-hombre al proyecto cada tick.
3. **Cuándo sonríe**: Cuando el monumento se completa, el mapa hace un zoom-out dramático y aparece el selector de la primera Bendición de Aldea (ej: *Bendición de la Fertilidad*).
4. **Cuándo se frustra**: Cuando una muerte masiva por hambre reduce el número de trabajadores por debajo de 3 y el monumento colapsa en 'ruina'.

## Balance
- **Coste**: 200 de piedra es un reto logístico que obliga al clan a agotar canteras locales y moverse.
- **Transición**: La era tribal hereda los NPCs y la bendición, pero empieza con 0 gratitud para resetear la economía de la nueva era.

🚩 **Flags**:
- La cinemática de transición es un placeholder técnico. Necesitará pulido visual en la Fase 7.
- Verificar que el monumento como 'reliquia' sea visible en el mapa de la era tribal.
