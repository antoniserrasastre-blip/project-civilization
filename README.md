# GODGAME (Proyecto Civilización)

Motor determinista de simulación de civilizaciones. El jugador es un dios observador sobre los **Hijos de Tramuntana** en un archipiélago balear-ficticio.

## Documentación del Proyecto

- **`ROADMAP.md`**: Estado vivo + fuente de verdad estratégica. Qué está hecho y qué falta.
- **`vision-primigenia.md`**: Anexo editorial que define la identidad, sistemas base y fases de la era actual (durable).
- **`CLAUDE.md`**: Instrucciones de trabajo para el agente (contratos deterministas §A4, reglas técnicas).

> Tras la "Poda Burocrática" (ver ROADMAP) este proyecto es deliberadamente ligero: tres documentos, sin sprints ni bandejas de decisiones. Si lo lees y no existe, es que se podó a propósito.

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
