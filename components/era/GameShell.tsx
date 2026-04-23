'use client';

/**
 * GameShell — shell React que mantiene el GameState vivo.
 *
 * Sprint Fase 5 #1: sustituye el pulso diario forzoso por el susurro
 * persistente (§3.7). El tick corre automáticamente (un tick cada
 * `TICK_INTERVAL_MS` reales) y el jugador decide cuándo abrir el
 * selector de susurro desde el HUD.
 *
 * Sprint Fase 5 #2 (LEGIBILIDAD-MVP): pasa `ClanSummary` al selector
 * y `chronicle` al feed lateral para que el jugador pueda responder
 * *"¿por qué elegí Coraje?"* sin abrir la visión.
 *
 * Hotfix UX post-playtest PR #12: botón de pausa (+ barra
 * espaciadora) — sin pausa es casi imposible clicar en un NPC en
 * movimiento. No toca §A4 porque pausar sólo deja de llamar a
 * `tickSim()`; el state sigue siendo el mismo.
 *
 * §A4 intacto — ninguna aleatoriedad sale del PRNG seedable; el
 * tick() sigue siendo puro y el state se pasa inmutable a React.
 */

import { useEffect, useMemo, useState } from 'react';
import { MapView, type NpcIntentTrail } from '@/components/map/MapView';
import type { NpcStatusVisual } from '@/components/map/MapView';
import { WhisperSelector } from '@/components/era/WhisperSelector';
import { HUD, type BuildHudStatus } from '@/components/era/HUD';
import { ChronicleFeed } from '@/components/era/ChronicleFeed';
import {
  NpcSheet,
  type NpcOperationalStatus,
} from '@/components/era/NpcSheet';
import { TribalPlaceholder } from '@/components/era/TribalPlaceholder';
import type { GameState } from '@/lib/game-state';
import { initialGameState } from '@/lib/game-state';
import { defaultClanSpawn, makeDefaultClan } from '@/lib/default-clan';
import { applyPlayerIntent, type MessageChoice } from '@/lib/messages';
import { TICKS_PER_DAY } from '@/lib/resources';
import {
  makeNpcReachabilityChecker,
  nextBuildPriority,
  tick as tickSim,
} from '@/lib/simulation';
import { summarizeClanState } from '@/lib/clan-context';
import { grantMiracle, type MiracleId } from '@/lib/miracles';
import { decideDestination, NEED_THRESHOLDS } from '@/lib/needs';
import { firstStructureOfKind } from '@/lib/structures';
import { clanInventoryTotal, CRAFTABLE, RECIPES } from '@/lib/crafting';
import type { NPC, NPCInventory } from '@/lib/npcs';
import { RESOURCE, TILE, type TileId } from '@/lib/world-state';

/** Milisegundos reales entre ticks simulados. A 250ms un día
 *  in-game (24 ticks) dura ~6s reales — suficientemente lento
 *  para observar y rápido para no aburrir en playtest. */
const TICK_INTERVAL_MS = 250;

function bootstrap(seed: number): GameState {
  return initialGameState(seed, makeDefaultClan(seed));
}

const TILE_LABEL: Record<TileId, string> = {
  [TILE.WATER]: 'agua profunda',
  [TILE.SHALLOW_WATER]: 'agua poco profunda',
  [TILE.SHORE]: 'orilla',
  [TILE.GRASS]: 'pradera',
  [TILE.FOREST]: 'bosque',
  [TILE.MOUNTAIN]: 'montaña',
  [TILE.SAND]: 'arena',
};

function actionForDestination(
  state: GameState,
  npc: NPC,
  destination: { x: number; y: number },
): string {
  if (
    destination.x === npc.position.x &&
    destination.y === npc.position.y
  ) {
    if (npc.stats.supervivencia < NEED_THRESHOLDS.supervivenciaBuildReady) {
      return 'recuperándose';
    }
    return 'quieto';
  }
  const fire = firstStructureOfKind(
    state.structures,
    CRAFTABLE.FOGATA_PERMANENTE,
  );
  if (
    fire &&
    destination.x === fire.position.x &&
    destination.y === fire.position.y
  ) {
    return 'vuelve a la fogata';
  }
  const resource = state.world.resources.find(
    (r) =>
      r.quantity > 0 &&
      r.x === destination.x &&
      r.y === destination.y,
  );
  if (resource?.id === RESOURCE.WATER) return 'busca agua';
  if (
    resource?.id === RESOURCE.BERRY ||
    resource?.id === RESOURCE.GAME ||
    resource?.id === RESOURCE.FISH
  ) {
    return 'busca comida';
  }
  if (resource?.id === RESOURCE.WOOD || resource?.id === RESOURCE.STONE) {
    return 'recolecta para construir';
  }
  if (npc.stats.socializacion < NEED_THRESHOLDS.socializacionLow) {
    return 'busca al clan';
  }
  return 'se desplaza';
}

export interface GameShellProps {
  seed: number;
}

export function GameShell({ seed }: GameShellProps) {
  const [state, setState] = useState<GameState>(() => bootstrap(seed));
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const spawnCenter = useMemo(() => defaultClanSpawn(seed).center, [seed]);

  const day = useMemo(
    () => Math.floor(state.tick / TICKS_PER_DAY) + 1,
    [state.tick],
  );
  const aliveCount = useMemo(
    () => state.npcs.filter((n) => n.alive).length,
    [state.npcs],
  );
  const clanSummary = useMemo(
    () => summarizeClanState(state.npcs, state.tick),
    [state.npcs, state.tick],
  );
  const intentTrails = useMemo<NpcIntentTrail[]>(() => {
    const fire = firstStructureOfKind(
      state.structures,
      CRAFTABLE.FOGATA_PERMANENTE,
    );
    const isReachable = makeNpcReachabilityChecker(state);
    const ctx = {
      world: state.world,
      npcs: state.npcs,
      nextBuildPriority: nextBuildPriority(state),
      firePosition: fire?.position,
      currentTick: state.tick,
      ticksPerDay: TICKS_PER_DAY,
      isReachable,
    };
    return state.npcs
      .filter((npc) => npc.alive)
      .map((npc) => ({
        npcId: npc.id,
        from: npc.position,
        to: decideDestination(npc, ctx),
      }))
      .filter(
        (trail) =>
          trail.from.x !== trail.to.x || trail.from.y !== trail.to.y,
      );
  }, [state]);
  const npcStatuses = useMemo<NpcStatusVisual[]>(() => {
    return state.npcs
      .filter((npc) => npc.alive)
      .map((npc) => {
        const tile =
          state.world.tiles[npc.position.y * state.world.width + npc.position.x];
        const badges: NpcStatusVisual['badges'] = [
          ...(npc.stats.supervivencia <
          NEED_THRESHOLDS.supervivenciaCritical
            ? ['critical' as const]
            : npc.stats.supervivencia <
                NEED_THRESHOLDS.supervivenciaBuildReady
              ? ['hungry' as const]
              : []),
          ...(npc.stats.socializacion < NEED_THRESHOLDS.socializacionLow
            ? ['lonely' as const]
            : []),
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
        active: {
          kind: state.buildProject.kind,
          progress: state.buildProject.progress,
          required: state.buildProject.required,
        },
      };
    }
    const next = nextBuildPriority(state) ?? null;
    if (!next) return { next: null, ready: true, missing: {} };
    const inv = clanInventoryTotal(state.npcs);
    const recipe = RECIPES[next];
    const missing: Partial<Record<keyof NPCInventory, number>> = {};
    for (const [key, needed] of Object.entries(recipe.inputs) as Array<
      [keyof NPCInventory, number]
    >) {
      const amount = Math.max(0, needed - inv[key]);
      if (amount > 0) missing[key] = amount;
    }
    return { next, ready: Object.keys(missing).length === 0, missing };
  }, [state]);

  useEffect(() => {
    if (state.era !== 'primigenia') return;
    if (paused) return;
    const id = setInterval(() => {
      setState((prev) =>
        prev.era === 'primigenia' ? tickSim(prev) : prev,
      );
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state.era, paused]);

  // Barra espaciadora alterna pausa. Evita interceptar cuando el
  // usuario está escribiendo en un input (no hay ninguno ahora, pero
  // la guarda es trivial y robusta).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onChoose = (choice: MessageChoice) => {
    setState((prev) => {
      try {
        return { ...prev, village: applyPlayerIntent(prev.village, choice, prev.tick) };
      } catch {
        return prev;
      }
    });
    setSelectorOpen(false);
  };

  const selectedNpc = useMemo(
    () =>
      selectedNpcId
        ? state.npcs.find((n) => n.id === selectedNpcId) ?? null
        : null,
    [selectedNpcId, state.npcs],
  );
  const selectedNpcStatus = useMemo<NpcOperationalStatus | undefined>(() => {
    if (!selectedNpc) return undefined;
    const fire = firstStructureOfKind(
      state.structures,
      CRAFTABLE.FOGATA_PERMANENTE,
    );
    const ctx = {
      world: state.world,
      npcs: state.npcs,
      nextBuildPriority: nextBuildPriority(state),
      firePosition: fire?.position,
      currentTick: state.tick,
      ticksPerDay: TICKS_PER_DAY,
      isReachable: makeNpcReachabilityChecker(state),
    };
    const destination = decideDestination(selectedNpc, ctx);
    const tile = state.world.tiles[
      selectedNpc.position.y * state.world.width + selectedNpc.position.x
    ] as TileId;
    const badges =
      npcStatuses.find((status) => status.npcId === selectedNpc.id)?.badges ??
      [];
    return {
      action: actionForDestination(state, selectedNpc, destination),
      destination,
      tile: TILE_LABEL[tile],
      badges,
    };
  }, [npcStatuses, selectedNpc, state]);

  const onGrantMiracle = (miracleId: MiracleId) => {
    if (!selectedNpcId) return;
    setState((prev) => {
      try {
        return grantMiracle(prev, selectedNpcId, miracleId);
      } catch {
        return prev;
      }
    });
  };

  if (state.era === 'tribal') return <TribalPlaceholder />;

  return (
    <main
      data-testid="primigenia-page"
      data-seed={seed}
      style={{ margin: 0, padding: 0, height: '100vh', overflow: 'hidden' }}
    >
      <MapView
        world={state.world}
        fog={state.fog}
        npcs={state.npcs}
        structures={state.structures}
        buildProject={state.buildProject}
        intentTrails={intentTrails}
        npcStatuses={npcStatuses}
        onNpcClick={(id) => setSelectedNpcId(id)}
        initialCenter={spawnCenter}
      />
      <HUD
        day={day}
        gratitude={state.village.gratitude}
        faith={state.village.faith}
        activeMessage={state.village.activeMessage}
        aliveCount={aliveCount}
        totalCount={state.npcs.length}
        monumentPhase={state.monument.phase}
        monumentProgress={state.monument.progress}
        village={state.village}
        buildStatus={buildStatus}
        paused={paused}
        onTogglePause={() => setPaused((p) => !p)}
        onOpenWhisper={() => setSelectorOpen(true)}
      />
      <ChronicleFeed
        activeMessage={state.village.activeMessage}
        messageHistory={state.village.messageHistory}
        chronicle={state.chronicle}
      />
      {selectorOpen && (
        <WhisperSelector
          activeMessage={state.village.activeMessage}
          faith={state.village.faith}
          clan={clanSummary}
          onChoose={onChoose}
          onClose={() => setSelectorOpen(false)}
        />
      )}
      {selectedNpc && (
        <NpcSheet
          npc={selectedNpc}
          village={state.village}
          status={selectedNpcStatus}
          onClose={() => setSelectedNpcId(null)}
          onGrantMiracle={onGrantMiracle}
        />
      )}
    </main>
  );
}
