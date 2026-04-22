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
import {
  FAITH_CAP,
  FAITH_COST_SILENCE,
  FAITH_COST_CHANGE,
} from '@/lib/faith';

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
  faith: number;
  aliveCount: number;
  totalCount: number;
  monumentPhase: MonumentPhase;
  monumentProgress: number;
  onOpenWhisperSelector: () => void;
}

function pct(progress: number): number {
  return Math.min(100, Math.round((progress / BUILD_TICK_HOURS) * 100));
}

export function HUD({
  day,
  gratitude,
  faith,
  aliveCount,
  totalCount,
  monumentPhase,
  monumentProgress,
  onOpenWhisperSelector,
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
        minWidth: 220,
        fontFamily: 'var(--font-sans, system-ui)',
      }}
    >
      <div data-testid="hud-day">
        <strong>Día</strong> {day}
      </div>
      <div data-testid="hud-gratitude">
        <strong>Gratitud</strong> {Math.floor(gratitude)}
      </div>
      <FaithBar faith={faith} />
      <div data-testid="hud-alive">
        <strong>Hijos vivos</strong> {aliveCount}/{totalCount}
      </div>
      <div data-testid="hud-monument">
        <strong>Monumento</strong> {PHASE_ES[monumentPhase]}
        {showProgress && ` (${pct(monumentProgress)}%)`}
      </div>
      <button
        type="button"
        data-testid="talk-button"
        onClick={onOpenWhisperSelector}
        style={{
          marginTop: 8,
          width: '100%',
          background: '#2a2a2a',
          color: '#f5f5dc',
          border: '1px solid #555',
          borderRadius: 6,
          padding: '6px 10px',
          cursor: 'pointer',
          fontSize: '0.9rem',
        }}
      >
        Hablar al clan
      </button>
    </div>
  );
}

function FaithBar({ faith }: { faith: number }) {
  const clamped = Math.max(0, Math.min(FAITH_CAP, faith));
  const widthPct = (clamped / FAITH_CAP) * 100;
  const markSilence = (FAITH_COST_SILENCE / FAITH_CAP) * 100;
  const markChange = (FAITH_COST_CHANGE / FAITH_CAP) * 100;
  return (
    <div data-testid="hud-faith">
      <strong>Fe</strong> {Math.floor(faith)} / {FAITH_CAP}
      <div
        aria-label="Barra de Fe"
        style={{
          position: 'relative',
          height: 6,
          background: '#222',
          borderRadius: 3,
          marginTop: 2,
          overflow: 'hidden',
        }}
      >
        <div
          data-testid="faith-fill"
          style={{
            width: `${widthPct}%`,
            height: '100%',
            background: '#8a7a3a',
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: `${markSilence}%`,
            width: 1,
            height: '100%',
            background: '#888',
          }}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: `${markChange}%`,
            width: 1,
            height: '100%',
            background: '#ddd',
          }}
        />
      </div>
    </div>
  );
}
