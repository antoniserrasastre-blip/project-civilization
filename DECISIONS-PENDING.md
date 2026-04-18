# Decisiones del Director Creativo — Registro histórico

## v1.0.1 — Resuelto ✅

Cinco decisiones de diseño capturadas y resueltas en la rama
`claude/v1.0.1-polish`. Ver `VERSION-LOG-v1.0.1.md` para balance
completo, perspectiva del jugador y flags de supervisión.

| # | Pregunta | Opción elegida | Implementación |
|-|-|-|-|
| 1 | Cap/decay de Fe | **A** cap duro 500 | `lib/faith.ts` + clampFaith en scheduler |
| 2 | NPCs con sexo | **A** binario M/F | `lib/world-state.ts` + schema v4 + pairing hetero |
| 3 | Limbo del veredicto | **C** victoria pírrica | `lib/verdict.ts::computeVerdict` |
| 4 | Simetría rival | **B** conceden dones, no maldicen | `lib/rival-ai.ts` + evento `rival_grant_gift` |
| 5 | Dilema nuclear | **A** decisión simple | `lib/nuclear.ts` + `NuclearDilemmaModal` |

Plus: balance de conflicto (`CONFLICT_BASE_PROB_PER_TICK` 0.0015 →
0.0005) descubierto por la suite de coherencia — conflictos dejan
de dominar las muertes.

## Flags pendientes para v1.1+

- 🟡 **Microconsecuencia nuclear** (v1.4): añadir tech
  `radiacion_ambiental` en era industrial que degrade stats del
  pueblo. Hoy la decisión nuclear es narrativa-pura; la propuesta
  del Director es darle coste mecánico previo.
- 🟡 **Rival puede sostenerse en cap**: un rival aggressive + chosen
  completos puede llegar a gastar en "nada" (grant repetido de dones
  ya concedidos). Playtest decide si añadir curses al rival (flag
  del bloque #4 que quedó en B).
- ⚠️ **No hay migración de saves v3 → v4**. Decidido por diseño: el
  determinismo del seed no permite añadir `sex` retroactivamente sin
  romper replays.

## Formato de decisiones futuras

Cuando aparezcan nuevas preguntas de diseño que bloqueen un sprint,
se crea un bloque nuevo aquí siguiendo el patrón de v1.0.1 (contexto
breve + 3 opciones + default + espacio para marca). Resueltas las
decisiones, se implementan con TDD y se archivan en este mismo
documento como "Resuelto ✅".
