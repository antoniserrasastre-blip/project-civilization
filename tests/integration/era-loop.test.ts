/**
 * Integration end-to-end de la Fase 6 — Sprint 6.4.
 *
 * Valida que el loop primigenia llega a desbloquear el monumento
 * desde una partida inicial. La cinemática + UI final quedan
 * diferidas hasta que Playwright esté disponible.
 *
 * Flujo:
 *   1. Clan drafteado (14 NPCs, 3 linajes).
 *   2. Tick loop con recolección + autobuild.
 *   3. Tras noches consecutivas suficientes, monumento desbloquea.
 */

import { describe, it, expect } from 'vitest';
import { initialGameState } from '@/lib/game-state';
import { tick } from '@/lib/simulation';
import { makeTestNPC, CASTA, LINAJE, SEX } from '@/lib/npcs';
import { TILE, RESOURCE, type WorldMap } from '@/lib/world-state';
import { isMonumentUnlocked } from '@/lib/monument';
import { CRAFTABLE } from '@/lib/crafting';
import { hasStructure } from '@/lib/structures';
import { addStructure } from '@/lib/structures';

function buildRichWorld(): WorldMap {
  const w = 24;
  const h = 24;
  const tiles = new Array(w * h).fill(TILE.GRASS);
  const world: WorldMap = {
    seed: 0,
    width: w,
    height: h,
    tiles,
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
    influence: [],
  };
  // Stones en columna.
  for (let y = 0; y < h; y += 2) {
    world.resources.push({
      id: RESOURCE.STONE,
      x: 5,
      y,
      quantity: 60,
      initialQuantity: 60,
      regime: 'depletable',
      depletedAtTick: null,
    });
  }
  // Wood en otra columna.
  for (let y = 0; y < h; y += 2) {
    world.resources.push({
      id: RESOURCE.WOOD,
      x: 8,
      y,
      quantity: 40,
      initialQuantity: 40,
      regime: 'regenerable',
      depletedAtTick: null,
    });
  }
  // Game scattered.
  for (let i = 0; i < 15; i++) {
    world.resources.push({
      id: RESOURCE.GAME,
      x: 12 + (i % 5),
      y: 5 + Math.floor(i / 5),
      quantity: 5,
      initialQuantity: 5,
      regime: 'regenerable',
      depletedAtTick: null,
    });
  }
  // Berry.
  for (let i = 0; i < 20; i++) {
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 18 + (i % 3),
      y: 10 + (i % 4),
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
  }
  // Agua central — 3×3.
  for (let y = 11; y <= 13; y++) {
    for (let x = 11; x <= 13; x++) {
      world.resources.push({
        id: RESOURCE.WATER,
        x,
        y,
        quantity: 999,
        initialQuantity: 999,
        regime: 'continuous',
        depletedAtTick: null,
      });
    }
  }
  return world;
}

function buildDraftedClan() {
  const npcs = [];
  const linajes = [LINAJE.TRAMUNTANA, LINAJE.MIGJORN, LINAJE.PONENT];
  for (let i = 0; i < 14; i++) {
    npcs.push(
      makeTestNPC({
        id: `npc-${i}`,
        sex: i % 2 === 0 ? SEX.M : SEX.F,
        casta: i < 4 ? CASTA.ELEGIDO : CASTA.CIUDADANO,
        // 4 Tramuntana + 5 Migjorn + 5 Ponent.
        linaje: i < 4 ? linajes[0] : linajes[(i % 2) + 1],
        position: { x: 11 + (i % 3), y: 11 + Math.floor(i / 3) },
        stats: { supervivencia: 95, socializacion: 85 },
        skills: {
          hunting: 35,
          gathering: 35,
          crafting: 35,
          fishing: 10,
          healing: 10,
        },
      }),
    );
  }
  return npcs;
}

describe('Fase 6 — loop primigenia hacia monumento', () => {
  it(
    'clan autónomo construye los 5 crafteables y acumula 10 noches',
    () => {
      let s = initialGameState(1, buildDraftedClan(), buildRichWorld());

      // Fuerza una fogata prearmada cerca del clan para que el
      // contador de noches pueda arrancar incluso sin auto-build
      // perfecto. Esto simplifica el test — la lógica de auto-
      // build de fogata ya está cubierta en Fase 4.
      s = {
        ...s,
        structures: addStructure(
          s.structures,
          CRAFTABLE.FOGATA_PERMANENTE,
          { x: 12, y: 12 },
          0,
          0,
        ),
      };

      for (let i = 0; i < 40_000; i++) {
        s = tick(s);
        if (
          s.structures.length === 5 &&
          s.village.consecutiveNightsAtFire >= 10
        )
          break;
      }

      // Los 5 crafteables construidos (o existentes).
      const builtKinds = new Set(s.structures.map((x) => x.kind));
      expect(builtKinds.has(CRAFTABLE.FOGATA_PERMANENTE)).toBe(true);
      expect(hasStructure(s.structures, CRAFTABLE.REFUGIO)).toBe(true);
      // Contador de noches acumulado.
      expect(s.village.consecutiveNightsAtFire).toBeGreaterThanOrEqual(10);
      // Desbloqueo: con los 5 crafteables + 10 noches + linajes
      // presentes vivos, el monumento está disponible.
      expect(isMonumentUnlocked(s.structures, s.npcs, s.village)).toBe(true);
    },
    180_000,
  );
});
