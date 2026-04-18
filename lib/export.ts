/**
 * Exportación de la crónica a texto plano — Sprint 6.
 *
 * Función pura que serializa las entradas del `state.chronicle` a un
 * string legible, preservando el orden cronológico y la voz partisana
 * de `chronicle.ts`. No lee archivos ni localStorage — solo formatea.
 * El disparo del descargable (Blob + URL.createObjectURL) vive en la
 * capa de UI, fuera de `lib/`.
 */

import type { WorldState } from './world-state';

export interface ExportOptions {
  /** Nombre del grupo del jugador para la cabecera. Opcional. */
  groupName?: string;
  /** Incluir cabecera con metadatos (seed, día). Default true. */
  withHeader?: boolean;
}

export function exportChronicle(
  state: WorldState,
  options: ExportOptions = {},
): string {
  const lines: string[] = [];
  if (options.withHeader ?? true) {
    lines.push('Crónica del pueblo');
    if (options.groupName) lines.push(options.groupName);
    lines.push(`Semilla: ${state.seed}`);
    lines.push(`Día de escritura: ${state.day}`);
    lines.push('');
  }
  if (state.chronicle.length === 0) {
    lines.push('El tiempo aún no ha dejado huella.');
  } else {
    for (const entry of state.chronicle) {
      lines.push(entry.text);
    }
  }
  return lines.join('\n');
}

/** Nombre de archivo sugerido para la descarga TXT. */
export function exportFilename(state: WorldState): string {
  return `cronica-seed-${state.seed}-dia-${state.day}.txt`;
}

/** Nombre de archivo sugerido para la descarga HTML. */
export function exportHtmlFilename(state: WorldState): string {
  return `codice-seed-${state.seed}-dia-${state.day}.html`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Exporta el códice como HTML standalone (sin deps externas).
 * Incluye cabecera + lista de entradas + resumen del estado del mundo.
 */
export function exportCodexHtml(state: WorldState): string {
  const groupName =
    state.groups.find((g) => g.id === state.player_god.group_id)?.name ??
    state.player_god.group_id;
  const alive = state.npcs.filter((n) => n.alive).length;
  const chosenCount = state.player_god.chosen_ones.length;
  const entriesHtml = state.chronicle
    .map(
      (e) =>
        `<li><span class="day">Día ${e.day}</span><span class="text">${escapeHtml(e.text)}</span></li>`,
    )
    .join('\n');
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Códice — ${escapeHtml(groupName)} — seed ${state.seed}</title>
<style>
  body {
    font-family: ui-serif, Georgia, 'Times New Roman', serif;
    background: #f5ecd2;
    color: #312e24;
    max-width: 760px;
    margin: 3rem auto;
    padding: 2rem;
    line-height: 1.55;
  }
  h1 { font-size: 1.8rem; margin-bottom: 0.2rem; letter-spacing: -0.01em; }
  .meta {
    color: #7c6c4a;
    font-size: 0.85rem;
    font-style: italic;
    margin-bottom: 2rem;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin: 1.5rem 0;
    padding: 1rem 0;
    border-top: 1px solid #c9b98c;
    border-bottom: 1px solid #c9b98c;
    font-size: 0.85rem;
  }
  .stats dt { text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.7rem; color: #8a7858; }
  .stats dd { font-weight: 700; margin: 0; }
  ul.chronicle { list-style: none; padding: 0; margin: 0; }
  ul.chronicle li { border-left: 2px solid #c9b98c; padding: 0.6rem 0 0.6rem 1rem; margin-bottom: 0.6rem; }
  .day { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #8a7858; margin-bottom: 0.2rem; }
  .text { display: block; font-size: 0.95rem; }
  footer { margin-top: 3rem; font-size: 0.7rem; color: #8a7858; text-align: center; }
</style>
</head>
<body>
  <h1>Códice de los ${escapeHtml(groupName)}</h1>
  <p class="meta">Semilla ${state.seed} · Día ${state.day} · Era ${escapeHtml(state.era)}</p>
  <dl class="stats">
    <div><dt>Vivos</dt><dd>${alive}</dd></div>
    <div><dt>Población total</dt><dd>${state.npcs.length}</dd></div>
    <div><dt>Elegidos</dt><dd>${chosenCount}</dd></div>
    <div><dt>Fe</dt><dd>${state.player_god.faith_points.toFixed(1)}</dd></div>
  </dl>
  <ul class="chronicle">
${entriesHtml || '<li class="empty">El tiempo aún no ha dejado huella.</li>'}
  </ul>
  <footer>Generado por Proyecto Civilización · motor determinista</footer>
</body>
</html>`;
}

/** Construye la URL compartible para replicar esta partida. */
export function shareUrl(state: WorldState, baseUrl: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('seed', String(state.seed));
  url.searchParams.set('group', state.player_god.group_id);
  return url.toString();
}
