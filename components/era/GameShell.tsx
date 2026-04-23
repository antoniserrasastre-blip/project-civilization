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
import { MapView } from '@/components/map/MapView';
import { WhisperSelector } from '@/components/era/WhisperSelector';
import { HUD } from '@/components/era/HUD';
import { ChronicleFeed } from '@/components/era/ChronicleFeed';
import { NpcSheet } from '@/components/era/NpcSheet';
import { TribalPlaceholder } from '@/components/era/TribalPlaceholder';
import type { GameState } from '@/lib/game-state';
import { initialGameState } from '@/lib/game-state';
import { defaultClanSpawn, makeDefaultClan } from '@/lib/default-clan';
import { applyPlayerIntent, type MessageChoice } from '@/lib/messages';
import { TICKS_PER_DAY } from '@/lib/resources';
import { tick as tickSim } from '@/lib/simulation';
import { summarizeClanState } from '@/lib/clan-context';
import { grantMiracle, type MiracleId } from '@/lib/miracles';

/** Milisegundos reales entre ticks simulados. A 250ms un día
 *  in-game (24 ticks) dura ~6s reales — suficientemente lento
 *  para observar y rápido para no aburrir en playtest. */
const TICK_INTERVAL_MS = 250;

function bootstrap(seed: number): GameState {
  return initialGameState(seed, makeDefaultClan(seed));
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
        npcs={state.npcs}
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
          onClose={() => setSelectedNpcId(null)}
          onGrantMiracle={onGrantMiracle}
        />
      )}
    </main>
  );
}
