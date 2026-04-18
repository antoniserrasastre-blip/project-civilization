'use client';

/**
 * Dashboard del jugador — GODGAME v0.1 (MVP).
 *
 * Capa de presentación del núcleo puro en `lib/*`. Responsabilidades:
 *   - Bootstrappear el estado (load snapshot ↦ fallback a initialState).
 *   - Correr el reloj de simulación con velocidad configurable.
 *   - Persistir automáticamente cada N ticks.
 *   - Renderizar roster, crónica y panel de ungimiento.
 *
 * La UI NO contiene lógica de dominio: solo llama a `tick`, `canAnoint`,
 * `anoint`, `narrate*`. Si algo de gameplay vive aquí, está mal colocado.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  History as HistoryIcon,
  Sparkles,
  Play,
  Pause,
  FastForward,
  Rewind,
  RotateCcw,
  Heart,
  Skull,
  Crown,
  X as XIcon,
} from 'lucide-react';

import { initialState, GROUPS, type WorldState, type NPC } from '@/lib/world-state';
import { tick } from '@/lib/simulation';
import { canAnoint, anoint } from '@/lib/anoint';
import {
  narrateAnointment,
  appendChronicle,
  formatDate,
} from '@/lib/chronicle';
import {
  saveSnapshot,
  loadSnapshot,
  clearSnapshot,
} from '@/lib/persistence';
import { generateCoast } from '@/lib/map';
import { MapView } from '@/components/map-view';
import { tutorialPhase, endTutorial, type TutorialPhase } from '@/lib/tutorial';
import { topByInfluence, lineageInTop3 } from '@/lib/verdict';
import { exportChronicle, exportFilename } from '@/lib/export';
import { TECH_POOLS, pendingTechs } from '@/lib/tech';
import {
  CHRONICLE_PROVIDERS,
  providerById,
  type ChronicleProvider,
} from '@/lib/chronicle-provider';
import {
  GIFTS,
  type GiftId,
  canGrantGift,
  grantGift,
  nextGiftCost,
} from '@/lib/gifts';
import { CURSES, type CurseId, canCurse, curseNpc } from '@/lib/curses';
import { narrateGift } from '@/lib/chronicle';
// ---------------------------------------------------------------------------
// Constantes de cadencia
// ---------------------------------------------------------------------------

/** Semilla por defecto cuando se arranca mundo nuevo. */
const DEFAULT_SEED = 42;

/** Tamaño del mapa (unidades de mundo). Coincide con el default de initialState. */
const MAP_SIZE = 100;

/** Intervalo del reloj, en ms — el tick real se lanza aquí. */
const CLOCK_MS = 200;

/**
 * Velocidades canónicas según visión §11: [pausa, 1×, 10×, 100×]. Con
 * CLOCK_MS=200 eso equivale a [0, 5, 50, 500] días/segundo.
 */
const SPEEDS = [0, 1, 10, 100] as const;
type Speed = (typeof SPEEDS)[number];

/** Cada cuántos ticks persistimos al localStorage. Compromiso entre coste y pérdida máxima. */
const SAVE_EVERY_N_TICKS = 50;

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function GodgameDashboard() {
  // Estado seed-determinista. En SSR esto es lo que se pinta; en cliente
  // el efecto de abajo lo reemplaza por el snapshot si existe.
  const [state, setState] = useState<WorldState>(() =>
    initialState(DEFAULT_SEED, { playerGroupId: 'tramuntana' }),
  );
  const [hydrated, setHydrated] = useState(false);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  /** Se abre solo cuando el jugador pulsa un círculo en el mapa. */
  const [cardOpen, setCardOpen] = useState(false);
  const [verdictOpen, setVerdictOpen] = useState(false);
  /** Era anterior: guardada para detectar transición y mostrar cinemática. */
  const [eraCinematic, setEraCinematic] = useState<null | { from: string; to: string }>(null);
  /** Selector de grupos: abierto tras boot si no hay snapshot guardado. */
  const [groupSelectorOpen, setGroupSelectorOpen] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [toast, setToast] = useState<string | null>(null);
  const [chronicleProviderId, setChronicleProviderId] = useState<
    ChronicleProvider['id']
  >('template');
  const chronicleProvider = useMemo(
    () => providerById(chronicleProviderId),
    [chronicleProviderId],
  );

  // ---- Boot: intentar cargar snapshot ---------------------------------
  // Necesariamente hacemos setState en efecto de montaje: la carga
  // viene de localStorage, que solo existe en cliente. Durante SSR el
  // initialState(DEFAULT_SEED) es el valor determinista pintado.
  useEffect(() => {
    const loaded = loadSnapshot();
    if (loaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(loaded);
    } else {
      // Mundo nuevo: el jugador elige grupo antes de que arranque nada.
      setGroupSelectorOpen(true);
    }
    setHydrated(true);
  }, []);

  const handlePickGroup = useCallback((groupId: string) => {
    setState(() => {
      const fresh = initialState(DEFAULT_SEED, { playerGroupId: groupId });
      saveSnapshot(fresh);
      return fresh;
    });
    setSelectedNpcId(null);
    setSpeed(1);
    setGroupSelectorOpen(false);
  }, []);

  // ---- Reloj de simulación --------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    if (speed === 0) return;

    const id = window.setInterval(() => {
      setState((prev) => {
        let next = prev;
        for (let i = 0; i < speed; i++) next = tick(next);
        return next;
      });
    }, CLOCK_MS);

    return () => window.clearInterval(id);
  }, [speed, hydrated]);

  // ---- Persistencia periódica -----------------------------------------
  // Observamos `state.day` y guardamos cada N ticks. Hacer save aquí (en
  // lugar de dentro del setInterval) respeta las reglas de React y usa
  // siempre el estado cuajado del render.
  useEffect(() => {
    if (!hydrated) return;
    if (state.day === 0) return;
    if (state.day % SAVE_EVERY_N_TICKS !== 0) return;
    saveSnapshot(state);
  }, [state.day, hydrated, state]);

  // ---- Acciones del jugador -------------------------------------------

  // Usamos setState funcional en vez de stateRef.current para evitar carreras
  // entre clicks rápidos del jugador: el updater siempre ve la versión más
  // reciente del estado, sin depender de que useEffect haya sincronizado la
  // ref.
  const handleAnoint = useCallback(() => {
    if (!selectedNpcId) return;
    setState((current) => {
      const check = canAnoint(current, selectedNpcId);
      if (!check.ok) {
        setToast(anointRejectionMessage(check.reason));
        return current;
      }
      const npc = current.npcs.find((n) => n.id === selectedNpcId);
      if (!npc) return current;
      const afterAnoint = anoint(current, selectedNpcId);
      const withChronicle = appendChronicle(
        afterAnoint,
        narrateAnointment(current, npc),
      );
      saveSnapshot(withChronicle);
      setToast('Has ungido a un Elegido.');
      return withChronicle;
    });
  }, [selectedNpcId]);

  const handleCurse = useCallback(
    (curse_id: CurseId) => {
      if (!selectedNpcId) return;
      setState((current) => {
        const check = canCurse(current, selectedNpcId, curse_id);
        if (!check.ok) {
          setToast(curseRejectionMessage(check.reason));
          return current;
        }
        const npc = current.npcs.find((n) => n.id === selectedNpcId);
        if (!npc) return current;
        const after = curseNpc(current, selectedNpcId, curse_id);
        const withChronicle = appendChronicle(after, {
          day: after.day,
          text: `Año ${Math.floor(after.day / 365)}, día ${(after.day % 365) + 1}. Cayó la sombra sobre ${npc.name}, de los hijos de ${after.groups.find((g) => g.id === npc.group_id)?.name ?? npc.group_id}. Los nuestros no lloran.`,
        });
        saveSnapshot(withChronicle);
        setToast(`Has lanzado ${CURSES[curse_id].name}.`);
        return withChronicle;
      });
    },
    [selectedNpcId],
  );

  const handleGrantGift = useCallback(
    (gift_id: GiftId) => {
      if (!selectedNpcId) return;
      setState((current) => {
        const check = canGrantGift(current, selectedNpcId, gift_id);
        if (!check.ok) {
          setToast(giftRejectionMessage(check.reason));
          return current;
        }
        const npc = current.npcs.find((n) => n.id === selectedNpcId);
        if (!npc) return current;
        const afterGrant = grantGift(current, selectedNpcId, gift_id);
        const withChronicle = appendChronicle(
          afterGrant,
          narrateGift(current, npc, GIFTS[gift_id].name),
        );
        saveSnapshot(withChronicle);
        setToast(`Has concedido ${GIFTS[gift_id].name}.`);
        return withChronicle;
      });
    },
    [selectedNpcId],
  );

  const handleReset = useCallback(() => {
    clearSnapshot();
    // Volvemos al mundo por defecto visualmente (compat v0.1) y
    // mostramos el selector para que el jugador elija otra vez.
    setState(initialState(DEFAULT_SEED, { playerGroupId: 'tramuntana' }));
    setSelectedNpcId(null);
    setSpeed(1);
    setGroupSelectorOpen(true);
    setToast('Mundo reiniciado.');
  }, []);

  const handleExportChronicle = useCallback(() => {
    setState((current) => {
      const text = exportChronicle(current, {
        groupName:
          current.groups.find((g) => g.id === current.player_god.group_id)?.name,
      });
      if (typeof window === 'undefined') return current;
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFilename(current);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setToast('Crónica exportada.');
      return current;
    });
  }, []);

  const handleSkipTutorial = useCallback(() => {
    setState((current) => {
      const next = endTutorial(current);
      if (next === current) return current;
      saveSnapshot(next);
      return next;
    });
    setToast('Has saltado el tutorial.');
  }, []);

  const handleSpeed = useCallback((delta: 1 | -1) => {
    setSpeed((s) => {
      const idx = SPEEDS.indexOf(s);
      const nextIdx = Math.min(
        SPEEDS.length - 1,
        Math.max(0, idx + delta),
      );
      return SPEEDS[nextIdx];
    });
  }, []);

  // ---- Derivados --------------------------------------------------------

  const aliveNpcs = useMemo(() => state.npcs.filter((n) => n.alive), [state.npcs]);
  const selectedNpc = useMemo(
    () => state.npcs.find((n) => n.id === selectedNpcId) ?? null,
    [state.npcs, selectedNpcId],
  );
  const chosenOnes = state.player_god.chosen_ones;
  const chronicleReversed = useMemo(
    () => [...state.chronicle].reverse(),
    [state.chronicle],
  );
  const coast = useMemo(() => generateCoast(state.seed, MAP_SIZE), [state.seed]);
  const phase = useMemo<TutorialPhase>(() => tutorialPhase(state), [state]);
  const tutorialHighlight = state.tutorial_active
    ? state.tutorial_highlight_id
    : null;
  const verdictRows = useMemo(() => topByInfluence(state, 3), [state]);
  const lineageWins = useMemo(() => lineageInTop3(state), [state]);
  const techList = useMemo(
    () => state.technologies.map((id) => ({ id, name: techLabel(id) })),
    [state.technologies],
  );
  const techPending = useMemo(() => pendingTechs(state).length, [state]);

  // Detección de transición de era — mostrar cinemática.
  const previousEraRef = useRef<string>(state.era);
  useEffect(() => {
    if (state.era !== previousEraRef.current) {
      setEraCinematic({ from: previousEraRef.current, to: state.era });
      previousEraRef.current = state.era;
    }
  }, [state.era]);

  // Auto-dismiss del toast.
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const playerGroupName =
    state.groups.find((g) => g.id === state.player_god.group_id)?.name ??
    state.player_god.group_id;

  // ---- Render ----------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 font-sans selection:bg-orange-100 p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold tracking-tighter text-slate-900 mb-2 uppercase"
            >
              Proyecto Civilización
            </motion.h1>
            <p className="text-slate-500 font-medium italic">
              Crónica de los {playerGroupName}
            </p>
          </div>

          <HudStrip
            day={state.day}
            era={state.era}
            faithPoints={state.player_god.faith_points}
            chosenCount={chosenOnes.length}
            aliveCount={aliveNpcs.length}
            totalCount={state.npcs.length}
          />
        </div>

        <ClockBar
          speed={speed}
          onSlower={() => handleSpeed(-1)}
          onFaster={() => handleSpeed(1)}
          onReset={handleReset}
        />
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <MapView
            coast={coast}
            npcs={state.npcs}
            selectedId={selectedNpcId}
            chosenOnes={chosenOnes}
            rivalChosenIds={state.rival_gods.flatMap((r) => r.chosen_ones)}
            mapSize={MAP_SIZE}
            seed={state.seed}
            highlightId={tutorialHighlight}
            onSelect={(id) => {
              setSelectedNpcId(id);
              setCardOpen(true);
            }}
          />
          {state.tutorial_active && phase !== 'intro' && (
            <TutorialBanner
              phase={phase}
              highlightName={
                state.npcs.find((n) => n.id === state.tutorial_highlight_id)?.name ?? null
              }
              onSkip={handleSkipTutorial}
            />
          )}

          <Roster
            npcs={state.npcs}
            selectedId={selectedNpcId}
            chosenOnes={chosenOnes}
            onSelect={setSelectedNpcId}
          />

          <AnimatePresence mode="wait">
            {selectedNpc ? (
              <InterventionPanel
                key={selectedNpc.id}
                npc={selectedNpc}
                isChosen={chosenOnes.includes(selectedNpc.id)}
                faithPoints={state.player_god.faith_points}
                giftsGranted={state.player_god.gifts_granted}
                onAnoint={handleAnoint}
                onGrantGift={handleGrantGift}
              />
            ) : (
              <EmptyIntervention />
            )}
          </AnimatePresence>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <FaithPanel
            faithPoints={state.player_god.faith_points}
            giftsGranted={state.player_god.gifts_granted}
          />
          <TechPanel era={state.era} tech={techList} pendingCount={techPending} />
          {state.rival_gods.length > 0 && (
            <RivalPanel
              rivals={state.rival_gods}
              groups={state.groups}
              npcs={state.npcs}
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVerdictOpen(true)}
            data-testid="open-verdict"
            className="w-full text-xs"
          >
            <Crown className="w-3 h-3 mr-1" /> Ver veredicto de la era
          </Button>
          <ChroniclePanel
            entries={chronicleReversed}
            onExport={handleExportChronicle}
            provider={chronicleProvider}
            onProviderChange={setChronicleProviderId}
          />
        </aside>
      </main>

      <AnimatePresence>
        {selectedNpc && cardOpen && (
          <CharacterCardOverlay
            key={selectedNpc.id}
            npc={selectedNpc}
            isChosen={chosenOnes.includes(selectedNpc.id)}
            isPlayerGroup={selectedNpc.group_id === state.player_god.group_id}
            faithPoints={state.player_god.faith_points}
            allNpcs={state.npcs}
            onClose={() => setCardOpen(false)}
            onCurse={handleCurse}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {groupSelectorOpen && (
          <GroupSelectorOverlay onPick={handlePickGroup} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {eraCinematic && (
          <EraCinematicModal
            from={eraCinematic.from}
            to={eraCinematic.to}
            onClose={() => setEraCinematic(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {verdictOpen && (
          <VerdictModal
            rows={verdictRows}
            lineageWins={lineageWins}
            chosenOnes={chosenOnes}
            onClose={() => setVerdictOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.tutorial_active && phase === 'intro' && (
          <TutorialIntroOverlay
            highlightName={
              state.npcs.find((n) => n.id === state.tutorial_highlight_id)?.name ?? null
            }
            onStart={() => {
              setState((current) => ({ ...current, day: Math.max(current.day, 2) }));
            }}
            onSkip={handleSkipTutorial}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg z-50"
            data-testid="toast"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto mt-12 py-6 border-t border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-widest text-center">
        © 2026 Proyecto Civilización · v0.1 MVP · Motor determinista
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

function HudStrip(props: {
  day: number;
  era: WorldState['era'];
  faithPoints: number;
  chosenCount: number;
  aliveCount: number;
  totalCount: number;
}) {
  return (
    <div
      className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200"
      data-testid="hud-strip"
    >
      <HudCell
        label="Día"
        value={formatDate(props.day)}
        testid="hud-day"
      />
      <Separator orientation="vertical" className="h-8" />
      <HudCell label="Era" value={props.era} testid="hud-era" />
      <Separator orientation="vertical" className="h-8" />
      <HudCell
        label="Vivos"
        value={`${props.aliveCount}/${props.totalCount}`}
        testid="hud-alive"
      />
      <Separator orientation="vertical" className="h-8" />
      <HudCell
        label="Elegidos"
        value={props.chosenCount}
        testid="hud-chosen"
      />
      <Separator orientation="vertical" className="h-8" />
      <div className="flex items-center gap-2" data-testid="hud-faith">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">
            Fe
          </p>
          <p className="text-lg font-mono font-bold text-orange-600">
            {props.faithPoints}
          </p>
        </div>
        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
          <Sparkles className="text-orange-600 w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

function HudCell(props: { label: string; value: string | number; testid?: string }) {
  return (
    <div data-testid={props.testid}>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5">
        {props.label}
      </p>
      <p className="text-sm font-mono font-bold text-slate-900 capitalize">
        {props.value}
      </p>
    </div>
  );
}

function ClockBar(props: {
  speed: Speed;
  onSlower: () => void;
  onFaster: () => void;
  onReset: () => void;
}) {
  const paused = props.speed === 0;
  return (
    <div
      className="mt-6 flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm"
      data-testid="clock-bar"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Más lento"
          onClick={props.onSlower}
          data-testid="clock-slower"
        >
          <Rewind className="w-4 h-4" />
        </Button>
        <Badge
          variant={paused ? 'outline' : 'secondary'}
          className="font-mono uppercase tracking-wider"
          data-testid="clock-speed"
        >
          {paused ? (
            <>
              <Pause className="w-3 h-3 mr-1" />
              Pausado
            </>
          ) : (
            <>
              <Play className="w-3 h-3 mr-1" />
              {props.speed}× ({props.speed * (1000 / CLOCK_MS)} días/s)
            </>
          )}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Más rápido"
          onClick={props.onFaster}
          data-testid="clock-faster"
        >
          <FastForward className="w-4 h-4" />
        </Button>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={props.onReset}
        className="text-xs text-slate-500 flex items-center gap-1"
        data-testid="clock-reset"
      >
        <RotateCcw className="w-3 h-3" /> Reiniciar mundo
      </Button>
    </div>
  );
}

function Roster(props: {
  npcs: NPC[];
  selectedId: string | null;
  chosenOnes: string[];
  onSelect: (id: string) => void;
}) {
  const visible = props.npcs.slice(0, 30); // cap visual; roster completo está en state
  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-slate-50">
        <div>
          <CardTitle className="tracking-tight text-base">Roster</CardTitle>
          <CardDescription className="text-xs">
            Mortales que habitan el mundo. Selecciona uno para intervenir.
          </CardDescription>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]" data-testid="roster-count">
          {props.npcs.filter((n) => n.alive).length} vivos / {props.npcs.length}
        </Badge>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[320px]">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5" data-testid="roster-list">
            {visible.map((npc) => {
              const selected = props.selectedId === npc.id;
              const chosen = props.chosenOnes.includes(npc.id);
              return (
                <li key={npc.id}>
                  <button
                    type="button"
                    onClick={() => props.onSelect(npc.id)}
                    disabled={!npc.alive}
                    data-testid={`npc-${npc.id}`}
                    data-selected={selected ? 'true' : 'false'}
                    data-alive={npc.alive ? 'true' : 'false'}
                    data-chosen={chosen ? 'true' : 'false'}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                      selected
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-slate-100 hover:border-slate-300 bg-white'
                    } ${!npc.alive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {chosen ? (
                        <Crown className="w-3 h-3 text-orange-500 shrink-0" />
                      ) : npc.alive ? (
                        <Heart className="w-3 h-3 text-emerald-500 shrink-0" />
                      ) : (
                        <Skull className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                      <span className="text-xs font-semibold truncate">
                        {npc.name}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {Math.floor(npc.age_days / 365)}a
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function InterventionPanel(props: {
  npc: NPC;
  isChosen: boolean;
  faithPoints: number;
  giftsGranted: number;
  onAnoint: () => void;
  onGrantGift: (gift_id: GiftId) => void;
}) {
  const { npc, isChosen, faithPoints, giftsGranted } = props;
  const years = Math.floor(npc.age_days / 365);
  const giftEntries = Object.values(GIFTS);
  const cost = nextGiftCost(giftsGranted);
  const canAfford = faithPoints >= cost;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="border-slate-200 overflow-hidden bg-white shadow-sm">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle
                className="tracking-tight flex items-center gap-2"
                data-testid="intervention-name"
              >
                {isChosen && <Crown className="w-4 h-4 text-orange-500" />}
                Intervención: {npc.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {years} inviernos · posición ({npc.position.x.toFixed(1)},{' '}
                {npc.position.y.toFixed(1)})
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {npc.alive ? 'Vivo' : 'Fallecido'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <StatCell label="Fuerza" value={npc.stats.fuerza} />
            <StatCell label="Intel." value={npc.stats.inteligencia} />
            <StatCell label="Agilidad" value={npc.stats.agilidad} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <StatCell label="Ambición" value={npc.traits.ambicion} />
            <StatCell label="Lealtad" value={npc.traits.lealtad} />
            <StatCell label="Paranoia" value={npc.traits.paranoia} />
            <StatCell label="Carisma" value={npc.traits.carisma} />
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              {isChosen
                ? 'Este mortal ya lleva tu marca. Observa su destino.'
                : 'Ungir consagra a este mortal como tu Elegido. El primero es gratis.'}
            </div>
            <Button
              onClick={props.onAnoint}
              disabled={isChosen || !npc.alive}
              data-testid="anoint-button"
              className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
            >
              <Crown className="w-4 h-4" />
              {isChosen ? 'Ya ungido' : 'Ungir como Elegido'}
            </Button>
          </div>

          {isChosen && (
            <div className="space-y-3" data-testid="gifts-panel">
              <Separator />
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Dones concedidos
              </p>
              {npc.gifts.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5" data-testid="gifts-granted-list">
                  {npc.gifts.map((gid) => {
                    const def = GIFTS[gid as GiftId];
                    const label = def?.name ?? gid;
                    return (
                      <li key={gid} data-testid={`gift-granted-${gid}`}>
                        <Badge className="bg-orange-100 text-orange-700 text-[10px] font-semibold">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {label}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Aún no ha recibido ningún don.
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {giftEntries.map((def) => {
                  const already = npc.gifts.includes(def.id);
                  const disabled = already || !npc.alive || !canAfford;
                  const costLabel =
                    cost === 0 ? 'gratis' : `${cost} Fe`;
                  return (
                    <Button
                      key={def.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => props.onGrantGift(def.id)}
                      disabled={disabled}
                      data-testid={`grant-gift-${def.id}`}
                      className="text-xs"
                      title={def.description}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      {already
                        ? `${def.name} (ya)`
                        : `Conceder ${def.name} · ${costLabel}`}
                    </Button>
                  );
                })}
              </div>
              {!canAfford && cost > 0 && (
                <p
                  className="text-[11px] text-red-500"
                  data-testid="gifts-not-enough-faith"
                >
                  Te faltan {Math.max(0, cost - Math.floor(faithPoints))} Fe
                  para el próximo don.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatCell(props: { label: string; value: number }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
        {props.label}
      </p>
      <p className="text-lg font-mono font-bold text-slate-900">{props.value}</p>
    </div>
  );
}

function EmptyIntervention() {
  return (
    <div
      className="h-48 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 bg-white/30"
      data-testid="intervention-empty"
    >
      <div className="flex flex-col items-center gap-2">
        <Users className="w-8 h-8 opacity-30" />
        <p className="text-sm font-medium italic">
          Selecciona un mortal del roster.
        </p>
      </div>
    </div>
  );
}

function NpcSilhouette(props: { npc: NPC; isChosen: boolean }) {
  const { npc, isChosen } = props;
  // Color de la silueta según estado — mantiene el feeling hand-drawn.
  const fill = !npc.alive
    ? '#cbd5e1'
    : isChosen
      ? '#f59e0b'
      : npc.partner_id
        ? '#065f46'
        : '#1f2937';
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      data-testid="npc-silhouette"
      aria-hidden="true"
      className="shrink-0 rounded-full bg-[#f5ecd2] border border-amber-900/20 p-1"
    >
      {/* Silueta de persona: cabeza + torso. Simple, legible a 48px. */}
      <circle cx="12" cy="7" r="3.2" fill={fill} />
      <path
        d="M4.5 22 C 5 16, 9 14, 12 14 C 15 14, 19 16, 19.5 22 Z"
        fill={fill}
      />
      {isChosen && (
        <path
          d="M8 3.5 L10 1.5 L12 3 L14 1.5 L16 3.5 L15 5.5 L9 5.5 Z"
          fill="#f97316"
          stroke="#7c2d12"
          strokeWidth="0.3"
        />
      )}
    </svg>
  );
}

function VerdictModal(props: {
  rows: ReturnType<typeof topByInfluence>;
  lineageWins: boolean;
  chosenOnes: string[];
  onClose: () => void;
}) {
  const { rows, lineageWins, chosenOnes } = props;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-8"
      data-testid="verdict-modal"
      onClick={props.onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4"
      >
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Crown className="w-5 h-5 text-orange-500" /> Veredicto de la era
          </h2>
          <p
            className={`text-sm mt-1 font-semibold ${lineageWins ? 'text-orange-600' : 'text-slate-500'}`}
            data-testid="verdict-headline"
          >
            {lineageWins ? '¿Reina tu linaje? SÍ.' : '¿Reina tu linaje? AÚN NO.'}
          </p>
        </div>
        <ol className="space-y-1.5" data-testid="verdict-top">
          {rows.map((row, idx) => {
            const isChosen = chosenOnes.includes(row.npc.id);
            const isDescendant = row.npc.descends_from_chosen;
            return (
              <li
                key={row.npc.id}
                data-testid={`verdict-row-${idx}`}
                className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg border ${
                  isChosen || isDescendant
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-slate-100 bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span className="text-slate-400 font-mono text-xs w-4">
                    {idx + 1}.
                  </span>
                  {isChosen && <Crown className="w-3 h-3 text-orange-500" />}
                  {row.npc.name}
                  {isDescendant && !isChosen && (
                    <Badge className="text-[9px] bg-orange-100 text-orange-700">
                      descendiente
                    </Badge>
                  )}
                </span>
                <span className="text-xs text-slate-600 font-mono">
                  inf {row.influence.toFixed(0)} · seg {row.followers} · des{' '}
                  {row.descendants}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="pt-2 flex justify-end">
          <Button size="sm" onClick={props.onClose} data-testid="verdict-close">
            Cerrar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TutorialIntroOverlay(props: {
  highlightName: string | null;
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-8"
      data-testid="tutorial-intro"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-lg bg-white rounded-2xl shadow-2xl p-8 space-y-4"
      >
        <h2 className="text-xl font-bold tracking-tight">
          Bienvenido, dios observador.
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Estás mirando a los <strong>Hijos de Tramuntana</strong>. Son
          mortales. Nacerán, amarán, lucharán y morirán sin tu ayuda.
          Tu presencia no es obligatoria — pero puede cambiarlo todo.
        </p>
        {props.highlightName && (
          <p className="text-sm text-slate-600 leading-relaxed">
            Hay uno entre ellos que arde más que los demás:{' '}
            <strong data-testid="tutorial-highlight-name">
              {props.highlightName}
            </strong>
            . Te lo señalaré con un halo dorado. Vigílalo.
          </p>
        )}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onSkip}
            data-testid="tutorial-skip-intro"
            className="text-xs text-slate-500"
          >
            Saltar tutorial
          </Button>
          <Button
            onClick={props.onStart}
            data-testid="tutorial-start"
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Comenzar
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TutorialBanner(props: {
  phase: TutorialPhase;
  highlightName: string | null;
  onSkip: () => void;
}) {
  const label = phaseLabel(props.phase, props.highlightName);
  if (!label) return null;
  return (
    <div
      className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2"
      data-testid="tutorial-banner"
    >
      <p className="text-xs text-amber-900" data-testid="tutorial-phase-text">
        <span className="font-bold uppercase tracking-wider mr-2">
          Tutorial · {props.phase}
        </span>
        {label}
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={props.onSkip}
        data-testid="tutorial-skip-banner"
        className="text-[11px] text-amber-700"
      >
        Saltar
      </Button>
    </div>
  );
}

function phaseLabel(phase: TutorialPhase, highlightName: string | null): string | null {
  switch (phase) {
    case 'intro':
      return null;
    case 'halo':
      return `Sigue a ${highlightName ?? 'el señalado'}, marcado con un halo dorado.`;
    case 'forced_event':
      return 'Algo va a ocurrir. Observa al señalado.';
    case 'notable_act':
      return 'El señalado dejó huella. Piensa si lo conviertes en tu Elegido.';
    case 'done':
      return null;
  }
}

function GroupSelectorOverlay(props: {
  onPick: (groupId: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-8"
      data-testid="group-selector"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-2xl w-full bg-[#f5ecd2] border border-amber-900/30 rounded-2xl shadow-2xl p-8 space-y-6"
      >
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-amber-800 font-bold">
            Elige tu pueblo
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-amber-900">
            ¿A quién mirarás como dios?
          </h2>
          <p className="text-sm text-amber-700">
            Hay tres pueblos en el archipiélago. Los otros dos tendrán sus
            propios dioses — rivales tuyos.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => props.onPick(g.id)}
              data-testid={`pick-group-${g.id}`}
              className="text-left rounded-xl border border-amber-900/30 bg-white/60 hover:bg-white px-4 py-4 space-y-1 transition"
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: g.color }}
              />
              <p className="font-bold tracking-tight text-amber-900">{g.name}</p>
              <p className="text-[11px] text-amber-700">
                Territorio ({g.center.x}, {g.center.y})
              </p>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function RivalPanel(props: {
  rivals: WorldState['rival_gods'];
  groups: WorldState['groups'];
  npcs: WorldState['npcs'];
}) {
  return (
    <Card className="border-slate-200 bg-white" data-testid="rival-panel">
      <CardHeader className="p-4 border-b border-slate-50">
        <CardTitle className="tracking-tight text-base">
          Dioses rivales
        </CardTitle>
        <CardDescription className="text-[11px]">
          Mirando a otros pueblos desde el cielo, como tú.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        {props.rivals.map((r) => {
          const group = props.groups.find((g) => g.id === r.group_id);
          const alive = props.npcs.filter(
            (n) => n.alive && n.group_id === r.group_id,
          ).length;
          return (
            <div
              key={r.group_id}
              data-testid={`rival-${r.group_id}`}
              className="flex items-center justify-between text-xs border-l-2 border-slate-200 pl-2"
            >
              <div>
                <p className="font-semibold text-slate-800">
                  {group?.name ?? r.group_id}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                  {r.profile} · {alive} mortales · {r.chosen_ones.length} elegidos
                </p>
              </div>
              <span className="font-mono text-[10px] text-slate-600">
                {r.faith_points.toFixed(1)} Fe
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TechPanel(props: {
  era: string;
  tech: Array<{ id: string; name: string }>;
  pendingCount: number;
}) {
  return (
    <Card className="border-slate-200 bg-white" data-testid="tech-panel">
      <CardHeader className="p-4 border-b border-slate-50">
        <CardTitle className="tracking-tight text-base">Tecnología</CardTitle>
        <CardDescription className="text-[11px]">
          Era actual: <span className="font-semibold uppercase">{props.era}</span>
          {' · '}
          <span data-testid="tech-pending">
            {props.pendingCount} pendientes
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {props.tech.length === 0 ? (
          <p className="text-xs text-slate-400 italic">
            Los tuyos aún tropiezan en la oscuridad.
          </p>
        ) : (
          <ul
            className="flex flex-wrap gap-1.5"
            data-testid="tech-known-list"
          >
            {props.tech.map((t) => (
              <li key={t.id} data-testid={`tech-known-${t.id}`}>
                <Badge variant="outline" className="text-[10px]">
                  {t.name}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EraCinematicModal(props: {
  from: string;
  to: string;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-8"
      data-testid="era-cinematic"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md bg-[#f5ecd2] border border-amber-900/30 rounded-2xl shadow-2xl p-8 text-center space-y-4"
      >
        <p className="text-[10px] uppercase tracking-widest text-amber-800 font-bold">
          Fin de era
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-amber-900">
          La era {props.from} cae.
        </h2>
        <p className="text-sm text-amber-700">
          Llega la era <strong className="uppercase">{props.to}</strong>. Los
          tuyos ya no son lo que eran.
        </p>
        <Button
          onClick={props.onClose}
          data-testid="era-cinematic-close"
          className="bg-amber-900 hover:bg-amber-950 text-amber-50"
        >
          Seguir observando
        </Button>
      </motion.div>
    </motion.div>
  );
}

function techLabel(id: string): string {
  for (const pool of Object.values(TECH_POOLS)) {
    const def = pool.find((t) => t.id === id);
    if (def) return def.name;
  }
  return id;
}

function FaithPanel(props: { faithPoints: number; giftsGranted: number }) {
  const nextCost = nextGiftCost(props.giftsGranted);
  const hasEnough = props.faithPoints >= nextCost;
  return (
    <Card className="border-slate-200 bg-white" data-testid="faith-panel">
      <CardHeader className="p-4 border-b border-slate-50 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="tracking-tight text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" /> Fe
          </CardTitle>
          <CardDescription className="text-[11px]">
            Rezan los tuyos. El mundo se acuerda de ti.
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className="font-mono text-[10px]"
          data-testid="faith-panel-points"
        >
          {props.faithPoints.toFixed(1)} Fe
        </Badge>
      </CardHeader>
      <CardContent className="p-4 space-y-2 text-xs text-slate-600">
        <p data-testid="faith-panel-next-cost">
          Próximo don:{' '}
          {nextCost === 0 ? (
            <span className="font-semibold text-emerald-600">GRATIS</span>
          ) : (
            <span
              className={`font-semibold ${hasEnough ? 'text-slate-900' : 'text-red-500'}`}
            >
              {nextCost} Fe
            </span>
          )}
          {' · '}
          <span className="text-slate-400">
            {props.giftsGranted} concedido{props.giftsGranted === 1 ? '' : 's'}
          </span>
        </p>
        <ul className="text-[11px] text-slate-500 list-disc pl-4 space-y-0.5">
          <li>rezar: cada vivo tuyo produce Fe pasiva</li>
          <li>enemigo caído: bono al vencer a un rival</li>
          <li>descendencia: bono por cada recién nacido sagrado</li>
        </ul>
      </CardContent>
    </Card>
  );
}

function CharacterCardOverlay(props: {
  npc: NPC;
  isChosen: boolean;
  isPlayerGroup: boolean;
  faithPoints: number;
  allNpcs: NPC[];
  onClose: () => void;
  onCurse: (curse_id: CurseId) => void;
}) {
  const { npc, isChosen, isPlayerGroup, faithPoints, allNpcs } = props;
  const years = Math.floor(npc.age_days / 365);
  const parents = npc.parents
    .map((pid) => allNpcs.find((n) => n.id === pid))
    .filter((n): n is NPC => Boolean(n));
  const leader = npc.follower_of
    ? allNpcs.find((n) => n.id === npc.follower_of)
    : null;
  const followers = allNpcs.filter((n) => n.follower_of === npc.id);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm flex items-start justify-center p-8"
      data-testid="character-card-overlay"
      onClick={props.onClose}
    >
      <motion.div
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -12, opacity: 0 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="character-card"
      >
        <div className="flex items-start gap-4 mb-4">
          <NpcSilhouette npc={npc} isChosen={isChosen} />
          <div className="flex-grow">
            <h2
              className="font-bold text-lg tracking-tight flex items-center gap-2"
              data-testid="character-card-name"
            >
              {isChosen && <Crown className="w-4 h-4 text-orange-500" />}
              {npc.name}
            </h2>
            <p className="text-xs text-slate-500 italic">
              {years} inviernos · {npc.alive ? 'vivo' : 'fallecido'}
              {npc.partner_id ? ' · emparejado' : ''}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={props.onClose}
            data-testid="character-card-close"
            className="text-slate-400 hover:text-slate-900"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-4">
          <dt className="text-slate-400 font-medium uppercase tracking-widest">Fuerza</dt>
          <dd className="text-slate-900 font-mono">{npc.stats.fuerza}</dd>
          <dt className="text-slate-400 font-medium uppercase tracking-widest">Intel.</dt>
          <dd className="text-slate-900 font-mono">{npc.stats.inteligencia}</dd>
          <dt className="text-slate-400 font-medium uppercase tracking-widest">Agilidad</dt>
          <dd className="text-slate-900 font-mono">{npc.stats.agilidad}</dd>
          <dt className="text-slate-400 font-medium uppercase tracking-widest">Ambición</dt>
          <dd className="text-slate-900 font-mono">{npc.traits.ambicion}</dd>
          <dt className="text-slate-400 font-medium uppercase tracking-widest">Lealtad</dt>
          <dd className="text-slate-900 font-mono">{npc.traits.lealtad}</dd>
          <dt className="text-slate-400 font-medium uppercase tracking-widest">Paranoia</dt>
          <dd className="text-slate-900 font-mono">{npc.traits.paranoia}</dd>
          <dt className="text-slate-400 font-medium uppercase tracking-widest">Carisma</dt>
          <dd className="text-slate-900 font-mono">{npc.traits.carisma}</dd>
        </dl>

        <div className="space-y-3">
          <section data-testid="card-gifts">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">
              Dones
            </h3>
            {npc.gifts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Ninguno.</p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {npc.gifts.map((gid) => (
                  <li key={gid} data-testid={`card-gift-${gid}`}>
                    <Badge className="bg-orange-100 text-orange-700 text-[10px] font-semibold">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {GIFTS[gid as GiftId]?.name ?? gid}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section data-testid="card-lineage">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">
              Linaje
            </h3>
            {parents.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                De la generación fundacional — sin padres conocidos.
              </p>
            ) : (
              <p className="text-xs text-slate-700">
                Hijo/a de{' '}
                <span className="font-semibold">
                  {parents.map((p) => p.name).join(' y ')}
                </span>
                .
              </p>
            )}
          </section>

          <section data-testid="card-social">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">
              Vínculos
            </h3>
            <p className="text-xs text-slate-700">
              {leader ? (
                <>Sigue a <span className="font-semibold">{leader.name}</span>.</>
              ) : followers.length > 0 ? (
                <>
                  Lidera a{' '}
                  <span className="font-semibold">{followers.length}</span>{' '}
                  seguidor{followers.length === 1 ? '' : 'es'}.
                </>
              ) : (
                <span className="text-slate-400 italic">Camina en solitario.</span>
              )}
            </p>
          </section>

          {!isPlayerGroup && npc.alive && (
            <section
              className="pt-2 border-t border-slate-100"
              data-testid="curses-panel"
            >
              <h3 className="text-[10px] uppercase tracking-widest text-red-600 font-bold mb-2">
                Maldecir (rival)
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {Object.values(CURSES).map((c) => {
                  const cantAfford = faithPoints < c.cost;
                  return (
                    <Button
                      key={c.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={cantAfford}
                      onClick={() => props.onCurse(c.id)}
                      data-testid={`curse-${c.id}`}
                      className="text-[11px] border-red-300 text-red-700 hover:bg-red-50"
                      title={c.description}
                    >
                      {c.name} · {c.cost} Fe
                    </Button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ChroniclePanel(props: {
  entries: { day: number; text: string }[];
  onExport: () => void;
  provider: ChronicleProvider;
  onProviderChange: (id: ChronicleProvider['id']) => void;
}) {
  const [rendered, setRendered] = useState<string[]>(
    props.entries.map((e) => e.text),
  );

  // Render asincrónico: proveedores de LLM real pueden devolver Promise;
  // hasta entonces mostramos el texto plantilla como fallback.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const out: string[] = [];
      for (const e of props.entries) {
        out.push(await props.provider.enhance(e, {}));
      }
      if (!cancelled) setRendered(out);
    }
    setRendered(props.entries.map((e) => e.text));
    run();
    return () => {
      cancelled = true;
    };
  }, [props.entries, props.provider]);

  return (
    <Card className="border-slate-200 h-[calc(100vh-260px)] flex flex-col bg-white">
      <CardHeader className="p-4 border-b border-slate-50 flex flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 tracking-tight">
            <HistoryIcon className="w-4 h-4 text-slate-400" />
            CRÓNICAS
          </div>
          <CardDescription className="text-[10px]">
            La voz del cronista — parcial, no neutral.
          </CardDescription>
        </div>
        <div className="flex items-center gap-1">
          <select
            className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5"
            value={props.provider.id}
            onChange={(ev) =>
              props.onProviderChange(ev.target.value as ChronicleProvider['id'])
            }
            data-testid="chronicle-provider-select"
            title="Voz del cronista"
          >
            {CHRONICLE_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onExport}
            data-testid="export-chronicle"
            className="text-[10px]"
            title="Descargar como texto"
          >
            Exportar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-full p-4">
          {props.entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs text-slate-400 italic">
                El tiempo aún no ha dejado huella.
              </p>
            </div>
          ) : (
            <ul className="space-y-3" data-testid="chronicle-list">
              {props.entries.map((e, i) => (
                <li
                  key={`${e.day}-${i}`}
                  className="text-xs border-l-2 border-slate-100 pl-3 py-0.5"
                  data-testid="chronicle-entry"
                >
                  <p className="text-slate-700 leading-relaxed">
                    {rendered[i] ?? e.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Mensajería
// ---------------------------------------------------------------------------

function anointRejectionMessage(
  reason: 'unknown_npc' | 'dead_npc' | 'wrong_group' | 'already_chosen',
): string {
  switch (reason) {
    case 'unknown_npc':
      return 'Ese mortal no existe en esta realidad.';
    case 'dead_npc':
      return 'Ese mortal ha muerto. Los muertos no escuchan.';
    case 'wrong_group':
      return 'No puedes ungir fuera de tu pueblo.';
    case 'already_chosen':
      return 'Ya es uno de tus Elegidos.';
  }
}

function curseRejectionMessage(
  reason:
    | 'unknown_npc'
    | 'unknown_curse'
    | 'dead_npc'
    | 'own_group'
    | 'not_enough_faith',
): string {
  switch (reason) {
    case 'unknown_npc':
      return 'Ese mortal no existe en esta realidad.';
    case 'unknown_curse':
      return 'Esa maldición no existe.';
    case 'dead_npc':
      return 'Los muertos ya no pueden ser maldecidos.';
    case 'own_group':
      return 'No puedes maldecir a los tuyos.';
    case 'not_enough_faith':
      return 'No tienes suficiente Fe para esta maldición.';
  }
}

function giftRejectionMessage(
  reason:
    | 'unknown_npc'
    | 'unknown_gift'
    | 'dead_npc'
    | 'not_chosen'
    | 'already_has_gift'
    | 'not_enough_faith',
): string {
  switch (reason) {
    case 'unknown_npc':
      return 'Ese mortal no existe en esta realidad.';
    case 'unknown_gift':
      return 'Ese don no existe.';
    case 'dead_npc':
      return 'Los muertos no reciben dones.';
    case 'not_chosen':
      return 'Solo los Elegidos pueden recibir dones.';
    case 'already_has_gift':
      return 'Ese don ya ha sido concedido.';
    case 'not_enough_faith':
      return 'No tienes suficiente Fe para este don.';
  }
}
