'use client';

/**
 * ChronicleFeed — consola narrativa (Estilo Gran Estrategia).
 *
 * Muestra el historial diario y el Códice de Leyendas en un formato
 * horizontal de consola.
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
      text: `Escuchan: ${WHISPER_ES[props.activeMessage]}.`,
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
    <div
      data-testid="chronicle-feed"
      className="pixel-box-dark bg-stone-900/95 w-72 h-[500px] flex flex-col overflow-hidden border-wb-stone/20 shadow-2xl pointer-events-auto"
    >
      {/* Tabs */}
      <div className="flex bg-black/60 border-b border-white/5">
        <button 
          onClick={() => setActiveTab('chronicle')}
          className={`flex-1 p-3 text-[9px] uppercase font-black transition-colors ${activeTab === 'chronicle' ? 'text-wb-gold bg-white/5 border-b-2 border-wb-gold' : 'text-wb-stone/30'}`}
        >
          Crónica
        </button>
        <button 
          onClick={() => setActiveTab('legends')}
          className={`flex-1 p-3 text-[9px] uppercase font-black transition-colors ${activeTab === 'legends' ? 'text-wb-gold bg-white/5 border-b-2 border-wb-gold' : 'text-wb-stone/30'}`}
        >
          Leyendas
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 font-monospace custom-scrollbar">
        {activeTab === 'chronicle' ? (
          <div className="space-y-3">
            {rows.length === 0 ? (
              <p className="text-[10px] opacity-40 italic lowercase text-center py-10">Los Hijos esperan tu voz...</p>
            ) : (
              rows.map((r) => (
                <div key={r.key} className="text-[11px] border-l border-wb-stone/30 pl-3 py-0.5 opacity-90 lowercase leading-snug">
                   {r.text}
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {props.legends.threads.length === 0 ? (
              <p className="text-[10px] opacity-40 italic lowercase text-center py-10">Las hogueras están en silencio...</p>
            ) : (
              props.legends.threads.map((thread) => (
                <div 
                  key={thread.id}
                  className="p-3 bg-gradient-to-br from-wb-blood/5 to-black/60 border border-wb-gold/10 rounded shadow-inner"
                >
                  <div className="text-[8px] text-wb-gold/60 uppercase font-black tracking-tighter mb-1.5 italic">Saga del Día {thread.day}</div>
                  <div className="text-[11px] text-wb-parchment/90 italic leading-relaxed font-serif">"{thread.saga}"</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2f2f2f; }
      `}</style>
    </div>
  );
}
