'use client';

import { useState, useMemo } from 'react';
import type { GameState } from '@/lib/game-state';
import { VOCATION } from '@/lib/npcs';
import {
  TECH_DEFS,
  TRAIT_DEFS,
  type CulturePole,
  type TechId,
} from '@/lib/technologies';

interface CivilizationCodexProps {
  state: GameState;
  onClose: () => void;
}

const POLE_LABEL: Record<CulturePole, string> = {
  cuerpo:   'Cuerpo',
  fuerza:   'Fuerza',
  tierra:   'Tierra',
  mar:      'Mar',
  mano:     'Mano',
  mercado:  'Mercado',
};

const POLE_COLOR: Record<CulturePole, string> = {
  cuerpo:  'text-amber-400  border-amber-500/50  bg-amber-900/20',
  fuerza:  'text-red-400    border-red-500/50    bg-red-900/20',
  tierra:  'text-green-400  border-green-500/50  bg-green-900/20',
  mar:     'text-cyan-400   border-cyan-500/50   bg-cyan-900/20',
  mano:    'text-purple-400 border-purple-500/50 bg-purple-900/20',
  mercado: 'text-yellow-300 border-yellow-500/50 bg-yellow-900/20',
};

const POLE_BAR: Record<CulturePole, string> = {
  cuerpo:  'bg-amber-500',
  fuerza:  'bg-red-500',
  tierra:  'bg-green-500',
  mar:     'bg-cyan-500',
  mano:    'bg-purple-500',
  mercado: 'bg-yellow-400',
};

const AXIS_PAIRS: [CulturePole, CulturePole][] = [
  ['cuerpo', 'fuerza'],
  ['tierra', 'mar'],
  ['mano',   'mercado'],
];

export function CivilizationCodex({ state, onClose }: CivilizationCodexProps) {
  const [tab, setTab] = useState<'poblacion' | 'tecnologia' | 'cultura'>('tecnologia');

  const stats = useMemo(() => {
    const alive = state.npcs.filter(n => n.alive);
    const vocations = {
      [VOCATION.SABIO]:      alive.filter(n => n.vocation === VOCATION.SABIO).length,
      [VOCATION.GUERRERO]:   alive.filter(n => n.vocation === VOCATION.GUERRERO).length,
      [VOCATION.SIMPLEZAS]:  alive.filter(n => n.vocation === VOCATION.SIMPLEZAS).length,
      [VOCATION.AMBICIOSO]:  alive.filter(n => n.vocation === VOCATION.AMBICIOSO).length,
    };
    const elegidos = alive.filter(n => n.casta === 'Elegido').length;
    return { alive: alive.length, vocations, elegidos };
  }, [state.npcs]);

  // Tech tree data
  const techData = useMemo(() => {
    const unlocked = new Set(state.tech.unlocked);
    const byPole: Record<CulturePole, typeof TECH_DEFS[TechId][]> = {
      cuerpo: [], fuerza: [], tierra: [], mar: [], mano: [], mercado: [],
    };
    for (const def of Object.values(TECH_DEFS)) {
      byPole[def.pole].push(def);
    }
    // Sort each pole by tier
    for (const pole of Object.keys(byPole) as CulturePole[]) {
      byPole[pole].sort((a, b) => a.tier - b.tier);
    }
    const culture = state.tech.culture ?? { cuerpo: 0, fuerza: 0, tierra: 0, mar: 0, mano: 0, mercado: 0 };
    const maxCulture = Math.max(1, ...Object.values(culture));
    return { unlocked, byPole, culture, maxCulture };
  }, [state.tech]);

  return (
    <div className="pixel-box bg-stone-900/95 border-wb-gold w-full h-full flex flex-col overflow-hidden pointer-events-auto shadow-2xl font-monospace">
      {/* Header */}
      <header className="bg-stone-800 p-4 border-b-4 border-black/40 flex justify-between items-center">
        <h2 className="text-lg text-wb-gold font-black italic uppercase tracking-widest leading-none">
          Códice de Civilización
        </h2>
        <button onClick={onClose} className="text-wb-blood hover:text-white transition-colors text-xl">✕</button>
      </header>

      {/* Tabs */}
      <nav className="flex bg-black/20 border-b border-white/5">
        {(['poblacion', 'tecnologia', 'cultura'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 p-3 text-[10px] font-bold uppercase transition-colors border-b-2 ${
              tab === t
                ? 'border-wb-gold bg-stone-800 text-wb-gold'
                : 'border-transparent text-wb-stone/50 hover:bg-white/5'
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* ── POBLACIÓN ───────────────────────────────────────────── */}
        {tab === 'poblacion' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/20 p-3 border border-white/5 rounded">
                <span className="text-[9px] text-wb-stone/60 uppercase font-black">Población</span>
                <div className="text-xl font-bold">
                  {stats.alive}
                  <span className="text-[10px] opacity-40"> / {state.npcs.length}</span>
                </div>
              </div>
              <div className="bg-black/20 p-3 border border-white/5 rounded">
                <span className="text-[9px] text-wb-gold/60 uppercase font-black">Elegidos</span>
                <div className="text-xl font-bold text-wb-gold">{stats.elegidos}</div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-wb-stone opacity-70 uppercase border-b border-white/10 pb-1">
                Vocaciones
              </h3>
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

        {/* ── TECNOLOGÍA ──────────────────────────────────────────── */}
        {tab === 'tecnologia' && (
          <div className="space-y-5">
            {/* Summary bar */}
            <div className="bg-black/30 p-3 border border-white/5 rounded flex justify-between items-center">
              <span className="text-[9px] text-wb-stone/60 uppercase font-black">Descubrimientos</span>
              <span className="text-lg font-bold text-wb-gold">
                {state.tech.unlocked.length}
                <span className="text-[10px] opacity-40"> / {Object.keys(TECH_DEFS).length}</span>
              </span>
            </div>

            {/* Axis pairs */}
            {AXIS_PAIRS.map(([poleA, poleB]) => (
              <div key={`${poleA}-${poleB}`} className="space-y-2">
                <div className="flex items-center gap-2 text-[9px] font-black uppercase opacity-50 border-b border-white/5 pb-1">
                  <span className={POLE_COLOR[poleA].split(' ')[0]}>{POLE_LABEL[poleA]}</span>
                  <span className="flex-1 text-center opacity-30">─── eje ───</span>
                  <span className={POLE_COLOR[poleB].split(' ')[0]}>{POLE_LABEL[poleB]}</span>
                </div>

                {/* Two columns: one per pole */}
                <div className="grid grid-cols-2 gap-2">
                  {([poleA, poleB] as CulturePole[]).map(pole => (
                    <div key={pole} className="space-y-1">
                      {techData.byPole[pole].map(def => {
                        const done = techData.unlocked.has(def.id);
                        return (
                          <div
                            key={def.id}
                            title={done ? def.description : def.unlockHint}
                            className={`p-2 border rounded text-[9px] transition-all ${
                              done
                                ? `${POLE_COLOR[pole]} border-current opacity-90`
                                : 'bg-black/20 border-white/5 opacity-40'
                            }`}
                          >
                            <div className="flex items-center gap-1 font-black">
                              <span>{done ? '✓' : `T${def.tier}`}</span>
                              <span className="truncate">{def.name}</span>
                            </div>
                            {!done && (
                              <div className="text-[8px] opacity-60 mt-0.5 leading-tight line-clamp-2">
                                {def.unlockHint}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── CULTURA ─────────────────────────────────────────────── */}
        {tab === 'cultura' && (
          <div className="space-y-5">

            {/* Rasgos activos */}
            {(state.tech.activeTraits ?? []).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-wb-gold uppercase border-b border-wb-gold/20 pb-1">
                  Rasgos Culturales Activos
                </h3>
                {(state.tech.activeTraits ?? []).map(tid => {
                  const trait = TRAIT_DEFS[tid];
                  if (!trait) return null;
                  const colors = POLE_COLOR[trait.pole];
                  return (
                    <div key={tid} className={`p-3 border rounded ${colors}`}>
                      <div className="font-black text-[10px] uppercase">{trait.name}</div>
                      <div className="text-[9px] opacity-70 mt-0.5">{trait.description}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ejes de cultura */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-wb-stone opacity-70 uppercase border-b border-white/10 pb-1">
                Identidad Cultural
              </h3>
              {AXIS_PAIRS.map(([poleA, poleB]) => {
                const va = techData.culture[poleA];
                const vb = techData.culture[poleB];
                const total = va + vb || 1;
                const pctA = Math.round((va / total) * 100);
                return (
                  <div key={`${poleA}-${poleB}`} className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase">
                      <span className={POLE_COLOR[poleA].split(' ')[0]}>{POLE_LABEL[poleA]} {va}</span>
                      <span className={POLE_COLOR[poleB].split(' ')[0]}>{POLE_LABEL[poleB]} {vb}</span>
                    </div>
                    <div className="h-2 bg-black/40 w-full rounded overflow-hidden flex">
                      <div
                        className={`h-full transition-all ${POLE_BAR[poleA]}`}
                        style={{ width: `${pctA}%` }}
                      />
                      <div
                        className={`h-full transition-all ${POLE_BAR[poleB]}`}
                        style={{ width: `${100 - pctA}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tradiciones emergentes */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-black text-wb-stone opacity-70 uppercase border-b border-white/10 pb-1">
                Tradiciones del Clan
              </h3>
              {Object.entries(state.world.traditions || {})
                .sort((a, b) => b[1] - a[1])
                .map(([t, val]) => (
                  <div key={t} className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] uppercase font-bold">
                      <span>{t}</span>
                      <span>{Math.floor(val)}</span>
                    </div>
                    <div className="h-1 bg-black/40 w-full overflow-hidden rounded">
                      <div
                        className="h-full bg-wb-gold/60"
                        style={{ width: `${Math.min(100, (val / 200) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>

            {/* Sinergias */}
            {state.village.blessings.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-black text-wb-stone opacity-70 uppercase border-b border-white/10 pb-1">
                  Sinergias Divinas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {state.village.blessings.map(b => (
                    <div key={b} className="pixel-box bg-cyan-900/40 px-2 py-1 text-[9px] text-cyan-300 border-cyan-500/20">
                      ✧ {b}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="p-4 bg-black/40 text-[9px] text-wb-stone/30 italic flex justify-between border-t border-white/5">
        <span>Edad Primigenia</span>
        <span>Techs: {state.tech.unlocked.length} desbloqueadas</span>
      </footer>
    </div>
  );
}
