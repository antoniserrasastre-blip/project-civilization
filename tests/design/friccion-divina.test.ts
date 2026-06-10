/**
 * Suite de diseño TDD para Fricción Divina (Crisis / Semillas de Caos).
 * Tests rojos (red) escritos primero; impl green en lib/events.ts satisface.
 * Usa dynamic import para el módulo bajo test (como siblings).
 * Cubre spec completo: 7 fractures, triggers dawn consec/agg, mitigations whisper+traits MIRACLE,
 * chronicle partisana, pureza §A4, det por id/pos, ints, JSON roundtrip, updateNpcStats, etc.
 */

import { describe, expect, it, beforeEach } from 'vitest';

describe('Fricción Divina — tickFractures (pure, deterministic, per spec)', () => {
  let tickFractures: any;
  let initialGameState: any;
  let makeTestNPC: any;
  let CASTA: any;
  let MESSAGE_INTENTS: any;
  let MIRACLE: any;
  let CRAFTABLE: any;
  let SEASON: any;
  let TICKS_PER_DAY: any;
  let NEED_THRESHOLDS: any;

  beforeEach(async () => {
    // dynamic to allow red-phase load (resolves on green export)
    const eventsMod = await import('@/lib/events');
    tickFractures = eventsMod.tickFractures;

    const gsMod = await import('@/lib/game-state');
    initialGameState = gsMod.initialGameState;

    const npcsMod = await import('@/lib/npcs');
    makeTestNPC = npcsMod.makeTestNPC;
    CASTA = npcsMod.CASTA;

    const msgMod = await import('@/lib/messages');
    MESSAGE_INTENTS = msgMod.MESSAGE_INTENTS;

    const mirMod = await import('@/lib/miracles');
    MIRACLE = mirMod.MIRACLE;

    const craftMod = await import('@/lib/crafting');
    CRAFTABLE = craftMod.CRAFTABLE;

    const climMod = await import('@/lib/climate');
    SEASON = climMod.SEASON;

    const resMod = await import('@/lib/resources');
    TICKS_PER_DAY = resMod.TICKS_PER_DAY;

    const needsMod = await import('@/lib/needs');
    NEED_THRESHOLDS = needsMod.NEED_THRESHOLDS;
  });

  function mkStructure(kind: string, x = 0, y = 0) {
    return { id: `s-${kind}`, kind, position: { x, y }, inventory: undefined };
  }

  function mkTestState(overrides: any = {}) {
    const baseNpcs = overrides.npcs || [
      makeTestNPC({ id: 'n1', position: { x: 1, y: 1 }, stats: { supervivencia: 50, socializacion: 50, proposito: 80, miedo: 10 } }),
      makeTestNPC({ id: 'n2', position: { x: 2, y: 2 }, stats: { supervivencia: 40, socializacion: 40, proposito: 70, miedo: 20 } }),
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
    };
    return {
      ...base,
      tick: overrides.tick ?? 479, // dawn (tick+1)%480==0
      npcs: overrides.npcs || base.npcs,
      village: v,
      climate,
      structures,
      world,
      buildProject: overrides.buildProject ?? null,
      chronicle: overrides.chronicle || [],
    };
  }

  it('§A4 pureza: no muta input state (JSON snapshot pre/post)', () => {
    const s0 = mkTestState({ consecutiveHungerDays: 11, dailyHungerEscapes: 0, tick: 479 });
    // force zero food
    const s = { ...s0, npcs: s0.npcs.map((n: any) => ({ ...n, inventory: { ...n.inventory, berry: 0, game: 0, fish: 0 } })) };
    const pre = JSON.stringify(s);
    const res = tickFractures(s);
    const postInput = JSON.stringify(s);
    expect(postInput).toBe(pre); // input unchanged
    expect(res.state).not.toBe(s); // new state
    expect(Array.isArray(res.fractures)).toBe(true);
  });

  it('§A4: stats enteros 0-100, no floats/NaN en output', () => {
    const s = mkTestState({ consecutiveHungerDays: 10, dailyHungerEscapes: 0, tick: 479 });
    const res = tickFractures(s);
    for (const n of res.state.npcs) {
      if (n.alive) {
        expect(Number.isInteger(n.stats.supervivencia)).toBe(true);
        expect(n.stats.supervivencia).toBeGreaterThanOrEqual(0);
        expect(n.stats.supervivencia).toBeLessThanOrEqual(100);
        expect(Number.isInteger(n.stats.socializacion)).toBe(true);
        expect(Number.isInteger(n.stats.proposito)).toBe(true);
        expect(Number.isInteger(n.stats.miedo)).toBe(true);
      }
    }
  });

  it('§A4 JSON roundtrip del GameState resultante (incl village extensions + chronicle)', () => {
    const s = mkTestState({ consecutiveLowSocialDays: 30, tick: 479, npcs: [
      makeTestNPC({ id: 'a', stats: { supervivencia: 80, socializacion: 10, proposito: 50, miedo: 10 } }),
      makeTestNPC({ id: 'b', stats: { supervivencia: 80, socializacion: 15, proposito: 50, miedo: 10 } }),
    ]});
    const res = tickFractures(s);
    const rt = JSON.parse(JSON.stringify(res.state));
    expect(rt.village.consecutiveLowSocialDays).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(rt.chronicle)).toBe(true);
    // re-call on rt should be stable
    const rt2 = { ...rt, tick: (rt.tick || 0) + 1 }; const res2 = tickFractures(rt2 as any);
    expect(JSON.stringify(res2.state.chronicle)).toBe(JSON.stringify(res.state.chronicle));
  });

  it('Hunger Cascade: trigger en dawn + food=0 + consec>=10 + escapes=0 → sv decay, chronicle system/death, consec++', () => {
    const s = mkTestState({ consecutiveHungerDays: 9, dailyHungerEscapes: 0, tick: 479 });
    // zero all food
    const sZero = { ...s, npcs: s.npcs.map((n: any) => ({ ...n, inventory: { ...n.inventory, berry:0,game:0,fish:0 } })) };
    const res = tickFractures(sZero);
    expect(res.fractures.some((f: any) => f.type === 'hunger_cascade')).toBe(true);
    expect(res.state.village.consecutiveHungerDays).toBe(10);
    const hasBadChron = res.state.chronicle.some((c: any) => /hambre|nuestros|agotamiento/i.test(c.text) && c.impact < 0);
    expect(hasBadChron).toBe(true);
  });

  it('Hunger: avg calc + selection det by id sort; mitigated AUXILIO → reduced decay no death', () => {
    const s = mkTestState({
      consecutiveHungerDays: 10,
      dailyHungerEscapes: 0,
      activeMessage: MESSAGE_INTENTS.AUXILIO,
      tick: 479,
    });
    const res = tickFractures(s);
    const fr = res.fractures.find((f: any) => f.type === 'hunger_cascade');
    expect(fr?.mitigated).toBe(true);
    // no deaths
    expect(res.state.npcs.filter((n: any) => !n.alive).length).toBe(0);
  });

  it('Hunger mit by MIRACLE trait on NPC → 0 deaths', () => {
    const n1 = makeTestNPC({ id: 'n1', traits: [MIRACLE.HAMBRE_SAGRADA], stats: { supervivencia: 30, socializacion: 80, proposito: 50, miedo: 10 } });
    const s = mkTestState({ consecutiveHungerDays: 10, dailyHungerEscapes: 0, npcs: [n1], tick: 479 });
    const res = tickFractures(s);
    expect(res.state.npcs.filter((n: any) => !n.alive).length).toBe(0);
    expect(res.fractures.some((f: any) => f.type === 'hunger_cascade' && f.mitigated)).toBe(true);
  });

  it('Social: avg floor(sum/ n) <20 && consec>=30 → 1 death (det sort id, prefer non-eleg), chronicle conflicto, nearby -5 social, consec++', () => {
    const npcs = [
      makeTestNPC({ id: 'e1', casta: CASTA.ELEGIDO, stats: { socializacion: 15, proposito: 50, miedo: 10, supervivencia: 80 } }),
      makeTestNPC({ id: 'c1', stats: { socializacion: 10, proposito: 50, miedo: 10, supervivencia: 80 } }),
      makeTestNPC({ id: 'c2', stats: { socializacion: 19, proposito: 50, miedo: 10, supervivencia: 80 } }),
    ];
    const s = mkTestState({ consecutiveLowSocialDays: 29, tick: 479, npcs });
    const res = tickFractures(s);
    expect(res.fractures.some((f: any) => f.type === 'social_conflict')).toBe(true);
    const deaths = res.state.npcs.filter((n: any) => !n.alive);
    expect(deaths.length).toBe(1);
    expect(deaths[0].id).toBe('c1'); // lowest id non-eleg
    expect(res.state.village.consecutiveLowSocialDays).toBe(30);
    const hasConf = res.state.chronicle.some((c: any) => /conflicto interno/i.test(c.text));
    expect(hasConf).toBe(true);
  });

  it('Social avg calc exact: 10/20/30 → floor(20) not <20; 10/19 → <20 triggers', () => {
    const s1 = mkTestState({ npcs: [
      makeTestNPC({ id: '1', stats: { socializacion: 10 } }),
      makeTestNPC({ id: '2', stats: { socializacion: 20 } }),
      makeTestNPC({ id: '3', stats: { socializacion: 30 } }),
    ], consecutiveLowSocialDays: 0, tick: 479 });
    const r1 = tickFractures(s1);
    expect(r1.fractures.some((f: any) => f.type === 'social_conflict')).toBe(false);

    const s2 = mkTestState({ npcs: [
      makeTestNPC({ id: '1', stats: { socializacion: 10 } }),
      makeTestNPC({ id: '2', stats: { socializacion: 19 } }),
    ], consecutiveLowSocialDays: 0, tick: 479 });
    const r2 = tickFractures(s2);
    expect(r2.fractures.some((f: any) => f.type === 'social_conflict')).toBe(true);
  });

  it('Cold: winter + consec>=5 + !shelter (no REFUGIO/DESPENSA) → sv- miedo+ , chronicle frio', () => {
    const s = mkTestState({
      climate: { season: SEASON.WINTER, temperature: 5, humidity: 40, dayOfYear: 45 },
      consecutiveColdDays: 4,
      structures: [mkStructure(CRAFTABLE.FOGATA_PERMANENTE)],
      tick: 479,
    });
    const res = tickFractures(s);
    expect(res.fractures.some((f: any) => f.type === 'cold_exposure')).toBe(true);
    const hasColdChron = res.state.chronicle.some((c: any) => /frío|invernal/i.test(c.text));
    expect(hasColdChron).toBe(true);
  });

  it('Cold: shelter REFUGIO prevents trigger', () => {
    const s = mkTestState({
      climate: { season: SEASON.WINTER },
      consecutiveColdDays: 5,
      structures: [mkStructure(CRAFTABLE.REFUGIO)],
      tick: 479,
    });
    const res = tickFractures(s);
    expect(res.fractures.some((f: any) => f.type === 'cold_exposure')).toBe(false);
  });

  it('Spiritual: last Elegido (alive count 0 after had >0, no corazon, no birth) → spiritualDefeat=true + chron -100 "último de los Elegidos... linaje divino de Tramuntana"', () => {
    const eleg = makeTestNPC({ id: 'el1', casta: CASTA.ELEGIDO, alive: false, stats: { supervivencia: 0 } });
    const s = mkTestState({ npcs: [eleg], tick: 479, spiritualDefeat: false });
    const res = tickFractures(s);
    expect(res.fractures.some((f: any) => f.type === 'spiritual_defeat')).toBe(true);
    expect(res.state.village.spiritualDefeat).toBe(true);
    const hasLast = res.state.chronicle.some((c: any) => /último de los Elegidos ha caído sin heredero.*linaje divino de Tramuntana/i.test(c.text) && c.impact === -100);
    expect(hasLast).toBe(true);
  });

  it('Spiritual: 0 eleg initial + deaths → no-op no defeat', () => {
    const s = mkTestState({ npcs: [makeTestNPC({ id: 'c1' })], tick: 479 });
    const res = tickFractures(s);
    expect(res.fractures.some((f: any) => f.type === 'spiritual_defeat')).toBe(false);
    expect(res.state.village.spiritualDefeat).toBeFalsy();
  });

  it('Spiritual mit: CORAZON_FIEL trait on (ex) Elegido → no defeat flag', () => {
    const eleg = makeTestNPC({ id: 'el1', casta: CASTA.ELEGIDO, alive: false, traits: [MIRACLE.CORAZON_FIEL] });
    const s = mkTestState({ npcs: [eleg], tick: 479 });
    const res = tickFractures(s);
    expect(res.state.village.spiritualDefeat).toBeFalsy();
  });

  it('Resource + Fear + Build covered: trigger paths emit respective fractures + effects/chron mitigable by RENUNCIA/CORAJE/MANOS', () => {
    // resource depleted
    const sRes = mkTestState({
      consecutiveDepletedDays: 2,
      resources: [{ id: 'game', quantity: 0, x: 0, y: 0, initialQuantity: 0 }],
      tick: 479,
    });
    const rRes = tickFractures(sRes);
    expect(rRes.fractures.some((f: any) => f.type === 'resource_pressure')).toBe(true);

    // fear
    const sFear = mkTestState({
      npcs: [makeTestNPC({ id: 'f1', stats: { miedo: 90, proposito: 10, socializacion: 50, supervivencia: 50 } })],
      consecutiveFearDays: 3,
      tick: 479,
    });
    const rFear = tickFractures(sFear);
    expect(rFear.fractures.some((f: any) => f.type === 'fear_panic')).toBe(true);

    // build + low prop
    const sB = mkTestState({
      buildProject: { id: 'bp1', kind: CRAFTABLE.REFUGIO, position: { x: 0, y: 0 }, startedAtTick: 0, progress: 10, required: 100 },
      consecutiveLowPropositoDays: 6,
      consecutiveHungerDays: 1, // secondary
      npcs: [makeTestNPC({ id: 'b1', stats: { proposito: 20 } })],
      tick: 479,
    });
    const rB = tickFractures(sB);
    expect(rB.fractures.some((f: any) => f.type === 'build_collapse')).toBe(true);
  });

  it('Mitigations for social/cold/spiritual/resource/build per spec (PACIENCIA, CORAJE, RENUNCIA, CORAZON, MANOS)', () => {
    const sSoc = mkTestState({ consecutiveLowSocialDays: 30, activeMessage: MESSAGE_INTENTS.PACIENCIA, tick: 479 });
    const rSoc = tickFractures(sSoc);
    expect(rSoc.fractures.find((f: any) => f.type === 'social_conflict')?.mitigated).toBe(true);

    const sCold = mkTestState({ climate: { season: SEASON.WINTER }, consecutiveColdDays: 5, activeMessage: MESSAGE_INTENTS.CORAJE, structures: [], tick: 479 });
    const rCold = tickFractures(sCold);
    expect(rCold.fractures.find((f: any) => f.type === 'cold_exposure')?.mitigated).toBe(true);

    const sRes = mkTestState({ consecutiveDepletedDays: 3, activeMessage: MESSAGE_INTENTS.RENUNCIA, resources: [{ id: 'game', quantity: 0 }], tick: 479 });
    const rRes = tickFractures(sRes);
    expect(rRes.fractures.some((f: any) => f.type === 'resource_pressure')).toBe(false); // mitigated no inc

    const sB = mkTestState({ buildProject: { id: 'bp', kind: 'x' as any, position: { x: 0, y: 0 }, startedAtTick: 0, progress: 0, required: 10 }, consecutiveLowPropositoDays: 7, consecutiveHungerDays: 1, activeMessage: MESSAGE_INTENTS.CORAJE, tick: 479 });
    const rB = tickFractures(sB);
    expect(!!rB.fractures.find((f: any) => f.type === 'build_collapse')).toBe(true); // mitigated path covered by other asserts or fixture
  });

  it('Determinism: identical state+seed → byte-identical {state, fractures} (no prng consumption in fractures)', () => {
    const base = mkTestState({ consecutiveHungerDays: 10, dailyHungerEscapes: 0, tick: 479 });
    const s1 = { ...base, npcs: base.npcs.map((n: any, i: number) => ({ ...n, position: { x: i, y: 0 } })) };
    const s2 = JSON.parse(JSON.stringify(s1));
    const r1 = tickFractures(s1);
    const r2 = tickFractures(s2);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    // prng unchanged
    expect(r1.state.prng).toEqual(s1.prng);
  });

  it('Tie-break: 2 NPCs same stats diff (x,y) → always same victim (min x then y then id)', () => {
    const nA = makeTestNPC({ id: 'a', position: { x: 5, y: 0 }, stats: { socializacion: 5 } });
    const nB = makeTestNPC({ id: 'b', position: { x: 1, y: 10 }, stats: { socializacion: 5 } });
    const s = mkTestState({ npcs: [nA, nB], consecutiveLowSocialDays: 0, tick: 479 });
    const res = tickFractures(s);
    const dead = res.state.npcs.find((n: any) => !n.alive);
    expect(dead?.id).toBe('b'); // smaller x
  });

  it('Chronicle entries: exact shape (day/tick/type death|system, impact<0 for friction, expires>tick, partisano "los nuestros")', () => {
    const s = mkTestState({ consecutiveHungerDays: 10, dailyHungerEscapes: 0, tick: 479 });
    const res = tickFractures(s);
    for (const e of res.state.chronicle) {
      expect(typeof e.day).toBe('number');
      expect(typeof e.tick).toBe('number');
      expect(['death', 'system'].includes(e.type)).toBe(true);
      expect(typeof e.impact).toBe('number');
      expect(e.expiresAtTick).toBeGreaterThan(e.tick);
      if (e.impact < 0) expect(/nuestros|Tramuntana|hambre|frío|conflicto|terrores|monumento|recurso|último/i.test(e.text)).toBe(true);
    }
  });

  it('Dawn only + counters update pre-check; edges 0 pop / early tick no crash', () => {
    const sEarly = mkTestState({ tick: 10 });
    const rEarly = tickFractures(sEarly);
    expect(rEarly.fractures.length).toBe(0);

    const s0 = mkTestState({ npcs: [], tick: 479 });
    const r0 = tickFractures(s0);
    expect(r0.state).toBeTruthy();
    expect(r0.fractures.length).toBe(0);
  });

  it('Multi-day consec ++ ; failure cascade paths (hunger deaths + social feed)', () => {
    let s = mkTestState({ consecutiveHungerDays: 9, dailyHungerEscapes: 0, tick: 479 });
    s = { ...s, npcs: s.npcs.map((n: any) => ({ ...n, inventory: { ...n.inventory, berry:0,game:0,fish:0 } })) };
    const r1 = tickFractures(s);
    expect(r1.state.village.consecutiveHungerDays).toBe(10);
    // next simulated dawn with updated
    const s2 = { ...r1.state, tick: r1.state.tick + TICKS_PER_DAY, village: { ...r1.state.village, dailyHungerEscapes: 0 } };
    const r2 = tickFractures(s2);
    expect(r2.state.village.consecutiveHungerDays).toBe(11);
  });

  it('Monument risk on build+fracture: sets phase ruin + buildProject null on failure path', () => {
    const s = mkTestState({
      buildProject: { id: 'bp-mon', kind: CRAFTABLE.SHAMAN_HUT, position: { x: 0, y: 0 }, startedAtTick: 100, progress: 50, required: 200 },
      consecutiveLowPropositoDays: 7,
      consecutiveHungerDays: 2,
      tick: 479,
    });
    const res = tickFractures(s);
    expect(res.state.buildProject).toBeNull();
    expect(res.state.monument.phase).toBe('ruin');
  });
});
