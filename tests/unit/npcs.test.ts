/**
 * Tests del shape de NPC — contrato §A4.
 *
 * No implementan drafting (Sprint 2.2/2.3) ni movimiento. Solo
 * verifican que los tipos declarados permiten round-trip JSON y que
 * las constantes de casta / linaje / arquetipo son las del diseño.
 */

import { describe, it, expect } from 'vitest';
import {
  CASTA,
  SEX,
  LINAJE,
  ARCHETYPE,
  makeTestNPC,
  type NPC,
} from '@/lib/npcs';

describe('Constantes de diseño', () => {
  it('CASTA lista los 3 estratos', () => {
    expect(Object.values(CASTA)).toEqual(['elegido', 'ciudadano', 'esclavo']);
  });

  it('SEX es binario (primigenia)', () => {
    expect(Object.values(SEX)).toEqual(['M', 'F']);
  });

  it('LINAJE lista los 8 vientos', () => {
    const linajes = Object.values(LINAJE);
    expect(linajes).toHaveLength(8);
    expect(linajes).toContain('tramuntana');
    expect(linajes).toContain('llevant');
    expect(linajes).toContain('migjorn');
    expect(linajes).toContain('ponent');
    expect(linajes).toContain('xaloc');
    expect(linajes).toContain('mestral');
    expect(linajes).toContain('gregal');
    expect(linajes).toContain('garbi');
  });

  it('ARCHETYPE lista los 8 arquetipos del drafting (decisión #2)', () => {
    const arche = Object.values(ARCHETYPE);
    expect(arche).toHaveLength(8);
    expect(arche).toContain('cazador');
    expect(arche).toContain('recolector');
    expect(arche).toContain('curandero');
    expect(arche).toContain('artesano');
    expect(arche).toContain('lider');
    expect(arche).toContain('scout');
    expect(arche).toContain('tejedor');
    expect(arche).toContain('pescador');
  });
});

describe('makeTestNPC — helper de tests', () => {
  it('produce un NPC con todos los campos obligatorios', () => {
    const n = makeTestNPC({ id: 'npc-1' });
    expect(n.id).toBe('npc-1');
    expect(n.sex).toMatch(/^[MF]$/);
    expect(Object.values(CASTA)).toContain(n.casta);
    expect(Object.values(LINAJE)).toContain(n.linaje);
    expect(n.stats.supervivencia).toBeGreaterThanOrEqual(0);
    expect(n.stats.supervivencia).toBeLessThanOrEqual(100);
    expect(n.stats.socializacion).toBeGreaterThanOrEqual(0);
    expect(n.stats.socializacion).toBeLessThanOrEqual(100);
    expect(Number.isInteger(n.position.x)).toBe(true);
    expect(Number.isInteger(n.position.y)).toBe(true);
    expect(Array.isArray(n.traits)).toBe(true);
  });
});

describe('Round-trip JSON (§A4)', () => {
  it('14 NPCs round-trip estructural', () => {
    const clan: NPC[] = [];
    for (let i = 0; i < 14; i++) {
      clan.push(
        makeTestNPC({
          id: `npc-${i}`,
          sex: i % 2 === 0 ? 'M' : 'F',
          casta: i < 4 ? CASTA.ELEGIDO : CASTA.CIUDADANO,
          linaje: i < 4 ? LINAJE.TRAMUNTANA : LINAJE.MIGJORN,
          position: { x: 10 + i, y: 20 },
        }),
      );
    }
    const after = JSON.parse(JSON.stringify(clan));
    expect(after).toEqual(clan);
  });

  it('NPC con traits preserva el array en orden canónico', () => {
    const n = makeTestNPC({
      id: 'npc-traits',
      traits: ['ojo_halcon', 'manos_recuerdan'],
    });
    const after = JSON.parse(JSON.stringify(n)) as NPC;
    expect(after.traits).toEqual(['ojo_halcon', 'manos_recuerdan']);
  });

  it('NPC sin padres acepta parents: null', () => {
    const n = makeTestNPC({ id: 'npc-fundador', parents: null });
    const after = JSON.parse(JSON.stringify(n));
    expect(after.parents).toBeNull();
  });
});

describe('Invariantes de casta (§3.2 vision-primigenia)', () => {
  it('Elegido y Ciudadano son válidos en drafting; Esclavo no', () => {
    // Drafting inicial (Sprint 2.2/2.3) nunca crea Esclavo (decisión
    // #6). Esta invariante se cubre en los tests de drafting; aquí
    // solo verificamos que makeTestNPC permite construir cualquier
    // casta porque es un helper genérico — el enforcement vive en
    // drafting.ts, no aquí.
    const e = makeTestNPC({ id: 'e', casta: CASTA.ELEGIDO });
    const c = makeTestNPC({ id: 'c', casta: CASTA.CIUDADANO });
    const es = makeTestNPC({ id: 'es', casta: CASTA.ESCLAVO });
    expect(e.casta).toBe('elegido');
    expect(c.casta).toBe('ciudadano');
    expect(es.casta).toBe('esclavo');
  });
});
