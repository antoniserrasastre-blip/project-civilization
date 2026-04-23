'use client';

/**
 * HUD — barra de estado del jugador.
 *
 * Combina las dos ramas de feedback del Sprint Fase 5 + Gratitud v2:
 *   - Fe (Sprint Fase 5 #1): barra con marcas en 40 (coste silencio)
 *     y 80 (coste cambio) + indicador del susurro activo (§3.7b).
 *   - Gratitud v2: número con pulso de color (verde saturado M+L,
 *     verde claro S, rojo pérdidas) y floater `+N` / `-N` que sube
 *     22px y se desvanece en ~1.2s (hook `useGratitudeFloaters`).
 *
 * El prop `village` es opcional: si no se pasa, el hook se llama
 * con un shape sintético estable y no dispara floaters — así
 * tests antiguos que pasan `gratitude` directo siguen funcionando.
 *
 * `onOpenWhisper` abre el selector de susurro desde el botón
 * "Hablar al clan" (§3.7 susurro persistente).
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
import type { VillageState } from '@/lib/village';
import type { CraftableId } from '@/lib/crafting';
import type { NPCInventory } from '@/lib/npcs';
import { useGratitudeFloaters } from '@/hooks/use-gratitude-floaters';
import { SYNERGY_CATALOG, type ActiveSynergy } from '@/lib/synergies';

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

const CRAFTABLE_ES: Record<CraftableId, string> = {
  refugio: 'Refugio',
  fogata_permanente: 'Fogata',
  piel_ropa: 'Piel/ropa',
  despensa: 'Despensa',
};

const INVENTORY_ES = {
  wood: 'madera',
  stone: 'piedra',
  berry: 'bayas',
  game: 'caza',
  fish: 'pescado',
  obsidian: 'obsidiana',
  shell: 'concha',
} as const;

export interface BuildHudStatus {
  next: CraftableId | null;
  ready: boolean;
  missing: Partial<Record<keyof typeof INVENTORY_ES, number>>;
  active?: {
    kind: CraftableId;
    progress: number;
    required: number;
  };
}

export interface HUDProps {
  day: number;
  gratitude: number;
  faith: number;
  activeMessage: MessageChoice | null;
  aliveCount: number;
  totalCount: number;
  monumentPhase: MonumentPhase;
  monumentProgress: number;
  /** Opcional — habilita pulso animado + floater de gratitud. */
  village?: VillageState;
  buildStatus?: BuildHudStatus;
  /** Sprint 11 OBSERVABILIDAD-TOTAL: pool agregado de inventarios
   *  vivos del clan. Visible siempre que se pase; los tests antiguos
   *  que no lo inyectan siguen pasando. */
  communalInventory?: NPCInventory;
  /** Sprint 13: sinergias activas por composición del clan. */
  activeSynergies?: ActiveSynergy[];
  paused: boolean;
  onTogglePause: () => void;
  onOpenWhisper: () => void;
}

function pct(progress: number): number {
  return Math.min(100, Math.round((progress / BUILD_TICK_HOURS) * 100));
}

function floaterColor(delta: number): string {
  if (delta < 0) return '#f87171';
  if (delta >= 5) return '#4ade80';
  return '#a7f3d0';
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
  village,
  buildStatus,
  communalInventory,
  activeSynergies,
  paused,
  onTogglePause,
  onOpenWhisper,
}: HUDProps) {
  const showProgress =
    monumentPhase === 'building' || monumentPhase === 'built';
  // Hook siempre llamado — Rules of Hooks. Si no hay `village`,
  // pasamos uno sintético estable (gratitud idéntica entre renders
  // → no dispara floaters).
  const floaters = useGratitudeFloaters(
    village ??
      ({
        gratitude,
        gratitudeEarnedToday: 0,
        gratitudeEventKeys: [],
        dailyDeaths: 0,
        dailyHungerEscapes: 0,
        consecutiveNightsAtFire: 0,
        faith: 0,
        silenceGraceDaysRemaining: 0,
        activeMessage: null,
        messageHistory: [],
        blessings: [],
      } as VillageState),
  );
  const lastFloater = floaters[floaters.length - 1];
  const pulsing = lastFloater !== undefined;
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div data-testid="hud-day">
          <strong>Día</strong> {day}
        </div>
        <button
          type="button"
          data-testid="pause-toggle"
          onClick={onTogglePause}
          title={paused ? 'Reanudar (Espacio)' : 'Pausar (Espacio)'}
          style={{
            background: paused ? '#2a2a1c' : '#1e1e1e',
            color: '#f5f5dc',
            border: `1px solid ${paused ? '#6b5a1f' : '#333'}`,
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: '0.78rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {paused ? '▶ Reanudar' : '⏸ Pausar'}
        </button>
      </div>
      <div data-testid="hud-faith">
        <strong>Fe</strong> {Math.floor(faith)} / {FAITH_CAP}
        <FaithBar faith={faith} />
      </div>
      <div
        data-testid="hud-gratitude"
        style={{
          position: 'relative',
          transition: 'color 400ms ease-out',
          color: pulsing ? floaterColor(lastFloater.delta) : '#f5f5dc',
        }}
      >
        <strong>Gratitud</strong> {Math.floor(gratitude)}
        {floaters.map((f) => (
          <span
            key={f.id}
            data-testid="gratitude-floater"
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '100%',
              marginLeft: 8,
              top: 0,
              color: floaterColor(f.delta),
              fontWeight: 700,
              pointerEvents: 'none',
              animation: 'gratitude-floater-rise 1200ms ease-out forwards',
            }}
          >
            {f.delta > 0 ? `+${f.delta}` : `${f.delta}`}
          </span>
        ))}
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
      {communalInventory && (
        <div
          data-testid="hud-inventory"
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: '1px solid rgba(245,245,220,0.18)',
            fontSize: '0.78rem',
            lineHeight: 1.35,
          }}
        >
          <strong style={{ fontSize: '0.82rem' }}>Inventario comunal</strong>
          <div
            style={{
              marginTop: 4,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4,
              opacity: 0.92,
            }}
          >
            {([
              ['wood',     'madera'],
              ['stone',    'piedra'],
              ['berry',    'bayas'],
              ['game',     'caza'],
              ['fish',     'pescado'],
              ['obsidian', 'obsidiana'],
              ['shell',    'concha'],
            ] as const).map(([key, label]) => (
              <span
                key={key}
                data-testid={`hud-inventory-${key}`}
                title={label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '0.76rem',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/resources/${key}.svg`}
                  alt={label}
                  style={{
                    width: 20,
                    height: 20,
                    imageRendering: 'pixelated',
                    opacity: communalInventory[key] === 0 ? 0.3 : 1,
                  }}
                />
                <strong style={{ fontSize: '0.78rem' }}>
                  {communalInventory[key]}
                </strong>
              </span>
            ))}
          </div>
        </div>
      )}
      {buildStatus && (
        <div
          data-testid="hud-build"
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: '1px solid rgba(245,245,220,0.18)',
          }}
        >
          <strong>Construcción</strong>{' '}
          {buildStatus.active
            ? CRAFTABLE_ES[buildStatus.active.kind]
            : buildStatus.next
              ? CRAFTABLE_ES[buildStatus.next]
              : 'completa'}
          {buildStatus.active ? (
            <div
              data-testid="hud-build-progress"
              style={{ fontSize: '0.76rem', opacity: 0.78 }}
            >
              Obra:{' '}
              {Math.round(
                (buildStatus.active.progress / buildStatus.active.required) *
                  100,
              )}
              %
            </div>
          ) : (
            buildStatus.next &&
            (buildStatus.ready ? (
              <span style={{ color: '#a7f3d0' }}> lista</span>
            ) : (
              <div
                data-testid="hud-build-missing"
                style={{ fontSize: '0.76rem', opacity: 0.78 }}
              >
                Falta:{' '}
                {Object.entries(buildStatus.missing)
                  .filter(([, amount]) => amount > 0)
                  .map(
                    ([key, amount]) =>
                      `${INVENTORY_ES[key as keyof typeof INVENTORY_ES]} ${amount}`,
                  )
                  .join(', ')}
              </div>
            ))
          )}
        </div>
      )}
      {activeSynergies && activeSynergies.length > 0 && (
        <div
          data-testid="hud-synergies"
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: '1px solid rgba(245,245,220,0.18)',
          }}
        >
          <strong style={{ fontSize: '0.8rem', opacity: 0.85 }}>Sinergies actives</strong>
          {activeSynergies.map((s) => {
            const def = SYNERGY_CATALOG[s.id];
            return (
              <div
                key={s.id}
                data-testid={`synergy-${s.id}`}
                style={{
                  fontSize: '0.76rem',
                  marginTop: 3,
                  color: '#a7f3d0',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>⚡ {def.name}</span>
                <span style={{ opacity: 0.7 }}>{s.npcIds.length} NPCs</span>
              </div>
            );
          })}
        </div>
      )}
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
      <style>{`
        @keyframes gratitude-floater-rise {
          0% { opacity: 0; transform: translateY(0); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-22px); }
        }
      `}</style>
    </div>
  );
}
