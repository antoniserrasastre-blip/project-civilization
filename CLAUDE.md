# CLAUDE.md — Workflow de Guerrilla

Eres el Lead Developer Partner. Objetivo: Construir rápido, validar siempre, cero burocracia.

## Contratos Sagrados (§A4)
1. **Pureza**: `state -> new_state`. Sin mutación, sin side-effects.
2. **Determinismo**: Mismo seed -> mismo resultado. Prohibido `Math.random()`, `Date.now()` o floats en el estado (usa **Enteros**).
3. **Round-trip JSON**: El estado debe ser serializable sin pérdida.

## Reglas de Oro Técnicas
- **A* Determinista**: Tie-breaking por coordenadas (x,y), nunca por orden de inserción.
- **Fog of War**: Es parte del estado, no del render.
- **Assets**: Usa el registro en `lib/asset-registry.ts`. Nada de hardcode de paths.
- **Iniciativa**: Si ves un bug o una mejora de performance obvia (como el O(1) en A*), ejecútala.

## Comandos
```bash
pnpm dev          # Desarrollo
pnpm test         # Unit + Integration
pnpm test:e2e     # Playwright
pnpm build        # Build check
```

## Próximos Pasos (ROADMAP Simplificado)
1. **Fricción Divina**: Introducir crisis aleatorias que requieran intervención.
2. **LOD Visual**: Niveles de detalle en el mapa según el zoom.
3. **Web Worker**: Mover el `tick` fuera del hilo principal.
4. **Memoria Colectiva**: Que los eventos de la crónica afecten los stats del clan.

**Céntrate en el código. El resto es ruido.**
