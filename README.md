# GODGAME (Proyecto Civilización)

Motor determinista de simulación de civilizaciones. El jugador es un dios observador sobre los **Hijos de Tramuntana** en un archipiélago balear-ficticio.

## Documentación del Proyecto

- **`vision-primigenia.md`**: Anexo editorial que define la identidad, sistemas base y fases de la era actual.
- **`ROADMAP.md`**: Fuente de verdad estratégica. Define las fases de desarrollo y criterios de cierre globales.
- **`SPRINTS.md`**: Cola táctica de ejecución. Contiene los sprints activos y el historial de trabajo.
- **`DECISIONS-PENDING.md`**: Bandeja de decisiones de diseño pendientes de firma por el Director Creativo.
- **`CONVENTIONS.md`**: Convenciones técnicas específicas para la arquitectura determinista del proyecto.
- **`CLAUDE.md`**: Instrucciones maestras para los agentes (Ingeniería, Diseño, Edición, Director).
- **`CLAUDEDIRECTOR.md`**: Instrucciones específicas para el rol de Director Creativo.

## Metodología

El desarrollo sigue un **TDD estricto** y un motor 100% determinista (§A4):
1. **Pureza**: El estado es inmutable.
2. **Determinismo**: Mismo seed → misma trayectoria byte a byte.
3. **Round-trip JSON**: El estado es serializable sin pérdida.

## Comandos

```bash
pnpm install
pnpm dev              # Inicia el entorno de desarrollo
pnpm test             # Ejecuta la suite de tests unitarios e integración
pnpm test:e2e         # Ejecuta los tests de extremo a extremo (Playwright)
pnpm build            # Genera la build de producción
pnpm lint             # Sanea el código (ESLint)
```

---
> [!IMPORTANT]
> Nunca se debe realizar un commit sin pasar el gate de tests (`pnpm test`, `tsc`, `lint`, `build`).
