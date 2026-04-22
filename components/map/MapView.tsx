'use client';

/**
 * MapView — render pixel art del archipiélago primigenia.
 *
 * Lee la fixture `lib/fixtures/world-map.v1.json` y la dibuja en un
 * canvas HTML5 con zoom + drag. La lógica de viewport (clamp, pan,
 * zoom) vive en `lib/viewport.ts` (testable sin DOM).
 *
 * NPCs se pintan como marcadores pixel-art PLACEHOLDER (diamante =
 * Elegido, círculo = Ciudadano) vía `lib/npc-marker.ts`. Sprint
 * ASSETS-IMPORT los reemplazará por sprites sin cambiar el cableado
 * de hover/click.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import worldMapJson from '@/lib/fixtures/world-map.v1.json';
import type { WorldMap, TileId } from '@/lib/world-state';
import type { NPC } from '@/lib/npcs';
import { computeNpcMarker, type NpcMarker } from '@/lib/npc-marker';
import { TILE_COLOR } from '@/lib/tile-colors';
import {
  applyDrag,
  applyZoom,
  clampOffset,
  clampZoom,
  minZoom,
  type ViewportDims,
  type ViewportState,
} from '@/lib/viewport';

const TILE_SIZE = 32;

const WORLD = worldMapJson as unknown as WorldMap;

interface MarkerPlacement {
  npc: NPC;
  marker: NpcMarker;
  /** Centro del marcador en pixels de screen. */
  cx: number;
  cy: number;
}

/** Devuelve los marcadores (con bbox en pixels de screen) de todos
 *  los NPCs vivos dentro del viewport. Se usa tanto por el renderer
 *  como por el hit-test del hover/click — misma fuente de verdad
 *  para pintura e interacción. */
function placeMarkers(
  npcs: readonly NPC[],
  dims: ViewportDims,
  state: ViewportState,
): MarkerPlacement[] {
  const tilePx = dims.tileSize * state.zoom;
  const out: MarkerPlacement[] = [];
  for (const npc of npcs) {
    if (!npc.alive) continue;
    const cx = npc.position.x * tilePx + state.offsetX + tilePx / 2;
    const cy = npc.position.y * tilePx + state.offsetY + tilePx / 2;
    const marker = computeNpcMarker(npc, state.zoom, dims.tileSize);
    const half = marker.size / 2 + marker.outline;
    if (
      cx < -half ||
      cy < -half ||
      cx > dims.screenWidth + half ||
      cy > dims.screenHeight + half
    ) {
      continue;
    }
    out.push({ npc, marker, cx, cy });
  }
  return out;
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  outline: string,
  outlineWidth: number,
) {
  const r = size / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = outlineWidth;
  ctx.strokeStyle = outline;
  ctx.stroke();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  outline: string,
  outlineWidth: number,
) {
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = outlineWidth;
  ctx.strokeStyle = outline;
  ctx.stroke();
}

function renderNPCs(
  ctx: CanvasRenderingContext2D,
  placements: readonly MarkerPlacement[],
) {
  // Pixel-art duro: sin antialias.
  ctx.imageSmoothingEnabled = false;
  ctx.lineJoin = 'miter';
  for (const { marker, cx, cy } of placements) {
    const { fill, outline, highlight } = marker.colors;
    if (marker.shape === 'diamond') {
      drawDiamond(ctx, cx, cy, marker.size, fill, outline, marker.outline);
      // Halo interior del Elegido — un pixel central de highlight
      // para hacerlo resaltar sobre tiles variados.
      ctx.fillStyle = highlight;
      ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 2, 2);
    } else {
      drawCircle(ctx, cx, cy, marker.size, fill, outline, marker.outline);
    }
  }
}

function renderTiles(
  ctx: CanvasRenderingContext2D,
  world: WorldMap,
  dims: ViewportDims,
  state: ViewportState,
) {
  const { screenWidth, screenHeight, tileSize } = dims;
  ctx.clearRect(0, 0, screenWidth, screenHeight);

  // Determinar qué tiles caen dentro del viewport para evitar
  // iterar los 262k del mapa completo cada frame.
  const tilePx = tileSize * state.zoom;
  const firstX = Math.max(0, Math.floor(-state.offsetX / tilePx));
  const firstY = Math.max(0, Math.floor(-state.offsetY / tilePx));
  const lastX = Math.min(
    world.width,
    Math.ceil((screenWidth - state.offsetX) / tilePx),
  );
  const lastY = Math.min(
    world.height,
    Math.ceil((screenHeight - state.offsetY) / tilePx),
  );

  for (let y = firstY; y < lastY; y++) {
    for (let x = firstX; x < lastX; x++) {
      const tile = world.tiles[y * world.width + x] as TileId;
      ctx.fillStyle = TILE_COLOR[tile] ?? '#000';
      ctx.fillRect(
        x * tilePx + state.offsetX,
        y * tilePx + state.offsetY,
        Math.ceil(tilePx),
        Math.ceil(tilePx),
      );
    }
  }
}

/** Hit-test: dado un punto del screen, devuelve el NPC cuyo marcador
 *  lo contiene (última coincidencia gana — orden de render). */
function hitTest(
  placements: readonly MarkerPlacement[],
  x: number,
  y: number,
): MarkerPlacement | null {
  // Recorremos en reverso: el último pintado queda encima.
  for (let i = placements.length - 1; i >= 0; i--) {
    const p = placements[i];
    const half = p.marker.size / 2 + p.marker.outline;
    if (
      x >= p.cx - half &&
      x <= p.cx + half &&
      y >= p.cy - half &&
      y <= p.cy + half
    ) {
      return p;
    }
  }
  return null;
}

export interface MapViewProps {
  /** NPCs a renderizar encima del mapa. Vacío si solo mostramos el
   *  tablero. Elegidos como diamante amarillo; Ciudadanos como
   *  círculo blanco. */
  npcs?: readonly NPC[];
  /** Callback al clickear un NPC. Sprint FICHA-AVENTURERO lo
   *  conectará a la card; de momento sirve para que `app/page.tsx`
   *  pueda loggear o ignorar. */
  onNpcClick?: (npcId: string) => void;
}

interface HoverState {
  npcId: string;
  label: string;
  x: number;
  y: number;
}

export function MapView({ npcs = [], onNpcClick }: MapViewProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<ViewportDims>({
    worldWidth: WORLD.width,
    worldHeight: WORLD.height,
    tileSize: TILE_SIZE,
    screenWidth: 1024,
    screenHeight: 768,
  });
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 0.3,
    // Viewport centrado sobre el spawn del clan (tile ~85,73 en el
    // fixture actual). Con zoom 0.3 cada tile = 9.6px; offset negativo
    // desplaza el mapa para que la isla del spawn quede en la mitad
    // superior del canvas, por encima del DailyModal inferior.
    offsetX: -300,
    offsetY: -300,
  });
  const [hover, setHover] = useState<HoverState | null>(null);

  // Ajusta dims al tamaño real del contenedor.
  useEffect(() => {
    const resize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nextDims: ViewportDims = {
        ...dims,
        screenWidth: rect.width,
        screenHeight: rect.height,
      };
      setDims(nextDims);
      // Re-clampea y establece vista inicial centrada si es primer render.
      setViewport((prev) => {
        const z = clampZoom(nextDims, prev.zoom || minZoom(nextDims));
        return clampOffset(nextDims, { ...prev, zoom: z });
      });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placements = useMemo(
    () => placeMarkers(npcs, dims, viewport),
    [npcs, dims, viewport],
  );

  // Redibuja en cada cambio de dims/viewport/placements.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dims.screenWidth;
    canvas.height = dims.screenHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderTiles(ctx, WORLD, dims, viewport);
    renderNPCs(ctx, placements);
  }, [dims, viewport, placements]);

  // Drag.
  const draggingRef = useRef<{ x: number; y: number; moved: boolean } | null>(
    null,
  );
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = { x: e.clientX, y: e.clientY, moved: false };
    // Mientras arrastras, el cursor debe ser "grab", no "pointer".
    setHover(null);
  }, []);
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const d = draggingRef.current;
      if (d) {
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) {
          d.moved = true;
        }
        draggingRef.current = { x: e.clientX, y: e.clientY, moved: d.moved };
        setViewport((prev) => applyDrag(dims, prev, dx, dy));
        return;
      }
      // Hover: solo cuando no arrastramos.
      if (!rect) return;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const hit = hitTest(placements, px, py);
      if (!hit) {
        if (hover) setHover(null);
        return;
      }
      const label = `${hit.npc.name}, ${hit.npc.linaje}`;
      if (hover?.npcId === hit.npc.id && hover.x === hit.cx && hover.y === hit.cy) {
        return;
      }
      setHover({ npcId: hit.npc.id, label, x: hit.cx, y: hit.cy });
    },
    [dims, placements, hover],
  );
  const onMouseUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      // Ignora el "click" que cierra un drag real.
      if (draggingRef.current?.moved) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const hit = hitTest(placements, px, py);
      if (!hit) return;
      if (onNpcClick) {
        onNpcClick(hit.npc.id);
      } else {
        console.log('[MapView] NPC click:', hit.npc.id);
      }
    },
    [placements, onNpcClick],
  );

  // Zoom con rueda.
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pivotX = e.clientX - rect.left;
      const pivotY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setViewport((prev) => applyZoom(dims, prev, factor, pivotX, pivotY));
    },
    [dims],
  );

  // El hover se resetea al empezar un drag, así que basta con
  // mirarlo; evita leer el ref en render (prohibido por reglas de
  // React: tocar ref.current fuera de eventos/effects).
  const cursor = hover ? 'pointer' : 'grab';

  return (
    <div
      ref={containerRef}
      data-testid="map-view-container"
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: '#000',
        position: 'relative',
      }}
    >
      <canvas
        ref={canvasRef}
        data-testid="map-view-canvas"
        data-npc-count={placements.length}
        style={{ display: 'block', cursor, imageRendering: 'pixelated' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => {
          draggingRef.current = null;
          setHover(null);
        }}
        onClick={onClick}
        onWheel={onWheel}
      />
      {hover && (
        <div
          data-testid="npc-tooltip"
          style={{
            position: 'absolute',
            left: hover.x + 12,
            top: hover.y + 12,
            padding: '2px 6px',
            background: 'rgba(10, 10, 10, 0.85)',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: 12,
            pointerEvents: 'none',
            border: '1px solid #444',
            whiteSpace: 'nowrap',
          }}
        >
          {hover.label}
        </div>
      )}
    </div>
  );
}
