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

interface MapViewProps {
  coast: Coast;
  npcs: NPC[];
  selectedId: string | null;
  chosenOnes: string[];
  mapSize: number;
  onSelect: (id: string) => void;
}

function npcColor(npc: NPC, chosenOnes: string[]): string {
  if (!npc.alive) return '#94a3b8'; // slate-400 (muertos)
  if (chosenOnes.includes(npc.id)) return '#f97316'; // orange-500 (Elegido)
  if (npc.partner_id) return '#10b981'; // emerald-500 (emparejado)
  return '#0f172a'; // slate-900 (mortal normal)
}

export function MapView(props: MapViewProps) {
  const { coast, npcs, selectedId, chosenOnes, mapSize, onSelect } = props;
  const polygonPoints = coast.points
    .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');

  return (
    <div
      className="relative w-full aspect-square bg-[#fdf6e3] border border-slate-200 rounded-xl overflow-hidden shadow-sm"
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
            width="4"
            height="4"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="4"
              stroke="#cbd5e1"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        {/* Mar de fondo (tachado sutil) */}
        <rect x="0" y="0" width={mapSize} height={mapSize} fill="url(#sea-hatch)" />
        {/* Isla */}
        <polygon
          data-testid="coast-polygon"
          points={polygonPoints}
          fill="#fefbe9"
          stroke="#475569"
          strokeWidth="0.5"
        />
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
              stroke={isSelected ? '#f97316' : 'none'}
              strokeWidth={isSelected ? 0.4 : 0}
              opacity={npc.alive ? 1 : 0.35}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(npc.id);
              }}
              style={{ cursor: npc.alive ? 'pointer' : 'default' }}
            />
          );
        })}
      </svg>
    </div>
  );
}
