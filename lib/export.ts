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

/** Nombre de archivo sugerido para la descarga. */
export function exportFilename(state: WorldState): string {
  return `cronica-seed-${state.seed}-dia-${state.day}.txt`;
}
