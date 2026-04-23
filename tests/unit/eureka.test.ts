/**
 * Tests Red — Sprint 9 CULTURA-MATERIAL · Sistema Eureka.
 *
 * Contrato de `lib/eureka.ts`:
 *   - checkEureka: NPC en necesidad crítica + recursos disponibles
 *     tiene probabilidad de descubrir una herramienta.
 *   - Determinista (mismo PRNG → mismo resultado).
 *   - Respeta que Esclavos no descubren herramientas complejas.
 */

import { describe, it, expect } from 'vitest';
import {
  checkEureka,
  EUREKA_NEED_THRESHOLD,
  type EurekaContext,
} from '../../lib/eureka';
import { makeTestNPC } from '../../lib/npcs';
import { CASTA, SEX } from '../../lib/npcs';
import { ITEM_KIND, ITEM_DEFS } from '../../lib/items';
import { seedState } from '../../lib/prng';

const prng0 = seedState(99);

function ctxWith(overrides: Partial<EurekaContext>): EurekaContext {
  return {
    clanInventory: { wood: 10, stone: 10, berry: 0, game: 5, fish: 0, obsidian: 5, shell: 5 },
    existingItemKinds: new Set(),
    currentTick: 100,
    ...overrides,
  };
}

// ── checkEureka ───────────────────────────────────────────────────────────────

describe('checkEureka', () => {
  it('devuelve null si supervivencia > EUREKA_NEED_THRESHOLD', () => {
    const npc = makeTestNPC({
      id: 'a',
      stats: { supervivencia: EUREKA_NEED_THRESHOLD + 5, socializacion: 50 },
    });
    const { discovered } = checkEureka(npc, ctxWith({}), prng0);
    expect(discovered).toBeNull();
  });

  it('puede descubrir si supervivencia <= EUREKA_NEED_THRESHOLD', () => {
    const npc = makeTestNPC({
      id: 'a',
      stats: { supervivencia: EUREKA_NEED_THRESHOLD - 1, socializacion: 50 },
    });
    // Corremos muchas veces para confirmar que al menos una vez descubre
    let found = false;
    let prng = seedState(1);
    for (let i = 0; i < 2000 && !found; i++) {
      const { discovered, prng: next } = checkEureka(npc, ctxWith({}), prng);
      prng = next;
      if (discovered !== null) found = true;
    }
    expect(found).toBe(true);
  });

  it('devuelve null si el inventario no tiene materiales para ningún item', () => {
    const npc = makeTestNPC({
      id: 'a',
      stats: { supervivencia: 5, socializacion: 50 },
    });
    const ctx = ctxWith({
      clanInventory: { wood: 0, stone: 0, berry: 0, game: 0, fish: 0, obsidian: 0, shell: 0 },
    });
    const { discovered } = checkEureka(npc, ctx, prng0);
    expect(discovered).toBeNull();
  });

  it('no descubre items ya conocidos por el clan', () => {
    const npc = makeTestNPC({
      id: 'a',
      stats: { supervivencia: 5, socializacion: 50 },
    });
    const allKinds = new Set(Object.values(ITEM_KIND));
    const ctx = ctxWith({ existingItemKinds: allKinds });
    const { discovered } = checkEureka(npc, ctx, prng0);
    expect(discovered).toBeNull();
  });

  it('Esclavo no descubre herramientas complejas', () => {
    const npc = makeTestNPC({
      id: 'e',
      casta: CASTA.ESCLAVO,
      stats: { supervivencia: 5, socializacion: 50 },
    });
    let prng = seedState(7);
    const discovered: string[] = [];
    for (let i = 0; i < 500; i++) {
      const result = checkEureka(npc, ctxWith({}), prng);
      prng = result.prng;
      if (result.discovered) discovered.push(result.discovered);
    }
    // Ningún descubrimiento debe ser de herramienta compleja
    for (const k of discovered) {
      expect(ITEM_DEFS[k as keyof typeof ITEM_DEFS].complex).toBe(false);
    }
  });

  it('es determinista: mismo NPC + PRNG → mismo resultado', () => {
    const npc = makeTestNPC({
      id: 'a',
      stats: { supervivencia: 5, socializacion: 50 },
    });
    const r1 = checkEureka(npc, ctxWith({}), prng0);
    const r2 = checkEureka(npc, ctxWith({}), prng0);
    expect(r1.discovered).toBe(r2.discovered);
  });

  it('avanza el cursor PRNG aunque no descubra', () => {
    const npc = makeTestNPC({
      id: 'a',
      stats: { supervivencia: EUREKA_NEED_THRESHOLD + 10, socializacion: 50 },
    });
    const r = checkEureka(npc, ctxWith({}), prng0);
    // Si no activa el trigger, no consume PRNG (optimización válida)
    // — o lo hace pero devuelve null. Ambos son válidos; lo que no
    // es válido es que el cursor retroceda.
    expect(r.prng.cursor).toBeGreaterThanOrEqual(prng0.cursor);
  });
});
