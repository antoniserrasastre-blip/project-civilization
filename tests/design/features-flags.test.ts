/**
 * Suite de diseño TDD — Sprint 05 "El Laboratorio": flags `features` por subsistema.
 *
 * Contrato (decidido por el orquestador, Sprint 05.1):
 *  - `GameState.features?: FeatureFlags` — OPCIONAL (compat saves viejos, mismo
 *    patrón que `dawnReport`). 9 claves booleanas exactas:
 *    climate, animals, reproduction, items, legends, miracles, influence,
 *    fractures, tech (Sprint 05b.4).
 *  - `isFeatureOn(state, key)` — accessor puro: true si `features` está ausente
 *    o la clave no está (default todo ON); el valor del flag si está.
 *  - `DEFAULT_FEATURES` — las 9 claves a true.
 *  - Gating real en tick()/dawn(): cada flag OFF apaga SU subsistema y nada más.
 *  - `tech` OFF (Sprint 05b.4, contrato del orquestador) → `tickTech` NO corre:
 *    sin unlocks nuevos (state.tech idéntico), sin eurekas (unlockedItemKinds
 *    idéntico), sin crónica de descubrimiento/identidad nueva, sin avance de
 *    prng por ese paso. Razón playtest: 7 ¡EUREKA! + 5 "el clan domina:" +
 *    2 "ha forjado su carácter" en los primeros 30s del laboratorio.
 *  - Compat crítico: estado SIN `features` ≡ estado con DEFAULT_FEATURES,
 *    byte a byte (módulo el propio campo). El juego clásico no cambia.
 *  - Milagros OFF — comportamiento mínimo especificado aquí tras leer
 *    lib/miracles.ts: `canGrantMiracle` devuelve false (señal explícita para la
 *    UI) y `grantMiracle` es no-op puro (devuelve el estado idéntico: no gasta
 *    gratitud, no añade trait, no lanza). Razón: grantMiracle ya lanza por
 *    inputs inválidos, pero un flag apagado no es un input inválido — un save
 *    o replay con el flag OFF jamás debe reventar.
 *  - §A4: pureza, determinismo (enteros, mismo seed → mismo resultado),
 *    round-trip JSON sin pérdida.
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { dawn } from '@/lib/dawn';
import {
  initialGameState,
  isFeatureOn,
  DEFAULT_FEATURES,
  type FeatureFlags,
  type GameState,
} from '@/lib/game-state';
import { TICKS_PER_DAY } from '@/lib/resources';
import { grantMiracle, canGrantMiracle, MIRACLE, MIRACLES_CATALOG } from '@/lib/miracles';
import { makeTestNPC, makeFullInventory, SEX, VOCATION } from '../helpers/npc-fixtures';
import { TILE, type WorldMap, type Animal } from '@/lib/world-state';

// ————————————————————————————————————————————————————————————————
// Fixtures (estilo phase-machine / full-cycle: mundo plano, NPCs sanos)
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

function mkFlatWorld(w = 32, h = 32): WorldMap {
  return {
    seed: 0,
    width: w,
    height: h,
    tiles: new Array(w * h).fill(TILE.GRASS),
    resources: [],
    meta: { generatorVersion: 1, shaHash: '', islandCount: 1 },
    influence: [],
  };
}

function mkHealthyNPC(id: string, x: number, y: number, overrides: Parameters<typeof makeTestNPC>[0] = { id }) {
  return makeTestNPC({
    position: { x, y },
    stats: { supervivencia: 90, socializacion: 80, proposito: 90, miedo: 10 },
    inventory: makeFullInventory({ berry: 500 }),
    ...overrides,
    id,
  });
}

function mkState(seed = 7, npcs = [mkHealthyNPC('ana', 5, 5), mkHealthyNPC('bru', 6, 6)]): GameState {
  return initialGameState(seed, npcs, mkFlatWorld(), 'stone', { skipSpawning: true });
}

/** Estado con flags explícitos: DEFAULT_FEATURES + overrides parciales. */
function conFlags(s: GameState, partial: Partial<FeatureFlags>): GameState {
  return { ...s, features: { ...DEFAULT_FEATURES, ...partial } };
}

/** Quita el campo `features` para comparar byte a byte contra un estado clásico. */
function sinCampoFeatures(s: GameState): Omit<GameState, 'features'> {
  const { features: _f, ...rest } = s;
  return rest;
}

function mkWolf(x: number, y: number): Animal {
  return {
    id: 'wolf-test-1',
    kind: 'wolf',
    x,
    y,
    hp: 60,
    maxHp: 60,
    hunger: 100,
    packId: null,
    alive: true,
    birthTick: 0,
  };
}

// ————————————————————————————————————————————————————————————————
// 1. Contrato base: FeatureFlags, DEFAULT_FEATURES, isFeatureOn
// ————————————————————————————————————————————————————————————————

describe('Sprint 05 — features flags: contrato base (isFeatureOn + DEFAULT_FEATURES)', () => {
  it('DEFAULT_FEATURES tiene exactamente las 9 claves del contrato, todas a true', () => {
    expect(Object.keys(DEFAULT_FEATURES).sort()).toEqual([...FLAG_KEYS].sort());
    for (const key of FLAG_KEYS) {
      expect(DEFAULT_FEATURES[key]).toBe(true);
    }
    // El tipo FeatureFlags acepta el objeto completo (contrato de shape).
    const full: FeatureFlags = {
      climate: true,
      animals: true,
      reproduction: true,
      items: true,
      legends: true,
      miracles: true,
      influence: true,
      fractures: true,
      tech: true,
    };
    expect(full).toEqual(DEFAULT_FEATURES);
  });

  it('estado sin features → isFeatureOn devuelve true para las 9 claves (default todo ON)', () => {
    const s = mkState();
    expect(s.features).toBeUndefined(); // compat: initialGameState clásico no lo trae… o lo trae; lo que NO puede es romper el default ON
    for (const key of FLAG_KEYS) {
      expect(isFeatureOn(s, key)).toBe(true);
    }
  });

  it('features parcial → clave presente devuelve su valor, clave ausente devuelve true', () => {
    const s = { ...mkState(), features: { animals: false } as Partial<FeatureFlags> as FeatureFlags };
    expect(isFeatureOn(s, 'animals')).toBe(false);
    // Las otras 8 no están en el objeto parcial → default ON.
    for (const key of FLAG_KEYS.filter((k) => k !== 'animals')) {
      expect(isFeatureOn(s, key)).toBe(true);
    }
  });

  it('isFeatureOn es puro: consultar no muta el estado', () => {
    const s = conFlags(mkState(), { climate: false, miracles: false });
    const antes = JSON.stringify(s);
    for (const key of FLAG_KEYS) isFeatureOn(s, key);
    expect(JSON.stringify(s)).toBe(antes);
  });
});

// ————————————————————————————————————————————————————————————————
// 2. Compat: estado sin features ≡ DEFAULT_FEATURES (el clásico no cambia)
// ————————————————————————————————————————————————————————————————

describe('Sprint 05 — features flags: compat byte a byte con el juego clásico', () => {
  it('tick(): N ticks sin features ≡ N ticks con DEFAULT_FEATURES (módulo el propio campo)', () => {
    let clasico = mkState(42);
    let conDefaults = conFlags(mkState(42), {});
    for (let i = 0; i < 30; i++) {
      clasico = tick(clasico);
      conDefaults = tick(conDefaults);
    }
    expect(JSON.stringify(sinCampoFeatures(conDefaults))).toBe(JSON.stringify(clasico));
    // El campo features sobrevive intacto al tick (no se pierde ni se normaliza).
    expect(conDefaults.features).toEqual(DEFAULT_FEATURES);
  });

  it('dawn(): sin features ≡ DEFAULT_FEATURES (módulo el propio campo)', () => {
    const clasico = mkState(42);
    const conDefaults = conFlags(mkState(42), {});
    expect(JSON.stringify(sinCampoFeatures(dawn(conDefaults)))).toBe(JSON.stringify(dawn(clasico)));
  });
});

// ————————————————————————————————————————————————————————————————
// 3. Round-trip JSON (§A4)
// ————————————————————————————————————————————————————————————————

describe('Sprint 05 — features flags: round-trip JSON', () => {
  it('features completo sobrevive JSON.parse(JSON.stringify(s)) sin pérdida', () => {
    const s = conFlags(mkState(), { animals: false, climate: false });
    const revived = JSON.parse(JSON.stringify(s)) as GameState;
    expect(revived).toEqual(s);
    expect(revived.features).toEqual({ ...DEFAULT_FEATURES, animals: false, climate: false });
  });

  it('features parcial sobrevive el round-trip sin pérdida ni relleno de claves', () => {
    const s = { ...mkState(), features: { legends: false } as Partial<FeatureFlags> as FeatureFlags };
    const revived = JSON.parse(JSON.stringify(s)) as GameState;
    expect(revived).toEqual(s);
    // Parcial se queda parcial: serializar no "completa" las claves ausentes.
    expect(Object.keys(revived.features!)).toEqual(['legends']);
  });
});

// ————————————————————————————————————————————————————————————————
// 4. Determinismo (§A4)
// ————————————————————————————————————————————————————————————————

describe('Sprint 05 — features flags: determinismo', () => {
  it('mismo seed + mismos flags → estado final byte-idéntico tras N ticks (cruzando un amanecer)', () => {
    const run = () => {
      // Arranca cerca del anochecer para que el run cruce el dawn inline
      // (modo continuo) con flags apagados de por medio.
      let s = { ...conFlags(mkState(7), { animals: false, climate: false, reproduction: false }), tick: TICKS_PER_DAY - 20 };
      for (let i = 0; i < 60; i++) s = tick(s);
      return s;
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});

// ————————————————————————————————————————————————————————————————
// 5. Gating real en tick()
// ————————————————————————————————————————————————————————————————

describe('Sprint 05 — features flags: gating en tick()', () => {
  it('animals OFF → los animales ni se mueven ni spawnean (animals idéntico tras el tick)', () => {
    // tick 0 dispara el spawn-check y el lobo está lejos del clan → deambula.
    const base = { ...mkState(), animals: [mkWolf(20, 20)] };

    const off = tick(conFlags(base, { animals: false }));
    expect(off.animals).toEqual(base.animals);

    // Sanity (no-vacuo): con el flag ON el subsistema SÍ toca animals.
    const on = tick(conFlags(base, {}));
    expect(JSON.stringify(on.animals)).not.toBe(JSON.stringify(base.animals));
  });

  it('influence OFF → world.influence no se recalcula en el tick (queda idéntico)', () => {
    const base = mkState();

    const off = tick(conFlags(base, { influence: false }));
    expect(off.world.influence).toEqual(base.world.influence);

    // Sanity: con ON, los NPCs vivos pintan influencia (deja de ser todo ceros).
    const on = tick(conFlags(base, {}));
    expect(JSON.stringify(on.world.influence)).not.toBe(JSON.stringify(base.world.influence));
  });

  it('reproduction OFF → no nacen NPCs nunca (40 amaneceres con pareja fértil, npcs no crece)', () => {
    // Pareja fértil: M + F, supervivencia ≥ 50, sin cooldown.
    const npcs = [
      mkHealthyNPC('adan', 5, 5, { id: 'adan', sex: SEX.M }),
      mkHealthyNPC('eva', 6, 6, { id: 'eva', sex: SEX.F }),
    ];
    let s = conFlags(mkState(11, npcs), { reproduction: false });
    // El roll de nacimiento solo corre cuando tick % TICKS_PER_DAY === 0:
    // forzamos 40 amaneceres distintos para darle 40 oportunidades.
    for (let d = 1; d <= 40; d++) {
      s = tick({ ...s, tick: d * TICKS_PER_DAY });
      expect(s.npcs).toHaveLength(2);
    }
  });

  it('legends OFF → una muerte no registra leyenda (legends idéntico tras los ticks)', () => {
    // Moribundo: supervivencia 1, sin comida → muere en pocos ticks.
    const npcs = [
      mkHealthyNPC('sano', 5, 5),
      makeTestNPC({
        id: 'moribundo',
        position: { x: 10, y: 10 },
        stats: { supervivencia: 1, socializacion: 50, proposito: 50, miedo: 10 },
      }),
    ];
    const base = mkState(13, npcs);

    // OFF (animals también OFF para aislar la muerte por hambre, determinista):
    let off = conFlags(base, { legends: false, animals: false });
    let guard = 0;
    while (off.npcs.find((n) => n.id === 'moribundo')!.alive) {
      off = tick(off);
      if (++guard > 200) throw new Error('el moribundo nunca murió — fixture roto');
    }
    off = tick(off); // un tick más allá de la muerte, por si el registro va a tick vencido
    expect(off.legends).toEqual(base.legends);

    // Sanity: con legends ON la misma muerte SÍ registra leyenda.
    let on = conFlags(base, { animals: false });
    guard = 0;
    while (on.npcs.find((n) => n.id === 'moribundo')!.alive) {
      on = tick(on);
      if (++guard > 200) throw new Error('el moribundo nunca murió — fixture roto');
    }
    expect(JSON.stringify(on.legends)).not.toBe(JSON.stringify(base.legends));
  });

  it('items OFF → no se craftean items nuevos y los existentes no cambian', () => {
    // Sabio con piedra de sobra + clan desarmado → tryAutoCraftItems craftearía
    // un hand_axe (3 de piedra) en el primer tick con el flag ON.
    const npcs = [
      mkHealthyNPC('sabio', 5, 5, {
        id: 'sabio',
        vocation: VOCATION.SABIO,
        inventory: makeFullInventory({ berry: 500, stone: 10 }),
      }),
      mkHealthyNPC('peon', 6, 6),
    ];
    const base = mkState(17, npcs);

    // Sanity ON: el crafteo ocurre de verdad (el test no es vacuo).
    const on = tick(conFlags(base, {}));
    expect(on.items.length).toBeGreaterThan(0);

    // OFF desde cero: items no crece.
    const off = tick(conFlags(base, { items: false }));
    expect(off.items).toEqual(base.items);

    // OFF con un item ya existente (el crafteado en `on`): no crece ni cambia.
    let off2 = conFlags(on, { items: false });
    for (let i = 0; i < 3; i++) off2 = tick(off2);
    expect(off2.items).toEqual(on.items);
  });
});

// ————————————————————————————————————————————————————————————————
// 6. Gating real en dawn()
// ————————————————————————————————————————————————————————————————

describe('Sprint 05 — features flags: gating en dawn()', () => {
  it('climate OFF → el paso clima no avanza el clima NI consume prng', () => {
    // tick 0 (no es boundary) → friccion-divina es no-op; el ÚNICO paso del
    // DAWN_PIPELINE que consume prng es 'clima'. Con climate OFF, el prng
    // tiene que salir intacto: si el paso "corre en vacío" pero avanza el
    // prng, rompe el determinismo entre partidas con/sin flag.
    const base = mkState(23);

    const off = dawn(conFlags(base, { climate: false }));
    expect(off.climate).toEqual(base.climate);
    expect(off.prng).toEqual(base.prng);

    // Sanity ON: el clima avanza (dayOfYear 0 → 1) y el prng se consume.
    const on = dawn(conFlags(base, {}));
    expect(on.climate.dayOfYear).toBe(base.climate.dayOfYear + 1);
    expect(JSON.stringify(on.prng)).not.toBe(JSON.stringify(base.prng));
  });

  it('fractures OFF → friccion-divina no corre (contadores de fractura intactos en el boundary)', () => {
    // Clan en hambre real (sv crítica, cero comida) en el último tick del día:
    // con fractures ON, tickFractures incrementa consecutiveHungerDays (y
    // dispara la cascada porque food <= 0). Con OFF, los contadores de
    // fractura del village quedan EXACTAMENTE como entraron.
    const npcs = [
      makeTestNPC({
        id: 'hambriento',
        position: { x: 5, y: 5 },
        stats: { supervivencia: 10, socializacion: 50, proposito: 50, miedo: 10 },
      }),
    ];
    const base = { ...mkState(29, npcs), tick: TICKS_PER_DAY - 1 };

    const contadores = (s: GameState) => ({
      consecutiveHungerDays: s.village.consecutiveHungerDays,
      consecutiveLowSocialDays: s.village.consecutiveLowSocialDays,
      consecutiveColdDays: s.village.consecutiveColdDays,
      consecutiveFearDays: s.village.consecutiveFearDays,
      consecutiveLowPropositoDays: s.village.consecutiveLowPropositoDays,
      consecutiveDepletedDays: s.village.consecutiveDepletedDays,
      spiritualDefeat: s.village.spiritualDefeat,
    });

    const off = dawn(conFlags(base, { fractures: false }));
    expect(contadores(off)).toEqual(contadores(base));

    // Sanity ON: el día de hambre SÍ cuenta.
    const on = dawn(conFlags(base, {}));
    expect(on.village.consecutiveHungerDays).toBeGreaterThan(base.village.consecutiveHungerDays);
  });
});

// ————————————————————————————————————————————————————————————————
// 7. Gating de milagros (lib/miracles.ts)
// ————————————————————————————————————————————————————————————————

describe('Sprint 05 — features flags: gating de milagros', () => {
  function mkRichState(flags: Partial<FeatureFlags>): GameState {
    const base = mkState(31);
    // Gratitud de sobra para cualquier milagro del catálogo.
    return conFlags({ ...base, village: { ...base.village, gratitude: 100 } }, flags);
  }

  it('miracles OFF → canGrantMiracle devuelve false aunque todo lo demás valide', () => {
    const off = mkRichState({ miracles: false });
    expect(canGrantMiracle(off, 'ana', MIRACLE.HAMBRE_SAGRADA)).toBe(false);

    // Sanity ON: con el flag encendido el mismo milagro es concedible.
    const on = mkRichState({});
    expect(canGrantMiracle(on, 'ana', MIRACLE.HAMBRE_SAGRADA)).toBe(true);
  });

  it('miracles OFF → grantMiracle es no-op puro: estado byte-idéntico, sin gasto ni trait, sin throw', () => {
    const off = mkRichState({ miracles: false });
    const antes = JSON.stringify(off);

    const out = grantMiracle(off, 'ana', MIRACLE.HAMBRE_SAGRADA);
    // No-op puro y explícito: ni gasta gratitud, ni añade el trait, ni muta el input.
    expect(JSON.stringify(out)).toBe(antes);
    expect(JSON.stringify(off)).toBe(antes);

    // Sanity ON: el mismo milagro con el flag encendido SÍ aplica y cobra.
    const on = mkRichState({});
    const granted = grantMiracle(on, 'ana', MIRACLE.HAMBRE_SAGRADA);
    const ana = granted.npcs.find((n) => n.id === 'ana')!;
    expect(ana.traits).toContain(MIRACLES_CATALOG[MIRACLE.HAMBRE_SAGRADA].traitId);
    expect(granted.village.gratitude).toBe(100 - MIRACLES_CATALOG[MIRACLE.HAMBRE_SAGRADA].cost);
  });
});

// ————————————————————————————————————————————————————————————————
// 8. Gating de tech (Sprint 05b.4 — la máquina de premios)
// ————————————————————————————————————————————————————————————————

describe('Sprint 05b — features flags: gating de tech', () => {
  // Fixture: clan ya en su día 3 (daysAlive >= 3), arrancando UN tick después
  // del boundary para no pisar el dawn inline. tickTech solo evalúa cada
  // TECH_CHECK_INTERVAL = 20 ticks → 25 ticks cruzan seguro un check (tick
  // 1460), donde FOOD_PRESERVATION ('El clan almacena más de lo que come en
  // un día', daysAlive >= 3) emerge SÍ o SÍ con tech ON — sin depender de
  // tradiciones ni de items previos. Es el mismo premio que inunda el
  // laboratorio en el playtest.
  const N_TICKS = 25;

  function mkDia3(): GameState {
    return { ...mkState(37), tick: 3 * TICKS_PER_DAY + 1 };
  }

  function corre(s: GameState, n = N_TICKS): GameState {
    for (let i = 0; i < n; i++) s = tick(s);
    return s;
  }

  /** Las entradas de crónica que SOLO fabrica tickTech: descubrimiento
   *  ("El clan domina:") e identidad ("ha forjado su carácter"). */
  function cronicaDeTech(s: GameState) {
    return s.chronicle.filter(
      (e) => e.text.includes('El clan domina:') || e.text.includes('ha forjado su carácter'),
    );
  }

  it('tech OFF → tickTech no corre: tech, unlockedItemKinds y crónica de descubrimiento/identidad idénticos tras N ticks', () => {
    const base = mkDia3();
    expect(cronicaDeTech(base)).toEqual([]); // el fixture entra limpio

    const off = corre(conFlags(base, { tech: false }));
    expect(off.tech).toEqual(base.tech);
    expect(off.unlockedItemKinds).toEqual(base.unlockedItemKinds);
    expect(cronicaDeTech(off)).toEqual([]);
  });

  it('sanity (no-vacuo): el mismo fixture con tech ON SÍ desbloquea (unlock + eureka + crónica)', () => {
    const base = mkDia3();
    const on = corre(conFlags(base, {}));
    // FOOD_PRESERVATION emerge en el primer check del día 3…
    expect(on.tech.unlocked.length).toBeGreaterThan(base.tech.unlocked.length);
    // …trae eureka ('despensa' entra en unlockedItemKinds)…
    expect(on.unlockedItemKinds.length).toBeGreaterThan(base.unlockedItemKinds.length);
    // …y grita su ¡DESCUBRIMIENTO! en la crónica.
    expect(cronicaDeTech(on).length).toBeGreaterThan(0);
  });

  it('determinismo con tech OFF: mismo seed + mismos flags → estado final byte-idéntico', () => {
    const run = () => JSON.stringify(corre(conFlags(mkDia3(), { tech: false }), 40));
    expect(run()).toBe(run());
  });
});
