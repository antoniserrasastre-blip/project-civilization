'use client';

/**
 * HUD — barra de estado mínima del jugador.
 *
 * Muestra día actual, gratitud, NPCs vivos y fase del monumento.
 * Dumb component: recibe strings/números ya calculados. Sin
 * decisiones estéticas finales — tokens base. Director Design
 * firma look & feel después.
 *
 * Progreso del monumento solo se muestra en fase 'building' o
 * superior; en 'none' / 'unlocked' sale el texto de fase para
 * que el jugador sepa dónde está del arco.
 */

import type { MonumentPhase } from '@/lib/monument';
import { BUILD_TICK_HOURS } from '@/lib/monument';

const PHASE_ES: Record<MonumentPhase, string> = {
  none: 'sin desbloquear',
  unlocked: 'desbloqueado',
  building: 'construyendo',
  built: 'en pie',
  ruin: 'en ruina',
};

export interface HUDProps {
  day: number;
  gratitude: number;
  aliveCount: number;
  totalCount: number;
  monumentPhase: MonumentPhase;
  monumentProgress: number;
}

function pct(progress: number): number {
  return Math.min(100, Math.round((progress / BUILD_TICK_HOURS) * 100));
}

export function HUD({
  day,
  gratitude,
  aliveCount,
  totalCount,
  monumentPhase,
  monumentProgress,
}: HUDProps) {
  const showProgress =
    monumentPhase === 'building' || monumentPhase === 'built';
  return (
    <div
      data-testid="hud"
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        background: 'rgba(0,0,0,0.65)',
        color: '#f5f5dc',
        padding: '10px 14px',
        borderRadius: 8,
        fontSize: '0.9rem',
        lineHeight: 1.5,
        zIndex: 10,
        minWidth: 180,
        fontFamily: 'var(--font-sans, system-ui)',
      }}
    >
      <div data-testid="hud-day">
        <strong>Día</strong> {day}
      </div>
      <div data-testid="hud-gratitude">
        <strong>Gratitud</strong> {gratitude}
      </div>
      <div data-testid="hud-alive">
        <strong>Hijos vivos</strong> {aliveCount}/{totalCount}
      </div>
      <div data-testid="hud-monument">
        <strong>Monumento</strong> {PHASE_ES[monumentPhase]}
        {showProgress && ` (${pct(monumentProgress)}%)`}
      </div>
    </div>
  );
}
