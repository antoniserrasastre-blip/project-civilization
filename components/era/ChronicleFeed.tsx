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
import type { LegendState } from '@/lib/legends';
import { useState } from 'react';

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
  legends: LegendState;
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
  const [activeTab, setActiveTab] = useState<'chronicle' | 'legends'>('chronicle');
  const rows = buildRows(props);

  return (
    <aside
      data-testid="chronicle-feed"
      aria-label="Crónica del clan"
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        width: 280,
        maxHeight: '75vh',
        overflowY: 'auto',
        background: 'rgba(20, 20, 15, 0.9)',
        color: '#f5f5dc',
        padding: '0',
        borderRadius: 8,
        border: '1px solid #3d3d29',
        fontSize: '0.82rem',
        lineHeight: 1.4,
        zIndex: 10,
        fontFamily: 'var(--font-sans, system-ui)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #3d3d29',
        background: 'rgba(0,0,0,0.3)'
      }}>
        <button 
          onClick={() => setActiveTab('chronicle')}
          style={{
            flex: 1,
            padding: '10px',
            background: activeTab === 'chronicle' ? 'rgba(61, 61, 41, 0.4)' : 'transparent',
            border: 'none',
            color: activeTab === 'chronicle' ? '#ffd700' : '#8a8a78',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'chronicle' ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          Crónica
        </button>
        <button 
          onClick={() => setActiveTab('legends')}
          style={{
            flex: 1,
            padding: '10px',
            background: activeTab === 'legends' ? 'rgba(61, 61, 41, 0.4)' : 'transparent',
            border: 'none',
            color: activeTab === 'legends' ? '#ffd700' : '#8a8a78',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: activeTab === 'legends' ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          Leyendas
        </button>
      </div>

      <div style={{ padding: '12px' }}>
        {activeTab === 'chronicle' ? (
          <>
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
                  gap: 8,
                }}
              >
                {rows.map((r) => (
                  <li
                    key={r.key}
                    data-testid="chronicle-entry"
                    style={{
                      borderLeft: '2px solid #3d3d29',
                      paddingLeft: 10,
                      opacity: 0.9,
                    }}
                  >
                    {r.text}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {props.legends.threads.length === 0 ? (
              <p style={{ margin: 0, opacity: 0.6, fontSize: '0.78rem', fontStyle: 'italic' }}>
                Las hogueras aún no han escuchado grandes hazañas...
              </p>
            ) : (
              props.legends.threads.map((thread) => (
                <div 
                  key={thread.id}
                  style={{
                    padding: '10px',
                    background: 'linear-gradient(135deg, #2a2a1c 0%, #1a1a0d 100%)',
                    border: '1px solid #d4af37',
                    borderRadius: '4px',
                    position: 'relative',
                    boxShadow: 'inset 0 0 10px rgba(212, 175, 55, 0.1)'
                  }}
                >
                  <div style={{ 
                    fontSize: '0.65rem', 
                    color: '#d4af37', 
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: '4px',
                    fontWeight: 'bold'
                  }}>
                    Saga del Día {thread.day}
                  </div>
                  <div style={{ 
                    color: '#f5f5dc', 
                    fontFamily: 'serif',
                    fontStyle: 'italic',
                    fontSize: '0.85rem',
                    lineHeight: '1.3'
                  }}>
                    "{thread.saga}"
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
