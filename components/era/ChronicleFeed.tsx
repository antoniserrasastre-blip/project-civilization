'use client';

/**
 * ChronicleFeed — feed lateral del historial narrativo del clan
 * (Sprint #2 Fase 5 LEGIBILIDAD-MVP).
 *
 * Muestra dos capas de información:
 *
 *   1. Susurro activo actual, si lo hay — "los nuestros escuchan X".
 *   2. Historial de susurros archivados (`village.messageHistory`).
 *   3. Entradas narradas de `state.chronicle` si las hay (muertes,
 *      nacimientos, migraciones — cableado mínimo en el tick).
 *
 * Ordenación: más reciente arriba. Cap visual de últimas N.
 */

import type { MessageChoice } from '@/lib/messages';
import { MESSAGE_INTENTS, SILENCE } from '@/lib/messages';
import type { ChronicleEntry } from '@/lib/game-state';

const WHISPER_ES: Record<MessageChoice, string> = {
  [MESSAGE_INTENTS.AUXILIO]: 'Auxilio',
  [MESSAGE_INTENTS.CORAJE]: 'Coraje',
  [MESSAGE_INTENTS.PACIENCIA]: 'Paciencia',
  [MESSAGE_INTENTS.ENCUENTRO]: 'Encuentro',
  [MESSAGE_INTENTS.RENUNCIA]: 'Renuncia',
  [MESSAGE_INTENTS.ESPERANZA]: 'Esperanza',
  [SILENCE]: 'Silencio',
};

const VISIBLE_ENTRIES = 12;

export interface ChronicleFeedProps {
  activeMessage: MessageChoice | null;
  messageHistory: readonly { day: number; intent: MessageChoice }[];
  chronicle: readonly ChronicleEntry[];
}

interface Row {
  key: string;
  day: number;
  text: string;
}

function buildRows(props: ChronicleFeedProps): Row[] {
  const rows: Row[] = [];
  if (props.activeMessage !== null) {
    rows.push({
      key: 'active',
      day: Number.MAX_SAFE_INTEGER,
      text: `Los nuestros escuchan: ${WHISPER_ES[props.activeMessage]}.`,
    });
  }
  for (let i = 0; i < props.messageHistory.length; i++) {
    const m = props.messageHistory[i];
    rows.push({
      key: `msg-${i}`,
      day: m.day,
      text: `Día ${m.day}: susurro ${WHISPER_ES[m.intent]} archivado.`,
    });
  }
  for (let i = 0; i < props.chronicle.length; i++) {
    const c = props.chronicle[i];
    rows.push({ key: `ch-${i}`, day: c.day, text: c.text });
  }
  rows.sort((a, b) => b.day - a.day);
  return rows.slice(0, VISIBLE_ENTRIES);
}

export function ChronicleFeed(props: ChronicleFeedProps) {
  const rows = buildRows(props);
  return (
    <aside
      data-testid="chronicle-feed"
      aria-label="Crónica del clan"
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        width: 260,
        maxHeight: '70vh',
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.65)',
        color: '#f5f5dc',
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid #1e1e1e',
        fontSize: '0.82rem',
        lineHeight: 1.4,
        zIndex: 10,
        fontFamily: 'var(--font-sans, system-ui)',
      }}
    >
      <h3
        style={{
          margin: 0,
          marginBottom: 6,
          fontSize: '0.9rem',
          opacity: 0.85,
        }}
      >
        Crónica
      </h3>
      {rows.length === 0 ? (
        <p style={{ margin: 0, opacity: 0.6, fontSize: '0.78rem' }}>
          Nada aún. Los Hijos esperan tu voz.
        </p>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {rows.map((r) => (
            <li
              key={r.key}
              data-testid="chronicle-entry"
              style={{
                borderLeft: '2px solid #2a2a1c',
                paddingLeft: 8,
                opacity: 0.9,
              }}
            >
              {r.text}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
