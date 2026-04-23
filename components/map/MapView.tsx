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
import {
  RESOURCE,
  type ResourceSpawn,
  type WorldMap,
  type TileId,
} from '@/lib/world-state';
import type { NPC, Archetype } from '@/lib/npcs';
import type { BuildProject, Structure } from '@/lib/structures';
import type { FogState } from '@/lib/fog';
import type { Edge } from '@/lib/relations';
import { CRAFTABLE } from '@/lib/crafting';
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

const MAP_STYLE = {
  resources: {
    shadow: 'rgba(20, 14, 8, 0.36)',
    berryLeaf: '#263d24',
    berryFruit: '#8d2020',
    stone: '#c1b49a',
    stoneDark: '#5b5147',
    wood: '#6b3f20',
    woodLight: '#b9854c',
    game: '#2a1b13',
    fish: '#d7e1d5',
    water: '#b8d8df',
  },
  structures: {
    shadow: 'rgba(12, 8, 4, 0.45)',
    wood: '#5a3219',
    woodLight: '#b97b3f',
    hide: '#c08a52',
    hideDark: '#6d3f24',
    stone: '#d4c5a1',
    stoneDark: '#5c5348',
    basket: '#8a5a2b',
    basketLight: '#d2a35f',
    fireOuter: '#ffb347',
    fireInner: '#d43b1f',
    thatch: '#c59a55',
  },
  fog: {
    hidden: 'rgba(10, 8, 6, 0.82)',
    seam: 'rgba(226, 199, 145, 0.08)',
  },
  intent: {
    stroke: 'rgba(238, 205, 126, 0.55)',
    ember: 'rgba(255, 179, 71, 0.78)',
  },
  relations: {
    kinship: 'rgba(180, 210, 255, 0.55)',
    debt: 'rgba(232, 122, 108, 0.6)',
    saved: 'rgba(180, 230, 170, 0.55)',
    favor: 'rgba(238, 205, 126, 0.5)',
  },
} as const;

/** Paleta de oficios — un color por arquetipo para el píxel de
 *  oficio del Sprint 11 OBSERVABILIDAD-TOTAL. Ciudadanos sin
 *  arquetipo formal reciben un gris neutro (no distraen). */
const PROFESSION_COLOR: Record<Archetype, string> = {
  cazador: '#c0482f',
  recolector: '#3f8a40',
  curandero: '#7a5ea8',
  artesano: '#b7802d',
  lider: '#d6b24a',
  scout: '#3a8ca8',
  tejedor: '#c66b9a',
  pescador: '#2d7faa',
};
const PROFESSION_NEUTRAL = '#9a8e78';

export interface NpcIntentTrail {
  npcId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export type NpcStatusBadge = 'critical' | 'hungry' | 'lonely' | 'swimming';

export interface NpcStatusVisual {
  npcId: string;
  badges: readonly NpcStatusBadge[];
}

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

function professionColor(npc: NPC): string {
  if (npc.archetype) return PROFESSION_COLOR[npc.archetype];
  return PROFESSION_NEUTRAL;
}

function renderNPCs(
  ctx: CanvasRenderingContext2D,
  placements: readonly MarkerPlacement[],
  professionLayer: boolean,
) {
  // Pixel-art duro: sin antialias.
  ctx.imageSmoothingEnabled = false;
  ctx.lineJoin = 'miter';
  for (const { npc, marker, cx, cy } of placements) {
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
    if (professionLayer) {
      // Píxel de oficio — pintado en el cuadrante inferior derecho
      // del marcador para no pisar el halo central del Elegido.
      const offset = Math.max(1, Math.round(marker.size * 0.24));
      ctx.fillStyle = professionColor(npc);
      ctx.fillRect(Math.round(cx) + offset - 1, Math.round(cy) + offset - 1, 2, 2);
    }
  }
}

function drawStructureShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.fillStyle = MAP_STYLE.structures.shadow;
  ctx.fillRect(
    cx - size * 0.55,
    cy + size * 0.34,
    size * 1.1,
    Math.max(2, size * 0.12),
  );
}

function drawFireStructure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  drawStructureShadow(ctx, cx, cy, size);
  ctx.strokeStyle = MAP_STYLE.structures.wood;
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.45, cy + size * 0.28);
  ctx.lineTo(cx + size * 0.45, cy + size * 0.38);
  ctx.moveTo(cx + size * 0.42, cy + size * 0.28);
  ctx.lineTo(cx - size * 0.42, cy + size * 0.38);
  ctx.stroke();

  ctx.fillStyle = MAP_STYLE.structures.fireOuter;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.56);
  ctx.lineTo(cx + size * 0.38, cy + size * 0.22);
  ctx.lineTo(cx - size * 0.38, cy + size * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = MAP_STYLE.structures.fireInner;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.22);
  ctx.lineTo(cx + size * 0.2, cy + size * 0.22);
  ctx.lineTo(cx - size * 0.2, cy + size * 0.22);
  ctx.closePath();
  ctx.fill();
}

function drawShelterStructure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  drawStructureShadow(ctx, cx, cy, size);
  ctx.fillStyle = MAP_STYLE.structures.wood;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.58);
  ctx.lineTo(cx + size * 0.58, cy + size * 0.34);
  ctx.lineTo(cx - size * 0.58, cy + size * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = MAP_STYLE.structures.thatch;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.42);
  ctx.lineTo(cx + size * 0.4, cy + size * 0.28);
  ctx.lineTo(cx - size * 0.4, cy + size * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = MAP_STYLE.structures.hideDark;
  ctx.fillRect(cx - size * 0.14, cy + size * 0.02, size * 0.28, size * 0.32);
}

function drawToolStructure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  drawStructureShadow(ctx, cx, cy, size);
  ctx.strokeStyle = MAP_STYLE.structures.woodLight;
  ctx.lineWidth = Math.max(2, size * 0.12);
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.36, cy + size * 0.44);
  ctx.lineTo(cx + size * 0.18, cy - size * 0.46);
  ctx.stroke();

  ctx.fillStyle = MAP_STYLE.structures.stoneDark;
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.1, cy - size * 0.5);
  ctx.lineTo(cx + size * 0.52, cy - size * 0.28);
  ctx.lineTo(cx + size * 0.22, cy + size * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = MAP_STYLE.structures.stone;
  ctx.fillRect(cx + size * 0.2, cy - size * 0.34, size * 0.16, size * 0.08);
}

function drawPantryStructure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  drawStructureShadow(ctx, cx, cy, size);
  ctx.strokeStyle = MAP_STYLE.structures.basketLight;
  ctx.lineWidth = Math.max(2, size * 0.1);
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.18, size * 0.34, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = MAP_STYLE.structures.basket;
  ctx.fillRect(cx - size * 0.46, cy - size * 0.08, size * 0.92, size * 0.48);
  ctx.strokeStyle = MAP_STYLE.structures.basketLight;
  ctx.lineWidth = 1;
  for (const dx of [-0.24, 0, 0.24]) {
    ctx.beginPath();
    ctx.moveTo(cx + dx * size, cy - size * 0.06);
    ctx.lineTo(cx + dx * size, cy + size * 0.36);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.38, cy + size * 0.12);
  ctx.lineTo(cx + size * 0.38, cy + size * 0.12);
  ctx.stroke();
}

function drawHideStructure(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  drawStructureShadow(ctx, cx, cy, size);
  ctx.fillStyle = MAP_STYLE.structures.hideDark;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.5);
  ctx.lineTo(cx + size * 0.38, cy - size * 0.24);
  ctx.lineTo(cx + size * 0.48, cy + size * 0.22);
  ctx.lineTo(cx + size * 0.18, cy + size * 0.48);
  ctx.lineTo(cx, cy + size * 0.28);
  ctx.lineTo(cx - size * 0.18, cy + size * 0.48);
  ctx.lineTo(cx - size * 0.48, cy + size * 0.22);
  ctx.lineTo(cx - size * 0.38, cy - size * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = MAP_STYLE.structures.hide;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.36);
  ctx.lineTo(cx + size * 0.25, cy - size * 0.16);
  ctx.lineTo(cx + size * 0.28, cy + size * 0.18);
  ctx.lineTo(cx, cy + size * 0.16);
  ctx.lineTo(cx - size * 0.28, cy + size * 0.18);
  ctx.lineTo(cx - size * 0.25, cy - size * 0.16);
  ctx.closePath();
  ctx.fill();
}

function renderStructures(
  ctx: CanvasRenderingContext2D,
  structures: readonly Structure[],
  dims: ViewportDims,
  state: ViewportState,
) {
  const tilePx = dims.tileSize * state.zoom;
  for (const structure of structures) {
    const x = structure.position.x * tilePx + state.offsetX;
    const y = structure.position.y * tilePx + state.offsetY;
    if (
      x + tilePx < 0 ||
      y + tilePx < 0 ||
      x > dims.screenWidth ||
      y > dims.screenHeight
    ) {
      continue;
    }

    const cx = x + tilePx / 2;
    const cy = y + tilePx / 2;
    const size = Math.max(9, Math.min(24, tilePx * 1.1));

    switch (structure.kind) {
      case CRAFTABLE.FOGATA_PERMANENTE:
        drawFireStructure(ctx, cx, cy, size);
        break;
      case CRAFTABLE.REFUGIO:
        drawShelterStructure(ctx, cx, cy, size);
        break;
      case CRAFTABLE.HERRAMIENTA_SILEX:
        drawToolStructure(ctx, cx, cy, size);
        break;
      case CRAFTABLE.DESPENSA:
        drawPantryStructure(ctx, cx, cy, size);
        break;
      case CRAFTABLE.PIEL_ROPA:
        drawHideStructure(ctx, cx, cy, size);
        break;
    }
  }
}

function renderBuildProject(
  ctx: CanvasRenderingContext2D,
  project: BuildProject | null | undefined,
  dims: ViewportDims,
  state: ViewportState,
) {
  if (!project) return;
  const tilePx = dims.tileSize * state.zoom;
  const x = project.position.x * tilePx + state.offsetX;
  const y = project.position.y * tilePx + state.offsetY;
  if (
    x + tilePx < 0 ||
    y + tilePx < 0 ||
    x > dims.screenWidth ||
    y > dims.screenHeight
  ) {
    return;
  }
  const cx = x + tilePx / 2;
  const cy = y + tilePx / 2;
  const size = Math.max(10, Math.min(25, tilePx * 1.15));
  drawStructureShadow(ctx, cx, cy, size);

  ctx.strokeStyle = MAP_STYLE.structures.woodLight;
  ctx.lineWidth = Math.max(2, size * 0.1);
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.42, cy + size * 0.38);
  ctx.lineTo(cx - size * 0.18, cy - size * 0.34);
  ctx.moveTo(cx + size * 0.42, cy + size * 0.38);
  ctx.lineTo(cx + size * 0.18, cy - size * 0.34);
  ctx.moveTo(cx - size * 0.36, cy + size * 0.1);
  ctx.lineTo(cx + size * 0.36, cy + size * 0.1);
  ctx.stroke();

  const pct = Math.max(0, Math.min(1, project.progress / project.required));
  ctx.strokeStyle = MAP_STYLE.intent.ember;
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.48, size * 0.16, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
  ctx.stroke();
}

function visibleTileBounds(
  dims: ViewportDims,
  state: ViewportState,
  world: WorldMap,
) {
  const tilePx = dims.tileSize * state.zoom;
  const firstX = Math.max(0, Math.floor(-state.offsetX / tilePx));
  const firstY = Math.max(0, Math.floor(-state.offsetY / tilePx));
  const lastX = Math.min(
    world.width,
    Math.ceil((dims.screenWidth - state.offsetX) / tilePx),
  );
  const lastY = Math.min(
    world.height,
    Math.ceil((dims.screenHeight - state.offsetY) / tilePx),
  );
  return { firstX, firstY, lastX, lastY, tilePx };
}

function drawBerryGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  const r = Math.max(1, size * 0.12);
  ctx.fillStyle = MAP_STYLE.resources.berryLeaf;
  ctx.fillRect(cx - size * 0.28, cy - size * 0.1, size * 0.56, size * 0.28);
  ctx.fillStyle = MAP_STYLE.resources.berryFruit;
  ctx.beginPath();
  ctx.arc(cx - size * 0.16, cy - size * 0.08, r, 0, Math.PI * 2);
  ctx.arc(cx + size * 0.12, cy - size * 0.03, r, 0, Math.PI * 2);
  ctx.arc(cx, cy + size * 0.13, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawStoneGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.fillStyle = MAP_STYLE.resources.stoneDark;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.42, cy + size * 0.3);
  ctx.lineTo(cx - size * 0.12, cy - size * 0.34);
  ctx.lineTo(cx + size * 0.38, cy + size * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = MAP_STYLE.resources.stone;
  ctx.fillRect(cx - size * 0.08, cy - size * 0.12, size * 0.18, size * 0.12);
}

function drawWoodGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.lineWidth = Math.max(1, size * 0.12);
  ctx.lineCap = 'square';
  ctx.strokeStyle = MAP_STYLE.resources.wood;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.35, cy + size * 0.28);
  ctx.lineTo(cx + size * 0.34, cy - size * 0.22);
  ctx.moveTo(cx - size * 0.28, cy - size * 0.22);
  ctx.lineTo(cx + size * 0.32, cy + size * 0.28);
  ctx.stroke();
  ctx.strokeStyle = MAP_STYLE.resources.woodLight;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.25, cy + size * 0.18);
  ctx.lineTo(cx + size * 0.22, cy - size * 0.15);
  ctx.stroke();
}

function drawGameGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.fillStyle = MAP_STYLE.resources.game;
  const r = Math.max(1, size * 0.1);
  for (const [dx, dy] of [
    [-0.18, -0.18],
    [0.08, -0.05],
    [-0.02, 0.18],
  ] as const) {
    ctx.beginPath();
    ctx.arc(cx + dx * size, cy + dy * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFishGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.strokeStyle = MAP_STYLE.resources.fish;
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.34, cy);
  ctx.lineTo(cx + size * 0.2, cy);
  ctx.moveTo(cx - size * 0.08, cy - size * 0.15);
  ctx.lineTo(cx + size * 0.08, cy + size * 0.15);
  ctx.moveTo(cx + size * 0.2, cy);
  ctx.lineTo(cx + size * 0.38, cy - size * 0.16);
  ctx.moveTo(cx + size * 0.2, cy);
  ctx.lineTo(cx + size * 0.38, cy + size * 0.16);
  ctx.stroke();
}

function drawWaterGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.strokeStyle = MAP_STYLE.resources.water;
  ctx.lineWidth = Math.max(1, size * 0.08);
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
  ctx.stroke();
}

function renderResourceGlyph(
  ctx: CanvasRenderingContext2D,
  resource: ResourceSpawn,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.fillStyle = MAP_STYLE.resources.shadow;
  ctx.fillRect(
    cx - size * 0.42,
    cy + size * 0.32,
    size * 0.84,
    Math.max(1, size * 0.08),
  );
  switch (resource.id) {
    case RESOURCE.BERRY:
      drawBerryGlyph(ctx, cx, cy, size);
      break;
    case RESOURCE.STONE:
      drawStoneGlyph(ctx, cx, cy, size);
      break;
    case RESOURCE.WOOD:
      drawWoodGlyph(ctx, cx, cy, size);
      break;
    case RESOURCE.GAME:
      drawGameGlyph(ctx, cx, cy, size);
      break;
    case RESOURCE.FISH:
      drawFishGlyph(ctx, cx, cy, size);
      break;
    case RESOURCE.WATER:
      drawWaterGlyph(ctx, cx, cy, size);
      break;
  }
}

function renderResources(
  ctx: CanvasRenderingContext2D,
  resources: readonly ResourceSpawn[],
  dims: ViewportDims,
  state: ViewportState,
  world: WorldMap,
) {
  const { firstX, firstY, lastX, lastY, tilePx } = visibleTileBounds(
    dims,
    state,
    world,
  );
  const size = Math.max(7, Math.min(20, tilePx * 1.05));
  for (const resource of resources) {
    if (resource.quantity <= 0) continue;
    if (
      resource.x < firstX ||
      resource.x >= lastX ||
      resource.y < firstY ||
      resource.y >= lastY
    ) {
      continue;
    }
    const cx = resource.x * tilePx + state.offsetX + tilePx / 2;
    const cy = resource.y * tilePx + state.offsetY + tilePx / 2;
    renderResourceGlyph(ctx, resource, cx, cy, size);
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
  const { firstX, firstY, lastX, lastY, tilePx } = visibleTileBounds(
    dims,
    state,
    world,
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

function decodeFogBitmap(bitmap: string): Uint8Array | null {
  if (typeof atob !== 'function') return null;
  const raw = atob(bitmap);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function fogDiscovered(
  bytes: Uint8Array,
  width: number,
  x: number,
  y: number,
): boolean {
  const idx = y * width + x;
  return (bytes[idx >> 3] & (1 << (idx & 7))) !== 0;
}

function renderFogOverlay(
  ctx: CanvasRenderingContext2D,
  fog: FogState | undefined,
  dims: ViewportDims,
  state: ViewportState,
  world: WorldMap,
) {
  if (!fog) return;
  const bytes = decodeFogBitmap(fog.bitmap);
  if (!bytes) return;
  const { firstX, firstY, lastX, lastY, tilePx } = visibleTileBounds(
    dims,
    state,
    world,
  );

  ctx.fillStyle = MAP_STYLE.fog.hidden;
  for (let y = firstY; y < lastY; y++) {
    for (let x = firstX; x < lastX; x++) {
      if (fogDiscovered(bytes, fog.width, x, y)) continue;
      const sx = x * tilePx + state.offsetX;
      const sy = y * tilePx + state.offsetY;
      ctx.fillRect(sx, sy, Math.ceil(tilePx), Math.ceil(tilePx));
      if ((x + y) % 7 === 0 && tilePx >= 6) {
        ctx.fillStyle = MAP_STYLE.fog.seam;
        ctx.fillRect(sx, sy, Math.ceil(tilePx), 1);
        ctx.fillStyle = MAP_STYLE.fog.hidden;
      }
    }
  }
}

function relationColor(type: Edge['type']): string {
  switch (type) {
    case 'kinship':
      return MAP_STYLE.relations.kinship;
    case 'debt':
      return MAP_STYLE.relations.debt;
    case 'saved':
      return MAP_STYLE.relations.saved;
    case 'favor':
      return MAP_STYLE.relations.favor;
  }
}

function renderRelationsLayer(
  ctx: CanvasRenderingContext2D,
  relations: readonly Edge[],
  placements: readonly MarkerPlacement[],
  dims: ViewportDims,
) {
  if (relations.length === 0) return;
  const byId = new Map<string, MarkerPlacement>();
  for (const p of placements) byId.set(p.npc.id, p);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const tilePx = dims.tileSize;
  ctx.lineWidth = Math.max(1, Math.min(2, tilePx * 0.05));
  for (const edge of relations) {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) continue;
    ctx.strokeStyle = relationColor(edge.type);
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(b.cx, b.cy);
    ctx.stroke();
  }
}

function renderIntentTrails(
  ctx: CanvasRenderingContext2D,
  trails: readonly NpcIntentTrail[],
  dims: ViewportDims,
  state: ViewportState,
) {
  if (trails.length === 0) return;
  const tilePx = dims.tileSize * state.zoom;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = MAP_STYLE.intent.stroke;
  ctx.lineWidth = Math.max(1, Math.min(3, tilePx * 0.12));
  for (const trail of trails) {
    if (trail.from.x === trail.to.x && trail.from.y === trail.to.y) continue;
    const fromX = trail.from.x * tilePx + state.offsetX + tilePx / 2;
    const fromY = trail.from.y * tilePx + state.offsetY + tilePx / 2;
    const toX = trail.to.x * tilePx + state.offsetX + tilePx / 2;
    const toY = trail.to.y * tilePx + state.offsetY + tilePx / 2;
    if (
      (fromX < 0 && toX < 0) ||
      (fromY < 0 && toY < 0) ||
      (fromX > dims.screenWidth && toX > dims.screenWidth) ||
      (fromY > dims.screenHeight && toY > dims.screenHeight)
    ) {
      continue;
    }

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(midX, midY);
    ctx.stroke();

    ctx.fillStyle = MAP_STYLE.intent.ember;
    ctx.fillRect(Math.round(midX) - 1, Math.round(midY) - 1, 2, 2);
  }
}

function badgeColor(badge: NpcStatusBadge): string {
  switch (badge) {
    case 'critical':
      return '#c02a1d';
    case 'hungry':
      return '#d89b3a';
    case 'lonely':
      return '#6fa0c6';
    case 'swimming':
      return '#a8d7e8';
  }
}

const STATUS_LEGEND: Array<{ badge: NpcStatusBadge; label: string }> = [
  { badge: 'critical', label: 'crítico' },
  { badge: 'hungry', label: 'hambre' },
  { badge: 'lonely', label: 'aislado' },
  { badge: 'swimming', label: 'nadando' },
];

function renderNpcStatusBadges(
  ctx: CanvasRenderingContext2D,
  placements: readonly MarkerPlacement[],
  statuses: readonly NpcStatusVisual[],
) {
  if (statuses.length === 0) return;
  const byNpc = new Map(statuses.map((s) => [s.npcId, s.badges]));
  for (const placement of placements) {
    const badges = byNpc.get(placement.npc.id);
    if (!badges || badges.length === 0) continue;
    const count = Math.min(3, badges.length);
    const r = Math.max(2, Math.min(4, placement.marker.size * 0.22));
    const y = placement.cy - placement.marker.size * 0.72;
    const startX = placement.cx - ((count - 1) * r * 2.4) / 2;
    for (let i = 0; i < count; i++) {
      const x = startX + i * r * 2.4;
      ctx.fillStyle = '#16110c';
      ctx.beginPath();
      ctx.arc(x, y, r + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = badgeColor(badges[i]);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
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
  /** Mundo activo. Si se omite, se usa la fixture canónica para
   *  tests/smoke; en partida real llega desde GameState. */
  world?: WorldMap;
  /** Niebla de guerra descubierta por visión de NPCs. */
  fog?: FogState;
  /** NPCs a renderizar encima del mapa. Vacío si solo mostramos el
   *  tablero. Elegidos como diamante amarillo; Ciudadanos como
   *  círculo blanco. */
  npcs?: readonly NPC[];
  /** Crafteables materializados en el mundo: fogata, refugio,
   *  despensa, etc. Se pintan bajo los NPCs. */
  structures?: readonly Structure[];
  /** Obra activa antes de materializarse como Structure. */
  buildProject?: BuildProject | null;
  /** Rastros de intención calculados fuera del canvas con la misma
   *  decisión que usa el tick de simulación. */
  intentTrails?: readonly NpcIntentTrail[];
  /** Badges compactos de estado vital sobre NPCs. */
  npcStatuses?: readonly NpcStatusVisual[];
  /** Grafo de relaciones (Sprint 4.4). Se pinta como capa opcional
   *  cuando el jugador activa el toggle — Sprint 11 OBSERVABILIDAD. */
  relations?: readonly Edge[];
  /** Callback al clickear un NPC. Sprint FICHA-AVENTURERO lo
   *  conectará a la card; de momento sirve para que `app/page.tsx`
   *  pueda loggear o ignorar. */
  onNpcClick?: (npcId: string) => void;
  /** Tile del mundo sobre el que centrar el viewport al arrancar.
   *  Sprint #5 SPAWN-COSTERO: lo pasa `GameShell` a partir de
   *  `defaultClanSpawn(seed)`. Si se omite, el MapView cae sobre
   *  el centro geométrico del mundo. */
  initialCenter?: { x: number; y: number };
}

interface HoverState {
  npcId: string;
  label: string;
  x: number;
  y: number;
}

export function MapView({
  world = WORLD,
  fog,
  npcs = [],
  structures = [],
  buildProject = null,
  intentTrails = [],
  npcStatuses = [],
  relations = [],
  onNpcClick,
  initialCenter,
}: MapViewProps = {}) {
  const [relationsLayerOn, setRelationsLayerOn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<ViewportDims>({
    worldWidth: world.width,
    worldHeight: world.height,
    tileSize: TILE_SIZE,
    screenWidth: 1024,
    screenHeight: 768,
  });
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 0.3,
    // Placeholder — el useEffect de resize recomputa el offset
    // inicial centrando sobre `initialCenter` (Sprint #5).
    offsetX: 0,
    offsetY: 0,
  });
  const [hover, setHover] = useState<HoverState | null>(null);

  // Ajusta dims al tamaño real del contenedor y centra el viewport
  // sobre el spawn del clan cuando es el primer render.
  useEffect(() => {
    const resize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nextDims: ViewportDims = {
        ...dims,
        worldWidth: world.width,
        worldHeight: world.height,
        screenWidth: rect.width,
        screenHeight: rect.height,
      };
      setDims(nextDims);
      setViewport((prev) => {
        const z = clampZoom(nextDims, prev.zoom || minZoom(nextDims));
        // Centra sobre `initialCenter` si el offset todavía es el
        // placeholder (0,0); si el usuario ya panneó, respeta su
        // posición. El criterio "si todavía es placeholder" = ambos
        // offsets son exactamente 0 — poco probable tras interacción.
        const center = initialCenter;
        const isFirst = prev.offsetX === 0 && prev.offsetY === 0;
        if (!isFirst || !center) {
          return clampOffset(nextDims, { ...prev, zoom: z });
        }
        const tilePx = nextDims.tileSize * z;
        const offsetX = Math.round(
          nextDims.screenWidth / 2 - center.x * tilePx - tilePx / 2,
        );
        const offsetY = Math.round(
          nextDims.screenHeight / 2 - center.y * tilePx - tilePx / 2,
        );
        return clampOffset(nextDims, { zoom: z, offsetX, offsetY });
      });
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter, world.width, world.height]);

  const placements = useMemo(
    () => placeMarkers(npcs, dims, viewport),
    [npcs, dims, viewport],
  );
  const activeResourceCount = useMemo(
    () => world.resources.reduce((n, r) => n + (r.quantity > 0 ? 1 : 0), 0),
    [world.resources],
  );

  // Redibuja en cada cambio de dims/viewport/placements.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = dims.screenWidth;
    canvas.height = dims.screenHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderTiles(ctx, world, dims, viewport);
    renderResources(ctx, world.resources, dims, viewport, world);
    renderStructures(ctx, structures, dims, viewport);
    renderBuildProject(ctx, buildProject, dims, viewport);
    renderFogOverlay(ctx, fog, dims, viewport, world);
    if (relationsLayerOn) {
      renderRelationsLayer(ctx, relations, placements, dims);
    }
    renderIntentTrails(ctx, intentTrails, dims, viewport);
    renderNPCs(ctx, placements, true);
    renderNpcStatusBadges(ctx, placements, npcStatuses);
  }, [
    dims,
    viewport,
    placements,
    structures,
    buildProject,
    world,
    fog,
    intentTrails,
    npcStatuses,
    relations,
    relationsLayerOn,
  ]);

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
        data-structure-count={structures.length}
        data-build-project={buildProject ? buildProject.kind : ''}
        data-resource-count={activeResourceCount}
        data-fog-enabled={fog ? 'true' : 'false'}
        data-intent-count={intentTrails.length}
        data-status-count={npcStatuses.length}
        data-profession-layer="on"
        data-relations-layer={relationsLayerOn ? 'on' : 'off'}
        data-relations-count={relations.length}
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
      <div
        data-testid="map-layers-panel"
        style={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: '6px 8px',
          background: 'rgba(10, 8, 6, 0.72)',
          border: '1px solid rgba(245,245,220,0.18)',
          borderRadius: 8,
          color: '#f5f5dc',
          fontSize: 11,
        }}
      >
        <span style={{ opacity: 0.75 }}>Capas</span>
        <button
          type="button"
          data-testid="map-layer-relations-toggle"
          onClick={() => setRelationsLayerOn((v) => !v)}
          aria-pressed={relationsLayerOn}
          title={
            relationsLayerOn
              ? 'Ocultar capa de relaciones'
              : 'Mostrar parentesco y deudas'
          }
          style={{
            background: relationsLayerOn ? '#2a2a1c' : '#1e1e1e',
            color: '#f5f5dc',
            border: `1px solid ${relationsLayerOn ? '#6b5a1f' : '#2f2f2f'}`,
            borderRadius: 6,
            padding: '3px 8px',
            fontSize: 11,
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          {relationsLayerOn ? '● Relaciones' : '○ Relaciones'}
        </button>
      </div>
      <div
        data-testid="map-status-legend"
        style={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          maxWidth: 360,
          padding: '6px 8px',
          background: 'rgba(10, 8, 6, 0.72)',
          border: '1px solid rgba(245,245,220,0.18)',
          borderRadius: 8,
          color: '#f5f5dc',
          fontSize: 11,
          pointerEvents: 'none',
        }}
      >
        {STATUS_LEGEND.map((item) => (
          <span
            key={item.badge}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: badgeColor(item.badge),
                boxShadow: '0 0 0 1px #16110c',
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
