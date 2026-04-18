/**
 * Tests de multi-grupo — Sprint 9 (v0.3).
 *
 * Verifica que con `playerGroupId`:
 *   - Hay 3 grupos activos con nombres baleares.
 *   - Los NPCs se reparten equilibradamente.
 *   - Cada grupo arranca clustered en su centro territorial.
 *   - rival_gods contiene los 2 no-jugador con profile 'passive'.
 *   - El highlight del tutorial es del grupo del jugador.
 *   - JSON round-trip y determinismo se preservan.
 */

import { describe, it, expect } from 'vitest';
import { initialState, GROUPS } from '@/lib/world-state';

describe('multi-grupo — estado inicial', () => {
  it('con playerGroupId="tramuntana" hay 3 grupos activos', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    expect(s.groups).toHaveLength(3);
    expect(s.groups.map((g) => g.id).sort()).toEqual([
      'llevant',
      'migjorn',
      'tramuntana',
    ]);
  });

  it('sin playerGroupId, modo compat (1 grupo, 50 NPCs)', () => {
    const s = initialState(42);
    expect(s.groups).toHaveLength(1);
    expect(s.npcs).toHaveLength(50);
  });

  it('por defecto en multi-grupo son 12 NPCs por grupo = 36 totales', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    expect(s.npcs).toHaveLength(36);
    for (const g of GROUPS) {
      const count = s.npcs.filter((n) => n.group_id === g.id).length;
      expect(count).toBe(12);
    }
  });

  it('el jugador mantiene su grupo; rival_gods son los otros 2 con profile passive', () => {
    const s = initialState(42, { playerGroupId: 'llevant' });
    expect(s.player_god.group_id).toBe('llevant');
    expect(s.rival_gods).toHaveLength(2);
    for (const r of s.rival_gods) {
      expect(['tramuntana', 'migjorn']).toContain(r.group_id);
      expect(r.profile).toBe('passive');
      expect(r.chosen_ones).toEqual([]);
      expect(r.faith_points).toBe(0);
    }
  });

  it('los NPCs arrancan clustered cerca del centro de su grupo', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    for (const npc of s.npcs) {
      const group = GROUPS.find((g) => g.id === npc.group_id)!;
      const dx = Math.abs(npc.position.x - group.center.x);
      const dy = Math.abs(npc.position.y - group.center.y);
      // Jitter de 18u/2 = 9u de cada lado del centro → margen de 10.
      expect(dx).toBeLessThanOrEqual(10);
      expect(dy).toBeLessThanOrEqual(10);
    }
  });

  it('tutorial_highlight_id es del grupo del jugador', () => {
    const s = initialState(42, { playerGroupId: 'migjorn' });
    const highlight = s.npcs.find((n) => n.id === s.tutorial_highlight_id);
    expect(highlight).toBeDefined();
    expect(highlight?.group_id).toBe('migjorn');
  });

  it('JSON round-trip en modo multi-grupo', () => {
    const s = initialState(42, { playerGroupId: 'tramuntana' });
    const rt = JSON.parse(JSON.stringify(s));
    expect(rt).toEqual(s);
  });

  it('determinismo: misma seed + playerGroupId ⇒ mismo estado byte a byte', () => {
    const a = initialState(42, { playerGroupId: 'tramuntana' });
    const b = initialState(42, { playerGroupId: 'tramuntana' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('cambiar playerGroupId cambia rival_gods y highlight', () => {
    const a = initialState(42, { playerGroupId: 'tramuntana' });
    const b = initialState(42, { playerGroupId: 'llevant' });
    expect(a.player_god.group_id).not.toBe(b.player_god.group_id);
    expect(JSON.stringify(a.rival_gods)).not.toBe(JSON.stringify(b.rival_gods));
  });
});
