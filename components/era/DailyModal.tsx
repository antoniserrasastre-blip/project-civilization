'use client';

/**
 * DailyModal — verbo diario del dios (Sprint 5.1 cableado a UI).
 *
 * Se muestra cuando `awaitsMessage(village, tick)` es true (amanecer
 * sin intención activa). Expone las 7 opciones de `VALID_CHOICES`
 * (6 intenciones + silencio). Al clicar, llama a `onChoose(choice)`
 * — el wiring de `page.tsx` se encarga de `selectIntent` + avanzar
 * el día.
 *
 * Sin decisiones de paleta finales — tokens base de shadcn. El
 * Director Design firma look & feel después.
 */

import type { MessageChoice } from '@/lib/messages';
import { MESSAGE_INTENTS, SILENCE, VALID_CHOICES } from '@/lib/messages';

const LABEL_ES: Record<MessageChoice, string> = {
  [MESSAGE_INTENTS.AUXILIO]: 'Auxilio',
  [MESSAGE_INTENTS.CORAJE]: 'Coraje',
  [MESSAGE_INTENTS.PACIENCIA]: 'Paciencia',
  [MESSAGE_INTENTS.ENCUENTRO]: 'Encuentro',
  [MESSAGE_INTENTS.RENUNCIA]: 'Renuncia',
  [MESSAGE_INTENTS.ESPERANZA]: 'Esperanza',
  [SILENCE]: 'Silencio',
};

export interface DailyModalProps {
  /** Día actual (empieza en 1, no en 0). */
  day: number;
  onChoose: (choice: MessageChoice) => void;
}

export function DailyModal({ day, onChoose }: DailyModalProps) {
  return (
    <aside
      data-testid="daily-modal"
      role="dialog"
      aria-label={`Amanecer del día ${day}`}
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#0e0e0e',
        color: '#f5f5dc',
        padding: '16px 20px',
        borderRadius: 10,
        minWidth: 420,
        maxWidth: 620,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        border: '1px solid #1e1e1e',
        zIndex: 20,
      }}
    >
      <h2
        data-testid="daily-modal-title"
        style={{ margin: 0, marginBottom: 4, fontSize: '1.15rem' }}
      >
        Amanecer del día {day}
      </h2>
      <p
        style={{
          margin: 0,
          marginBottom: 12,
          opacity: 0.75,
          lineHeight: 1.4,
          fontSize: '0.9rem',
        }}
      >
        Los hijos de Tramuntana esperan tu voz. ¿Qué susurras al
        viento hoy?
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}
      >
        {VALID_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            data-testid={`daily-option-${choice}`}
            onClick={() => onChoose(choice)}
            style={{
              background: '#1e1e1e',
              color: '#f5f5dc',
              border: '1px solid #333',
              borderRadius: 6,
              padding: '8px 10px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            {LABEL_ES[choice]}
          </button>
        ))}
      </div>
    </aside>
  );
}
