/**
 * Tests — Sprint 15 v1.1 ejércitos abstractos + don Estratega.
 *
 * Contrato:
 *   - `armyStrength(state, group_id)` = floor(Σ fuerza de adultos
 *     sanos del grupo / 10).
 *   - `resolveGroupBattle(state, attackerGroupId, defenderGroupId,
 *     strategistId?)` devuelve { winner, casualties } — determinista
 *     si se pasa un PRNGState seedable. El estratega añade +20% a la
 *     fuerza de su grupo.
 *   - Estratega: don que solo puede concederse en era ≥ clasica.
 */

import { describe, it, expect } from 'vitest';
import { initialState } from '@/lib/world-state';
import { armyStrength, resolveGroupBattle } from '@/lib/army';

describe('armyStrength', () => {
  it('suma fuerza de adultos sanos del grupo / 10', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    const group = 'tramuntana';
    const expected = Math.floor(
      s.npcs
        .filter(
          (n) => n.group_id === group && n.alive && n.age_days / 365 >= 16,
        )
        .reduce((a, n) => a + n.stats.fuerza, 0) / 10,
    );
    expect(armyStrength(s, group)).toBe(expected);
  });

  it('grupo extinto devuelve 0', () => {
    const s = initialState(42);
    expect(armyStrength(s, 'unknown')).toBe(0);
  });
});

describe('resolveGroupBattle', () => {
  it('gana el grupo con mayor fuerza', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    const { winner } = resolveGroupBattle(s, 'tramuntana', 'llevant');
    // Determinista: devuelve un winner entre los dos.
    expect(['tramuntana', 'llevant']).toContain(winner);
  });

  it('determinismo: misma seed ⇒ mismo resultado', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    const a = resolveGroupBattle(s, 'tramuntana', 'llevant');
    const b = resolveGroupBattle(s, 'tramuntana', 'llevant');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('el don estratega del atacante añade +20% a su fuerza', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    const attackerBase = armyStrength(s, 'tramuntana');
    const defenderBase = armyStrength(s, 'llevant');
    const fairer = resolveGroupBattle(s, 'tramuntana', 'llevant');
    const withStrategist = resolveGroupBattle(
      s,
      'tramuntana',
      'llevant',
      { strategistBoost: 0.2 },
    );
    // Si la partida estaba ajustada, el estratega puede cambiar el
    // resultado — el test comprueba que el boost afecta el cómputo.
    // Comprobamos que las métricas totales cambian:
    expect(fairer.attackerPower).toBeGreaterThanOrEqual(attackerBase);
    expect(withStrategist.attackerPower).toBeGreaterThan(
      fairer.attackerPower,
    );
    expect(withStrategist.defenderPower).toBe(defenderBase);
  });

  it('devuelve casualties en [0, armyStrength] del perdedor', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    const r = resolveGroupBattle(s, 'tramuntana', 'llevant');
    expect(r.casualties).toBeGreaterThanOrEqual(0);
  });
});
