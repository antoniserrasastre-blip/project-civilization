---
tipo: draft-ajustes-branch
estado: propuesta del Director — pendiente integración en rama origen
fecha: 2026-04-22
target: rama `claude/setup-monorepo-workflow-aSzkl` (commits d7bb3b6 + cd6e633)
base: main @ 2ff093f
---

# DRAFT — Tres ajustes al branch monorepo+agentes

La rama `claude/setup-monorepo-workflow-aSzkl` propone estructura de
monorepo y tres roles (Ingeniería / Diseño / Edición). Con 4 agentes
concurrentes previstos por el Director humano, el branch es mergeable
**tras tres ajustes**. Este DRAFT los especifica.

El autor de la rama (o quien haga el rebase) integra los 3 cambios,
rebasea sobre main, y reabre PR. Sin los 3, el Director rechaza
merge.

---

## Ajuste 1 — Añadir 4º rol "Director Creativo" + reconciliar con `CLAUDEDIRECTOR.md`

El branch inventa "Edición" sin mencionar `CLAUDEDIRECTOR.md`, que
ya define el rol editorial desde ayer con contrato firmado (§Auditoría
técnica, 118 líneas). Superposición no resuelta = doble fuente de
verdad sobre quién revisa qué.

**Resolución**: añadir 4º rol explícito + redefinir "Edición" como
saneamiento técnico (no editorial).

### Texto a insertar en CLAUDE.md §"Agentes especializados"

Inserción tras la sección "### 3. Edición" y antes de "### Reglas
anti-conflicto entre roles":

```markdown
### 4. Director Creativo

**Responsabilidad**: guardián de la visión. Firma decisiones §A4
irreversibles. Redacta DRAFTs editoriales para firma humana. Audita
PRs de los otros tres roles desde la perspectiva "¿esto cumple la
visión firmada?". Protocolo completo en `CLAUDEDIRECTOR.md` — este
punto es resumen, no contrato.

**Puede tocar**:
- `vision-*.md`, `CLAUDEDIRECTOR.md`, `DECISIONS-PENDING-*.md`,
  `REVIEW-*.md`, `DRAFT-*.md`, bloques `> [Director]:` en
  `NOTES-OVERNIGHT.md`.
- `ROADMAP-*.md` y `SPRINTS-*.md` cuando hay firma que actualizar
  (adendas, cambios de orden, nuevas decisiones §A4).
- Commits al `CLAUDE.md` y `CLAUDE-primigenia.md` cuando afectan
  contrato editorial (no cuando afectan código).

**NO puede tocar**:
- `lib/**`, `components/**`, `tests/**`. Cero. Si el Director detecta
  bug o regresión, abre handoff `[director→eng]` — no parchea.
- Assets o tokens visuales (territorio de Diseño).

**Método**: hold-the-line editorial. Bloquea merges que contradigan
la visión o que introduzcan contratos §A4 sin firma. No escribe
código.

---
```

### Texto a reemplazar en sección "### 3. Edición"

El párrafo **Responsabilidad** actual:

> **Responsabilidad**: calidad y consistencia transversal. Revisa lo
> que los otros dos producen. Caza errores obvios, duplicación,
> comentarios muertos, inconsistencias de voz/nomenclatura, warnings
> residuales, drift entre docs y código. Es el ojo frío que cierra
> PRs para merge.

Se reemplaza por:

> **Responsabilidad**: saneamiento técnico transversal. Typos,
> lints, imports huérfanos, warnings, inconsistencias de
> nomenclatura técnica, drift obvio entre docstrings y firmas.
> **No es revisión editorial** — esa pertenece al Director Creativo
> (§4). Edición es el ojo que limpia; Director es el ojo que firma.

Y al final de la sección añadir:

> **Relación con Director Creativo**: Edición no corrige prosa de
> `vision-*.md`, `DECISIONS-*.md`, `REVIEW-*.md` ni docs de firma.
> Si ve un typo en uno de esos, abre handoff `[edit→director]`.

---

## Ajuste 2 — Matriz de compatibilidad entre sprints concurrentes

El branch habilita 4 agentes trabajando en paralelo pero no dice qué
pares de sprints pueden correr al mismo tiempo. Con el queue actual
hay colisiones reales (STORAGE_KEY, componentes compartidos).

### Texto a añadir en `SPRINTS-primigenia.md` §"Totales"

Tras el párrafo "Paralelizable tras cerrar #1 y #1.5..." (ya existente),
insertar subsección nueva:

```markdown
### Matriz de compatibilidad concurrente

Cuando hay múltiples agentes activos, esta tabla define qué sprints
pueden correr en paralelo y cuáles no. Pares no listados son ✅
(territorios disjuntos).

| Par | Status | Razón |
|-|-|-|
| #1 ↔ #4 | ❌ serial | Ambos bumpean `STORAGE_KEY`. Uno a la vez. #4 arranca tras merge de #1. |
| #1 ↔ #6 | ❌ | #6 bloqueado por firma decisión #34. No aplica. |
| #1 ↔ #7 | ❌ | #7 depende de #6. |
| #5 ↔ #6 | ❌ | Ídem #6 bloqueado. |
| #6 ↔ #7 | ❌ | #7 depende de #6. |
| #1 ↔ #2 | ⚠️ coordinar | Ambos tocan `components/era/WhisperSelector.tsx` (#1 lo renombra, #2 añade tooltips). #2 arranca idealmente tras #1. |
| #1 ↔ #3 | ⚠️ coordinar | Ambos tocan `components/era/GameShell.tsx` y `HUD.tsx`. Rebases frecuentes o serializar. |
| #2 ↔ #3 | ⚠️ coordinar | Comparten `GameShell.tsx`. |
| #4 ↔ #5 | ⚠️ coordinar | Comparten `components/map/MapView.tsx`. |

**Regla derivada**: dos ❌ no arrancan al mismo tiempo bajo ningún
concepto. Dos ⚠️ pueden arrancar en paralelo si los agentes acuerdan
explícitamente (comentario en NOTES-OVERNIGHT.md bajo bloque
`> [Coordinación N↔M]:`). Cualquier par ✅ corre libre.
```

---

## Ajuste 3 — Borrar placeholders vacíos + reemplazar por 3 líneas

Los directorios `agents/`, `shared/`, `docs/` con README placeholder
violan YAGNI y el propio principio del `CLAUDE.md` (*"Don't design
for hypothetical future requirements"*). Se borran y se sustituyen
por una línea en CLAUDE.md que los menciona como slot futuro.

### Cambios concretos

1. **Borrar ficheros**:
   - `agents/README.md`
   - `shared/README.md`
   - `docs/README.md`
   (Los directorios desaparecen automáticamente al quedar vacíos.)

2. **Añadir en CLAUDE.md** al final de la sección "Agentes
   especializados" (tras "Reglas anti-conflicto entre roles"):

```markdown
### Extensión multi-agente — slots diferidos

Cuando aparezca un segundo agente con scope persistente distinto
(p.ej. `balancer` tuneando constantes, `narrador` curando crónica
LLM-generada), se crea `agents/<nombre>/` con su propio `CLAUDE.md`
hijo del raíz. Hasta que exista el primero, esas carpetas **no**
se pre-crean. Código común entre agentes vive en `shared/` cuando
haya al menos dos consumidores — mientras tanto, no existe.
Docs transversales de workflow van a `docs/` cuando haya al menos
uno — mientras, viven en la raíz.

Este repo sigue siendo **monorepo**; lo que cambia con agentes
nuevos es dónde cuelgan los subárboles, no la raíz.
```

---

## Cómo aplicar

El autor de la rama `claude/setup-monorepo-workflow-aSzkl`:

1. Pull main (incluye este DRAFT).
2. Leer este documento.
3. Rebasear la rama sobre main @ `2ff093f`.
4. Aplicar los 3 ajustes como commits individuales:
   - `docs(CLAUDE.md): añadir rol Director Creativo + redefinir Edición`
   - `docs(SPRINTS): matriz de compatibilidad concurrente`
   - `docs: borrar placeholders agents/ shared/ docs/ y reemplazar por mención diferida`
5. Push + reabrir PR contra main.
6. Borrar este DRAFT (`drafts/DRAFT-ajustes-monorepo.md`) en el mismo
   PR — deja de ser necesario una vez integrado.

Director audita el PR resultante. Si los 3 ajustes están fielmente
integrados, firma. Si hay desviación, nuevo round de review.

Alternativa si el autor no responde: otro agente (o Director) hace
fork del branch, aplica el DRAFT, reabre PR en nombre del workflow.
