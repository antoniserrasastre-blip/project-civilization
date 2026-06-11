/**
 * obraPendiente — Sprint 05e "La cara y el horizonte" (12-06-2026).
 *
 * El playtest: "Construcción falló 3 días con 'sin-obra-pendiente' y no hay
 * forma desde la UI de saberlo ANTES de asignar". Este helper puro es lo que
 * el panel de designios pinta: obra activa, o la siguiente con sus faltantes,
 * o nada que construir.
 */

import { describe, it, expect } from 'vitest';
import { obraPendiente } from '@/lib/simulation';
import { makeLaboratorioState } from '@/lib/laboratorio';
import { CRAFTABLE, RECIPES } from '@/lib/crafting';
import type { GameState } from '@/lib/game-state';
import type { Structure } from '@/lib/structures';

const lab = (): GameState => makeLaboratorioState(1);

/** Estructura mínima construida del kind dado (solo lo que el helper lee). */
function st(kind: string, i: number): Structure {
  return {
    id: `st-${kind}-${i}`,
    kind,
    position: { x: 1 + i, y: 1 },
    builtAtTick: 0,
  } as unknown as Structure;
}

describe('obraPendiente — el panel deja de ser un formulario a ciegas', () => {
  it('con buildProject activo → tipo activa con su progreso', () => {
    const s = lab();
    const conObra: GameState = {
      ...s,
      buildProject: {
        id: 'bp-x',
        kind: CRAFTABLE.FOGATA_PERMANENTE,
        position: { x: 2, y: 2 },
        startedAtTick: 0,
        progress: 120,
        required: 480,
      },
    };
    expect(obraPendiente(conObra)).toEqual({
      tipo: 'activa',
      kind: CRAFTABLE.FOGATA_PERMANENTE,
      progreso: 120,
      requerido: 480,
    });
  });

  it('sin obra y sin estructuras → siguiente = fogata, faltantes = lo que la receta pida menos lo que el clan lleva', () => {
    const s = lab();
    const r = obraPendiente(s);
    if (r.tipo !== 'siguiente') throw new Error(`esperaba 'siguiente', llegó '${r.tipo}'`);
    expect(r.kind).toBe(CRAFTABLE.FOGATA_PERMANENTE);
    // Coherencia contable contra la receta real (sin pinear cantidades del
    // draft, que son lotería): faltante = max(0, receta - inventario clan).
    for (const [k, falta] of Object.entries(r.faltantes)) {
      const receta = RECIPES[CRAFTABLE.FOGATA_PERMANENTE].inputs[k as never] ?? 0;
      expect(falta).toBeGreaterThan(0);
      expect(falta).toBeLessThanOrEqual(receta);
    }
  });

  it('faltantes vacío ⟺ construible ya (materiales en mano)', () => {
    const s = lab();
    const forrado: GameState = {
      ...s,
      npcs: s.npcs.map((n, i) =>
        i === 0 ? { ...n, inventory: { ...n.inventory, wood: 20, stone: 20, game: 5 } } : n,
      ),
    };
    const r = obraPendiente(forrado);
    if (r.tipo !== 'siguiente') throw new Error(`esperaba 'siguiente', llegó '${r.tipo}'`);
    expect(r.faltantes).toEqual({});
  });

  it('con los 5 crafteables construidos → tipo nada (construcción no tiene objeto)', () => {
    const s = lab();
    const todo: GameState = {
      ...s,
      structures: [
        st(CRAFTABLE.FOGATA_PERMANENTE, 0),
        st(CRAFTABLE.STOCKPILE_WOOD, 1),
        st(CRAFTABLE.STOCKPILE_STONE, 2),
        st(CRAFTABLE.DESPENSA, 3),
        st(CRAFTABLE.REFUGIO, 4),
      ],
    };
    expect(obraPendiente(todo)).toEqual({ tipo: 'nada' });
  });

  it('§A4: puro — no muta el estado y es determinista', () => {
    const s = lab();
    const antes = JSON.stringify(s);
    const r1 = obraPendiente(s);
    const r2 = obraPendiente(s);
    expect(JSON.stringify(s)).toBe(antes);
    expect(r1).toEqual(r2);
  });
});
