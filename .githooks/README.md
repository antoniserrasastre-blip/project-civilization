# .githooks

Git hooks versionados del repo. Por defecto git busca hooks en
`.git/hooks/` (no versionado por clon). Para que todo el equipo / todos
los agentes reciban los hooks al clonar, viven aquí.

## Setup (una vez por clon)

```bash
git config core.hooksPath .githooks
```

Sin este comando git ignora la carpeta. No es automático por diseño de
git: `core.hooksPath` vive en `.git/config` de cada clon.

Para verificar:

```bash
git config --get core.hooksPath  # debe devolver: .githooks
```

## Hooks activos

### `post-commit` — auto-push a GitHub

Tras cada `git commit` en una rama cualquiera, hace `git push
origin <rama>` automáticamente. Esto materializa la instrucción del
Director humano del 2026-04-21: *"todo lo que haga en esta sesión y
con este repo se va directo a github"*.

Se salta (exit 0 silencioso):

- Durante `rebase` / `cherry-pick` / `merge` en curso — evita el spam
  de pushes intermedios. El push final se hace manual tras completar
  el flujo.
- En detached HEAD — no hay rama donde pushear.

Si el push falla (sin red, rechazado, upstream ausente), el commit
local queda intacto y el hook imprime aviso. Reintenta con el
siguiente commit o con `git push` manual.

## Desactivar temporalmente

Si necesitas un commit local *sin* empujarlo:

```bash
chmod -x .githooks/post-commit
git commit -m "wip: cosa sucia"
chmod +x .githooks/post-commit
```

O bien:

```bash
git config --unset core.hooksPath  # desactiva todos los hooks versionados
# ... commit local ...
git config core.hooksPath .githooks  # reactiva
```
