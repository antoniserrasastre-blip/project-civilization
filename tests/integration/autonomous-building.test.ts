/**
 * Integration heavy — Sprint 4.7.
 *
 * El clan drafteado por defecto corre 20.000 ticks SIN bendiciones
 * y debe construir los 5 crafteables umbral. Este es el balance
 * pass inicial de Fase 4: si no llega, los costes (#20) necesitan
 * ajuste — se flaguea en VERSION-LOG.
 *
 * Versión inicial: validamos progreso hacia las 5 construcciones.
 * El sha256 del estado final queda anclado solo cuando el flujo
 * completo sea estable (revalidar en playtest del cierre de fase).
 */

import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { initialGameState } from '@/lib/game-state';
import { tick } from '@/lib/simulation';
import { makeTestNPC, CASTA, LINAJE, SEX } from '@/lib/npcs';
import { CRAFTABLE, RECIPES } from '@/lib/crafting';
import { TILE, RESOURCE, type WorldMap } from '@/lib/world-state';

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

/** Mundo 32×32 densamente rico — emula un área de asentamiento
 *  favorable. Recursos abundantes garantizan que el balance no
 *  esté gated por seed de spawn. */
function buildRichWorld(): WorldMap {
  const w = 32;
  const h = 32;
  const tiles = new Array(w * h).fill(TILE.GRASS);
  const world: WorldMap = {
    seed: 0,
    width: w,
    height: h,
    tiles,
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
  };
  // Leña en una columna, piedra en otra, bayas cerca, caza, agua.
  for (let y = 0; y < h; y += 3) {
    world.resources.push({
      id: RESOURCE.WOOD,
      x: 5,
      y,
      quantity: 50,
      initialQuantity: 50,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    world.resources.push({
      id: RESOURCE.STONE,
      x: 10,
      y,
      quantity: 50,
      initialQuantity: 50,
      regime: 'depletable',
      depletedAtTick: null,
    });
  }
  for (let i = 0; i < 20; i++) {
    world.resources.push({
      id: RESOURCE.GAME,
      x: 15 + (i % 5),
      y: 5 + Math.floor(i / 5),
      quantity: 5,
      initialQuantity: 5,
      regime: 'regenerable',
      depletedAtTick: null,
    });
    world.resources.push({
      id: RESOURCE.BERRY,
      x: 20 + (i % 3),
      y: 10 + (i % 4),
      quantity: 10,
      initialQuantity: 10,
      regime: 'regenerable',
      depletedAtTick: null,
    });
  }
  // Agua central para que los NPCs no mueran de hambre.
  for (let i = 0; i < 9; i++) {
    world.resources.push({
      id: RESOURCE.WATER,
      x: 16 + (i % 3),
      y: 16 + Math.floor(i / 3),
      quantity: 999,
      initialQuantity: 999,
      regime: 'continuous',
      depletedAtTick: null,
    });
  }
  return world;
}

function buildDraftedClan() {
  const npcs = [];
  // 4 Elegidos + 10 Ciudadanos, todos con skills razonables y
  // supervivencia alta para aguantar la primera parte del
  // autoabastecimiento.
  for (let i = 0; i < 14; i++) {
    npcs.push(
      makeTestNPC({
        id: `npc-${i}`,
        sex: i % 2 === 0 ? SEX.M : SEX.F,
        casta: i < 4 ? CASTA.ELEGIDO : CASTA.CIUDADANO,
        linaje: LINAJE.TRAMUNTANA,
        position: { x: 16 + (i % 4), y: 16 + Math.floor(i / 4) },
        stats: { supervivencia: 90, socializacion: 80 },
        skills: {
          hunting: 30,
          gathering: 30,
          crafting: 30,
          fishing: 10,
          healing: 10,
        },
      }),
    );
  }
  return npcs;
}

describe('Fase 4.7 — clan autónomo construye los 5 crafteables', () => {
  it(
    '20.000 ticks producen los 5 crafteables en mundo rico',
    () => {
      let s = initialGameState(1, buildDraftedClan(), buildRichWorld());
      for (let i = 0; i < 20_000; i++) {
        s = tick(s);
        if (s.structures.length === 5) break;
      }
      expect(s.structures.length).toBe(5);
      const kinds = s.structures.map((x) => x.kind).sort();
      expect(kinds).toEqual(
        [
          CRAFTABLE.DESPENSA,
          CRAFTABLE.FOGATA_PERMANENTE,
          CRAFTABLE.HERRAMIENTA_SILEX,
          CRAFTABLE.PIEL_ROPA,
          CRAFTABLE.REFUGIO,
        ].sort(),
      );
      // Los 5 deben construirse bien antes de los 20k ticks con
      // un clan de 14 NPCs en mundo rico.
      expect(s.tick).toBeLessThan(20_000);
    },
    120_000,
  );

  it(
    'determinismo: 2 corridas con mismo seed → mismo sha256 del estado final',
    () => {
      function run() {
        let s = initialGameState(1, buildDraftedClan(), buildRichWorld());
        for (let i = 0; i < 5_000; i++) {
          s = tick(s);
          if (s.structures.length === 5) break;
        }
        return s;
      }
      const a = run();
      const b = run();
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    },
    120_000,
  );

  // Ancla SHA-256 del estado final tras 20k ticks autónomos. Cualquier
  // cambio futuro en `tick` / ramas puras de `lib/` que altere bytes
  // del estado hará saltar este expect. Si salta: (1) decisión de
  // diseño consciente → regenerar hash y commit con explicación; o
  // (2) regresión determinismo → investigar antes de tocar.
  it(
    'ancla SHA-256 del estado tras 20k ticks autónomos',
    () => {
      let s = initialGameState(1, buildDraftedClan(), buildRichWorld());
      for (let i = 0; i < 20_000; i++) {
        s = tick(s);
        if (s.structures.length === 5) break;
      }
      expect(sha256(JSON.stringify(s))).toBe(
        '6fd15afa42b854984a13cfcc76f866b9acf753a045073a6660fd1eec52069bb0',
      );
    },
    120_000,
  );
});
