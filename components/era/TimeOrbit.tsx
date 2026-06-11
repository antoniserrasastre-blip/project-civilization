'use client';

import { useMemo } from 'react';
import { TICKS_PER_DAY } from '@/lib/resources';
import { currentDay, solarPhase, type SolarPhase } from '@/lib/solar';
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

const PHASE_VISUAL: Record<SolarPhase, { label: string; color: string }> = {
  amanecer: { label: 'Amanecer', color: 'text-orange-300' },
  dia: { label: 'Día', color: 'text-yellow-100' },
  ocaso: { label: 'Ocaso', color: 'text-red-400' },
  noche: { label: 'Noche', color: 'text-blue-400' },
};

export function TimeOrbit({ tick, climate }: TimeOrbitProps) {
  const dayProgress = (tick % TICKS_PER_DAY) / TICKS_PER_DAY;

  // 05d: UN solo reloj — la fase viene del SSOT solar (el mismo que usa el
  // sim para miedo/fuego/forrajeo). Antes la UI decía "Día" hasta el 60%
  // mientras el sim era nocturno desde el 50%.
  const phase = useMemo(() => PHASE_VISUAL[solarPhase(tick)], [tick]);

  if (!climate) return null;

  // 05d: el calendario deriva del TICK, no del clima — con el flag climate
  // OFF (laboratorio) el dayOfYear está congelado y los días "no avanzaban".
  const day = currentDay(tick);

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
          <span className="text-[11px] font-bold text-white/90">Día {day}</span>
          <span className="text-[9px] text-wb-stone/60">{SEASON_LABEL[climate.season]}</span>
        </div>
      </div>
    </div>
  );
}
