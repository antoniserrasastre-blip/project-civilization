'use client';

import { useState, useMemo } from 'react';
import type { GameState } from '@/lib/game-state';
import { VOCATION } from '@/lib/npcs';

interface CivilizationCodexProps {
  state: GameState;
  onClose: () => void;
}

export function CivilizationCodex({ state, onClose }: CivilizationCodexProps) {
  const [tab, setTab] = useState<'poblacion' | 'tecnologia' | 'cultura'>('poblacion');

  const stats = useMemo(() => {
    const alive = state.npcs.filter(n => n.alive);
    const vocations = {
      [VOCATION.SABIO]: alive.filter(n => n.vocation === VOCATION.SABIO).length,
      [VOCATION.GUERRERO]: alive.filter(n => n.vocation === VOCATION.GUERRERO).length,
      [VOCATION.SIMPLEZAS]: alive.filter(n => n.vocation === VOCATION.SIMPLEZAS).length,
      [VOCATION.AMBICIOSO]: alive.filter(n => n.vocation === VOCATION.AMBICIOSO).length,
    };
    const elegidos = alive.filter(n => n.casta === 'Elegido').length;
    return { alive: alive.length, vocations, elegidos };
  }, [state.npcs]);

  return (
    <div className="pixel-box bg-stone-900/95 border-wb-gold w-full h-full flex flex-col overflow-hidden pointer-events-auto shadow-2xl font-monospace">
      {/* Header */}
      <header className="bg-stone-800 p-4 border-b-4 border-black/40 flex justify-between items-center">
        <h2 className="text-lg text-wb-gold font-black italic uppercase tracking-widest leading-none">Códice de Civilización</h2>
        <button onClick={onClose} className="text-wb-blood hover:text-white transition-colors text-xl">✕</button>
      </header>

      {/* Tabs */}
      <nav className="flex bg-black/20 border-b border-white/5">
        {(['poblacion', 'tecnologia', 'cultura'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 p-3 text-[10px] font-bold uppercase transition-colors border-b-2 ${
              tab === t ? 'border-wb-gold bg-stone-800 text-wb-gold' : 'border-transparent text-wb-stone/50 hover:bg-white/5'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {tab === 'poblacion' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/20 p-3 border border-white/5 rounded">
                <span className="text-[9px] text-wb-stone/60 uppercase font-black">Población Total</span>
                <div className="text-xl font-bold">{stats.alive} <span className="text-[10px] opacity-40">/ {state.npcs.length}</span></div>
              </div>
              <div className="bg-black/20 p-3 border border-white/5 rounded">
                <span className="text-[9px] text-wb-gold/60 uppercase font-black">Elegidos</span>
                <div className="text-xl font-bold text-wb-gold">{stats.elegidos}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-wb-stone opacity-70 uppercase border-b border-white/10 pb-1">Distribución de Almas</h3>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(stats.vocations).map(([v, count]) => (
                  <div key={v} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/5">
                    <span className="text-[10px] uppercase font-bold text-wb-parchment/80">{v}</span>
                    <span className="text-sm font-mono font-black">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'tecnologia' && (
          <div className="space-y-4">
             <div className="bg-wb-gold/10 p-3 border border-wb-gold/20 rounded">
               <span className="text-[9px] text-wb-gold uppercase font-black">Sabiduría Acumulada</span>
               <div className="text-xl font-bold text-wb-gold">{Math.floor(state.tech.wisdom)}</div>
             </div>
             
             <div className="space-y-2">
               <h3 className="text-[10px] font-black text-wb-stone opacity-70 uppercase border-b border-white/10 pb-1">Descubrimientos</h3>
               <div className="grid grid-cols-1 gap-2">
                 {state.tech.unlocked.length > 0 ? state.tech.unlocked.map(t => (
                   <div key={t} className="bg-black/20 p-2 border-l-4 border-green-500 flex justify-between items-center">
                     <span className="text-[10px] uppercase font-bold">{t}</span>
                     <span className="text-[8px] text-green-500 font-black italic">INVESTIGADO</span>
                   </div>
                 )) : (
                   <div className="text-[10px] opacity-40 italic text-center py-8">Ninguna tecnología desbloqueada aún.</div>
                 )}
               </div>
             </div>
          </div>
        )}

        {tab === 'cultura' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-wb-stone opacity-70 uppercase border-b border-white/10 pb-1">Tradiciones Emergentes</h3>
              <div className="space-y-3">
                {Object.entries(state.world.traditions || {}).sort((a,b) => b[1] - a[1]).map(([t, val]) => (
                  <div key={t} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[10px] uppercase font-bold">
                      <span>{t}</span>
                      <span>{Math.floor(val)}</span>
                    </div>
                    <div className="h-1 bg-black/40 w-full overflow-hidden">
                      <div className="h-full bg-wb-gold/60 shadow-[0_0_5px_rgba(212,175,55,0.4)]" style={{ width: `${Math.min(100, val)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-wb-stone opacity-70 uppercase border-b border-white/10 pb-1">Sinergias Grupales</h3>
              <div className="flex flex-wrap gap-2">
                {state.village.blessings.length > 0 ? state.village.blessings.map(b => (
                  <div key={b} className="pixel-box bg-cyan-900/40 px-2 py-1 text-[9px] text-cyan-300 border-cyan-500/20">
                    ✧ {b}
                  </div>
                )) : (
                   <div className="text-[10px] opacity-40 italic text-center w-full py-4">Aún no hay sinergias divinas activas.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="p-4 bg-black/40 text-[9px] text-wb-stone/30 italic flex justify-between border-t border-white/5">
        <span>Edad Primigenia</span>
        <span>Proyecto Civilización v2.0</span>
      </footer>
    </div>
  );
}
