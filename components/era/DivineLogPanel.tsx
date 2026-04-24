'use client';

import React, { useState } from 'react';

export interface DivineLogEntry {
  tick: number;
  avgSv: number;
  avgSoc: number;
  avgProp: number;
  wood: number;
  stone: number;
  food: number;
  pos: { x: number; y: number };
  status: 'optimal' | 'warning' | 'critical';
}

interface DivineLogPanelProps {
  entries: DivineLogEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const DivineLogPanel: React.FC<DivineLogPanelProps> = ({ entries, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const text = entries.map(e => (
      `TICK ${e.tick} [${e.status.toUpperCase()}] | SV:${e.avgSv.toFixed(1)}% SOC:${e.avgSoc.toFixed(1)}% PROP:${e.avgProp.toFixed(1)}% | ` +
      `POS:(${e.pos.x},${e.pos.y}) | W:${e.wood} S:${e.stone} F:${e.food}`
    )).join('\n');
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-200">
      <div className="pixel-box bg-stone-900 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border-2 border-wb-gold">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b border-wb-stone/30 bg-stone-950">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-wb-gold tracking-widest uppercase">Consola de Inteligencia Divina</span>
            <span className="text-[9px] text-stone-500 italic">Reporte de Invariantes §A4 · Ctrl + {'>'} para cerrar</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleCopy}
              className={`px-3 py-1 text-[10px] font-bold uppercase transition-all border ${
                copied ? 'bg-green-600 border-green-400 text-white' : 'bg-wb-stone border-wb-slate text-wb-parchment hover:bg-stone-700'
              }`}
            >
              {copied ? '✓ Copiado' : '📋 Copiar Logs'}
            </button>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center hover:bg-red-900/30 text-stone-500 hover:text-white transition-colors border border-transparent"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Log Area */}
        <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar bg-black/40">
          {entries.length === 0 && (
            <div className="text-sm text-stone-600 italic py-20 text-center uppercase tracking-widest">Escuchando el Seed...</div>
          )}
          {entries.slice().reverse().map((entry, i) => (
            <div 
              key={`${entry.tick}-${i}`} 
              className={`text-xs p-3 border-l-4 bg-stone-800/40 shadow-inner transition-colors ${
                entry.status === 'optimal' ? 'border-green-500' : 
                entry.status === 'warning' ? 'border-amber-500' : 
                'border-red-500'
              }`}
            >
              <div className="flex justify-between text-[10px] text-stone-400 mb-2 font-mono">
                <span>SECUENCIA DE TICK: {entry.tick}</span>
                <span className={
                  entry.status === 'optimal' ? 'text-green-400' : 
                  entry.status === 'warning' ? 'text-amber-400' : 
                  'text-red-400'
                }>{entry.status.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-6 gap-2 items-center">
                <div className="flex flex-col">
                  <span className="text-[7px] text-stone-500 uppercase">Superv.</span>
                  <span className="text-[10px] font-bold text-wb-parchment">{entry.avgSv.toFixed(0)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] text-stone-500 uppercase">Social.</span>
                  <span className="text-[10px] font-bold text-wb-parchment">{entry.avgSoc.toFixed(0)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] text-stone-500 uppercase">Ambición</span>
                  <span className="text-[10px] font-bold text-wb-gold">{entry.avgProp.toFixed(0)}%</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] text-stone-500 uppercase">Localiz.</span>
                  <span className="text-[10px] font-mono text-wb-stone">({entry.pos.x},{entry.pos.y})</span>
                </div>
                <div className="flex flex-col border-l border-wb-stone/20 pl-2">
                  <span className="text-[7px] text-stone-500 uppercase">Res.</span>
                  <span className="text-[10px] font-bold text-cyan-400">W:{entry.wood} S:{entry.stone}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] text-stone-500 uppercase">Nutr.</span>
                  <span className="text-[10px] font-bold text-green-400">F:{entry.food}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-2 bg-stone-950 border-t border-wb-stone/30 text-[8px] text-stone-600 text-center uppercase tracking-widest opacity-50">
          Diorama Determinista · Invariante de Red · No Mutar
        </div>
      </div>
      
      <style jsx>{`
        .pixel-box {
          border: 2px solid #2f2f2f;
          box-shadow: 6px 6px 0px rgba(0,0,0,0.8);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};
