# `docs/`

Documentación transversal del repo.

## Qué va aquí

- Guías de workflow cross-agente (onboarding, estructura del repo,
  convenciones de PR).
- Documentos de referencia que no son sprint-específicos ni
  contrato-de-agente (esos van a `CLAUDE.md` raíz o al `CLAUDE.md`
  del agente).
- Diagramas, capturas, notas técnicas de largo alcance.

## Qué NO va aquí (por ahora)

Los siguientes documentos **siguen en la raíz** porque `CLAUDE.md`,
scripts, tests y vision los referencian por path absoluto desde raíz,
y moverlos rompería esas referencias sin beneficio real:

- `ROADMAP.md`, `ROADMAP-primigenia.md`, `SPRINTS-primigenia.md`
- `VERSION-LOG-*.md`, `NOTES-OVERNIGHT.md`
- `CLAUDE.md`, `CLAUDE-primigenia.md`, `CLAUDEDIRECTOR.md`
- `REVIEW-ensamblaje.md`, `DECISIONS-PENDING-primigenia.md`
- `vision-primigenia.md`

Si en el futuro se decide moverlos aquí, hay que actualizar:
`CLAUDE.md` (secciones "Fuentes de verdad" y "Estructura"),
`scripts/*`, imports de tests, y cualquier enlace interno entre docs.

## Convenciones

- Markdown plano, sin frontmatter salvo necesidad concreta.
- Nombres en kebab-case minúscula: `workflow-monorepo.md`,
  no `WorkflowMonorepo.md`.
- Comentarios y prosa en castellano (consistente con el resto del repo).
