'use client';

/**
 * ClanContext — panel de contexto del clan que acompaña al selector
 * de susurro (Sprint #2 Fase 5 LEGIBILIDAD-MVP).
 *
 * Recibe el `ClanSummary` pre-calculado por `lib/clan-context.ts` y
 * lo pinta como 3 indicadores legibles: hambre, apuros, días desde
 * el último nacimiento. El jugador lo lee antes de elegir susurro.
 *
 * Dumb component — no orquesta nada.
 */

import type { ClanSummary } from '@/lib/clan-context';

export interface ClanContextProps {
  summary: ClanSummary;
}

export function ClanContext({ summary }: ClanContextProps) {
  return (
    <section
      data-testid="clan-context"
      aria-label="Contexto del clan"
      style={{
        background: '#161613',
        border: '1px solid #2a2a1c',
        borderRadius: 6,
        padding: '8px 10px',
        marginBottom: 12,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8,
        fontSize: '0.8rem',
      }}
    >
      <div data-testid="clan-context-hunger">
        <div style={{ opacity: 0.6, fontSize: '0.72rem' }}>Hambre media</div>
        <div style={{ fontWeight: 600 }}>{summary.hungerMeanPct}%</div>
      </div>
      <div data-testid="clan-context-distress">
        <div style={{ opacity: 0.6, fontSize: '0.72rem' }}>En apuros</div>
        <div style={{ fontWeight: 600 }}>
          {summary.inDistressCount} / {summary.aliveCount}
        </div>
      </div>
      <div data-testid="clan-context-birth">
        <div style={{ opacity: 0.6, fontSize: '0.72rem' }}>Último nacimiento</div>
        <div style={{ fontWeight: 600 }}>
          hace {summary.daysSinceLastBirth} d
        </div>
      </div>
    </section>
  );
}
