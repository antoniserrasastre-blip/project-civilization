/**
 * Tests del esqueleto de estado del mundo.
 *
 * Cubre:
 *   - Contrato §A4 de JSON puro / round-trip.
 *   - Determinismo de `initialState` (misma semilla ⇒ mismo output).
 *   - Presencia del campo `group_id` en cada NPC desde día uno.
 *   - Preparación arquitectónica para v0.3 (rival_gods existe aunque vacío).
 */

import { describe, it, expect } from 'vitest';
import { initialState } from '@/lib/world-state';

describe('initialState — shape y defaults', () => {
  it('genera 50 NPCs por defecto', () => {
    const s = initialState(42);
    expect(s.npcs).toHaveLength(50);
  });

  it('respeta npcCount custom', () => {
    const s = initialState(42, { npcCount: 20 });
    expect(s.npcs).toHaveLength(20);
  });

  it('arranca en era tribal (MVP)', () => {
    expect(initialState(42).era).toBe('tribal');
  });

  it('tutorial_active=true por defecto', () => {
    expect(initialState(42).tutorial_active).toBe(true);
  });

  it('day=0 al arrancar', () => {
    expect(initialState(42).day).toBe(0);
  });

  it('faith_points del jugador empieza en 0 (primer Elegido es gratis)', () => {
    expect(initialState(42).player_god.faith_points).toBe(0);
  });

  it('rival_gods es array vacío (v0.3 lo poblará sin refactor)', () => {
    expect(initialState(42).rival_gods).toEqual([]);
  });

  it('un solo grupo activo (Hijos de Tramuntana)', () => {
    const s = initialState(42);
    expect(s.groups).toHaveLength(1);
    expect(s.groups[0].id).toBe('tramuntana');
  });
});

describe('initialState — invariante de group_id', () => {
  // Requisito duro del Vision Document v1.1: el campo `group_id` debe
  // estar presente en cada NPC desde día uno, aunque solo haya un
  // grupo activo en MVP.
  it('todos los NPCs tienen group_id del grupo del jugador', () => {
    const s = initialState(42);
    for (const npc of s.npcs) {
      expect(npc.group_id).toBe(s.player_god.group_id);
    }
  });

  it('ningún NPC arranca como Elegido', () => {
    const s = initialState(42);
    expect(s.player_god.chosen_ones).toEqual([]);
    for (const npc of s.npcs) {
      expect(npc.gifts).toEqual([]);
    }
  });

  it('todos los NPCs iniciales arrancan vivos', () => {
    const s = initialState(42);
    expect(s.npcs.every((n) => n.alive)).toBe(true);
  });

  it('todos los NPCs iniciales son sin padres (generación fundacional)', () => {
    const s = initialState(42);
    expect(s.npcs.every((n) => n.parents.length === 0)).toBe(true);
  });

  it('todos los NPCs iniciales arrancan solteros (partner_id=null)', () => {
    const s = initialState(42);
    expect(s.npcs.every((n) => n.partner_id === null)).toBe(true);
  });

  it('next_npc_id empieza igual al recuento inicial (primer hijo será ese id)', () => {
    const s = initialState(42);
    expect(s.next_npc_id).toBe(s.npcs.length);
    const sCustom = initialState(42, { npcCount: 20 });
    expect(sCustom.next_npc_id).toBe(20);
  });
});

describe('initialState — determinismo', () => {
  it('misma seed ⇒ mismo estado byte a byte', () => {
    const a = initialState(42);
    const b = initialState(42);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('seeds distintas producen estados distintos', () => {
    const a = initialState(1);
    const b = initialState(2);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('mismas opciones + misma seed ⇒ mismo estado', () => {
    const a = initialState(42, { npcCount: 30, mapSize: 200 });
    const b = initialState(42, { npcCount: 30, mapSize: 200 });
    expect(a).toEqual(b);
  });
});

describe('initialState — round-trip JSON (§A4)', () => {
  // El contrato más crítico: el estado debe sobrevivir JSON.stringify +
  // JSON.parse sin perder información. Si esto falla, localStorage no
  // funciona y los replays se rompen.
  it('JSON.stringify + JSON.parse preserva el estado', () => {
    const original = initialState(42);
    const roundtrip = JSON.parse(JSON.stringify(original));
    expect(roundtrip).toEqual(original);
  });

  it('no contiene funciones ni referencias circulares', () => {
    const s = initialState(42);
    // Si tuviera referencias circulares, stringify lanzaría.
    expect(() => JSON.stringify(s)).not.toThrow();
  });
});

describe('initialState — rangos de stats y traits', () => {
  it('stats en [20, 80] (margen para dones y mutaciones)', () => {
    const s = initialState(42, { npcCount: 100 });
    for (const npc of s.npcs) {
      for (const key of ['fuerza', 'inteligencia', 'agilidad'] as const) {
        expect(npc.stats[key]).toBeGreaterThanOrEqual(20);
        expect(npc.stats[key]).toBeLessThanOrEqual(80);
      }
    }
  });

  it('traits en [0, 100]', () => {
    const s = initialState(42, { npcCount: 100 });
    for (const npc of s.npcs) {
      for (const key of ['ambicion', 'lealtad', 'paranoia', 'carisma'] as const) {
        expect(npc.traits[key]).toBeGreaterThanOrEqual(0);
        expect(npc.traits[key]).toBeLessThanOrEqual(100);
      }
    }
  });

  it('edades iniciales en [15, 40] años (15×365 a 40×365 días)', () => {
    const s = initialState(42, { npcCount: 100 });
    for (const npc of s.npcs) {
      expect(npc.age_days).toBeGreaterThanOrEqual(15 * 365);
      expect(npc.age_days).toBeLessThan(40 * 365);
    }
  });

  it('posiciones dentro del mapa [0, mapSize)', () => {
    const s = initialState(42, { npcCount: 100, mapSize: 50 });
    for (const npc of s.npcs) {
      expect(npc.position.x).toBeGreaterThanOrEqual(0);
      expect(npc.position.x).toBeLessThan(50);
      expect(npc.position.y).toBeGreaterThanOrEqual(0);
      expect(npc.position.y).toBeLessThan(50);
    }
  });
});
