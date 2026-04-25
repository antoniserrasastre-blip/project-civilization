'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapView, type NpcIntentTrail } from '@/components/map/MapView';
import type { NpcStatusVisual } from '@/components/map/MapView';
import { WhisperSelector } from '@/components/era/WhisperSelector';
import { HUD, type BuildHudStatus } from '@/components/era/HUD';
import { ChronicleFeed } from '@/components/era/ChronicleFeed';
import {
  NpcSheet,
  type NpcBiography,
  type NpcOperationalStatus,
} from '@/components/era/NpcSheet';
import { TribalPlaceholder } from '@/components/era/TribalPlaceholder';
import { DivineLogPanel, type DivineLogEntry } from '@/components/era/DivineLogPanel';
import type { GameState } from '@/lib/game-state';
import { applyPlayerIntent, type MessageChoice } from '@/lib/messages';
import { TICKS_PER_DAY } from '@/lib/resources';
import {
  makeNpcReachabilityChecker,
  nextBuildPriority,
} from '@/lib/simulation';
import { summarizeClanState } from '@/lib/clan-context';
import { grantMiracle, type MiracleId } from '@/lib/miracles';
import { decideDestination, NEED_THRESHOLDS, carriedFood } from '@/lib/needs';
import { firstStructureOfKind } from '@/lib/structures';
import { clanInventoryTotal, CRAFTABLE, RECIPES } from '@/lib/crafting';
import type { NPC, NPCInventory } from '@/lib/npcs';
import { RESOURCE, TILE, type TileId } from '@/lib/world-state';
import { buildNpcBiography } from '@/lib/biography';
import { computeRole } from '@/lib/roles';
import { itemForNpc, itemLabel } from '@/lib/items';
import { computeActiveSynergies, type ActiveSynergy } from '@/lib/synergies';
import { DraftScreen, type DraftResult } from '@/components/draft/DraftScreen';
import { DebugOverlay } from '@/components/debug/DebugOverlay';

// LIBRERÍAS NUEVAS
import { useGameStore } from '@/lib/game-store';
import { PerformanceStats } from '@/components/debug/PerformanceStats';

const TICK_INTERVAL_MS = 250;

const TILE_LABEL: Record<TileId, string> = {
  [TILE.WATER]:            'agua profunda',
  [TILE.SHALLOW_WATER]:    'agua poco profunda',
  [TILE.SHORE]:            'orilla',
  [TILE.GRASS]:            'pradera',
  [TILE.FOREST]:           'bosque',
  [TILE.MOUNTAIN]:         'montaña',
  [TILE.SAND]:             'arena',
  [TILE.GRASS_LUSH]:       'pradera frondosa',
  [TILE.GRASS_SABANA]:     'sabana',
  [TILE.SAND_TROPICAL]:    'playa tropical',
  [TILE.JUNGLE_SOIL]:      'jungla',
  [TILE.MOUNTAIN_SNOW]:    'cima nevada',
  [TILE.MOUNTAIN_VOLCANO]: 'volcán',
  [TILE.RIVER]:            'río',
};

function actionForDestination(
  state: GameState,
  npc: NPC,
  destination: { x: number; y: number },
): string {
  if (destination.x === npc.position.x && destination.y === npc.position.y) {
    if (npc.stats.supervivencia < NEED_THRESHOLDS.supervivenciaBuildReady) return 'recuperándose';
    return 'quieto';
  }
  const fire = firstStructureOfKind(state.structures, CRAFTABLE.FOGATA_PERMANENTE);
  if (fire && destination.x === fire.position.x && destination.y === fire.position.y) return 'vuelve a la fogata';
  const resource = state.world.resources.find(r => r.quantity > 0 && r.x === destination.x && r.y === destination.y);
  if (resource?.id === RESOURCE.WATER) return 'busca agua';
  if (resource?.id && [RESOURCE.BERRY, RESOURCE.GAME, RESOURCE.FISH].includes(resource.id)) return 'busca comida';
  if (resource?.id && [RESOURCE.WOOD, RESOURCE.STONE].includes(resource.id)) return 'recolecta para construir';
  if (npc.stats.socializacion < NEED_THRESHOLDS.socializacionLow) return 'busca al clan';
  return 'se desplaza';
}

import { CivilizationCodex } from '@/components/era/CivilizationCodex';

export interface GameShellProps {
  seed: number;
}

export function GameShell({ seed }: GameShellProps) {
  const { state, paused, isTabActive, tick, setPaused, setIsTabActive, updateState, initializeFromDraft, bootstrap } = useGameStore();
  
  const [draftDone, setDraftDone] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [codexOpen, setCodexOpen] = useState(false);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [dismissedEurekas, setDismissedEurekas] = useState<Set<string>>(new Set());
  const [divineLogs, setDivineLogs] = useState<DivineLogEntry[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Inicializar store si la semilla cambia
  useEffect(() => {
    bootstrap(seed);
  }, [seed, bootstrap]);

  // Manejar visibilidad de pestaña
  useEffect(() => {
    const handleVisibility = () => setIsTabActive(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [setIsTabActive]);

  // Manejar teclado (Pausa y Logs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setPaused(!paused);
      }
      if (e.ctrlKey && (e.key === '<' || e.key === '`')) {
        e.preventDefault();
        setIsLogOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paused, setPaused]);

  // Loop de simulación centralizado
  useEffect(() => {
    if (!draftDone || paused) return;
    const interval = isTabActive ? TICK_INTERVAL_MS : TICK_INTERVAL_MS * 4;
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [draftDone, paused, isTabActive, tick]);

  const handleDraftStart = (result: DraftResult) => {
    initializeFromDraft(result.seed, result.mapType, result.npcs);
    setDraftDone(true);
  };

  const onChoose = (choice: MessageChoice) => {
    updateState((prev) => {
      try {
        return { ...prev, village: applyPlayerIntent(prev.village, choice, prev.tick) };
      } catch {
        return prev;
      }
    });
    setSelectorOpen(false);
  };

  const onGrantMiracle = (miracleId: MiracleId) => {
    if (!selectedNpcId) return;
    updateState((prev) => {
      try {
        return grantMiracle(prev, selectedNpcId, miracleId);
      } catch {
        return prev;
      }
    });
  };

  const handleDismissEureka = (id: string) => {
    setDismissedEurekas((prev) => new Set([...prev, id]));
  };

  // Monitor Divino: Volcado analítico cada 5 segundos
  useEffect(() => {
    if (!draftDone) return;
    const monitorId = setInterval(() => {
      if (paused) return;
      const s = useGameStore.getState().state;
      const aliveNpcs = s.npcs.filter(n => n.alive);
      if (aliveNpcs.length === 0) return;

      const avgSv = aliveNpcs.reduce((acc, n) => acc + n.stats.supervivencia, 0) / aliveNpcs.length;
      const avgSoc = aliveNpcs.reduce((acc, n) => acc + n.stats.socializacion, 0) / aliveNpcs.length;
      const avgProp = aliveNpcs.reduce((acc, n) => acc + (n.stats.proposito || 0), 0) / aliveNpcs.length;
      const inv = clanInventoryTotal(s.npcs, s.structures);
      
      const sumX = aliveNpcs.reduce((acc, n) => acc + n.position.x, 0);
      const sumY = aliveNpcs.reduce((acc, n) => acc + n.position.y, 0);

      const newEntry: DivineLogEntry = {
        tick: s.tick,
        avgSv,
        avgSoc,
        avgProp,
        wood: inv.wood,
        stone: inv.stone,
        food: inv.berry + inv.fish + inv.game,
        pos: { x: Math.round(sumX / aliveNpcs.length), y: Math.round(sumY / aliveNpcs.length) },
        status: avgSv > 80 ? 'optimal' : avgSv > 40 ? 'warning' : 'critical'
      };

      setDivineLogs(prev => [...prev.slice(-9), newEntry]);
    }, 5000);
    return () => clearInterval(monitorId);
  }, [draftDone, paused]);

  // MEMOS PARA UI (Solo recalculan si el state de Zustand cambia)
  const spawnCenter = useMemo(() => {
    const anchor = state.npcs.find((n) => n.alive);
    return anchor ? anchor.position : { x: 0, y: 0 };
  }, [state.npcs]);

  const day = useMemo(() => Math.floor(state.tick / TICKS_PER_DAY) + 1, [state.tick]);
  const aliveCount = useMemo(() => state.npcs.filter((n) => n.alive).length, [state.npcs]);
  const clanSummary = useMemo(() => summarizeClanState(state.npcs, state.tick), [state.npcs, state.tick]);

  const intentTrails = useMemo<NpcIntentTrail[]>(() => {
    const fire = firstStructureOfKind(state.structures, CRAFTABLE.FOGATA_PERMANENTE);
    const isReachable = makeNpcReachabilityChecker(state);
    const ctx = {
      world: state.world,
      npcs: state.npcs,
      nextBuildPriority: nextBuildPriority(state),
      firePosition: fire?.position,
      currentTick: state.tick,
      ticksPerDay: TICKS_PER_DAY,
      isReachable,
      prng: state.prng,
      synergies: [],
    };
    return state.npcs
      .filter((npc) => npc.alive)
      .map((npc) => {
        const { position } = decideDestination(npc, ctx as any);
        return { npcId: npc.id, from: npc.position, to: position };
      })
      .filter((trail) => trail.from.x !== trail.to.x || trail.from.y !== trail.to.y);
  }, [state]);

  const npcStatuses = useMemo<NpcStatusVisual[]>(() => {
    return state.npcs
      .filter((npc) => npc.alive)
      .map((npc) => {
        const tile = state.world.tiles[npc.position.y * state.world.width + npc.position.x];
        const badges: NpcStatusVisual['badges'] = [
          ...(npc.stats.supervivencia < NEED_THRESHOLDS.supervivenciaCritical ? ['critical' as const] : 
             npc.stats.supervivencia < NEED_THRESHOLDS.supervivenciaBuildReady ? ['hungry' as const] : []),
          ...(npc.stats.socializacion < NEED_THRESHOLDS.socializacionLow ? ['lonely' as const] : []),
          ...(tile === TILE.SHALLOW_WATER ? ['swimming' as const] : []),
        ];
        return { npcId: npc.id, badges };
      })
      .filter((status) => status.badges.length > 0);
  }, [state.npcs, state.world]);

  const buildStatus = useMemo<BuildHudStatus>(() => {
    if (state.buildProject) {
      return {
        next: state.buildProject.kind,
        ready: false,
        missing: {},
        active: { kind: state.buildProject.kind, progress: state.buildProject.progress, required: state.buildProject.required },
      };
    }
    const next = nextBuildPriority(state) ?? null;
    if (!next) return { next: null, ready: true, missing: {} };
    const inv = clanInventoryTotal(state.npcs, state.structures);
    const recipe = RECIPES[next];
    const missing: Partial<Record<keyof NPCInventory, number>> = {};
    for (const [key, needed] of Object.entries(recipe.inputs) as Array<[keyof NPCInventory, number]>) {
      const amount = Math.max(0, needed - inv[key]);
      if (amount > 0) missing[key] = amount;
    }
    return { next, ready: Object.keys(missing).length === 0, missing };
  }, [state]);

  const communalInventory = useMemo<NPCInventory>(() => clanInventoryTotal(state.npcs, state.structures), [state.npcs, state.structures]);
  const activeSynergies = useMemo<ActiveSynergy[]>(() => computeActiveSynergies(state.npcs), [state.npcs]);

  const selectedNpc = useMemo(() => selectedNpcId ? state.npcs.find((n) => n.id === selectedNpcId) ?? null : null, [selectedNpcId, state.npcs]);

  const selectedNpcStatus = useMemo<NpcOperationalStatus | undefined>(() => {
    if (!selectedNpc) return undefined;
    const fire = firstStructureOfKind(state.structures, CRAFTABLE.FOGATA_PERMANENTE);
    const ctx = {
      world: state.world, npcs: state.npcs, nextBuildPriority: nextBuildPriority(state),
      firePosition: fire?.position, currentTick: state.tick, ticksPerDay: TICKS_PER_DAY,
      isReachable: makeNpcReachabilityChecker(state), prng: state.prng, synergies: [],
    };
    const { position: destination } = decideDestination(selectedNpc, ctx as any);
    const tile = state.world.tiles[selectedNpc.position.y * state.world.width + selectedNpc.position.x] as TileId;
    const badges = npcStatuses.find((status) => status.npcId === selectedNpc.id)?.badges ?? [];
    return { action: actionForDestination(state, selectedNpc, destination), destination, tile: TILE_LABEL[tile], badges };
  }, [npcStatuses, selectedNpc, state]);

  const selectedNpcBiography = useMemo(() => selectedNpc ? buildNpcBiography(selectedNpc, state.npcs, state.tick) : undefined, [selectedNpc, state.npcs, state.tick]);
  const selectedNpcRole = useMemo(() => selectedNpc ? computeRole(selectedNpc, itemForNpc(selectedNpc, state.items)) : undefined, [selectedNpc, state.items]);
  const selectedNpcToolLabel = useMemo(() => selectedNpc ? itemLabel(itemForNpc(selectedNpc, state.items)) : undefined, [selectedNpc, state.items]);

  if (!draftDone) return <DraftScreen seed={seed} onStart={handleDraftStart} />;
  if (state.era === 'tribal') return <TribalPlaceholder />;

  return (
    <main data-testid="primigenia-page" className="fixed inset-0 overflow-hidden bg-[#0c0a09] text-stone-200 select-none">
      {/* CAPA 0: EL MUNDO (Background) */}
      <MapView
        world={state.world} fog={state.fog} npcs={state.npcs} animals={state.animals} structures={state.structures}
        buildProject={state.buildProject} intentTrails={intentTrails} npcStatuses={npcStatuses}
        relations={state.relations} items={state.items} onNpcClick={(id) => setSelectedNpcId(id)}
        initialCenter={spawnCenter} tickIntervalMs={TICK_INTERVAL_MS}
      />

      {/* CAPA 1: HUD PERMANENTE (No bloqueante) */}
      <HUD
        day={day} tick={state.tick} climate={state.climate}
        gratitude={state.village.gratitude} faith={state.village.faith}
        activeMessage={state.village.activeMessage} aliveCount={aliveCount}
        totalCount={state.npcs.length} monumentPhase={state.monument.phase}
        monumentProgress={state.monument.progress} village={state.village}
        buildStatus={buildStatus} communalInventory={communalInventory}
        activeSynergies={activeSynergies} paused={paused}
        onTogglePause={() => setPaused(!paused)} onOpenWhisper={() => setSelectorOpen(true)}
        onOpenCodex={() => setCodexOpen(true)}
        godType={state.godType} unlockedKinds={state.unlockedItemKinds.filter(k => !dismissedEurekas.has(k))}
        onDismissEureka={handleDismissEureka}
      />

      {/* CAPA 2: PANELES DE GESTIÓN (Lateral Izquierdo - Estilo Paradox) */}
      <div className="pointer-events-none fixed inset-y-0 left-0 z-[60] flex w-[400px] flex-col gap-4 p-4 pt-20">
        {codexOpen && (
          <div className="pointer-events-auto h-full shadow-2xl shadow-black">
            <CivilizationCodex state={state} onClose={() => setCodexOpen(false)} />
          </div>
        )}
        {selectedNpc && !codexOpen && (
          <div className="pointer-events-auto h-full shadow-2xl shadow-black">
            <NpcSheet 
              npc={selectedNpc} village={state.village} status={selectedNpcStatus} 
              biography={selectedNpcBiography} role={selectedNpcRole} 
              toolLabel={selectedNpcToolLabel} items={state.items} 
              onClose={() => setSelectedNpcId(null)} onGrantMiracle={onGrantMiracle} 
            />
          </div>
        )}
      </div>

      {/* CAPA 3: FEED DE EVENTOS (Bottom Center) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center p-4">
        <div className="pointer-events-auto w-full max-w-2xl">
          <ChronicleFeed 
            activeMessage={state.village.activeMessage} 
            messageHistory={state.village.messageHistory} 
            chronicle={state.chronicle} 
            legends={state.legends}
          />
        </div>
      </div>

      {/* MODALES TÉCNICOS (Centrados) */}
      {selectorOpen && (
        <div className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <WhisperSelector 
            activeMessage={state.village.activeMessage} 
            faith={state.village.faith} 
            clan={clanSummary} 
            onChoose={onChoose} 
            onClose={() => setSelectorOpen(false)} 
          />
        </div>
      )}

      <DivineLogPanel entries={divineLogs} isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
      <PerformanceStats />
      <DebugOverlay state={state} />
    </main>
  );
}
