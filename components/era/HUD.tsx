'use client';

/**
 * HUD — barra de estado mínima del jugador.
 *
 * Sprint Fase 5 #1: añade barra de Fe con marcas visuales en 40
 * (coste silencio) y 80 (coste cambio), e indicador del susurro
 * activo (§3.7b).
 *
 * Dumb component: recibe strings/números ya calculados. Sin
 * decisiones estéticas finales — tokens base. Director Design
 * firma look & feel después.
 */

import type { MessageChoice } from '@/lib/messages';
import { MESSAGE_INTENTS, SILENCE } from '@/lib/messages';
import type { MonumentPhase } from '@/lib/monument';
import { BUILD_TICK_HOURS } from '@/lib/monument';
import {
  FAITH_CAP,
  FAITH_COST_CHANGE,
  FAITH_COST_SILENCE,
} from '@/lib/faith';

const PHASE_ES: Record<MonumentPhase, string> = {
  none: 'sin desbloquear',
  unlocked: 'desbloqueado',
  building: 'construyendo',
  built: 'en pie',
  ruin: 'en ruina',
};

const WHISPER_ES: Record<MessageChoice, string> = {
  [MESSAGE_INTENTS.AUXILIO]: 'Auxilio',
  [MESSAGE_INTENTS.CORAJE]: 'Coraje',
  [MESSAGE_INTENTS.PACIENCIA]: 'Paciencia',
  [MESSAGE_INTENTS.ENCUENTRO]: 'Encuentro',
  [MESSAGE_INTENTS.RENUNCIA]: 'Renuncia',
  [MESSAGE_INTENTS.ESPERANZA]: 'Esperanza',
  [SILENCE]: 'Silencio',
};

export interface HUDProps {
  day: number;
  gratitude: number;
  faith: number;
  activeMessage: MessageChoice | null;
  aliveCount: number;
  totalCount: number;
  monumentPhase: MonumentPhase;
  monumentProgress: number;
  onOpenWhisper: () => void;
}

function pct(progress: number): number {
  return Math.min(100, Math.round((progress / BUILD_TICK_HOURS) * 100));
}

function FaithBar({ faith }: { faith: number }) {
  const pctFaith = Math.min(100, (faith / FAITH_CAP) * 100);
  const pctSilence = (FAITH_COST_SILENCE / FAITH_CAP) * 100;
  const pctChange = (FAITH_COST_CHANGE / FAITH_CAP) * 100;
  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          position: 'relative',
          height: 8,
          background: '#1e1e1e',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #333',
        }}
      >
        <div
          data-testid="hud-faith-fill"
          style={{
            width: `${pctFaith}%`,
            height: '100%',
            background: '#a78b4b',
            transition: 'width 0.3s',
          }}
        />
        <div
          data-testid="hud-faith-mark-silence"
          title="coste silencio (40)"
          style={{
            position: 'absolute',
            left: `${pctSilence}%`,
            top: 0,
            bottom: 0,
            width: 1,
            background: '#f5f5dc',
            opacity: 0.55,
          }}
        />
        <div
          data-testid="hud-faith-mark-change"
          title="coste cambio (80)"
          style={{
            position: 'absolute',
            left: `${pctChange}%`,
            top: 0,
            bottom: 0,
            width: 1,
            background: '#f5f5dc',
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}

export function HUD({
  day,
  gratitude,
  faith,
  activeMessage,
  aliveCount,
  totalCount,
  monumentPhase,
  monumentProgress,
  onOpenWhisper,
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
      <div data-testid="hud-faith">
        <strong>Fe</strong> {Math.floor(faith)} / {FAITH_CAP}
        <FaithBar faith={faith} />
      </div>
      <div data-testid="hud-gratitude">
        <strong>Gratitud</strong> {Math.floor(gratitude)}
      </div>
      <div data-testid="hud-alive">
        <strong>Hijos vivos</strong> {aliveCount}/{totalCount}
      </div>
      <div data-testid="hud-active-whisper">
        <strong>Susurro</strong>{' '}
        {activeMessage === null ? 'silencio (gracia)' : WHISPER_ES[activeMessage]}
      </div>
      <div data-testid="hud-monument">
        <strong>Monumento</strong> {PHASE_ES[monumentPhase]}
        {showProgress && ` (${pct(monumentProgress)}%)`}
      </div>
      <button
        type="button"
        data-testid="whisper-open"
        onClick={onOpenWhisper}
        style={{
          marginTop: 8,
          width: '100%',
          background: '#2a2a1c',
          color: '#f5f5dc',
          border: '1px solid #6b5a1f',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        Hablar al clan
      </button>
    </div>
  );
}
