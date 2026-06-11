/**
 * Pathfinding A* determinista sobre grid 2D.
 */

import { TILE, type WorldMap } from './world-state';
import type { PRNGState } from './prng';

// EL MAR (05c): el agua profunda ya no es pared — se nada, pero el A* la
// cobra a 8× el paso base (80 vs 10). La heurística manhattan ×10 sigue
// siendo admisible sin reescalar.
const WATER_MOVE_COST = 80;

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parentIdx: number; // Índice en la lista 'all'
  selfIdx: number;   // Índice propio para O(1) en reconstrucción
}

interface PathResult {
  path: { x: number; y: number }[] | null;
  next: PRNGState;
}

/** 
 * Encuentra el camino más corto entre dos puntos.
 * Introduce 'traffic' como reductor de coste para crear Rutas de Deseo.
 */
export function findPath(
  world: WorldMap,
  from: { x: number; y: number },
  to: { x: number; y: number },
  prng: PRNGState,
  options: { maxExpand?: number; passable?: (tile: any) => boolean } = {}
): PathResult {
  const { width, height, traffic } = world;
  const maxExpand = options.maxExpand || 1000;

  if (from.x === to.x && from.y === to.y) return { path: [from], next: prng };

  // EL MAR (05c): por defecto TODO es transitable (el agua cuesta, no bloquea).
  // Un `options.passable` custom de otros callers sigue mandando: solo el
  // DESTINO intransitable según ese predicado invalida el path.
  const endTile = world.tiles[to.y * world.width + to.x];
  const isPassableTile = (tile: number) => {
    if (options.passable) return options.passable(tile);
    return true;
  };
  if (!isPassableTile(endTile)) return { path: null, next: prng };

  const open: Node[] = [];
  const closed = new Set<number>();
  const all: Node[] = [];

  const startNode: Node = {
    x: from.x,
    y: from.y,
    g: 0,
    h: manhattan(from, to),
    f: manhattan(from, to),
    parentIdx: -1,
    selfIdx: 0,
  };

  open.push(startNode);
  all.push(startNode);

  let expansions = 0;
  while (open.length > 0 && expansions < maxExpand) {
    expansions++;
    open.sort(compareNodes);
    const current = open.shift()!;
    const currentCoordIdx = current.y * width + current.x;

    if (current.x === to.x && current.y === to.y) {
      return { path: reconstructPath(all, current), next: prng };
    }

    closed.add(currentCoordIdx);

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const nb of neighbors) {
      if (nb.x < 0 || nb.x >= width || nb.y < 0 || nb.y >= height) continue;
      
      const nbIdx = nb.y * width + nb.x;
      if (closed.has(nbIdx)) continue;

      const tile = world.tiles[nbIdx];
      if (options.passable && !options.passable(tile)) continue;

      // LÓGICA DE RUTAS DE DESEO:
      // El coste base es 10. Si hay mucho tráfico, el coste baja (máximo -5).
      // El agua profunda cuesta 80 fijo (sin descuento: en el mar no hay rutas).
      const trafficValue = traffic ? (traffic[nbIdx] || 0) : 0;
      const trafficDiscount = Math.min(5, Math.floor(trafficValue / 200));
      const moveCost = tile === TILE.WATER ? WATER_MOVE_COST : 10 - trafficDiscount;

      const g = current.g + moveCost;
      const h = manhattan(nb, to);
      const f = g + h;

      const existingInOpen = open.find(n => n.x === nb.x && n.y === nb.y);
      if (existingInOpen && existingInOpen.g <= g) continue;

      const newNode: Node = {
        x: nb.x,
        y: nb.y,
        g,
        h,
        f,
        parentIdx: current.selfIdx,
        selfIdx: all.length,
      };

      if (existingInOpen) {
        // El nodo ya vive en `all` en su índice original: conservar selfIdx.
        // Pisarlo con all.length corrompía la cadena de padres (ciclo infinito
        // en reconstructPath) — latente con coste uniforme, frecuente con agua=80.
        Object.assign(existingInOpen, newNode, { selfIdx: existingInOpen.selfIdx });
      } else {
        open.push(newNode);
        all.push(newNode);
      }
    }
  }

  return { path: null, next: prng };
}

function manhattan(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) * 10;
}

function compareNodes(a: Node, b: Node): number {
  if (a.f !== b.f) return a.f - b.f;
  if (a.h !== b.h) return a.h - b.h;
  // Tie-breaking determinista por coordenadas
  if (a.y !== b.y) return a.y - b.y;
  return a.x - b.x;
}

function reconstructPath(all: Node[], endNode: Node): { x: number; y: number }[] {
  const path = [];
  let curr: Node | undefined = endNode;
  while (curr) {
    path.unshift({ x: curr.x, y: curr.y });
    curr = curr.parentIdx === -1 ? undefined : all[curr.parentIdx];
  }
  return path;
}
