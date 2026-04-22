'use client';

/**
 * GameShell — shell React que mantiene el GameState vivo.
 *
 * Sprint #1 REFACTOR-SUSURRO-FE: el susurro ya no se pide en modal
 * forzoso al amanecer. El botón "Hablar al clan" está siempre en el
 * HUD; el jugador abre el `WhisperSelector` cuando decide. Elegir
 * una opción cobra Fe según política y avanza 24 ticks (un día)
 * con el susurro persistente activo.
 *
 * §A4 intacto — el tick sigue puro; la UI orquesta inputs y la
 * selección cobra Fe vía `selectIntent`.
 */

import { useMemo, useState } from 'react';
import { MapView } from '@/components/map/MapView';
import { WhisperSelector } from '@/components/era/WhisperSelector';
import { HUD } from '@/components/era/HUD';
import { TribalPlaceholder } from '@/components/era/TribalPlaceholder';
import type { GameState } from '@/lib/game-state';
import { initialGameState } from '@/lib/game-state';
import { makeDefaultClan } from '@/lib/default-clan';
import { selectIntent, type MessageChoice } from '@/lib/messages';
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
  const [selectorOpen, setSelectorOpen] = useState(false);

  const day = useMemo(
    () => Math.floor(state.tick / TICKS_PER_DAY) + 1,
    [state.tick],
  );
  const aliveCount = useMemo(
    () => state.npcs.filter((n) => n.alive).length,
    [state.npcs],
  );

  const onChoose = (choice: MessageChoice) => {
    setState((prev) => {
      const withChoice: GameState = {
        ...prev,
        village: selectIntent(prev.village, choice, prev.tick),
      };
      return runTicks(withChoice, TICKS_PER_DAY);
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
        aliveCount={aliveCount}
        totalCount={state.npcs.length}
        monumentPhase={state.monument.phase}
        monumentProgress={state.monument.progress}
        onOpenWhisperSelector={() => setSelectorOpen(true)}
      />
      {selectorOpen && (
        <WhisperSelector
          village={state.village}
          onChoose={onChoose}
          onClose={() => setSelectorOpen(false)}
        />
      )}
    </main>
  );
}
