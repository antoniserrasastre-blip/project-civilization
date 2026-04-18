'use client';

/**
 * Mapa visual — v1.2 "mapa antiguo de Baleares".
 *
 * Renderiza el archipiélago balear (Mallorca + Menorca + Ibiza +
 * Formentera) como polígonos de pergamino con costa a tinta. Incluye
 * rosa de los vientos, símbolos hand-drawn dentro de tierra, y NPCs
 * como círculos de color.
 *
 * Mantiene los `data-testid` originales (`map-view`, `coast-polygon`,
 * `map-symbols`, `map-npc-*`, `tutorial-halo`) para no romper E2E.
 * `coast-polygon` queda asociado al polígono de Mallorca (isla principal).
 */

import React from 'react';
import type { Archipelago, Island } from '@/lib/map';
import type { NPC } from '@/lib/world-state';
import { GROUPS } from '@/lib/world-state';
import { next, seedState } from '@/lib/prng';

interface MapViewProps {
  archipelago: Archipelago;
  npcs: NPC[];
  selectedId: string | null;
  chosenOnes: string[];
  /** Ids de los Elegidos de los dioses rivales (Sprint 10). */
  rivalChosenIds?: string[];
  mapSize: number;
  /** Semilla del mundo, para símbolos hand-drawn deterministas. */
  seed?: number;
  /** Id del NPC señalado por el tutorial. */
  highlightId?: string | null;
  onSelect: (id: string) => void;
}

/**
 * Genera posiciones deterministas de símbolos hand-drawn dentro de
 * cualquier isla del archipiélago. Pura + seedable.
 */
function generateSymbols(
  seed: number,
  islands: Island[],
  mapSize: number,
): Array<{ x: number; y: number; kind: 'mountain' | 'forest' }> {
  const out: Array<{ x: number; y: number; kind: 'mountain' | 'forest' }> = [];
  let prng = seedState(seed ^ 0xc0ffee);
  const target = 24;
  let attempts = 0;
  while (out.length < target && attempts < 400) {
    attempts++;
    const xr = next(prng);
    prng = xr.next;
    const yr = next(prng);
    prng = yr.next;
    const kindRoll = next(prng);
    prng = kindRoll.next;
    const x = xr.value * mapSize;
    const y = yr.value * mapSize;
    const onLand = islands.some((isla) => pointInPolygon(x, y, isla.points));
    if (!onLand) continue;
    out.push({
      x,
      y,
      kind: kindRoll.value < 0.4 ? 'mountain' : 'forest',
    });
  }
  return out;
}

function pointInPolygon(
  x: number,
  y: number,
  pts: Array<{ x: number; y: number }>,
): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function npcColor(npc: NPC, chosenOnes: string[]): string {
  if (!npc.alive) return '#94a3b8';
  if (chosenOnes.includes(npc.id)) return '#f97316';
  const group = GROUPS.find((g) => g.id === npc.group_id);
  if (group) return group.color;
  return '#0f172a';
}

export function MapView(props: MapViewProps) {
  const { archipelago, npcs, selectedId, chosenOnes, mapSize, onSelect } = props;
  const rivalChosenIds = props.rivalChosenIds ?? [];
  const highlightId = props.highlightId ?? null;
  const highlightNpc =
    highlightId ? npcs.find((n) => n.id === highlightId) ?? null : null;
  const symbols = React.useMemo(
    () => generateSymbols(props.seed ?? 0, archipelago.islands, mapSize),
    [props.seed, archipelago.islands, mapSize],
  );

  return (
    <div
      className="relative w-full aspect-square bg-[#f5ecd2] border border-amber-900/30 rounded-xl overflow-hidden shadow-inner"
      data-testid="map-view"
    >
      <svg
        viewBox={`0 0 ${mapSize} ${mapSize}`}
        className="w-full h-full"
        role="img"
        aria-label="Mapa del archipiélago balear — GODGAME"
      >
        <defs>
          <pattern
            id="sea-hatch"
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(30)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="#9a8a6a"
              strokeWidth="0.35"
              opacity="0.55"
            />
          </pattern>
          <radialGradient id="parchment-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(120,80,40,0.28)" />
          </radialGradient>
        </defs>

        {/* Mar — hachurado hand-drawn */}
        <rect
          x="0"
          y="0"
          width={mapSize}
          height={mapSize}
          fill="url(#sea-hatch)"
        />

        {/* Islas */}
        {archipelago.islands.map((isla) => {
          const pts = isla.points
            .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
            .join(' ');
          const isMallorca = isla.kind === 'mallorca';
          return (
            <g key={isla.kind} data-testid={`island-${isla.kind}`}>
              {/* Sombra de costa suave */}
              <polygon
                points={pts}
                fill="none"
                stroke="#8a6b43"
                strokeWidth="1.8"
                opacity={0.22}
                strokeLinejoin="round"
                pointerEvents="none"
              />
              <polygon
                // Mallorca conserva el testid legacy para E2E.
                data-testid={isMallorca ? 'coast-polygon' : undefined}
                points={pts}
                fill="#fefbe9"
                stroke="#312e24"
                strokeWidth="0.7"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {/* Símbolos hand-drawn — montañas y bosques */}
        <g
          data-testid="map-symbols"
          stroke="#3d2f1b"
          strokeWidth="0.35"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {symbols.map((sym, idx) =>
            sym.kind === 'mountain' ? (
              <path
                key={idx}
                data-testid="map-symbol-mountain"
                d={`M ${sym.x - 2} ${sym.y + 1.5} L ${sym.x} ${sym.y - 1.5} L ${sym.x + 2} ${sym.y + 1.5} M ${sym.x - 0.7} ${sym.y + 0.2} L ${sym.x} ${sym.y - 0.8} L ${sym.x + 0.7} ${sym.y + 0.2}`}
              />
            ) : (
              <g key={idx} data-testid="map-symbol-forest">
                <circle cx={sym.x} cy={sym.y - 0.3} r={0.8} fill="#3d2f1b11" />
                <path
                  d={`M ${sym.x} ${sym.y + 1.2} L ${sym.x} ${sym.y - 0.6} M ${sym.x - 0.6} ${sym.y - 0.3} L ${sym.x + 0.6} ${sym.y - 0.3}`}
                />
              </g>
            ),
          )}
        </g>

        {/* Rosa de los vientos */}
        <CompassRose
          cx={archipelago.compassRose.x}
          cy={archipelago.compassRose.y}
        />

        {/* Halo dorado del señalado por el tutorial */}
        {highlightNpc && highlightNpc.alive && (
          <g data-testid="tutorial-halo">
            <circle
              cx={highlightNpc.position.x}
              cy={highlightNpc.position.y}
              r={3}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={0.6}
              opacity={0.85}
            >
              <animate
                attributeName="r"
                values="2.5;4;2.5"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.4;1;0.4"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          </g>
        )}

        {/* NPCs */}
        {npcs.map((npc) => {
          const isSelected = selectedId === npc.id;
          const isRivalChosen = rivalChosenIds.includes(npc.id);
          return (
            <circle
              key={npc.id}
              data-testid={`map-npc-${npc.id}`}
              data-alive={npc.alive ? 'true' : 'false'}
              data-chosen={chosenOnes.includes(npc.id) ? 'true' : 'false'}
              data-rival-chosen={isRivalChosen ? 'true' : 'false'}
              cx={npc.position.x}
              cy={npc.position.y}
              r={isSelected ? 1.8 : isRivalChosen ? 1.5 : 1.2}
              fill={npcColor(npc, chosenOnes)}
              stroke={
                isSelected
                  ? '#f97316'
                  : isRivalChosen
                    ? '#7c2d12'
                    : '#312e24'
              }
              strokeWidth={isSelected ? 0.45 : isRivalChosen ? 0.5 : 0.2}
              strokeDasharray={isRivalChosen ? '0.6 0.4' : undefined}
              opacity={npc.alive ? 1 : 0.35}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(npc.id);
              }}
              style={{ cursor: npc.alive ? 'pointer' : 'default' }}
            />
          );
        })}

        {/* Viñeteado pergamino, oclusión suave en bordes */}
        <rect
          x="0"
          y="0"
          width={mapSize}
          height={mapSize}
          fill="url(#parchment-vignette)"
          pointerEvents="none"
        />
      </svg>
    </div>
  );
}

/**
 * Rosa de los vientos — 8 puntos, con N marcado en color de tinta.
 * Pensada para colocarse en mar abierto sin bloquear interacción.
 */
function CompassRose(props: { cx: number; cy: number }) {
  const { cx, cy } = props;
  const outer = 5;
  const inner = 1.6;
  // 8 direcciones cardinales + intercardinales.
  const arms = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    return {
      x1: cx,
      y1: cy,
      x2: cx + Math.cos(a) * outer,
      y2: cy + Math.sin(a) * outer,
      major: i % 2 === 0,
    };
  });
  return (
    <g
      data-testid="compass-rose"
      stroke="#3d2f1b"
      strokeLinecap="round"
      fill="none"
      pointerEvents="none"
    >
      {arms.map((a, i) => (
        <line
          key={i}
          x1={a.x1}
          y1={a.y1}
          x2={a.x2}
          y2={a.y2}
          strokeWidth={a.major ? 0.4 : 0.22}
          opacity={a.major ? 0.9 : 0.5}
        />
      ))}
      <circle cx={cx} cy={cy} r={inner} fill="#f5ecd2" />
      <circle cx={cx} cy={cy} r={inner} strokeWidth={0.3} />
      {/* Estrella de 4 puntas centrada */}
      <path
        d={`M ${cx} ${cy - outer} L ${cx + 0.8} ${cy - 0.5} L ${cx + outer} ${cy} L ${cx + 0.8} ${cy + 0.5} L ${cx} ${cy + outer} L ${cx - 0.8} ${cy + 0.5} L ${cx - outer} ${cy} L ${cx - 0.8} ${cy - 0.5} Z`}
        strokeWidth={0.35}
        fill="#fefbe9"
        opacity={0.95}
      />
      {/* N marca */}
      <text
        x={cx}
        y={cy - outer - 1.2}
        textAnchor="middle"
        fontSize={2}
        fontFamily="'Times New Roman', serif"
        fill="#3d2f1b"
        fontWeight="bold"
      >
        N
      </text>
    </g>
  );
}
