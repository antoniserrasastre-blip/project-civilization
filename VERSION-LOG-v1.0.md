# VERSION LOG — v1.0 Feature-Complete Single-Player

**Estado**: ✅ shipped (commit `1759e60`)
**Sprints**: 13 (Export & Share).

## Qué hace esta versión

Cierra el ciclo single-player. El jugador no solo juega: exporta y
comparte su mundo.

- **Export HTML standalone**: `lib/export.ts::exportCodexHtml(state)`
  devuelve un HTML auto-contenido con CSS inline, tipografía serif,
  fondo pergamino. Sin deps de PDF — el HTML imprime bien a PDF desde
  el navegador si el jugador lo necesita.
- **Compartir semillas**: `shareUrl(state, base)` construye
  `?seed=X&group=Y`. Botón "Compartir" copia al clipboard con
  fallback `window.prompt`.
- **Boot desde URL**: si `?seed=` está presente y no hay snapshot,
  la partida se crea con ese seed + `?group=` (o Tramuntana default).
  Mundos reproducibles entre jugadores sin ninguna configuración
  compartida.
- **ChroniclePanel**: tres botones en cabecera `.txt`, `.html`,
  "Compartir" + selector de provider LLM.

## Por qué y cómo encaja con la visión

- §11 del ROADMAP cita "analytics básicos sobre qué pilares sostienen"
  — **NO implementados** (flag abajo). En esta versión el jugador
  puede generar su códice pero no tiene aún un dashboard de "esta
  partida sostuvo fuerte el Pillar 1 porque X Elegidos reclutaron
  Y seguidores".
- **Loop social**: el Pillar 5 (veredicto/linaje) se completa con la
  posibilidad de mostrar tu resultado a otros. El códice HTML es el
  "book of your reign".

## Perspectiva del jugador

> Llevo tres partidas. La última me ha gustado — mi Elegida Coloma
> Barceló acabó con 14 descendientes vivos y seguidores en dos pueblos
> rivales. Pulso ".html" en el panel de crónica. Descarga un archivo
> `codice-seed-42-dia-3200.html`. Lo abro en el navegador — es
> hermoso, tipografía seria, entradas ordenadas. Pulso Cmd+P, "Guardar
> como PDF". Ahora tengo un libro.
>
> Quiero que mi amigo vea este mundo. Pulso "Compartir". "URL copiada
> al portapapeles." Le mando por mensaje la URL. Él abre, borra su
> partida, recarga. Ve EL MISMO mundo en día 0 — Coloma aún está por
> ungir. Es una semilla replicable. Le digo: "Anointa a npc_0000
> ambicioso y aura_de_carisma, te va a encantar."

## Balance

Esta versión no toca balance mecánico. Los valores de v0.1-v0.3 se
mantienen. Checklist rápido del balance consolidado del sistema
tras el shipping de v1.0:

- Ritmo general: **bueno**. A 100× una era tribal completa dura ~15
  min. A 1× dura horas (ritmo lento, "idle game" style).
- Economía de Fe: **funcional**. El primer don es generoso (gratis);
  el segundo cuesta ~2 min a 1×. No hay inflación: la Fe se
  acumula lentamente porque solo los Elegidos + descendientes
  producen. Si el Elegido muere, la producción baja.
- Dramatismo: **medio**. Con `aggressive` rival IA hay algo que
  responder; con `passive` el juego pide que el jugador sea
  proactivo (podría aburrir a un jugador reactivo).
- Visual: **sostenido**. Hand-drawn estética + NPC silhouette + halo
  dorado tutorial son suficientes para 15-30 min de partida.

## 🚩 Flags para supervisión humana

- ⚠️ **Analytics pendientes**: el ROADMAP pedía "qué pilares
  sostienen" — requiere un panel que agregue estadísticas:
  - Pillar 1: % de Elegidos del jugador con al menos 1 seguidor.
  - Pillar 2: % de días con al menos 1 evento automático.
  - Pillar 3: Fe total ganada por reason (rezar/kill/birth).
  - Pillar 4: % de partida donde el rival actuó en los últimos 2 min.
  - Pillar 5: ¿el linaje estuvo en top-3 al final?
  Flag para Sprint post-v1.0.
- ⚠️ **PDF real no implementado**: el usuario puede imprimir el HTML
  a PDF desde el navegador. Si se quiere PDF nativo (`react-pdf`,
  `puppeteer`), añade ~2 MB de deps. Decisión Director.
- ⚠️ **Balance general post-v1.0**: el juego no ha sido playtested
  contra usuarios reales. Sprint 7 tuning quedó basado en métricas
  automáticas. Para afinar de verdad necesitamos sesiones reales de
  jugadores y analítica.

## Estado de los Pilares del Vision Document

| Pillar | Estado | Notas |
|-|-|-|
| 1 — Mismo don, distinto resultado | ✅ testado (integration) | Aura + ambición vs aura + timidez producen seguidor-counts distintos. |
| 2 — Mundo cambia sin tocarlo | ✅ testado (18k ticks) | Muertes + nacimientos + crónica viva. |
| 3 — Fe como economía narrativa | ✅ shipped | Rezar + enemigo caído + descendencia con sus bonos. |
| 4 — Anti-presión | ✅ shipped (Sprint 10) | IA rival decide cada 500 días ≈ 100s a 1×. |
| 5 — Linaje reina | ✅ shipped (Sprint 5b) | Modal veredicto con top-3 por influencia. |

Todos los pilares del Vision sostenidos al cierre de v1.0.
