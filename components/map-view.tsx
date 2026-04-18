'use client';

/**
 * Mapa visual — Sprint 2.
 *
 * Renderiza la costa procedural (polígono cerrado) y los NPCs como
 * círculos de color, conforme al entregable "NPCs renderizados como
 * círculos de color sobre canvas" (Sprint 2 del ROADMAP).
 *
 * Se usa SVG en lugar de <canvas> porque (a) escala bien en responsive,
 * (b) da data-testid por NPC sin retrabajo, y (c) los eventos de click
 * llegan al elemento exacto — más determinista y testeable desde Playwright.
 * Visualmente equivale a un canvas de dibujo 2D con hit-testing implícito.
 */

import React from 'react';
import type { Coast } from '@/lib/map';
import type { NPC } from '@/lib/world-state';
import { GROUPS } from '@/lib/world-state';
import { next, seedState } from '@/lib/prng';

interface MapViewProps {
  coast: Coast;
  npcs: NPC[];
  selectedId: string | null;
  chosenOnes: string[];
  mapSize: number;
  /**
   * Semilla del mundo. Se usa para disponer símbolos hand-drawn
   * (montañas, bosques) deterministas por partida.
   */
  seed?: number;
  /**
   * Id del NPC señalado por el tutorial. Recibe halo dorado pulsante sobre
   * su círculo — solo se renderiza si no es null (tutorial activo).
   */
  highlightId?: string | null;
  onSelect: (id: string) => void;
}

/**
 * Genera posiciones deterministas de símbolos hand-drawn (montañas /
 * bosques) dentro del polígono de la isla. Pura + seedable.
 */
function generateSymbols(
  seed: number,
  coast: Coast,
  mapSize: number,
): Array<{ x: number; y: number; kind: 'mountain' | 'forest' }> {
  const out: Array<{ x: number; y: number; kind: 'mountain' | 'forest' }> = [];
  let prng = seedState(seed ^ 0xc0ffee);
  const target = 16; // montañas + bosques
  let attempts = 0;
  while (out.length < target && attempts < 200) {
    attempts++;
    const xr = next(prng);
    prng = xr.next;
    const yr = next(prng);
    prng = yr.next;
    const kindRoll = next(prng);
    prng = kindRoll.next;
    const x = xr.value * mapSize;
    const y = yr.value * mapSize;
    if (!pointInPolygon(x, y, coast.points)) continue;
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
  if (!npc.alive) return '#94a3b8'; // slate-400 (muertos)
  if (chosenOnes.includes(npc.id)) return '#f97316'; // orange-500 (Elegido)
  const group = GROUPS.find((g) => g.id === npc.group_id);
  if (group) return group.color;
  return '#0f172a'; // slate-900 (mortal sin grupo conocido)
}

export function MapView(props: MapViewProps) {
  const { coast, npcs, selectedId, chosenOnes, mapSize, onSelect } = props;
  const highlightId = props.highlightId ?? null;
  const highlightNpc =
    highlightId ? npcs.find((n) => n.id === highlightId) ?? null : null;
  const symbols = React.useMemo(
    () => generateSymbols(props.seed ?? 0, coast, mapSize),
    [props.seed, coast, mapSize],
  );
  const polygonPoints = coast.points
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');

  return (
    <div
      className="relative w-full aspect-square bg-[#f5ecd2] border border-amber-900/20 rounded-xl overflow-hidden shadow-inner"
      data-testid="map-view"
    >
      <svg
        viewBox={`0 0 ${mapSize} ${mapSize}`}
        className="w-full h-full"
        role="img"
        aria-label="Mapa del archipiélago de los Hijos de Tramuntana"
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
              opacity="0.6"
            />
          </pattern>
          <radialGradient id="parchment-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(120,80,40,0.22)" />
          </radialGradient>
        </defs>
        {/* Mar — hachurado hand-drawn */}
        <rect x="0" y="0" width={mapSize} height={mapSize} fill="url(#sea-hatch)" />
        {/* Isla (tinta gruesa, relleno pergamino) */}
        <polygon
          data-testid="coast-polygon"
          points={polygonPoints}
          fill="#fefbe9"
          stroke="#312e24"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        {/* Símbolos hand-drawn — montañas y bosques */}
        <g
          data-testid="map-symbols"
          stroke="#312e24"
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
                <circle cx={sym.x} cy={sym.y - 0.3} r={0.8} fill="#312e2411" />
                <path
                  d={`M ${sym.x} ${sym.y + 1.2} L ${sym.x} ${sym.y - 0.6} M ${sym.x - 0.6} ${sym.y - 0.3} L ${sym.x + 0.6} ${sym.y - 0.3}`}
                />
              </g>
            ),
          )}
        </g>
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
          return (
            <circle
              key={npc.id}
              data-testid={`map-npc-${npc.id}`}
              data-alive={npc.alive ? 'true' : 'false'}
              data-chosen={chosenOnes.includes(npc.id) ? 'true' : 'false'}
              cx={npc.position.x}
              cy={npc.position.y}
              r={isSelected ? 1.8 : 1.2}
              fill={npcColor(npc, chosenOnes)}
              stroke={isSelected ? '#f97316' : '#312e24'}
              strokeWidth={isSelected ? 0.45 : 0.2}
              opacity={npc.alive ? 1 : 0.35}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(npc.id);
              }}
              style={{ cursor: npc.alive ? 'pointer' : 'default' }}
            />
          );
        })}
        {/* Viñeteado pergamino final, ocluye suavemente hacia los bordes */}
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
