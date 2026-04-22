# `agents/`

Cada subcarpeta aquí es un **agente** que trabaja sobre este repo. Un
agente es una unidad con su propio prompt, su propio scope de tareas y
sus propios artefactos (memoria, configuración, notas de sesión).

## Estado actual

Ahora mismo este repo tiene **un solo agente activo**: Claude Code
ejecutando el `ROADMAP.md` del motor GODGAME. No vive bajo `agents/`
porque su código de aplicación es la raíz del proyecto (Next.js,
`lib/`, `tests/`, `app/`, etc.).

`agents/` queda listo como slot para agentes adicionales cuando
aparezcan (p. ej. `agents/balancer/` para tunear economía, o
`agents/narrador/` para pipelines de crónica). Cuando se cree uno:

1. Nueva carpeta `agents/<nombre-agente>/`.
2. Dentro, su propio `CLAUDE.md` con prompt y reglas específicas
   del agente (hereda del `CLAUDE.md` raíz, no lo duplica).
3. Artefactos del agente (notas, prompts, configs) viven **sólo**
   ahí. No contaminan la raíz.

## Convenciones

- **Nombre de carpeta** en kebab-case, corto y descriptivo del
  rol: `balancer`, `narrador`, `reviewer`, no `agente1`.
- **Un `CLAUDE.md` por agente** con su contrato propio. Las reglas
  globales (no push a main, PR obligatorio, gate de tests) viven en
  el `CLAUDE.md` raíz y se respetan sin redocumentar.
- **Código compartido** va a `shared/` o a `lib/` (núcleo §A4),
  nunca duplicado dentro de `agents/<x>/`.
