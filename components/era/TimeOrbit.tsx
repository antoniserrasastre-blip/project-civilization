'use client';

import { useMemo } from 'react';
import { TICKS_PER_DAY } from '@/lib/resources';
import type { ClimateState } from '@/lib/world-state';

interface TimeOrbitProps {
  tick: number;
  climate: ClimateState;
}

const SEASON_LABEL = {
  spring: 'Primavera',
  summer: 'Verano',
  autumn: 'Otoño',
  winter: 'Invierno',
};

const SEASON_ICON = {
  spring: '🌱',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
};

export function TimeOrbit({ tick, climate }: TimeOrbitProps) {
  const dayProgress = (tick % TICKS_PER_DAY) / TICKS_PER_DAY;
  
  if (!climate) return null;

  // Determinar fase del día
  const phase = useMemo(() => {
    if (dayProgress < 0.15) return { label: 'Amanecer', color: 'text-orange-300' };
    if (dayProgress < 0.60) return { label: 'Día', color: 'text-yellow-100' };
    if (dayProgress < 0.80) return { label: 'Ocaso', color: 'text-red-400' };
    return { label: 'Noche', color: 'text-blue-400' };
  }, [dayProgress]);

  const year = Math.floor(climate.dayOfYear / 60) + 1;
  const dayOfSeason = (climate.dayOfYear % 15) + 1;

  return (
    <div className="pixel-box bg-stone-900/90 p-3 flex flex-col gap-1 min-w-[120px] pointer-events-auto border-wb-stone/40">
      <div className="flex justify-between items-center border-b border-white/10 pb-1 mb-1">
        <span className="text-[10px] text-wb-gold font-black italic">Ciclo Solar</span>
        <span className={`text-[10px] font-bold ${phase.color}`}>{phase.label}</span>
      </div>
      
      {/* Barra de progreso del día */}
      <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden mb-2">
        <div 
          className="h-full bg-gradient-to-r from-orange-500 via-yellow-200 to-blue-900 transition-all duration-1000"
          style={{ width: `${dayProgress * 100}%` }}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xl">{SEASON_ICON[climate.season]}</span>
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-white/90">{SEASON_LABEL[climate.season]}</span>
          <span className="text-[9px] text-wb-stone/60">Día {dayOfSeason} del Año {year}</span>
        </div>
      </div>
    </div>
  );
}
