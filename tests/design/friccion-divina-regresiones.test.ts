/**
 * Suite de diseño TDD — Regresiones de la review adversarial (Fricción Divina).
 *
 * Tests ROJOS primero (red); exponen 3 bugs reales en lib/events.ts:
 *
 *   B1 — checkHungerCascade: `consecutiveHungerDays` incrementa cada amanecer
 *        en que `dailyHungerEscapes === 0`, es decir SIEMPRE en una aldea sana
 *        (nadie pasó hambre → 0 escapes). Desde el día 10 dispara la cascada
 *        cada amanecer aunque sobre comida, y tras una cascada mitigada el
 *        contador queda enclavado y re-dispara automáticamente.
 *
 *   B3 — copia superficial `{...terrainTags}` + `push('maldita')` muta el
 *        array del estado de ENTRADA cuando la posición ya tiene tags
 *        (rutas hunger_cascade y social_conflict). Viola pureza §A4.
 *
 *   B4 — al final de tickFractures, `fractures.some(f => f.type ===
 *        'build_collapse')` no filtra `mitigated`: una mitigación exitosa
 *        destruye `buildProject` igualmente.
 *
 * NO arregla producción: el implementer hace green sin tocar estos tests.
 * Estilo de la casa: dynamic imports + fixture mkTestState
 * (ver tests/design/friccion-divina.test.ts). Determinista, enteros, sin sleeps.
 */

import { describe, expect, it, beforeEach } from 'vitest';

describe('Fricción Divina — regresiones review adversarial (B1/B3/B4)', () => {
  let tickFractures: any;
  let initialGameState: any;
  let makeTestNPC: any;
  let MESSAGE_INTENTS: any;
  let CRAFTABLE: any;
  let SEASON: any;
  let TICKS_PER_DAY: any;

  beforeEach(async () => {
    const eventsMod = await import('@/lib/events');
    tickFractures = eventsMod.tickFractures;

    const gsMod = await import('@/lib/game-state');
    initialGameState = gsMod.initialGameState;

    const npcsMod = await import('@/lib/npcs');
    makeTestNPC = npcsMod.makeTestNPC;

    const msgMod = await import('@/lib/messages');
    MESSAGE_INTENTS = msgMod.MESSAGE_INTENTS;

    const craftMod = await import('@/lib/crafting');
    CRAFTABLE = craftMod.CRAFTABLE;

    const climMod = await import('@/lib/climate');
    SEASON = climMod.SEASON;

    const resMod = await import('@/lib/resources');
    TICKS_PER_DAY = resMod.TICKS_PER_DAY;
  });

  function mkTestState(overrides: any = {}) {
    const baseNpcs = overrides.npcs || [
      makeTestNPC({ id: 'n1', position: { x: 1, y: 1 }, stats: { supervivencia: 90, socializacion: 70, proposito: 80, miedo: 10 } }),
      makeTestNPC({ id: 'n2', position: { x: 2, y: 2 }, stats: { supervivencia: 90, socializacion: 70, proposito: 80, miedo: 10 } }),
    ];
    const base = initialGameState(1, baseNpcs, undefined, 'stone', { skipSpawning: true });
    const v = {
      ...base.village,
      dailyHungerEscapes: overrides.dailyHungerEscapes ?? 0,
      dailyDeaths: overrides.dailyDeaths ?? 0,
      consecutiveHungerDays: overrides.consecutiveHungerDays ?? 0,
      consecutiveLowSocialDays: overrides.consecutiveLowSocialDays ?? 0,
      consecutiveColdDays: overrides.consecutiveColdDays ?? 0,
      consecutiveFearDays: overrides.consecutiveFearDays ?? 0,
      consecutiveLowPropositoDays: overrides.consecutiveLowPropositoDays ?? 0,
      consecutiveDepletedDays: overrides.consecutiveDepletedDays ?? 0,
      spiritualDefeat: overrides.spiritualDefeat ?? false,
      activeMessage: overrides.activeMessage ?? null,
    };
    const climate = overrides.climate || { ...base.climate, season: SEASON.SPRING };
    const structures = overrides.structures || [];
    const world = {
      ...base.world,
      resources: overrides.resources || base.world.resources.map((r: any) => ({ ...r, quantity: r.quantity ?? 5 })),
      terrainTags: overrides.terrainTags || base.world.terrainTags || {},
    };
    return {
      ...base,
      tick: overrides.tick ?? 479, // amanecer: (tick+1) % 480 === 0
      npcs: overrides.npcs || base.npcs,
      village: v,
      climate,
      structures,
      world,
      buildProject: overrides.buildProject ?? null,
      chronicle: overrides.chronicle || [],
    };
  }

  /** Da comida abundante a cada NPC (inmutable). */
  function withFood(npcs: any[], berry = 50) {
    return npcs.map((n: any) => ({ ...n, inventory: { ...n.inventory, berry } }));
  }

  /** Vacía toda la comida de cada NPC (inmutable). */
  function withoutFood(npcs: any[]) {
    return npcs.map((n: any) => ({ ...n, inventory: { ...n.inventory, berry: 0, game: 0, fish: 0 } }));
  }

  /* =======================================================
   * B1 — Cascada de hambre con falso positivo
   * ======================================================= */
  describe('B1 — checkHungerCascade no debe disparar en aldea sana', () => {
    it('aldea sana (comida abundante, NPCs bien alimentados) — 14 amaneceres sin hunger_cascade y todos vivos', () => {
      let s = mkTestState({ tick: 479 });
      s = { ...s, npcs: withFood(s.npcs, 60) };

      const allFractures: any[] = [];
      for (let day = 0; day < 14; day++) {
        const res = tickFractures(s);
        allFractures.push(...res.fractures);
        // siguiente amanecer: avanza un día y simula el reset diario del caller
        // (resetGratitudeDailyTracking pone dailyHungerEscapes/dailyDeaths a 0).
        s = {
          ...res.state,
          tick: res.state.tick + TICKS_PER_DAY,
          npcs: withFood(res.state.npcs, 60), // la despensa se mantiene llena
          village: { ...res.state.village, dailyHungerEscapes: 0, dailyDeaths: 0 },
        };
      }

      // BUG HOY: escapes===0 (nadie pasó hambre) incrementa consecutiveHungerDays
      // cada día → desde el día 10 cae una cascada por amanecer pese a sobrar comida.
      expect(allFractures.filter((f: any) => f.type === 'hunger_cascade')).toEqual([]);
      expect(s.npcs.every((n: any) => n.alive)).toBe(true);
    });

    it('tras una cascada mitigada, el contador no queda enclavado: con la despensa recuperada no re-dispara al día siguiente', () => {
      // Día 0: crisis de hambre REAL (food=0, consec 9→10) mitigada por AUXILIO.
      let s = mkTestState({
        consecutiveHungerDays: 9,
        dailyHungerEscapes: 0,
        activeMessage: MESSAGE_INTENTS.AUXILIO,
        tick: 479,
      });
      s = { ...s, npcs: withoutFood(s.npcs) };
      const r1 = tickFractures(s);
      expect(r1.fractures.find((f: any) => f.type === 'hunger_cascade')?.mitigated).toBe(true);

      // Día 1: la despensa se recupera (comida abundante), sin susurro activo,
      // reset diario aplicado. Una aldea ya sana NO debe sufrir otra cascada.
      let s2 = {
        ...r1.state,
        tick: r1.state.tick + TICKS_PER_DAY,
        npcs: withFood(r1.state.npcs, 60),
        village: { ...r1.state.village, dailyHungerEscapes: 0, dailyDeaths: 0, activeMessage: null },
      };
      const r2 = tickFractures(s2);
      // BUG HOY: consec quedó >= 10 y escapes===0 → re-dispara (esta vez sin mitigar).
      expect(r2.fractures.some((f: any) => f.type === 'hunger_cascade')).toBe(false);

      // Día 2: sigue sana — tampoco debe disparar.
      const s3 = {
        ...r2.state,
        tick: r2.state.tick + TICKS_PER_DAY,
        npcs: withFood(r2.state.npcs, 60),
        village: { ...r2.state.village, dailyHungerEscapes: 0, dailyDeaths: 0 },
      };
      const r3 = tickFractures(s3);
      expect(r3.fractures.some((f: any) => f.type === 'hunger_cascade')).toBe(false);
      expect(r3.state.npcs.every((n: any) => n.alive)).toBe(true);
    });
  });

  /* =======================================================
   * B3 — Mutación de world.terrainTags del estado de entrada
   * ======================================================= */
  describe('B3 — pureza §A4: terrainTags pre-poblado no debe mutar en el input', () => {
    it('hunger_cascade con muerte en posición ya etiquetada → input intacto, output con maldita', () => {
      const npcs = [
        makeTestNPC({ id: 'v1', position: { x: 3, y: 4 }, stats: { supervivencia: 5, socializacion: 70, proposito: 50, miedo: 10 } }),
        makeTestNPC({ id: 'v2', position: { x: 9, y: 9 }, stats: { supervivencia: 90, socializacion: 70, proposito: 80, miedo: 10 } }),
      ];
      let s = mkTestState({ npcs, tick: 479, terrainTags: { '3,4': ['bosque'] } });
      s = { ...s, npcs: withoutFood(s.npcs) }; // food=0 → cascada sin mitigar; v1 (sv 5) muere en (3,4)

      const pre = JSON.stringify(s);
      const res = tickFractures(s);

      // Sanity: la fractura ocurrió y la muerte etiquetó la posición en el OUTPUT.
      expect(res.fractures.some((f: any) => f.type === 'hunger_cascade' && !f.mitigated)).toBe(true);
      expect(res.state.npcs.find((n: any) => n.id === 'v1')?.alive).toBe(false);
      expect(res.state.world.terrainTags['3,4']).toContain('bosque');
      expect(res.state.world.terrainTags['3,4']).toContain('maldita');

      // BUG HOY: push('maldita') muta el array compartido del estado de entrada.
      expect(s.world.terrainTags['3,4']).toEqual(['bosque']);
      expect(JSON.stringify(s)).toBe(pre);
    });

    it('social_conflict con víctima en posición ya etiquetada → input intacto, output con maldita', () => {
      const npcs = [
        makeTestNPC({ id: 'a1', position: { x: 1, y: 1 }, stats: { supervivencia: 90, socializacion: 10, proposito: 50, miedo: 10 } }),
        makeTestNPC({ id: 'a2', position: { x: 5, y: 5 }, stats: { supervivencia: 90, socializacion: 14, proposito: 50, miedo: 10 } }),
      ];
      // avg social = floor(24/2) = 12 < 20 → conflicto; víctima determinista = (1,1) (menor x).
      let s = mkTestState({ npcs, tick: 479, terrainTags: { '1,1': ['bosque'] } });
      s = { ...s, npcs: withFood(s.npcs, 60) }; // comida OK para no mezclar con hunger

      const pre = JSON.stringify(s);
      const res = tickFractures(s);

      expect(res.fractures.some((f: any) => f.type === 'social_conflict' && !f.mitigated)).toBe(true);
      expect(res.state.npcs.find((n: any) => n.id === 'a1')?.alive).toBe(false);
      expect(res.state.world.terrainTags['1,1']).toContain('bosque');
      expect(res.state.world.terrainTags['1,1']).toContain('maldita');

      // BUG HOY: el array original del input recibe el push.
      expect(s.world.terrainTags['1,1']).toEqual(['bosque']);
      expect(JSON.stringify(s)).toBe(pre);
    });
  });

  /* =======================================================
   * B4 — build_collapse mitigado no debe destruir la obra
   * ======================================================= */
  describe('B4 — build_collapse: mitigación exitosa conserva buildProject', () => {
    const mkProject = () => ({
      id: 'bp-test',
      position: { x: 0, y: 0 },
      startedAtTick: 0,
      progress: 40,
      required: 100,
    });

    it('mitigado (CORAJE) → buildProject se conserva y el monumento no es ruina', () => {
      const buildProject = { ...mkProject(), kind: CRAFTABLE.REFUGIO };
      const npcs = [
        makeTestNPC({ id: 'b1', position: { x: 1, y: 1 }, stats: { supervivencia: 90, socializacion: 70, proposito: 80, miedo: 10 } }),
        makeTestNPC({ id: 'b2', position: { x: 2, y: 2 }, stats: { supervivencia: 90, socializacion: 70, proposito: 80, miedo: 10 } }),
      ];
      let s = mkTestState({
        npcs,
        buildProject,
        consecutiveLowPropositoDays: 7, // dispara por prevConsec >= 7
        consecutiveHungerDays: 1, // crisis secundaria requerida (hasOtherCrisis)
        activeMessage: MESSAGE_INTENTS.CORAJE, // mitigación
        tick: 479,
      });
      s = { ...s, npcs: withFood(s.npcs, 60) }; // hunger no dispara (food > 0, consec < 10)

      const res = tickFractures(s);
      const fr = res.fractures.find((f: any) => f.type === 'build_collapse');
      expect(fr?.mitigated).toBe(true);

      // BUG HOY: el some() final no filtra mitigated → buildProject = null.
      expect(res.state.buildProject).toEqual(buildProject);
      expect(res.state.monument.phase).not.toBe('ruin');
    });

    it('control (no mitigado) → buildProject = null y monumento en ruina', () => {
      const buildProject = { ...mkProject(), kind: CRAFTABLE.REFUGIO };
      const npcs = [
        makeTestNPC({ id: 'b1', position: { x: 1, y: 1 }, stats: { supervivencia: 90, socializacion: 70, proposito: 80, miedo: 10 } }),
      ];
      let s = mkTestState({
        npcs,
        buildProject,
        consecutiveLowPropositoDays: 7,
        consecutiveHungerDays: 1,
        activeMessage: null,
        tick: 479,
      });
      s = { ...s, npcs: withFood(s.npcs, 60) };

      const res = tickFractures(s);
      expect(res.fractures.some((f: any) => f.type === 'build_collapse' && !f.mitigated)).toBe(true);
      expect(res.state.buildProject).toBeNull();
      expect(res.state.monument.phase).toBe('ruin');
    });
  });
});
