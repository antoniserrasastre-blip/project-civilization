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
import { DivineHeader } from '../ui/DivineHeader';
import { ResourceMonitor, type ResourceData } from '../ui/ResourceMonitor';
import { EurekaToast, type EurekaEvent } from '../ui/EurekaToast';
import { RESOURCE_LABEL } from '@/lib/world-state';
import { GRATITUDE_CEILING } from '@/lib/gratitude';

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
  godType?: string;
  currentWind?: string;
  unlockedKinds?: string[];
  onDismissEureka?: (id: string) => void;
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
  communalInventory = { wood: 0, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0 },
  activeSynergies = [],
  paused,
  onTogglePause,
  onOpenWhisper,
  godType = 'stone',
  currentWind = 'Tramuntana',
  unlockedKinds = [],
  onDismissEureka = () => {},
}: HUDProps) {
  // Mapear inventario para el monitor
  const resources: ResourceData[] = Object.entries(communalInventory)
    .filter(([_, amount]) => amount > 0)
    .map(([id, amount]) => ({
      id,
      name: RESOURCE_LABEL[id as any] || id,
      amount,
      // Los archivos se llaman berry.svg, wood.svg, etc.
      icon: `/resources/${id}.svg`,
      trend: 'stable',
    }));

  // Mapear notificaciones de Eureka
  const eurekaEvents: EurekaEvent[] = unlockedKinds.map((kind) => {
    // Fallback de iconos: si no hay tech_X, usamos skill_X o similar
    const iconMap: Record<string, string> = {
      navigation: '/ui/tech_navigation.svg',
      pottery: '/ui/tech_pottery.svg',
      agriculture: '/ui/tech_agriculture.svg',
      weaving: '/ui/tech_weaving.svg',
      masonry: '/ui/tech_masonry.svg',
      hand_axe: '/ui/skill_craft.svg',
      spear: '/ui/skill_hunt.svg',
    };
    return {
      id: kind,
      title: '¡Descubrimiento!',
      description: `Tu clan ha comprendido el secreto de: ${kind}`,
      icon: iconMap[kind] || '/ui/bubble_work.svg',
    };
  });

  const showProgress = monumentPhase === 'building' || monumentPhase === 'built';

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
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col justify-between p-4 font-monospace uppercase tracking-wider">
      {/* Superior: Identidad y Recursos */}
      <div className="flex w-full items-start justify-between">
        <div className="pointer-events-auto">
          <DivineHeader
            godType={godType as any}
            faith={faith}
            maxFaith={FAITH_CAP}
            gratitude={gratitude}
            maxGratitude={GRATITUDE_CEILING}
            currentWind={currentWind}
          />
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <ResourceMonitor resources={resources} />
          {showProgress && monumentProgress < 100 && (
            <div className="pixel-box bg-stone-900/80 p-2 text-[10px] text-amber-200">
              Obra del Monumento: {Math.round((monumentProgress / 480) * 100)}%
            </div>
          )}
        </div>
      </div>

      {/* Lateral: Eurekas */}
      <div className="pointer-events-auto absolute right-4 top-40">
        <EurekaToast events={eurekaEvents} onDismiss={onDismissEureka} />
      </div>

      {/* Inferior: Control y Sinergias */}
      <div className="flex w-full items-end justify-between">
        <div className="pointer-events-auto flex flex-col gap-4">
          {/* Sinergies Actives */}
          {activeSynergies.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-cyan-400 opacity-70">Sinergies actives</span>
              <div className="flex gap-2">
                {activeSynergies.map((s) => (
                  <div key={s.id} className="pixel-box bg-cyan-900/40 px-2 py-1 text-[10px] text-cyan-300">
                    ⚡ {SYNERGY_CATALOG[s.id].name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onOpenWhisper}
              className="pixel-box bg-stone-800 px-4 py-2 text-sm text-amber-200 transition-colors hover:bg-stone-700"
            >
              {activeMessage ? `Susurro: ${WHISPER_ES[activeMessage]}` : 'Hablar al clan'}
            </button>
            <button
              onClick={onTogglePause}
              className="pixel-box bg-stone-800 px-4 py-2 text-sm text-stone-300 transition-colors hover:bg-stone-700"
            >
              {paused ? '▶ Continuar' : '⏸ Pausar'}
            </button>
          </div>
        </div>

        <div className="text-right text-[10px] text-stone-500">
          Día {day} · Hijos vivos: {aliveCount}/{totalCount}
        </div>
      </div>
      
      <style jsx global>{`
        .pixel-box {
          border: 2px solid #2f2f2f;
          box-shadow: 2px 2px 0px #000;
        }
      `}</style>
    </div>
  );
}
