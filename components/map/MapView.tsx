'use client';

/**
 * MapView — render pixel art del archipiélago primigenia.
 *
 * Lee la fixture `lib/fixtures/world-map.v1.json` y la dibuja en un
 * canvas HTML5 con zoom + drag. La lógica de viewport (clamp, pan,
 * zoom) vive en `lib/viewport.ts` (testable sin DOM).
 *
 * Sin NPCs ni recursos renderizados aún — vendrán en Fase 2.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import worldMapJson from '@/lib/fixtures/world-map.v1.json';
import type { WorldMap, TileId } from '@/lib/world-state';
import type { NPC } from '@/lib/npcs';
import { CASTA } from '@/lib/npcs';
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

function renderNPCs(
  ctx: CanvasRenderingContext2D,
  npcs: readonly NPC[],
  dims: ViewportDims,
  state: ViewportState,
) {
  const tilePx = dims.tileSize * state.zoom;
  const radius = Math.max(2, tilePx * 0.3);
  for (const npc of npcs) {
    if (!npc.alive) continue;
    const cx = npc.position.x * tilePx + state.offsetX + tilePx / 2;
    const cy = npc.position.y * tilePx + state.offsetY + tilePx / 2;
    // Culling.
    if (
      cx < -radius ||
      cy < -radius ||
      cx > dims.screenWidth + radius ||
      cy > dims.screenHeight + radius
    ) {
      continue;
    }
    ctx.fillStyle = npc.casta === CASTA.ELEGIDO ? '#ffd54f' : '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
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

export interface MapViewProps {
  /** NPCs a renderizar encima del mapa. Vacío si solo mostramos el
   *  tablero. Elegidos se pintan en amarillo; resto en blanco. */
  npcs?: readonly NPC[];
}

export function MapView({ npcs = [] }: MapViewProps = {}) {
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
    offsetX: 0,
    offsetY: 0,
  });

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

  // Redibuja en cada cambio de dims/viewport.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dims.screenWidth;
    canvas.height = dims.screenHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderTiles(ctx, WORLD, dims, viewport);
    renderNPCs(ctx, npcs, dims, viewport);
  }, [dims, viewport, npcs]);

  // Drag.
  const draggingRef = useRef<{ x: number; y: number } | null>(null);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = { x: e.clientX, y: e.clientY };
  }, []);
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const d = draggingRef.current;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      draggingRef.current = { x: e.clientX, y: e.clientY };
      setViewport((prev) => applyDrag(dims, prev, dx, dy));
    },
    [dims],
  );
  const onMouseUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

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

  return (
    <div
      ref={containerRef}
      data-testid="map-view-container"
      style={{
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <canvas
        ref={canvasRef}
        data-testid="map-view-canvas"
        style={{ display: 'block', cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      />
    </div>
  );
}
