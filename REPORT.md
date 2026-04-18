# Reporte final — sesión overnight

> Fecha del informe: 18 de abril de 2026
> Rama principal: `claude/update-claude-md-mPM1k`
> Rama exploratoria: `claude/v2-roadmap`

---

## TL;DR

- **v1.0 single-player feature-complete SHIPPED** en la rama principal.
  230 unit+integration tests + 26 E2E en verde. Build limpio.
- **v1.3 en rama provisional** `claude/v2-roadmap` con 4 eras nuevas
  (clásica → industrial) + esqueleto de ejércitos abstractos. 252
  tests en verde.
- **7 VERSION-LOG-*.md** con perspectiva de jugador, análisis de
  balance y flags de decisiones humanas pendientes (uno por versión
  mayor).
- **CLAUDE.md** actualizado con la metodología de sesiones autónomas
  + TDD + Polish pass + version logs.
- **Flags rojos (bloqueantes)**: 2. **Flags ámbar (de diseño)**: ~14.
  Detalle abajo.

## Qué se construyó (commits nuevos)

Rama principal, de más reciente a más antiguo:

```
d48ea83 polish: v1.0 + version logs + CLAUDE.md metodología enriquecida
1759e60 sprint 13: export HTML + compartir semillas = v1.0 shipped
6b26cb7 polish: v0.4 wiring — endpoint stub + persistencia + hook fix
2ebd3ec sprint 12: chronicle provider layer (template + mock-llm + claude stub)
e85e42d polish: v0.3 debug + balance pass
2bb67fe sprint 11: cross-group pairing + deriva dinástica + maldiciones
02dd3f2 sprint 10: IA dioses rivales con ciclo de decisión anti-presión
a7d305f sprint 9: selector de 3 grupos + multi-grupo + e2e helpers
1c7132e sprint 8: segunda era + sistema de tecnología
```

Rama `claude/v2-roadmap`:

```
975351c v2 rama: sprints 14-17 — contenido post-v1.0 + VERSION-LOG-v1.3
```

## Estado del repo

### Métricas

| Métrica | Valor |
|-|-|
| Tests unitarios + integración | **230** (main) · **252** (v2) |
| Tests E2E (Playwright) | **26** (main) · **26** (v2) |
| Files in `lib/` | 15 módulos puros |
| Files in `app/` | 1 page + 1 api route + 2 layout |
| Files in `components/` | 1 map-view + shadcn primitives |
| Files in `tests/` | 20 unit + 4 integration + 10 e2e |
| Docs raíz | CLAUDE.md, ROADMAP.md, ROADMAP-v2.md, REPORT.md, NOTES-OVERNIGHT.md, VERSION-LOG × 6 |

### Pilares del Vision Document (sostenidos al cierre de v1.0)

| Pillar | Estado | Soporte testeable |
|-|-|-|
| 1 · Mismo don, distinto resultado | ✅ | `tests/integration/pillar-1.test.ts` |
| 2 · Mundo cambia sin tocarlo | ✅ | `tests/integration/long-run.test.ts` 18k ticks |
| 3 · Fe como economía narrativa | ✅ | `tests/unit/faith.test.ts` — 3 verbos |
| 4 · Anti-presión del dios rival | ✅ | `lib/rival-ai.ts` — ciclo 500 días |
| 5 · Linaje reina | ✅ | `tests/unit/verdict.test.ts` top-3 |

### Estructura conceptual

```
lib/ (núcleo puro)
├─ prng.ts            · PRNG funcional seedable
├─ world-state.ts     · Tipos + initialState (multi-grupo opcional)
├─ simulation.ts      · tick() compone scheduler + applyEvents
├─ scheduler.ts       · 9 pases: lifecycle + fe + tech + IA rival
├─ rival-ai.ts        · ciclo decisión dioses rivales
├─ anoint.ts          · ungir
├─ gifts.ts           · Fuerza Sobrehumana, Aura de Carisma + coste
├─ curses.ts          · 3 niveles + only-rival-group
├─ tech.ts            · TECH_POOLS por era + transición
├─ verdict.ts         · influencia + top-3 + lineageInTop3
├─ chronicle.ts       · plantillas partisanas
├─ chronicle-provider.ts · 3 providers (template, mock-llm, claude)
├─ tutorial.ts        · fases del onboarding
├─ export.ts          · TXT + HTML + shareUrl
├─ persistence.ts     · localStorage round-trip (v3)
└─ map.ts             · costa sine-wave determinista

app/
├─ page.tsx           · dashboard completo
├─ api/chronicle/enhance/route.ts · endpoint LLM stub
└─ (layout, globals.css)

components/map-view.tsx · SVG: costa + NPCs + halo + símbolos hand-drawn
```

## Flags para supervisión humana

### 🔴 Rojos (bloqueantes de siguiente versión)

1. **API key pegada en chat** — revocar en
   [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
   ya. Quedó en historial de la sesión.
2. **Dilema atómico sin diseño** (v1.3, v2.0) — la era atómica no
   tiene mecánica narrativa. ROADMAP original habla del "dilema
   nuclear final" como pieza de cierre del single-player. Requiere
   decisión de diseño antes de implementarse. Detalle en
   `VERSION-LOG-v1.3.md`.

### 🟡 Ámbar (decisiones de diseño — no bloquean pero la siguiente
versión se construye sobre este terreno)

3. **LLM Claude real**: endpoint stub + provider listo. Para activar
   ver checklist en `VERSION-LOG-v0.4.md` (env var + fetch + rate
   limit + batching). Budget de tokens a decidir.
4. **Ejércitos abstractos no cableados** (`lib/army.ts` existe pero
   el scheduler no los usa). Requiere decisión: ¿el rival IA declara
   guerras con cierta probabilidad? ¿batallas son recurrentes o
   únicas? `VERSION-LOG-v1.3.md`.
5. **Rivales asimétricos**: hoy el rival solo puede ungir; no concede
   dones ni lanza maldiciones. Para que el juego sea un diálogo
   pleno, hay que darles esas acciones. Ver `VERSION-LOG-v0.3.md`.
6. **Balance de curse_fatal (150 Fe)**: accesible solo tras ~50 min
   de juego a 1×. Si se quiere más drama, bajar a 100 Fe.
   `VERSION-LOG-v0.3.md`.
7. **Analytics de pilares**: el ROADMAP pedía un dashboard con
   métricas por pilar. Post-v1.0 natural.
   `VERSION-LOG-v1.0.md`.
8. **UI no cambia por era**: misma estética tribal/medieval/industrial.
   La cinemática de transición es el único feedback visual.
9. **Feudalismo (medieval) sin mecánica**: tech existe, pero los
   "vasallos" del ROADMAP-v2 no se modelan.
10. **Nombres de tech placeholder** en eras nuevas (ej.
    `nacionalismo`, `fision_nuclear`) — revisar tono con Director.
11. **Vida media de NPCs ~95 años**: poco realista para tribal. Si se
    quiere más turnover bajar `DEATH_START_AGE_YEARS` a 35.
    `VERSION-LOG-v0.1.md`.
12. **Coste de dones fijo (30 Fe)**: el ROADMAP sugería progresión
    por niveles. No implementado.
13. **PDF nativo**: hoy solo HTML (imprimible a PDF desde el
    navegador). Si se quiere PDF con branding, añadir deps.
14. **Descendiente mío en grupo rival**: la UI no destaca que un NPC
    enemigo lleva mi sangre — oportunidad dramática perdida.
15. **Música/sonido ausentes**: no hay feedback sonoro en ningún
    momento. Fuera de scope técnico hasta decisión del Director.
16. **Onboarding rígido día 6**: si el jugador pausa el juego, la
    intro avanza solo por ticks — puede quedar "congelada".

## Propuestas de mejora (ranked por impacto)

### Alto impacto — resolverían experiencia actual

1. **Rivales simétricos** (concede dones + maldice) → Sprint de
   mantenimiento de 1 día. Transforma el juego de "dios vs pueblos
   pasivos" a "dios vs dioses". Toca `rival-ai.ts` + `lib/gifts.ts`
   + scheduler.
2. **Analytics por pilar** → 1 día. Valida el diseño con números;
   abre puerta a balance tuning basado en datos, no intuición.
3. **UI por era** → 1-2 días. Color del polígono de la isla cambia,
   símbolos cambian (bosques tribal → torres medieval → chimeneas
   industrial). Bajo coste técnico, alto impacto de inmersión.
4. **Destacar en mapa a descendientes míos que viven en otro grupo**
   (anillo azul sobre fondo rojo) → <1 día. Hace visible la deriva
   dinástica.

### Mid impacto — quick wins

5. **Slider de velocidad continuo** (no solo 0/1×/10×/100×) — hoy el
   salto a 100× es abrupto. Con 25× y 50× habría más matices.
6. **Toasts apilables**: cuando dos acciones caen juntas, el segundo
   reemplaza al primero — se pierde feedback. Queue de toasts.
7. **"Continuar al 1×"** en la cinemática de era — ahora mismo
   cerrar el modal no cambia velocidad. Oportunidad de hacer el
   juego aquí más cinematográfico.

### Arquitectura — viabilidad de v2

8. **Separar `state.npcs` en `state.mortals` + `state.deceased`**
   antes de v2.0 multiplayer. Serializar un estado de 200+ NPCs a
   100+ eras por WebSocket es caro; los muertos son inmutables y no
   necesitan replicarse.
9. **Migrar `state.chronicle` a un store aparte** (IndexedDB). El
   estado del mundo crece lineal; la crónica puede llegar a MB en
   partidas largas y satura localStorage. Mover ayuda ahora y es
   necesario para v2.0 (server-authoritative).
10. **Sustituir `lib/map.ts` sine-wave por noise proper** (simplex).
    La costa actual es reconocible pero "matemática". Un pueblo
    balear ficticio merece algo más orgánico.

### Nice-to-have — post-v2

11. **Achievements y compendio** (ver códices de otros jugadores).
12. **Modo "espectador"**: observar partidas de otros sin poder
    intervenir.
13. **Decisiones morales explícitas** (antes del dilema atómico):
    "¿Permites el sacrificio ritual que aumenta X?".

## Recomendación al Director Creativo

1. **Primero** playtest real de v1.0 durante 1-2 sesiones (45 min
   cada una) con personas externas. Toma nota de dónde se aburren,
   dónde se confunden, dónde sonríen.
2. Con esos datos, **tomar decisión** sobre los 2 flags rojos:
   dilema atómico (cerrar diseño) + ejércitos cableados (sí o no).
3. **Decidir content-first vs multiplayer-first** — el
   `ROADMAP-v2.md` contempla ambos, pero el esfuerzo es muy distinto.
4. Antes de empezar v1.1+, **validar la rama `claude/v2-roadmap`**.
   Si las decisiones de Sprint 14-17 están bien, se mergea; si no,
   se descartan y se reescriben.
5. El equivalente humano de esta sesión overnight son ~2 semanas de
   trabajo a ritmo normal. Suficiente deuda se ha evitado — pero hay
   flags. **No construyas v1.1 encima de v1.0 sin antes haber jugado
   v1.0 y ajustado lo que te chirríe**.

## Cómo continuar

- `claude/update-claude-md-mPM1k` contiene v1.0 completo — se puede
  mergear a `main` cuando el Director lo valide.
- `claude/v2-roadmap` contiene v1.3 esqueleto — se cherry-pick a
  `release/v1.1` cuando se decida empezar content expansion.
- `NOTES-OVERNIGHT.md` tiene la bitácora técnica sprint-por-sprint
  si necesitas reconstruir por qué se tomó cada decisión.
- `VERSION-LOG-v*.md` están escritos con perspectiva de jugador —
  úsalos como "cartón piloto" cuando hagas el playtest.
