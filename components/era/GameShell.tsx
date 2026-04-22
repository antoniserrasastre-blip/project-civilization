'use client';

/**
 * GameShell — shell React que mantiene el GameState vivo.
 *
 * Recibe el seed resuelto desde la página (server component lee
 * `searchParams.seed`). Bootea el clan determinista de una vez en
 * el useState inicial y corre el loop diario:
 *
 *   1. Amanecer (tick % TICKS_PER_DAY === 0 && activeMessage null)
 *      → `awaitsMessage` → modal visible.
 *   2. Jugador elige intención → `selectIntent` setea activeMessage.
 *   3. Se corren 24 ticks (1 día). El 24º cruza el siguiente
 *      amanecer y `archiveAtDawn` mete la intención en el
 *      messageHistory y resetea activeMessage a null.
 *   4. Modal reaparece automáticamente en el siguiente dawn.
 *
 * Sin autoplay — el jugador controla el ritmo. Sin persistencia,
 * atajos, sonido, animaciones: eso es polish posterior.
 *
 * §A4 intacto — ninguna aleatoriedad sale del PRNG seedable; el
 * tick() sigue siendo puro y el state se pasa inmutable a React.
 */

import { useMemo, useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { DailyModal } from '@/components/era/DailyModal';
import { HUD } from '@/components/era/HUD';
import { TribalPlaceholder } from '@/components/era/TribalPlaceholder';
import type { GameState } from '@/lib/game-state';
import { initialGameState } from '@/lib/game-state';
import { makeDefaultClan } from '@/lib/default-clan';
import { awaitsMessage, selectIntent, type MessageChoice } from '@/lib/messages';
import { TICKS_PER_DAY } from '@/lib/resources';
import { tick as tickSim } from '@/lib/simulation';

function bootstrap(seed: number): GameState {
  return initialGameState(seed, makeDefaultClan(seed));
}

function runTicks(state: GameState, count: number): GameState {
  let s = state;
  for (let i = 0; i < count; i++) s = tickSim(s);
  return s;
}

export interface GameShellProps {
  seed: number;
}

export function GameShell({ seed }: GameShellProps) {
  const [state, setState] = useState<GameState>(() => bootstrap(seed));

  const day = useMemo(
    () => Math.floor(state.tick / TICKS_PER_DAY) + 1,
    [state.tick],
  );
  const showModal = useMemo(
    () => awaitsMessage(state.village, state.tick),
    [state.village, state.tick],
  );
  const aliveCount = useMemo(
    () => state.npcs.filter((n) => n.alive).length,
    [state.npcs],
  );

  const onChoose = (choice: MessageChoice) => {
    setState((prev) => {
      const withChoice: GameState = {
        ...prev,
        village: selectIntent(prev.village, choice),
      };
      return runTicks(withChoice, TICKS_PER_DAY);
    });
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
        aliveCount={aliveCount}
        totalCount={state.npcs.length}
        monumentPhase={state.monument.phase}
        monumentProgress={state.monument.progress}
      />
      {showModal && <DailyModal day={day} onChoose={onChoose} />}
    </main>
  );
}
