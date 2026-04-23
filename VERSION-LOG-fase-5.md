# VERSION LOG — Fase 5: Susurro, Fe y Gratitud

**Fecha**: 2026-04-23
**Estado**: ✅ Shipped (contract-complete)

## Qué hace esta Fase
Implementa el "Verbo del Dios" definitivo. El jugador ya no está atado a un pulso diario forzoso, sino que dispone de un **susurro persistente** que consume **Fe**. La **Gratitud** emerge de la prosperidad del clan y permite realizar milagros individuales sobre NPCs drafteados.

### Cambios Clave
- `lib/faith.ts`: Economía de Fe determinista (`sqrt(vivos)`). Coste 80 por cambio, 40 por silencio.
- `lib/gratitude.ts`: Sistema de pool de gratitud con generación por eventos positivos (saciedad, socialización, nacimientos).
- `WhisperSelector.tsx`: Interfaz de selección de las 6 intenciones (§3.7).
- `lib/miracles.ts`: Los 5 milagros potentes (Hambre sagrada, Ojo de halcón, etc.) operativos.

## Perspectiva del Jugador
1. **Primer minuto**: El jugador observa el clan en silencio (gracia de 7 días). Decide su primer susurro ("Encuentro") para que busquen recursos juntos. El coste es 0 por ser el primero.
2. **Quinto minuto**: La barra de Fe se llena lentamente. Al ver que el clan tiene hambre, el jugador gasta 80 de Fe para cambiar el susurro a "Coraje". El clan interpreta esto como una señal para cazar.
3. **Cuándo sonríe**: Cuando un NPC herido es sanado por el primer milagro de "Hambre sagrada" financiado con la gratitud acumulada tras una semana de buena gestión.
4. **Cuándo se frustra**: Cuando intenta cambiar el susurro dos veces seguidas y se da cuenta de que la Fe es un recurso escaso que requiere paciencia.

## Balance
- **Generación Fe**: `sqrt(14) ≈ 3.7` por día. Se necesita ~21 días in-game para un cambio (80 Fe) sin bonificaciones.
- **Gratitud**: Ajustada para permitir el primer milagro barato (~30) en el tercer o cuarto día de alineación perfecta.
- **Herejía**: El silencio prolongado (más de 7 días) empieza a drenar gratitud.

🚩 **Flags**:
- El rate de gratitud puede ser demasiado generoso en clanes de 14 NPCs. Monitorizar en playtest 1.5.
- La distinción entre "silencio por default" y "silencio elegido" debe ser clara en la UI.
