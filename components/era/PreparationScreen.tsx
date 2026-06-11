'use client';

/**
 * Pantalla de PREPARACIÓN (Sprint 04b, línea C) — la fase, no un panel.
 * Izquierda: informe del amanecer (state.dawnReport — generado por el sim,
 * aquí solo se pinta). Derecha: grid de cartas con selector de designio.
 * Abajo: Amanecer. Click en carta → NpcSheet existente (vía onNpcClick).
 */

import { useState } from 'react';
import type { Assignments } from '@/lib/dawn';
import type { DawnReport, GameState, MotivoFallo } from '@/lib/game-state';
import type { NPC, AssignmentDomain } from '@/lib/npcs';
import { ASSIGNMENT_DOMAINS } from '@/lib/npcs';
import { TICKS_PER_DAY } from '@/lib/resources';
import { RESOURCE_LABEL, type ResourceId } from '@/lib/world-state';

const DOMAIN_LABEL: Record<AssignmentDomain, string> = {
  recoleccion: 'Recolección',
  exploracion: 'Exploración',
  construccion: 'Construcción',
};

const SKILL_LABEL: Record<keyof NPC['skills'], string> = {
  exploration: 'Exploración',
  hunting: 'Caza',
  gathering: 'Recolección',
  crafting: 'Artesanía',
  fishing: 'Pesca',
  healing: 'Sanación',
};

/** Color de retrato-placeholder por linaje (los 8 vientos). */
const LINAJE_COLOR: Record<string, string> = {
  tramuntana: '#7da2c1', llevant: '#c1a87d', migjorn: '#c17d7d', ponent: '#9b7dc1',
  xaloc: '#c1947d', mestral: '#7dc1b4', gregal: '#8ec17d', garbi: '#c17da6',
};

function dominantSkill(npc: NPC): string {
  const entries = Object.entries(npc.skills) as [keyof NPC['skills'], number][];
  entries.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)); // estable
  return `${SKILL_LABEL[entries[0][0]]} ${entries[0][1]}`;
}

function ageDays(npc: NPC, tick: number): number {
  return Math.max(0, Math.floor((tick - npc.birthTick) / TICKS_PER_DAY));
}

/** Traducción del porqué del fallo (Sprint 05b) — el estado lleva el código. */
const MOTIVO_LABEL: Record<MotivoFallo, string> = {
  'sin-obra-pendiente': 'no había obra pendiente',
  'sin-frontera': 'no quedaba tierra por descubrir',
  corto: 'se quedó corto',
};

/** La voz del clan (CONEXIÓN, sprint 05): el informe le habla AL dios en 2ª
 *  persona sobre SUS designios. Plantillas deterministas sobre el estado —
 *  el LLM no pinta nada aquí. */
function vozDelClan(report: DawnReport): { frase: string; fallos: string[] } {
  const { designiosCumplidos: c, designiosDados: d } = report.clan;
  const fallos = report.npcs
    .filter((n) => n.cumplido === 'fallido')
    .map(
      (n) =>
        `${n.name} no pudo con ${DOMAIN_LABEL[n.designio!].toLowerCase()}` +
        (n.motivo ? ` — ${MOTIVO_LABEL[n.motivo]}` : ''),
    );
  if (d === 0) return { frase: 'No nos diste designio. El clan siguió su instinto.', fallos };
  if (c === d) return { frase: 'Hicimos lo que pediste. Todos tus designios se cumplieron.', fallos };
  if (c === 0) return { frase: 'Te fallamos: ninguno de tus designios se cumplió.', fallos };
  return { frase: `Cumplimos ${c} de tus ${d} designios. Te fallamos en el resto.`, fallos };
}

/** Etiqueta de recurso en minúscula («12 bayas») — RESOURCE_LABEL si existe. */
function labelRecurso(id: string): string {
  const label = (RESOURCE_LABEL as Partial<Record<string, string>>)[id];
  return label ? label.toLowerCase() : id;
}

/** Sección Economía (Sprint 05b): quién aportó qué y qué se comió hoy.
 *  Plantillas deterministas sobre el informe — sin estado extra. */
function Economia({ report }: { report: DawnReport }) {
  // `?? {}`: saves anteriores al 05b no traen los agregados (compat).
  const aportes = report.clan.aportes ?? {};
  const comido = report.clan.comido ?? {};
  const lineaAportes = Object.entries(aportes)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([id, total]) => {
      const quien = report.npcs
        .filter((n) => (n.porRecurso?.[id as ResourceId] ?? 0) > 0)
        .map((n) => `${n.name} ${n.porRecurso![id as ResourceId]}`)
        .join(', ');
      return `${total} ${labelRecurso(id)}${quien ? ` (${quien})` : ''}`;
    })
    .join(' · ');
  const lineaComido = Object.entries(comido)
    .filter(([, v]) => (v ?? 0) > 0)
    .map(([k, v]) => `${v} ${labelRecurso(k)}`)
    .join(', ');
  return (
    <div data-testid="dawn-economy" className="mb-4 text-sm">
      <h3 className="mb-1 text-amber-300">Economía</h3>
      <ul className="space-y-1">
        {lineaAportes !== '' && <li>Recolectado: {lineaAportes}</li>}
        {lineaComido !== '' ? (
          <li>Comimos: {lineaComido}</li>
        ) : (
          Object.keys(comido).length === 0 && <li className="text-stone-500">Nadie comió hoy.</li>
        )}
      </ul>
    </div>
  );
}

export function PreparationScreen({
  state,
  onDawn,
  onNpcClick,
}: {
  state: GameState;
  onDawn: (assignments: Assignments) => void;
  onNpcClick: (id: string) => void;
}) {
  const alive = state.npcs.filter((n) => n.alive);
  const [pending, setPending] = useState<Record<string, AssignmentDomain | null>>(
    () => Object.fromEntries(alive.map((n) => [n.id, n.designio ?? null])),
  );
  const report = state.dawnReport ?? null;

  const confirm = () => {
    const assignments: Record<string, AssignmentDomain | null> = {};
    for (const n of alive) {
      const d = pending[n.id] ?? null;
      if (d) assignments[n.id] = d;
      else if (n.designio) assignments[n.id] = null; // "Libre" sobre designio previo → limpieza explícita
      // null sin designio previo → se omite (no ensuciar el historial con no-ops)
    }
    onDawn(assignments);
  };

  return (
    <div
      data-testid="preparation-screen"
      className="fixed inset-0 z-[100] flex flex-col bg-[#0c0a09]/95 text-stone-200"
    >
      <header className="border-b border-stone-800 px-6 py-3 text-amber-400">
        Anochecer — preparación · el clan aguarda tus designios
      </header>

      <div className="flex min-h-0 flex-1">
        {/* INFORME DEL AMANECER */}
        <section data-testid="dawn-report" className="w-[380px] overflow-y-auto border-r border-stone-800 p-5">
          <h2 className="mb-3 text-amber-300">Informe del amanecer</h2>
          {!report ? (
            <p className="text-stone-500">Primera noche: aún no hay día que contar.</p>
          ) : (
            <>
              {(() => {
                const voz = vozDelClan(report);
                return (
                  <blockquote data-testid="voz-del-clan" className="mb-4 border-l-2 border-amber-700 pl-3 text-sm italic text-amber-200">
                    «{voz.frase}»
                    {voz.fallos.map((f) => (
                      <span key={f} className="block text-xs not-italic text-red-400">— {f}</span>
                    ))}
                  </blockquote>
                );
              })()}
              <ul className="mb-4 space-y-1 text-sm">
                <li>Día {report.day}: recolectado {report.clan.harvested} · obra {report.clan.built} · descubierto {report.clan.discovered} tiles</li>
                {report.clan.deaths > 0 && <li className="text-red-400">Muertes: {report.clan.deaths}</li>}
              </ul>
              <Economia report={report} />
              <table className="w-full text-left text-xs">
                <thead className="text-stone-500">
                  <tr><th>Quién</th><th>Tu designio</th><th>Hecho</th></tr>
                </thead>
                <tbody>
                  {report.npcs.map((n) => (
                    <tr key={n.id} className="border-t border-stone-800/60">
                      <td className="py-1">{n.name}</td>
                      <td>
                        {n.designio ? DOMAIN_LABEL[n.designio] : '—'}
                        {n.cumplido === 'cumplido' && <span className="text-emerald-400"> ✓</span>}
                        {n.cumplido === 'fallido' && <span className="text-red-400"> ✗</span>}
                      </td>
                      <td>{n.harvested > 0 && `rec ${n.harvested} `}{n.built > 0 && `obra ${n.built} `}{n.discovered > 0 && `expl ${n.discovered}`}{n.harvested + n.built + n.discovered === 0 && '·'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        {/* CARTAS */}
        <section className="grid flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3 overflow-y-auto p-5">
          {alive.map((n) => (
            <div key={n.id} data-testid={`npc-card-${n.id}`} className="border border-stone-700 bg-stone-900/60 p-3">
              <button className="flex w-full items-center gap-2 text-left" onClick={() => onNpcClick(n.id)}>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-stone-900"
                  style={{ backgroundColor: LINAJE_COLOR[n.linaje] ?? '#999' }}
                >
                  {n.name.charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate">{n.name}</span>
                  <span className="block text-[10px] text-stone-500">
                    {ageDays(n, state.tick)} días · {dominantSkill(n)}
                  </span>
                </span>
              </button>
              <select
                data-testid={`designio-select-${n.id}`}
                className="mt-2 w-full border border-stone-700 bg-stone-950 px-1 py-1 text-xs"
                value={pending[n.id] ?? ''}
                onChange={(e) =>
                  setPending((p) => ({ ...p, [n.id]: (e.target.value || null) as AssignmentDomain | null }))
                }
              >
                <option value="">Libre</option>
                {ASSIGNMENT_DOMAINS.map((d) => (
                  <option key={d} value={d}>{DOMAIN_LABEL[d]}</option>
                ))}
              </select>
            </div>
          ))}
        </section>
      </div>

      <footer className="flex justify-center border-t border-stone-800 p-3">
        <button
          data-testid="dawn-button"
          className="border border-amber-500 px-8 py-2 text-amber-300 hover:bg-amber-900/40"
          onClick={confirm}
        >
          Amanecer
        </button>
      </footer>
    </div>
  );
}
