/**
 * Ciclo solar — SSOT del tiempo (Sprint 05d, 12-06-2026).
 *
 * Dos bugs del playtest de Toni:
 *  1. "Los días no avanzan": el calendario visible leía climate.dayOfYear y el
 *     laboratorio (climate OFF) lo congelaba en Día 1 — el calendario es tiempo,
 *     no clima. Ahora deriva del tick (currentDay).
 *  2. "Las noches son eternas": el sim era nocturno desde el 50% del día y la
 *     UI lo pintaba desde el 80% — dos relojes distintos. Ahora hay UNO
 *     (lib/solar) y la noche es el ÚLTIMO 20%.
 */

import { describe, it, expect } from 'vitest';
import { solarPhase, isNightTick, currentDay, SOLAR_PHASE_BOUNDS } from '@/lib/solar';
import { TICKS_PER_DAY } from '@/lib/resources';
import { tick } from '@/lib/simulation';
import { applyAssignments } from '@/lib/dawn';
import { makeLaboratorioState } from '@/lib/laboratorio';

const T = TICKS_PER_DAY;

describe('Ciclo solar — un solo reloj con la noche al 20%', () => {
  it('las fases cubren el día entero en orden y sin huecos', () => {
    expect(SOLAR_PHASE_BOUNDS.amanecer).toEqual([0, 10]);
    expect(SOLAR_PHASE_BOUNDS.dia).toEqual([10, 70]);
    expect(SOLAR_PHASE_BOUNDS.ocaso).toEqual([70, 80]);
    expect(SOLAR_PHASE_BOUNDS.noche).toEqual([80, 100]);
  });

  it('los bordes exactos de fase caen donde dice el contrato', () => {
    expect(solarPhase(0)).toBe('amanecer');
    expect(solarPhase(Math.floor(T * 0.10) - 1)).toBe('amanecer');
    expect(solarPhase(Math.floor(T * 0.10))).toBe('dia');
    expect(solarPhase(Math.floor(T * 0.70) - 1)).toBe('dia');
    expect(solarPhase(Math.floor(T * 0.70))).toBe('ocaso');
    expect(solarPhase(Math.floor(T * 0.80) - 1)).toBe('ocaso');
    expect(solarPhase(Math.floor(T * 0.80))).toBe('noche');
    expect(solarPhase(T - 1)).toBe('noche');
    // El día siguiente reinicia el ciclo (módulo limpio).
    expect(solarPhase(T)).toBe('amanecer');
  });

  it('la noche es exactamente el 20% del día (antes: el 50%)', () => {
    let nocturnos = 0;
    for (let t = 0; t < T; t++) if (isNightTick(t)) nocturnos++;
    expect(nocturnos).toBe(Math.floor(T * 0.2));
    // El tick del 60% del día era "noche" con el reloj viejo; ya no lo es.
    expect(isNightTick(Math.floor(T * 0.6))).toBe(false);
  });

  it('currentDay deriva del tick: 1-based y avanza cada TICKS_PER_DAY', () => {
    expect(currentDay(0)).toBe(1);
    expect(currentDay(T - 1)).toBe(1);
    expect(currentDay(T)).toBe(2);
    expect(currentDay(5 * T + 3)).toBe(6);
  });
});

describe('Ciclo solar — el calendario no es clima (bug "los días no avanzan")', () => {
  it('en el laboratorio (climate OFF) el día del tick avanza aunque dayOfYear esté congelado', () => {
    let s = makeLaboratorioState(1);
    const dayOfYearInicial = s.climate.dayOfYear;
    // Dos amaneceres completos.
    for (let cruce = 0; cruce < 2; cruce++) {
      let guard = 0;
      while (s.phase !== 'preparation') {
        s = tick(s);
        if (++guard > T + 5) throw new Error('la máquina de fases no pausó');
      }
      s = applyAssignments(s, {});
    }
    // El clima sigue congelado (flag OFF — comportamiento esperado del lab)...
    expect(s.climate.dayOfYear).toBe(dayOfYearInicial);
    // ...pero el calendario del jugador SÍ avanzó: día 3 al amanecer del 2º cruce.
    expect(currentDay(s.tick)).toBe(3);
    expect(s.dawnReport!.day).toBe(1); // el informe del día 1, coherente con su contrato
  });
});
