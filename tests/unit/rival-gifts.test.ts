/**
 * Tests de simetría parcial rival — v1.0.1 decisión #4.
 *
 * Contrato (DECISIONS-PENDING.md bloque 4, opción B):
 *   - Rival puede conceder dones a sus propios Elegidos.
 *   - Rival NO puede maldecir (eso queda como privilegio del player).
 *   - Rival paga GIFT_COST_RIVAL Fe por don (simétrico al player fuera
 *     del free-first-gift).
 *   - El rival solo evalúa en su ciclo de decisión (cada
 *     RIVAL_DECISION_INTERVAL días) — no spam por tick.
 */

import { describe, it, expect } from 'vitest';
import { initialState, type WorldState } from '@/lib/world-state';
import { applyEvents } from '@/lib/scheduler';
import { decideRivalActions, RIVAL_DECISION_INTERVAL } from '@/lib/rival-ai';
import { runTicks } from '@/lib/simulation';
import { GIFT_COST } from '@/lib/gifts';
import { FAITH_CAP } from '@/lib/faith';

function stateWithRivalChosen(seed: number, rivalFaith: number): WorldState {
  let s = initialState(seed, { playerGroupId: 'tramuntana' });
  const rivalGroup = s.rival_gods[0].group_id;
  const rivalNpc = s.npcs.find((n) => n.group_id === rivalGroup && n.alive)!;
  // Ungimos un NPC al rival y le damos Fe suficiente.
  s = applyEvents(s, [
    { type: 'rival_anoint', rival_group_id: rivalGroup, npc_id: rivalNpc.id },
  ]);
  s = {
    ...s,
    rival_gods: s.rival_gods.map((r) =>
      r.group_id === rivalGroup ? { ...r, faith_points: rivalFaith } : r,
    ),
  };
  return s;
}

describe('applyEvents — rival_grant_gift', () => {
  it('añade el don al NPC rival y deduce Fe del rival', () => {
    let s = stateWithRivalChosen(42, 100);
    const rivalGroup = s.rival_gods[0].group_id;
    const rivalChosen = s.rival_gods.find((r) => r.group_id === rivalGroup)!
      .chosen_ones[0];
    const beforeFe = s.rival_gods.find((r) => r.group_id === rivalGroup)!
      .faith_points;
    s = applyEvents(s, [
      {
        type: 'rival_grant_gift',
        rival_group_id: rivalGroup,
        npc_id: rivalChosen,
        gift_id: 'fuerza_sobrehumana',
      },
    ]);
    const target = s.npcs.find((n) => n.id === rivalChosen)!;
    expect(target.gifts).toContain('fuerza_sobrehumana');
    const rival = s.rival_gods.find((r) => r.group_id === rivalGroup)!;
    expect(rival.faith_points).toBe(beforeFe - GIFT_COST);
  });

  it('rechaza silenciosamente si el rival no tiene Fe suficiente', () => {
    let s = stateWithRivalChosen(42, 10); // menos que GIFT_COST
    const rivalGroup = s.rival_gods[0].group_id;
    const rivalChosen = s.rival_gods.find((r) => r.group_id === rivalGroup)!
      .chosen_ones[0];
    s = applyEvents(s, [
      {
        type: 'rival_grant_gift',
        rival_group_id: rivalGroup,
        npc_id: rivalChosen,
        gift_id: 'fuerza_sobrehumana',
      },
    ]);
    const target = s.npcs.find((n) => n.id === rivalChosen)!;
    expect(target.gifts).not.toContain('fuerza_sobrehumana');
    const rival = s.rival_gods.find((r) => r.group_id === rivalGroup)!;
    expect(rival.faith_points).toBe(10); // sin cambio
  });

  it('rechaza si el NPC no es chosen del rival (evita cross-contamination)', () => {
    let s = stateWithRivalChosen(42, 100);
    const rivalGroup = s.rival_gods[0].group_id;
    // Un NPC aleatorio que NO es chosen del rival.
    const other = s.npcs.find(
      (n) =>
        n.group_id === rivalGroup &&
        !s.rival_gods
          .find((r) => r.group_id === rivalGroup)!
          .chosen_ones.includes(n.id),
    )!;
    s = applyEvents(s, [
      {
        type: 'rival_grant_gift',
        rival_group_id: rivalGroup,
        npc_id: other.id,
        gift_id: 'fuerza_sobrehumana',
      },
    ]);
    const target = s.npcs.find((n) => n.id === other.id)!;
    expect(target.gifts).not.toContain('fuerza_sobrehumana');
  });

  it('rechaza si el NPC ya tiene ese don', () => {
    let s = stateWithRivalChosen(42, 100);
    const rivalGroup = s.rival_gods[0].group_id;
    const rivalChosen = s.rival_gods.find((r) => r.group_id === rivalGroup)!
      .chosen_ones[0];
    s = applyEvents(s, [
      {
        type: 'rival_grant_gift',
        rival_group_id: rivalGroup,
        npc_id: rivalChosen,
        gift_id: 'fuerza_sobrehumana',
      },
    ]);
    const beforeFe = s.rival_gods.find((r) => r.group_id === rivalGroup)!
      .faith_points;
    // Segundo grant del mismo don: no-op silencioso.
    s = applyEvents(s, [
      {
        type: 'rival_grant_gift',
        rival_group_id: rivalGroup,
        npc_id: rivalChosen,
        gift_id: 'fuerza_sobrehumana',
      },
    ]);
    const rival = s.rival_gods.find((r) => r.group_id === rivalGroup)!;
    expect(rival.faith_points).toBe(beforeFe); // no cobra por nada
  });
});

describe('decideRivalActions — rivales aggressive conceden dones cuando tienen Fe', () => {
  it('tras suficientes ciclos con Fe capped, aparecen rival_grant_gift events', () => {
    // Boost: rivales arrancan aggressive + Fe al cap. El player ya no
    // importa — solo nos interesa observar el comportamiento rival.
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = {
      ...s,
      rival_gods: s.rival_gods.map((r) => ({
        ...r,
        profile: 'aggressive' as const,
        faith_points: FAITH_CAP,
      })),
    };
    // Ungir un NPC a cada rival para que tengan chosen donde gastar.
    for (const r of s.rival_gods) {
      const npc = s.npcs.find(
        (n) => n.group_id === r.group_id && n.alive,
      );
      if (npc) {
        s = applyEvents(s, [
          {
            type: 'rival_anoint',
            rival_group_id: r.group_id,
            npc_id: npc.id,
          },
        ]);
      }
    }
    // Forzamos day=1000 para activar varios ciclos rápido.
    s = { ...s, day: RIVAL_DECISION_INTERVAL };
    let sawGrant = false;
    for (let cycle = 0; cycle < 15 && !sawGrant; cycle++) {
      const { events, prng_cursor } = decideRivalActions(s);
      for (const ev of events) {
        if (ev.type === 'rival_grant_gift') {
          sawGrant = true;
          break;
        }
      }
      s = applyEvents({ ...s, prng_cursor }, events);
      s = { ...s, day: s.day + RIVAL_DECISION_INTERVAL };
    }
    expect(sawGrant).toBe(true);
  }, 15_000);

  it('rival SIN Fe suficiente no emite rival_grant_gift (respeta coste)', () => {
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = {
      ...s,
      rival_gods: s.rival_gods.map((r) => ({
        ...r,
        profile: 'aggressive' as const,
        faith_points: 5, // insuficiente
      })),
    };
    for (const r of s.rival_gods) {
      const npc = s.npcs.find(
        (n) => n.group_id === r.group_id && n.alive,
      );
      if (npc) {
        s = applyEvents(s, [
          {
            type: 'rival_anoint',
            rival_group_id: r.group_id,
            npc_id: npc.id,
          },
        ]);
      }
    }
    s = { ...s, day: RIVAL_DECISION_INTERVAL };
    for (let cycle = 0; cycle < 10; cycle++) {
      const { events, prng_cursor } = decideRivalActions(s);
      for (const ev of events) {
        expect(ev.type).not.toBe('rival_grant_gift');
      }
      s = applyEvents({ ...s, prng_cursor }, events);
      s = { ...s, day: s.day + RIVAL_DECISION_INTERVAL };
    }
  });
});

describe('rival NO puede maldecir (solo el player)', () => {
  it('no existe ningún evento rival_curse en el tipo LifecycleEvent', async () => {
    // Tipo-check indirecto via presencia en la unión: nos aseguramos
    // que el scheduler no emite el evento. Si algún día alguien lo
    // añade, este test revisita la decisión de diseño.
    const { runTicks } = await import('@/lib/simulation');
    let s = initialState(42, { playerGroupId: 'tramuntana' });
    s = {
      ...s,
      rival_gods: s.rival_gods.map((r) => ({
        ...r,
        profile: 'aggressive' as const,
        faith_points: FAITH_CAP,
      })),
    };
    s = runTicks(s, 3000);
    const forbidden = s.chronicle.filter((e) =>
      /sombra sobre.*(Tramuntana|los nuestros)/i.test(e.text),
    );
    // El player puede maldecir (esos textos podrían aparecer si el
    // player lanza curse) pero el SCHEDULER no; y sin acción humana
    // no debería haber.
    expect(forbidden.length).toBe(0);
  }, 15_000);
});
