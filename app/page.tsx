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

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Map as MapIcon,
  Play,
  Pause,
  FastForward,
  Rewind,
  RotateCcw,
  Heart,
  Skull,
  Crown,
} from 'lucide-react';

import { initialState, type WorldState, type NPC } from '@/lib/world-state';
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
import MapGenerator from '@/components/map-generator';

// ---------------------------------------------------------------------------
// Constantes de cadencia
// ---------------------------------------------------------------------------

/** Semilla por defecto cuando se arranca mundo nuevo. */
const DEFAULT_SEED = 42;

/** Intervalo del reloj, en ms — el tick real se lanza aquí. */
const CLOCK_MS = 200;

/**
 * Ticks que cada velocidad consume por pulso del reloj. Con CLOCK_MS=200,
 * la velocidad 1 avanza 5 días/segundo; 100x avanza 500 días/segundo.
 */
const SPEEDS = [0, 1, 5, 20, 100] as const;
type Speed = (typeof SPEEDS)[number];

/** Cada cuántos ticks persistimos al localStorage. Compromiso entre coste y pérdida máxima. */
const SAVE_EVERY_N_TICKS = 50;

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function GodgameDashboard() {
  // Estado seed-determinista. En SSR esto es lo que se pinta; en cliente
  // el efecto de abajo lo reemplaza por el snapshot si existe.
  const [state, setState] = useState<WorldState>(() => initialState(DEFAULT_SEED));
  const [hydrated, setHydrated] = useState(false);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [speed, setSpeed] = useState<Speed>(1);
  const [activeTab, setActiveTab] = useState<'world' | 'map'>('world');
  const [toast, setToast] = useState<string | null>(null);

  // Ref sincronizada con state, poblada en efecto (no en render, para
  // cumplir la regla de refs de React 19). La usan los event handlers
  // que no deben cerrar sobre snapshots obsoletos.
  const stateRef = useRef<WorldState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ---- Boot: intentar cargar snapshot ---------------------------------
  // Necesariamente hacemos setState en efecto de montaje: la carga
  // viene de localStorage, que solo existe en cliente. Durante SSR el
  // initialState(DEFAULT_SEED) es el valor determinista pintado.
  useEffect(() => {
    const loaded = loadSnapshot();
    if (loaded) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState(loaded);
    }
    setHydrated(true);
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

  const handleAnoint = useCallback(() => {
    if (!selectedNpcId) return;
    const current = stateRef.current;
    const check = canAnoint(current, selectedNpcId);
    if (!check.ok) {
      setToast(anointRejectionMessage(check.reason));
      return;
    }
    const npc = current.npcs.find((n) => n.id === selectedNpcId);
    if (!npc) return;
    const afterAnoint = anoint(current, selectedNpcId);
    const withChronicle = appendChronicle(
      afterAnoint,
      narrateAnointment(current, npc),
    );
    setState(withChronicle);
    // Persistimos al instante: una acción del jugador no debe perderse
    // si cierra la pestaña antes del próximo save periódico.
    saveSnapshot(withChronicle);
    setToast('Has ungido a un Elegido.');
  }, [selectedNpcId]);

  const handleReset = useCallback(() => {
    clearSnapshot();
    const fresh = initialState(DEFAULT_SEED);
    setState(fresh);
    setSelectedNpcId(null);
    setSpeed(1);
    setToast('Mundo reiniciado.');
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
            <div className="flex flex-wrap items-center gap-4 text-slate-500 font-medium italic">
              <p>Crónica de los {playerGroupName}</p>
              <Separator orientation="vertical" className="h-4 hidden md:block" />
              <div className="flex gap-2 bg-slate-200/50 p-1 rounded-lg">
                <Button
                  variant={activeTab === 'world' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('world')}
                  className="text-[10px] h-7 uppercase tracking-widest font-bold"
                >
                  Mundo
                </Button>
                <Button
                  variant={activeTab === 'map' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab('map')}
                  className="text-[10px] h-7 uppercase tracking-widest font-bold flex items-center gap-1"
                >
                  <MapIcon className="w-3 h-3" /> Cartografía
                </Button>
              </div>
            </div>
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
        <div className="lg:col-span-8 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'world' ? (
              <motion.div
                key="world-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
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
                      onAnoint={handleAnoint}
                    />
                  ) : (
                    <EmptyIntervention />
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="map-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <MapGenerator />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <ChroniclePanel entries={chronicleReversed} />
        </aside>
      </main>

      <AnimatePresence>
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
  onAnoint: () => void;
}) {
  const { npc, isChosen } = props;
  const years = Math.floor(npc.age_days / 365);
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

function ChroniclePanel(props: { entries: { day: number; text: string }[] }) {
  return (
    <Card className="border-slate-200 h-[calc(100vh-260px)] flex flex-col bg-white">
      <CardHeader className="p-4 border-b border-slate-50">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-900 tracking-tight">
          <HistoryIcon className="w-4 h-4 text-slate-400" />
          CRÓNICAS
        </div>
        <CardDescription className="text-[10px]">
          La voz del cronista — parcial, no neutral.
        </CardDescription>
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
                  <p className="text-slate-700 leading-relaxed">{e.text}</p>
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
