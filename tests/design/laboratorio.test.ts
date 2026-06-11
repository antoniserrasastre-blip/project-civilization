/**
 * Suite de diseño TDD — Sprint 05 "El Laboratorio": quickstart 🔬.
 *
 * El playtest dictó que el MVP 512×512/14 NPCs es indebuggeable. El
 * laboratorio encoge el juguete: mundo 32×32, 4 NPCs, solo el núcleo del
 * loop (mover, recolectar, construir, explorar, designios, amanecer,
 * informe). Los subsistemas con flag van TODOS apagados.
 *
 * Contrato (decidido por el orquestador, Sprint 05 — sim-side):
 *  - `lib/laboratorio.ts` exporta:
 *    · `LABORATORIO_FEATURES: FeatureFlags` — las 9 claves a false
 *      (climate, animals, reproduction, items, legends, miracles,
 *      influence, fractures, tech — Sprint 05b.4: el laboratorio nace
 *      sin la máquina de premios). El núcleo no tiene flag y siempre corre.
 *    · `makeLaboratorioState(seed: number): GameState` — PURA. Partida
 *      lista: mundo 32×32 determinista, exactamente 4 NPCs vivos
 *      drafteados desde el seed (patrón elegidos-sin-ciudadanos de
 *      handleQuickStart), `phasedMode: true`, `phase: 'day'`,
 *      `features: LABORATORIO_FEATURES`.
 *  - Mundo JUGABLE a 32×32: ≥1 recurso de comida y ≥30% de tiles
 *    transitables. Si generateWorld a ese tamaño no lo da, este test
 *    debe DETECTARLO (es señal real, no flaky).
 *  - §A4: pureza, determinismo (mismo seed → byte-idéntico), round-trip
 *    JSON sin pérdida.
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { applyAssignments } from '@/lib/dawn';
import { TICKS_PER_DAY, isFoodResource } from '@/lib/resources';
import { TILE } from '@/lib/world-state';
import { DEFAULT_FEATURES, type GameState } from '@/lib/game-state';
import { LABORATORIO_FEATURES, makeLaboratorioState } from '@/lib/laboratorio';

// ————————————————————————————————————————————————————————————————
// Helpers
// ————————————————————————————————————————————————————————————————

const FLAG_KEYS = [
  'climate',
  'animals',
  'reproduction',
  'items',
  'legends',
  'miracles',
  'influence',
  'fractures',
  'tech',
] as const;

/** Espejo de los criterios REALES del motor (ambos privados hoy):
 *  - movimiento NPC: `isMovementPassable` en lib/simulation.ts → tile !== TILE.WATER
 *    (el agua profunda es lo único intransitable para el movimiento). */
const esTransitable = (t: number) => t !== TILE.WATER;

/** - tierra de spawn: `isLandTile` en lib/spawn.ts → ni WATER ni SHALLOW_WATER.
 *  Los NPCs se colocan con pickLandCells, que exige tierra firme. */
const esTierra = (t: number) => t !== TILE.WATER && t !== TILE.SHALLOW_WATER;

function tileEn(s: GameState, x: number, y: number): number {
  return s.world.tiles[y * s.world.width + x];
}

/** Corre la sim hasta el anochecer (phasedMode pausa en 'preparation').
 *  Guard duro: si en TICKS_PER_DAY + 5 ticks no llegó, el loop está roto. */
function correHastaAnochecer(s: GameState): GameState {
  let guard = 0;
  while (s.phase !== 'preparation') {
    s = tick(s);
    if (++guard > TICKS_PER_DAY + 5) {
      throw new Error('nunca llegó a preparation — la máquina de fases no pausa');
    }
  }
  return s;
}

// ————————————————————————————————————————————————————————————————
// 1. Forma: 32×32, 4 NPCs vivos, phasedMode, las 9 flags OFF
// ————————————————————————————————————————————————————————————————

describe('Laboratorio — forma del estado', () => {
  it('LABORATORIO_FEATURES tiene exactamente las 9 claves del contrato, todas a false', () => {
    expect(Object.keys(LABORATORIO_FEATURES).sort()).toEqual([...FLAG_KEYS].sort());
    for (const key of FLAG_KEYS) {
      expect(LABORATORIO_FEATURES[key]).toBe(false);
    }
    // Mismo shape que DEFAULT_FEATURES (ninguna clave inventada ni faltante).
    expect(Object.keys(LABORATORIO_FEATURES).sort()).toEqual(
      Object.keys(DEFAULT_FEATURES).sort(),
    );
  });

  it('makeLaboratorioState: mundo 32×32, exactamente 4 NPCs vivos, phasedMode, phase day', () => {
    const s = makeLaboratorioState(7);
    expect(s.world.width).toBe(32);
    expect(s.world.height).toBe(32);
    expect(s.world.tiles).toHaveLength(32 * 32);
    expect(s.npcs).toHaveLength(4);
    expect(s.npcs.every((n) => n.alive)).toBe(true);
    expect(s.phasedMode).toBe(true);
    expect(s.phase).toBe('day');
    expect(s.tick).toBe(0);
  });

  it('features = LABORATORIO_FEATURES (las 9 OFF, explícitas en el estado)', () => {
    const s = makeLaboratorioState(7);
    expect(s.features).toEqual(LABORATORIO_FEATURES);
    for (const key of FLAG_KEYS) {
      expect(s.features?.[key]).toBe(false);
    }
  });
});

// ————————————————————————————————————————————————————————————————
// 2. Mundo jugable a 32×32 (si el generador no lo da, esto DEBE fallar)
// ————————————————————————————————————————————————————————————————

describe('Laboratorio — mundo jugable a 32×32', () => {
  it('hay al menos 1 recurso de comida en el mapa', () => {
    const s = makeLaboratorioState(7);
    const comida = s.world.resources.filter((r) => isFoodResource(r.id));
    expect(comida.length).toBeGreaterThanOrEqual(1);
  });

  it('al menos el 30% de los tiles son transitables (criterio real de movimiento)', () => {
    const s = makeLaboratorioState(7);
    const transitables = s.world.tiles.filter(esTransitable).length;
    expect(transitables / s.world.tiles.length).toBeGreaterThanOrEqual(0.3);
  });

  it('los 4 NPCs spawnean en tierra firme y dentro del mapa', () => {
    const s = makeLaboratorioState(7);
    for (const n of s.npcs) {
      expect(n.position.x).toBeGreaterThanOrEqual(0);
      expect(n.position.x).toBeLessThan(32);
      expect(n.position.y).toBeGreaterThanOrEqual(0);
      expect(n.position.y).toBeLessThan(32);
      expect(esTierra(tileEn(s, n.position.x, n.position.y))).toBe(true);
    }
  });
});

// ————————————————————————————————————————————————————————————————
// 3. Determinismo (§A4)
// ————————————————————————————————————————————————————————————————

describe('Laboratorio — determinismo', () => {
  it('makeLaboratorioState(7) dos veces → byte-idéntico (pura, sin estado oculto)', () => {
    const a = makeLaboratorioState(7);
    const b = makeLaboratorioState(7);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('seeds distintos → partidas distintas (el seed manda, no hay constante escondida)', () => {
    const a = makeLaboratorioState(7);
    const b = makeLaboratorioState(8);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

// ————————————————————————————————————————————————————————————————
// 4. Round-trip JSON (§A4)
// ————————————————————————————————————————————————————————————————

describe('Laboratorio — round-trip JSON', () => {
  it('el estado sobrevive JSON.parse(JSON.stringify(s)) sin pérdida', () => {
    const s = makeLaboratorioState(7);
    const revived = JSON.parse(JSON.stringify(s)) as GameState;
    expect(revived).toEqual(s);
    // Y el revivido sigue siendo serializable byte-estable (sin undefined/NaN colados).
    expect(JSON.stringify(revived)).toBe(JSON.stringify(s));
  });
});

// ————————————————————————————————————————————————————————————————
// 5 + 6. El loop corre y el día entero es BARATO
// ————————————————————————————————————————————————————————————————

describe('Laboratorio — el loop corre y es barato', () => {
  it(
    'tick() hasta el anochecer → phase preparation (phasedMode pausa) y tick congelado',
    () => {
      let s = makeLaboratorioState(7);
      s = correHastaAnochecer(s);
      expect(s.phase).toBe('preparation');
      // El anochecer cae en el último tick del día; applyAssignments cruza el límite.
      expect(s.tick).toBe(TICKS_PER_DAY - 1);
      // En preparación la sim está congelada: tick() es un no-op puro.
      const congelado = JSON.stringify(s);
      expect(JSON.stringify(tick(s))).toBe(congelado);
    },
    15_000,
  );

  it(
    'dos días completos del laboratorio corren enteros sin acercarse al timeout',
    () => {
      // Sin asserts de tiempo frágiles: si a 32×32 esto se arrastra, el
      // timeout del test (15s para ~2×480 ticks) lo pondrá en rojo — señal real.
      let s = makeLaboratorioState(7);
      s = correHastaAnochecer(s); // día 1 entero
      s = applyAssignments(s, {}); // cruza el amanecer
      expect(s.phase).toBe('day');
      expect(s.tick).toBe(TICKS_PER_DAY);
      s = correHastaAnochecer(s); // día 2 entero
      expect(s.phase).toBe('preparation');
      expect(s.tick).toBe(2 * TICKS_PER_DAY - 1);
    },
    15_000,
  );
});

// ————————————————————————————————————————————————————————————————
// 7. Informe del amanecer con los 4 NPCs
// ————————————————————————————————————————————————————————————————

describe('Laboratorio — informe del amanecer', () => {
  it(
    'tras cruzar un amanecer, dawnReport existe y tiene exactamente los 4 NPCs',
    () => {
      let s = makeLaboratorioState(7);
      s = correHastaAnochecer(s);
      s = applyAssignments(s, {});
      expect(s.dawnReport).not.toBeNull();
      expect(s.dawnReport).toBeDefined();
      expect(s.dawnReport!.npcs).toHaveLength(4);
      // Cada entrada del informe corresponde a un NPC real del estado.
      const ids = new Set(s.npcs.map((n) => n.id));
      for (const entry of s.dawnReport!.npcs) {
        expect(ids.has(entry.id)).toBe(true);
      }
    },
    15_000,
  );
});

// ————————————————————————————————————————————————————————————————
// 8. Designios en el laboratorio
// ————————————————————————————————————————————————————————————————

describe('Laboratorio — designios', () => {
  it(
    'asignar un designio en preparación y cruzar el amanecer → el NPC lo tiene activo el día siguiente',
    () => {
      let s = makeLaboratorioState(7);
      s = correHastaAnochecer(s);
      expect(s.phase).toBe('preparation');

      const elegido = s.npcs[0];
      s = applyAssignments(s, { [elegido.id]: 'recoleccion' });

      // El amanecer corrió y el día siguiente arrancó.
      expect(s.phase).toBe('day');
      const conDesignio = s.npcs.find((n) => n.id === elegido.id)!;
      expect(conDesignio.designio).toBe('recoleccion');

      // El historial registra la partida (seed + designios = partida, Sprint 02).
      const ultimo = s.assignmentsHistory[s.assignmentsHistory.length - 1];
      expect(ultimo.assignments).toEqual({ [elegido.id]: 'recoleccion' });

      // Y sigue activo entrado el día (el designio dura el día, no un tick).
      for (let i = 0; i < 10; i++) s = tick(s);
      expect(s.npcs.find((n) => n.id === elegido.id)!.designio).toBe('recoleccion');
    },
    15_000,
  );
});
