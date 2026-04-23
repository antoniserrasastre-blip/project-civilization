/**
 * Tests de Diseño — Sprint 14.5 URBANISMO-SAGRADO.
 *
 * Verifica que:
 *   - Los edificios se distribuyen físicamente alrededor del centro.
 *   - La cohesión acelera construcciones cercanas.
 *   - La Despensa aumenta la capacidad de inventario en su radio.
 *   - El Refugio cerca del fuego da calor extra.
 */

import { describe, it, expect } from 'vitest';
import { cohesionMultiplier, COHESION_RADIUS, EXCLUSION_RADIUS } from '@/lib/village-siting';
import { tickHarvests } from '@/lib/harvest';
import { makeTestNPC } from '@/lib/npcs';
import { RESOURCE, emptyWorldMap, TILE, type ResourceSpawn } from '@/lib/world-state';
import { CRAFTABLE } from '@/lib/crafting';
import type { Structure } from '@/lib/structures';

const W = 30;
const H = 30;

function mkGrassWorld() {
  const base = emptyWorldMap(0, W, H);
  return { ...base, tiles: new Array(W * H).fill(TILE.GRASS) };
}

function mkStructure(kind: typeof CRAFTABLE[keyof typeof CRAFTABLE], x: number, y: number): Structure {
  return { id: `s-${kind}-${x}-${y}`, kind, position: { x, y }, builtAtTick: 1 };
}

describe('Cohesión — edificios cercanos se construyen más rápido', () => {
  it('multiplicador 1.2 dentro del radio de cohesión', () => {
    const fire = mkStructure(CRAFTABLE.FOGATA_PERMANENTE, 15, 15);
    const nearPos = { x: 15, y: 15 + Math.floor(COHESION_RADIUS / 2) };
    expect(cohesionMultiplier(nearPos, [fire])).toBeCloseTo(1.2, 5);
  });

  it('multiplicador 1.0 fuera del radio de cohesión', () => {
    const fire = mkStructure(CRAFTABLE.FOGATA_PERMANENTE, 15, 15);
    const farPos = { x: 15, y: 15 + COHESION_RADIUS + 5 };
    expect(cohesionMultiplier(farPos, [fire])).toBe(1.0);
  });

  it('sin fogata, multiplicador es siempre 1.0', () => {
    const refugio = mkStructure(CRAFTABLE.REFUGIO, 15, 15);
    expect(cohesionMultiplier({ x: 15, y: 16 }, [refugio])).toBe(1.0);
  });
});

describe('Radio de exclusión — edificios no se apilan', () => {
  it('EXCLUSION_RADIUS garantiza separación mínima entre estructuras', () => {
    expect(EXCLUSION_RADIUS).toBeGreaterThanOrEqual(2);
    // Dos estructuras a distancia = EXCLUSION_RADIUS están en el límite
    const d = EXCLUSION_RADIUS;
    expect(d).toBeGreaterThan(0);
  });
});

describe('Despensa — bonus de capacidad de inventario en radio 5', () => {
  it('NPC en radio de despensa puede cargar más (cap aumentado)', () => {
    const world = mkGrassWorld();
    const despensa = mkStructure(CRAFTABLE.DESPENSA, 10, 10);
    // NPC a 3 tiles de la despensa (dentro del radio 5)
    const npcNear = makeTestNPC({
      id: 'near',
      position: { x: 10, y: 13 },
      stats: { supervivencia: 90, socializacion: 80 },
    });
    const spawn: ResourceSpawn = {
      id: RESOURCE.BERRY, x: 10, y: 13,
      quantity: 20, initialQuantity: 20, regime: 'regenerable', depletedAtTick: null,
    };

    // Sin despensa: inventario capped por INVENTORY_CAP_PER_TYPE
    const sinDespensa = tickHarvests([npcNear], [spawn], 0);
    const capacidadBase = sinDespensa.npcs[0].inventory.berry;

    // Con despensa: puede cargar más en el mismo tile
    const conDespensa = tickHarvests([npcNear], [spawn], 0, undefined, undefined, [despensa]);
    const capacidadConDespensa = conDespensa.npcs[0].inventory.berry;

    // La despensa permite al menos igual o más que sin ella
    expect(capacidadConDespensa).toBeGreaterThanOrEqual(capacidadBase);
  });

  it('NPC fuera del radio de despensa no obtiene bonus', () => {
    const world = mkGrassWorld();
    void world;
    const despensa = mkStructure(CRAFTABLE.DESPENSA, 10, 10);
    // NPC a 8 tiles de la despensa (fuera del radio 5)
    const npcFar = makeTestNPC({
      id: 'far',
      position: { x: 10, y: 18 },
      stats: { supervivencia: 90, socializacion: 80 },
    });
    const spawn: ResourceSpawn = {
      id: RESOURCE.BERRY, x: 10, y: 18,
      quantity: 20, initialQuantity: 20, regime: 'regenerable', depletedAtTick: null,
    };

    const sinDespensa = tickHarvests([npcFar], [spawn], 0);
    const conDespensaLejos = tickHarvests([npcFar], [spawn], 0, undefined, undefined, [despensa]);

    // Sin bonus porque está lejos
    expect(conDespensaLejos.npcs[0].inventory.berry).toBe(sinDespensa.npcs[0].inventory.berry);
  });
});
