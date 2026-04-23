'use client';

/**
 * DraftScreen — pantalla de configuración del clan antes de la partida.
 *
 * Flujo: Selección de Escenario → Bloque A (4 Elegidos: arquetipo + sexo
 * + rasgos) → Bloque B (10 Ciudadanos: picks de tier). Al confirmar llama
 * a `onStart(seed, draft, followerDraft, scenarioId)`.
 *
 * Toda la lógica vive en lib/drafting.ts + lib/traits.ts + lib/scenarios.ts.
 * Este componente solo orquesta la UI y llama a las funciones puras.
 */

import { useState } from 'react';
import {
  startDraft,
  pickArchetype,
  setSex,
  pickScenario,
  pickMapType,
  addTrait,
  removeTrait,
  traitsBudgetUsed,
  finalizeBlockA,
  startFollowerDraft,
  generateCandidates,
  pickFollower,
  finalizeBlockB,
  TRAIT_BUDGET_DRAFT,
  CHOSEN_BUDGET,
  type DraftState,
  type FollowerDraftState,
  type FollowerCandidate,
} from '@/lib/drafting';
import { ARCHETYPE, SEX, type Archetype, type Sex } from '@/lib/npcs';
import { SCENARIO, getScenarioDef, type ScenarioId } from '@/lib/scenarios';
import type { MapType } from '@/lib/world-gen';
import { TRAIT, TRAIT_CATALOG, type TraitId } from '@/lib/traits';
import type { NPC } from '@/lib/npcs';
import { spawnClanForScenario } from '@/lib/default-clan';

export interface DraftResult {
  seed: number;
  npcs: NPC[];
  mapType: MapType;
}

interface DraftScreenProps {
  seed: number;
  onStart: (result: DraftResult) => void;
}

type Phase = 'scenario' | 'geography' | 'blockA' | 'blockB' | 'confirm';

/* ─── Quick Starts ────────────────────────────────────────────────── */
interface QuickStartDef {
  id: string;
  name: string;
  description: string;
  difficulty: '●○○' | '●●○' | '●●●';
  scenarioId: ScenarioId;
  blockA: Array<{ archetype: Archetype; sex: Sex }>;
}

const QUICK_STARTS: QuickStartDef[] = [
  {
    id: 'supervivientes',
    name: 'Supervivientes',
    description: 'Náufragos en la costa. Cazador y pescador aseguran comida inmediata; el curandero mantiene al clan con vida.',
    difficulty: '●○○',
    scenarioId: SCENARIO.NAUFRAGOS,
    blockA: [
      { archetype: ARCHETYPE.CAZADOR,   sex: SEX.M },
      { archetype: ARCHETYPE.PESCADOR,  sex: SEX.F },
      { archetype: ARCHETYPE.CURANDERO, sex: SEX.F },
      { archetype: ARCHETYPE.RECOLECTOR,sex: SEX.M },
    ],
  },
  {
    id: 'constructores',
    name: 'Constructores',
    description: 'Éxodo organizado al interior. Dos artesanos levantan el monumento rápido; el líder coordina.',
    difficulty: '●●○',
    scenarioId: SCENARIO.EXODO,
    blockA: [
      { archetype: ARCHETYPE.LIDER,    sex: SEX.M },
      { archetype: ARCHETYPE.ARTESANO, sex: SEX.F },
      { archetype: ARCHETYPE.ARTESANO, sex: SEX.M },
      { archetype: ARCHETYPE.RECOLECTOR, sex: SEX.F },
    ],
  },
  {
    id: 'nomadas',
    name: 'Nómadas del Viento',
    description: 'Dos exploradores y dos recolectores. Muévete rápido, agota los tiles y sigue adelante.',
    difficulty: '●●●',
    scenarioId: SCENARIO.NAUFRAGOS,
    blockA: [
      { archetype: ARCHETYPE.SCOUT,     sex: SEX.M },
      { archetype: ARCHETYPE.SCOUT,     sex: SEX.F },
      { archetype: ARCHETYPE.RECOLECTOR,sex: SEX.M },
      { archetype: ARCHETYPE.CAZADOR,   sex: SEX.F },
    ],
  },
];

const ARCHETYPE_LABEL: Record<Archetype, string> = {
  [ARCHETYPE.LIDER]:      'Líder (4pts)',
  [ARCHETYPE.CAZADOR]:    'Cazador (3pts)',
  [ARCHETYPE.CURANDERO]:  'Curandero (3pts)',
  [ARCHETYPE.ARTESANO]:   'Artesano (3pts)',
  [ARCHETYPE.RECOLECTOR]: 'Recolector (2pts)',
  [ARCHETYPE.SCOUT]:      'Explorador (2pts)',
  [ARCHETYPE.TEJEDOR]:    'Tejedor (2pts)',
  [ARCHETYPE.PESCADOR]:   'Pescador (2pts)',
};

const SEX_LABEL: Record<Sex, string> = { M: 'Hombre', F: 'Mujer' };

const CARD = {
  bg: '#16130c',
  border: '1px solid rgba(245,245,220,0.15)',
  radius: 8,
  pad: 12,
};

const BTN = (active: boolean, accent = '#6b5a1f') => ({
  padding: '5px 12px',
  fontSize: '0.82rem',
  borderRadius: 5,
  cursor: 'pointer',
  fontFamily: 'inherit',
  background: active ? '#2a2a1c' : '#111108',
  color: '#f5f5dc',
  border: `1px solid ${active ? accent : '#2f2f2f'}`,
});

export function DraftScreen({ seed, onStart }: DraftScreenProps) {
  const [phase, setPhase] = useState<Phase>('scenario');
  const [draft, setDraft] = useState<DraftState>(() => startDraft(seed));
  const [followerDraft, setFollowerDraft] = useState<FollowerDraftState>(() =>
    startFollowerDraft(seed),
  );
  const [activeSlot, setActiveSlot] = useState(0);

  /* ─── Escenario ─────────────────────────────────────────────────── */
  const handleScenario = (id: ScenarioId) => {
    setDraft((d) => pickScenario(d, id));
    setPhase('geography');
  };

  /* ─── Geografía ─────────────────────────────────────────────────── */
  const handleMapType = (type: MapType) => {
    setDraft((d) => pickMapType(d, type));
    setPhase('blockA');
  };

  /* ─── Bloque A helpers ──────────────────────────────────────────── */
  // El try/catch debe vivir DENTRO del updater: React invoca el updater
  // durante el reconciliado (fuera del scope del try externo).
  const handleArchetype = (arch: Archetype) => {
    setDraft((d) => { try { return pickArchetype(d, activeSlot, arch); } catch { return d; } });
  };
  const handleSex = (sex: Sex) => {
    setDraft((d) => setSex(d, activeSlot, sex));
  };
  const handleAddTrait = (id: TraitId) => {
    setDraft((d) => { try { return addTrait(d, activeSlot, id); } catch { return d; } });
  };
  const handleRemoveTrait = (id: TraitId) => {
    setDraft((d) => { try { return removeTrait(d, activeSlot, id); } catch { return d; } });
  };

  const blockAReady = (() => {
    try { finalizeBlockA(draft); return true; } catch { return false; }
  })();

  /* ─── Bloque B helpers ──────────────────────────────────────────── */
  const tierCandidates = (tier: 'excelente' | 'bueno' | 'regular' | 'malo', page = 0) =>
    generateCandidates(seed, tier, page);

  const handlePickFollower = (c: FollowerCandidate) => {
    setFollowerDraft((d) => { try { return pickFollower(d, c); } catch { return d; } });
  };

  const blockBReady = followerDraft.picks.length === 10;

  /* ─── Confirmar ─────────────────────────────────────────────────── */
  /* ─── Quick Start ──────────────────────────────────────────────── */
  const handleQuickStart = (qs: QuickStartDef) => {
    try {
      let d = startDraft(seed);
      d = pickScenario(d, qs.scenarioId);
      qs.blockA.forEach((p, i) => {
        d = pickArchetype(d, i, p.archetype);
        d = setSex(d, i, p.sex);
      });
      const elegidos = finalizeBlockA(d);

      let fd = startFollowerDraft(seed);
      const tiers: Array<'excelente' | 'bueno' | 'regular' | 'malo'> = ['excelente', 'bueno', 'regular', 'malo'];
      const counts = [3, 3, 2, 2];
      tiers.forEach((tier, ti) => {
        const cands = generateCandidates(seed, tier, 0);
        for (let i = 0; i < counts[ti]; i++) fd = pickFollower(fd, cands[i]);
      });
      const usedNames = new Set(elegidos.map((n) => n.name));
      const ciudadanos = finalizeBlockB(fd, usedNames);
      const npcs = spawnClanForScenario(seed, [...elegidos, ...ciudadanos], qs.scenarioId);
      onStart({ seed, npcs, mapType: d.mapType });
    } catch { /* no debería fallar */ }
  };

  const handleConfirm = () => {
    try {
      const elegidos = finalizeBlockA(draft);
      const usedNames = new Set(elegidos.map((n) => n.name));
      const ciudadanos = finalizeBlockB(followerDraft, usedNames);
      // Aplicar posiciones de spawn según escenario — sin esto todos
      // los NPCs quedan en {x:0,y:0} (esquina del mapa).
      const npcs = spawnClanForScenario(seed, [...elegidos, ...ciudadanos], draft.scenarioId);
      onStart({ seed, npcs, mapType: draft.mapType });
    } catch { /* validación */ }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0e0c07',
        color: '#f5f5dc',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 16px',
        gap: 24,
      }}
    >
      <h1 style={{ fontSize: '1.4rem', letterSpacing: 2, margin: 0 }}>
        HIJOS DE TRAMUNTANA
      </h1>

      {phase === 'scenario' && (
        <ScenarioPhase onPick={handleScenario} />
      )}
      {phase === 'geography' && (
        <GeographyPhase onPick={handleMapType} />
      )}
      {phase === 'blockA' && (
        <BlockAPhase
          draft={draft}
          activeSlot={activeSlot}
          onSlot={setActiveSlot}
          onArchetype={handleArchetype}
          onSex={handleSex}
          onAddTrait={handleAddTrait}
          onRemoveTrait={handleRemoveTrait}
          onNext={() => setPhase('blockB')}
          ready={blockAReady}
        />
      )}
      {phase === 'blockB' && (
        <BlockBPhase
          followerDraft={followerDraft}
          seed={seed}
          onPick={handlePickFollower}
          tierCandidates={tierCandidates}
          onNext={() => setPhase('confirm')}
          ready={blockBReady}
        />
      )}
      {phase === 'confirm' && (
        <ConfirmPhase
          draft={draft}
          followerDraft={followerDraft}
          onConfirm={handleConfirm}
          onBack={() => setPhase('blockB')}
        />
      )}

      {phase === 'scenario' && (
        <div style={{ width: '100%', maxWidth: 680 }}>
          <div style={{ fontSize: '0.72rem', opacity: 0.5, textAlign: 'center', marginBottom: 8, letterSpacing: 1 }}>
            — INICIO RÁPIDO —
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16 }}>
            {QUICK_STARTS.map((qs) => (
              <button
                key={qs.id}
                type="button"
                data-testid={`quickstart-${qs.id}`}
                onClick={() => handleQuickStart(qs)}
                style={{
                  background: '#1a1608', color: '#f5f5dc',
                  border: '1px solid #4a3f1a', borderRadius: 8,
                  padding: '10px 14px', cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                  width: 200, display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.88rem' }}>{qs.name}</strong>
                  <span style={{ fontSize: '0.7rem', color: '#f4a261' }}>{qs.difficulty}</span>
                </div>
                <span style={{ fontSize: '0.72rem', opacity: 0.7, lineHeight: 1.4 }}>{qs.description}</span>
                <span style={{ fontSize: '0.7rem', color: '#a7f3d0', marginTop: 2 }}>
                  {getScenarioDef(qs.scenarioId).name}
                </span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', opacity: 0.4, textAlign: 'center', marginBottom: 12 }}>
            — o configura tu clan manualmente —
          </div>
        </div>
      )}

      <PhaseNav phase={phase} blockAReady={blockAReady} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/* Nav de fases                                                          */
/* ════════════════════════════════════════════════════════════════════ */
function PhaseNav({ phase, blockAReady }: { phase: Phase; blockAReady: boolean }) {
  const steps: { id: Phase; label: string }[] = [
    { id: 'scenario',  label: '1. Escenario' },
    { id: 'geography', label: '2. Geografía' },
    { id: 'blockA',    label: '3. Elegidos' },
    { id: 'blockB',    label: '4. Ciudadanos' },
    { id: 'confirm',   label: '5. Confirmar' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {steps.map((s) => (
        <span
          key={s.id}
          style={{
            fontSize: '0.75rem',
            opacity: phase === s.id ? 1 : 0.35,
            color: phase === s.id ? '#f7d060' : '#f5f5dc',
          }}
        >
          {s.label}
        </span>
      ))}
    </div>
  );
  void blockAReady;
}

/* ════════════════════════════════════════════════════════════════════ */
/* Fase 1: Escenario                                                    */
/* ════════════════════════════════════════════════════════════════════ */
function ScenarioPhase({ onPick }: { onPick: (id: ScenarioId) => void }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
      {(Object.values(SCENARIO) as ScenarioId[]).map((id) => {
        const def = getScenarioDef(id);
        return (
          <button
            key={id}
            type="button"
            data-testid={`scenario-pick-${id}`}
            onClick={() => onPick(id)}
            style={{
              ...CARD,
              width: 220,
              cursor: 'pointer',
              textAlign: 'left',
              color: '#f5f5dc',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <strong style={{ fontSize: '1rem' }}>{def.name}</strong>
            <span style={{ fontSize: '0.78rem', opacity: 0.75 }}>{def.description}</span>
            <span style={{ fontSize: '0.72rem', color: '#a7f3d0', marginTop: 4 }}>
              Zona: {def.preferredSpawnZone}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/* Fase 2: Geografía                                                    */
/* ════════════════════════════════════════════════════════════════════ */
function GeographyPhase({ onPick }: { onPick: (type: MapType) => void }) {
  const types: { id: MapType; label: string; desc: string; icon: string }[] = [
    { 
      id: 'archipelago', 
      label: 'Archipiélago', 
      desc: 'Múltiples islas fractales. Ideal para la expansión marítima y el nomadismo.',
      icon: '/ui/map_preview_archipelago.svg'
    },
    { 
      id: 'pangea',     
      label: 'Pangea',      
      desc: 'Una única masa de tierra masiva. Gran espacio interior y defensa central.',
      icon: '/ui/map_preview_pangea.svg'
    },
    { 
      id: 'continents', 
      label: 'Continentes', 
      desc: '5 grandes masas de tierra separadas por canales. Equilibrio entre tierra y mar.',
      icon: '/ui/map_preview_continents.svg'
    },
  ];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', maxWidth: 800 }}>
      {types.map((t) => (
        <button
          key={t.id}
          type="button"
          data-testid={`maptype-pick-${t.id}`}
          onClick={() => onPick(t.id)}
          style={{
            ...CARD,
            width: 240,
            cursor: 'pointer',
            textAlign: 'center',
            color: '#f5f5dc',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            transition: 'transform 0.1s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <div style={{ 
            width: 128, 
            height: 128, 
            background: '#000', 
            borderRadius: 8, 
            border: '2px solid #2f2f2f',
            overflow: 'hidden',
            imageRendering: 'pixelated'
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.icon} alt={t.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <strong style={{ fontSize: '1.1rem', color: '#f7d060' }}>{t.label}</strong>
          <span style={{ fontSize: '0.82rem', opacity: 0.8, lineHeight: 1.4 }}>{t.desc}</span>
        </button>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/* Fase 2: Bloque A — 4 Elegidos                                        */
/* ════════════════════════════════════════════════════════════════════ */
interface BlockAProps {
  draft: DraftState;
  activeSlot: number;
  onSlot: (i: number) => void;
  onArchetype: (a: Archetype) => void;
  onSex: (s: Sex) => void;
  onAddTrait: (id: TraitId) => void;
  onRemoveTrait: (id: TraitId) => void;
  onNext: () => void;
  ready: boolean;
}

function BlockAPhase({ draft, activeSlot, onSlot, onArchetype, onSex, onAddTrait, onRemoveTrait, onNext, ready }: BlockAProps) {
  const slot = draft.slots[activeSlot];
  const traitUsed = traitsBudgetUsed(draft);
  const slotTraits = draft.traitSelections[activeSlot] ?? [];

  return (
    <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {draft.slots.map((s, i) => (
          <button key={i} type="button" onClick={() => onSlot(i)}
            style={{ ...BTN(i === activeSlot, '#f4a261'), flex: 1 }}
            data-testid={`draft-slot-${i}`}>
            {s.archetype ? `${s.archetype} (${s.sex ?? '?'})` : `Slot ${i + 1}`}
          </button>
        ))}
      </div>

      <div style={{ ...CARD, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          Presupuesto arquetipos: {draft.budgetRemaining}/{CHOSEN_BUDGET}pts restantes
          {' · '}Presupuesto rasgos: {TRAIT_BUDGET_DRAFT - traitUsed}/{TRAIT_BUDGET_DRAFT}pts restantes
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: 4 }}>Arquetipo</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(Object.values(ARCHETYPE) as Archetype[]).map((a) => (
              <button key={a} type="button" onClick={() => onArchetype(a)}
                style={BTN(slot.archetype === a)} data-testid={`archetype-${a}`}>
                {ARCHETYPE_LABEL[a]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: 4 }}>Sexo</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {(Object.values(SEX) as Sex[]).map((s) => (
              <button key={s} type="button" onClick={() => onSex(s)}
                style={BTN(slot.sex === s)} data-testid={`sex-${s}`}>
                {SEX_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: 4 }}>Rasgos del slot</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(Object.values(TRAIT) as TraitId[]).map((id) => {
              const def = TRAIT_CATALOG[id];
              const active = slotTraits.includes(id);
              return (
                <button key={id} type="button"
                  onClick={() => active ? onRemoveTrait(id) : onAddTrait(id)}
                  style={{ ...BTN(active, def.cost < 0 ? '#e63946' : '#57cc99'), fontSize: '0.75rem' }}
                  data-testid={`trait-${id}`}>
                  {def.name} ({def.cost > 0 ? '+' : ''}{def.cost}pts)
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button type="button" onClick={onNext} disabled={!ready}
        style={{ ...BTN(ready, '#57cc99'), alignSelf: 'flex-end', opacity: ready ? 1 : 0.4 }}
        data-testid="blockA-next">
        Continuar → Ciudadanos
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/* Fase 3: Bloque B — 10 Ciutadans                                      */
/* ════════════════════════════════════════════════════════════════════ */
interface BlockBProps {
  followerDraft: FollowerDraftState;
  seed: number;
  onPick: (c: FollowerCandidate) => void;
  tierCandidates: (tier: 'excelente' | 'bueno' | 'regular' | 'malo', page?: number) => FollowerCandidate[];
  onNext: () => void;
  ready: boolean;
}

const TIER_LABELS = { excelente: 'Excelente', bueno: 'Bueno', regular: 'Regular', malo: 'Malo' } as const;

function BlockBPhase({ followerDraft, onPick, tierCandidates, onNext, ready }: BlockBProps) {
  const [activeTier, setActiveTier] = useState<'excelente' | 'bueno' | 'regular' | 'malo'>('excelente');
  const candidates = tierCandidates(activeTier);
  const picked = new Set(followerDraft.picks.map((p) => p.id));

  return (
    <div style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
        Ciudadanos seleccionados: {followerDraft.picks.length}/10
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {(['excelente', 'bueno', 'regular', 'malo'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setActiveTier(t)}
            style={BTN(activeTier === t)}>
            {TIER_LABELS[t]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
        {candidates.slice(0, 6).map((c) => {
          const isPicked = picked.has(c.id);
          return (
            <button key={c.id} type="button" onClick={() => !isPicked && onPick(c)}
              disabled={isPicked || followerDraft.picks.length >= 10}
              data-testid={`candidate-${c.id}`}
              style={{ ...BTN(isPicked, '#38b2ac'), display: 'flex', gap: 12, alignItems: 'center',
                opacity: isPicked ? 0.5 : 1, cursor: isPicked ? 'default' : 'pointer' }}>
              <span>{c.sex} · {c.linaje}</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                Sup:{c.stats.supervivencia} Soc:{c.stats.socializacion}
              </span>
            </button>
          );
        })}
      </div>

      <button type="button" onClick={onNext} disabled={!ready}
        style={{ ...BTN(ready, '#57cc99'), alignSelf: 'flex-end', opacity: ready ? 1 : 0.4 }}
        data-testid="blockB-next">
        Continuar → Confirmar
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
/* Fase 4: Confirmar                                                     */
/* ════════════════════════════════════════════════════════════════════ */
function ConfirmPhase({ draft, followerDraft, onConfirm, onBack }: {
  draft: DraftState; followerDraft: FollowerDraftState;
  onConfirm: () => void; onBack: () => void;
}) {
  const scenario = draft.scenarioId ? getScenarioDef(draft.scenarioId) : null;
  return (
    <div style={{ ...CARD, maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {scenario && (
        <div><strong>Escenario:</strong> {scenario.name}</div>
      )}
      <div>
        <strong>Elegidos:</strong>
        {draft.slots.map((s, i) => (
          <div key={i} style={{ fontSize: '0.8rem', opacity: 0.8 }}>
            {i + 1}. {s.archetype ?? '—'} ({s.sex ?? '?'})
            {(draft.traitSelections[i] ?? []).length > 0 &&
              ` [${draft.traitSelections[i].join(', ')}]`}
          </div>
        ))}
      </div>
      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
        {followerDraft.picks.length} ciutadans seleccionats
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onBack} style={BTN(false)}>← Atrás</button>
        <button type="button" onClick={onConfirm} data-testid="draft-confirm"
          style={{ ...BTN(true, '#57cc99') }}>
          Iniciar Partida
        </button>
      </div>
    </div>
  );
}
