'use client';

/**
 * GameShell — shell React que mantiene el GameState vivo.
 *
 * Sprint Fase 5 #1: sustituye el pulso diario forzoso por el susurro
 * persistente (§3.7). El tick ahora corre **automáticamente** (un
 * tick cada `TICK_INTERVAL_MS` reales) y el jugador decide cuándo
 * abrir el selector de susurro desde el HUD. El susurro activo
 * persiste entre ticks; sólo se archiva al cambiar.
 *
 * §A4 intacto — ninguna aleatoriedad sale del PRNG seedable; el
 * tick() sigue siendo puro y el state se pasa inmutable a React.
 */

import { useEffect, useMemo, useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { WhisperSelector } from '@/components/era/WhisperSelector';
import { HUD } from '@/components/era/HUD';
import { TribalPlaceholder } from '@/components/era/TribalPlaceholder';
import type { GameState } from '@/lib/game-state';
import { initialGameState } from '@/lib/game-state';
import { makeDefaultClan } from '@/lib/default-clan';
import { applyPlayerIntent, type MessageChoice } from '@/lib/messages';
import { TICKS_PER_DAY } from '@/lib/resources';
import { tick as tickSim } from '@/lib/simulation';

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

  const day = useMemo(
    () => Math.floor(state.tick / TICKS_PER_DAY) + 1,
    [state.tick],
  );
  const aliveCount = useMemo(
    () => state.npcs.filter((n) => n.alive).length,
    [state.npcs],
  );

  // Tick automático — el mundo corre solo, el jugador sólo susurra.
  useEffect(() => {
    if (state.era !== 'primigenia') return;
    const id = setInterval(() => {
      setState((prev) =>
        prev.era === 'primigenia' ? tickSim(prev) : prev,
      );
    }, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state.era]);

  const onChoose = (choice: MessageChoice) => {
    setState((prev) => {
      try {
        return { ...prev, village: applyPlayerIntent(prev.village, choice, prev.tick) };
      } catch {
        // Fe insuficiente: no cambia el state; el selector marca
        // el botón como disabled preventivamente.
        return prev;
      }
    });
    setSelectorOpen(false);
  };

  if (state.era === 'tribal') return <TribalPlaceholder />;

  return (
    <main
      data-testid="primigenia-page"
      data-seed={seed}
      style={{ margin: 0, padding: 0, height: '100vh', overflow: 'hidden' }}
    >
      <MapView npcs={state.npcs} />
      <HUD
        day={day}
        gratitude={state.village.gratitude}
        faith={state.village.faith}
        activeMessage={state.village.activeMessage}
        aliveCount={aliveCount}
        totalCount={state.npcs.length}
        monumentPhase={state.monument.phase}
        monumentProgress={state.monument.progress}
        onOpenWhisper={() => setSelectorOpen(true)}
      />
      {selectorOpen && (
        <WhisperSelector
          activeMessage={state.village.activeMessage}
          faith={state.village.faith}
          onChoose={onChoose}
          onClose={() => setSelectorOpen(false)}
        />
      )}
    </main>
  );
}
