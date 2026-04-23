'use client';

/**
 * WhisperSelector — selector del susurro persistente (§3.7, §3.7b).
 *
 * Sprint Fase 5 #1: ya NO aparece forzado al amanecer. Lo abre el
 * jugador desde el botón "Hablar al clan" del HUD. Muestra las 7
 * opciones (6 intenciones + silencio) con su coste actual en Fe.
 *
 * Regla de coste visible (§3.7b):
 *   - Primer susurro (sin activeMessage) → gratis.
 *   - Cambio a otro intent → 80 Fe.
 *   - Silencio elegido tras susurro → 40 Fe.
 *   - Reseleccionar la misma intención activa → no-op (gratis).
 *
 * Tokens base de shadcn — Director Design firma look & feel después.
 */

import type { MessageChoice } from '@/lib/messages';
import { MESSAGE_INTENTS, SILENCE, VALID_CHOICES } from '@/lib/messages';
import { FAITH_COST_CHANGE, FAITH_COST_SILENCE } from '@/lib/faith';
import { ClanContext, type ClanContextProps } from '@/components/era/ClanContext';

const LABEL_ES: Record<MessageChoice, string> = {
  [MESSAGE_INTENTS.AUXILIO]: 'Auxilio',
  [MESSAGE_INTENTS.CORAJE]: 'Coraje',
  [MESSAGE_INTENTS.PACIENCIA]: 'Paciencia',
  [MESSAGE_INTENTS.ENCUENTRO]: 'Encuentro',
  [MESSAGE_INTENTS.RENUNCIA]: 'Renuncia',
  [MESSAGE_INTENTS.ESPERANZA]: 'Esperanza',
  [SILENCE]: 'Silencio',
};

/** Texto de "tonalidad que empuja" (§3.7 vision-primigenia, columna 3
 *  de la tabla de intenciones). Es el empujón que el jugador lee
 *  antes de decidir. Condensado a 1-2 líneas para el tooltip. */
const TONALITY_ES: Record<MessageChoice, string> = {
  [MESSAGE_INTENTS.AUXILIO]:
    'Supervivencia primero; reparto de recursos. Para clan hambriento, herido o cansado.',
  [MESSAGE_INTENTS.CORAJE]:
    'Acción, asumir riesgos, salir del confort. Para decisiones difíciles o caza arriesgada.',
  [MESSAGE_INTENTS.PACIENCIA]:
    'Aguardar, negociar, reparar antes que castigar. Para conflicto interno o deudas tensas.',
  [MESSAGE_INTENTS.ENCUENTRO]:
    'Buscar al otro: pairing y reconciliación. Para soledad o linajes desconectados.',
  [MESSAGE_INTENTS.RENUNCIA]:
    'Soltar, migrar, dejar ir. Para recursos agotados localmente o apego insostenible.',
  [MESSAGE_INTENTS.ESPERANZA]:
    'Mirar al futuro; reforzar fe, perseverar. Para baja moral o herejía incipiente.',
  [SILENCE]:
    'Sin empuje. El mundo corre sin voz. Pausa táctica o emergency-stop.',
};

export interface WhisperSelectorProps {
  activeMessage: MessageChoice | null;
  faith: number;
  clan: ClanContextProps['summary'];
  onChoose: (choice: MessageChoice) => void;
  onClose: () => void;
}

function costFor(
  choice: MessageChoice,
  active: MessageChoice | null,
): number {
  if (active === null) return 0;
  if (active === choice) return 0;
  return choice === SILENCE ? FAITH_COST_SILENCE : FAITH_COST_CHANGE;
}

export function WhisperSelector({
  activeMessage,
  faith,
  clan,
  onChoose,
  onClose,
}: WhisperSelectorProps) {
  return (
    <aside
      data-testid="whisper-selector"
      role="dialog"
      aria-label="Susurro al clan"
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
        maxWidth: 640,
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        border: '1px solid #1e1e1e',
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <h2
          data-testid="whisper-selector-title"
          style={{ margin: 0, fontSize: '1.15rem' }}
        >
          Susurro al clan
        </h2>
        <button
          type="button"
          data-testid="whisper-close"
          onClick={onClose}
          style={{
            background: 'transparent',
            color: '#888',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          cerrar
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
        {activeMessage === null
          ? 'Tu primer susurro es gratuito — estrena la voz.'
          : 'Tu susurro resuena entre los Hijos. Cambiarlo cuesta Fe.'}
      </p>
      <ClanContext summary={clan} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
        }}
      >
        {VALID_CHOICES.map((choice) => {
          const cost = costFor(choice, activeMessage);
          const disabled = cost > faith;
          const isActive = activeMessage === choice;
          return (
            <button
              key={choice}
              type="button"
              data-testid={`whisper-option-${choice}`}
              disabled={disabled}
              onClick={() => onChoose(choice)}
              title={TONALITY_ES[choice]}
              style={{
                background: isActive ? '#2a2a1c' : '#1e1e1e',
                color: disabled ? '#555' : '#f5f5dc',
                border: `1px solid ${isActive ? '#6b5a1f' : '#333'}`,
                borderRadius: 6,
                padding: '8px 10px',
                fontSize: '0.9rem',
                cursor: disabled ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <div style={{ fontWeight: isActive ? 700 : 500 }}>
                {LABEL_ES[choice]}
              </div>
              <div
                data-testid={`whisper-option-${choice}-cost`}
                style={{ fontSize: '0.75rem', opacity: 0.7 }}
              >
                {cost === 0 ? 'gratis' : `${cost} Fe`}
              </div>
              <div
                data-testid={`whisper-option-${choice}-desc`}
                style={{
                  fontSize: '0.7rem',
                  opacity: 0.6,
                  marginTop: 4,
                  lineHeight: 1.25,
                  textAlign: 'left',
                }}
              >
                {TONALITY_ES[choice]}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
