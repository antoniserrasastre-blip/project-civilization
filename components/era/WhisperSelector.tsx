'use client';

/**
 * WhisperSelector — panel de elección del susurro persistente.
 *
 * Sprint #1 REFACTOR-SUSURRO-FE (vision-primigenia §3.7, §3.7b).
 * Renombrado de `DailyModal`. Ya no aparece forzado al amanecer;
 * se abre cuando el jugador pulsa "Hablar al clan". Muestra el
 * coste en Fe de cada opción y deshabilita las que no alcanza.
 */

import type { MessageChoice } from '@/lib/messages';
import { MESSAGE_INTENTS, SILENCE, VALID_CHOICES, changeCost } from '@/lib/messages';
import type { VillageState } from '@/lib/village';

const LABEL_ES: Record<MessageChoice, string> = {
  [MESSAGE_INTENTS.AUXILIO]: 'Auxilio',
  [MESSAGE_INTENTS.CORAJE]: 'Coraje',
  [MESSAGE_INTENTS.PACIENCIA]: 'Paciencia',
  [MESSAGE_INTENTS.ENCUENTRO]: 'Encuentro',
  [MESSAGE_INTENTS.RENUNCIA]: 'Renuncia',
  [MESSAGE_INTENTS.ESPERANZA]: 'Esperanza',
  [SILENCE]: 'Silencio',
};

export interface WhisperSelectorProps {
  village: VillageState;
  onChoose: (choice: MessageChoice) => void;
  onClose: () => void;
}

export function WhisperSelector({
  village,
  onChoose,
  onClose,
}: WhisperSelectorProps) {
  return (
    <aside
      data-testid="whisper-selector"
      role="dialog"
      aria-label="Elegir susurro al clan"
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Susurrar al clan</h2>
        <button
          type="button"
          data-testid="whisper-close"
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            background: 'transparent',
            color: '#f5f5dc',
            border: '1px solid #333',
            borderRadius: 4,
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
      <p
        style={{
          margin: 0,
          marginBottom: 12,
          opacity: 0.75,
          lineHeight: 1.4,
          fontSize: '0.9rem',
        }}
      >
        El susurro permanece activo hasta que cambies. Fe actual:{' '}
        <strong>{Math.floor(village.faith)}</strong>.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}
      >
        {VALID_CHOICES.map((choice) => {
          const cost = changeCost(village, choice);
          const disabled = cost > village.faith;
          const isActive = village.activeMessage === choice;
          return (
            <button
              key={choice}
              type="button"
              data-testid={`whisper-option-${choice}`}
              disabled={disabled}
              onClick={() => onChoose(choice)}
              style={{
                background: isActive ? '#2b2b17' : '#1e1e1e',
                color: '#f5f5dc',
                border: `1px solid ${isActive ? '#8a7a3a' : '#333'}`,
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: '0.9rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                opacity: disabled ? 0.45 : 1,
              }}
            >
              <div>{LABEL_ES[choice]}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                {cost === 0 ? (isActive ? 'activo' : 'gratis') : `${cost} Fe`}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
