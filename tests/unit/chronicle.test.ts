/**
 * Tests de la crónica partisana — Sprint 3.4.
 *
 * Plantillas string con voz "los nuestros" / "los hijos de X"
 * (§9 vision madre). Sin LLM aún — eso llega post-primigenia.
 * Determinismo puro: mismo evento → mismo texto.
 */

import { describe, it, expect } from 'vitest';
import { narrate, type ChronicleEvent } from '@/lib/chronicle';

describe('narrate — plantillas partisanas', () => {
  it('evento move_toward_food con baya → "los nuestros cazan..."', () => {
    const ev: ChronicleEvent = {
      type: 'move_toward_food',
      npcName: 'Aina',
      resourceKind: 'berry',
      position: { x: 10, y: 10 },
      tick: 50,
    };
    const s = narrate(ev);
    expect(s).toMatch(/los (nuestros|hijos)/i);
    expect(s.toLowerCase()).toContain('baya');
  });

  it('evento discovered_resource narra descubrimiento', () => {
    const ev: ChronicleEvent = {
      type: 'discovered_resource',
      npcName: 'Mateu',
      resourceKind: 'water',
      position: { x: 5, y: 5 },
      tick: 12,
    };
    const s = narrate(ev);
    expect(s).toMatch(/descub/i);
    expect(s).toContain('Mateu');
  });

  it('evento death narra muerte en voz partisana', () => {
    const ev: ChronicleEvent = {
      type: 'death',
      npcName: 'Bartomeu',
      cause: 'hambre',
      tick: 300,
    };
    const s = narrate(ev);
    expect(s).toMatch(/nuestro|nuestros|hermano|caído/i);
    expect(s).toContain('Bartomeu');
  });

  it('evento birth narra nacimiento', () => {
    const ev: ChronicleEvent = {
      type: 'birth',
      childName: 'Miquela',
      parents: ['Aina', 'Mateu'],
      tick: 500,
    };
    const s = narrate(ev);
    expect(s).toContain('Miquela');
    expect(s).toMatch(/nació|hija|hijo|nuev/i);
  });

  it('evento migration narra movimiento colectivo', () => {
    const ev: ChronicleEvent = {
      type: 'migration',
      direction: 'mestral',
      tick: 800,
    };
    const s = narrate(ev);
    expect(s.toLowerCase()).toMatch(/mestral|viento|migr/);
  });
});

describe('narrate — determinismo', () => {
  it('mismo evento → mismo texto byte-idéntico', () => {
    const ev: ChronicleEvent = {
      type: 'move_toward_food',
      npcName: 'Aina',
      resourceKind: 'berry',
      position: { x: 10, y: 10 },
      tick: 50,
    };
    expect(narrate(ev)).toBe(narrate(ev));
  });

  it('mismos tipos de evento con inputs distintos → textos distintos', () => {
    const a: ChronicleEvent = {
      type: 'death',
      npcName: 'Aina',
      cause: 'hambre',
      tick: 100,
    };
    const b: ChronicleEvent = {
      type: 'death',
      npcName: 'Mateu',
      cause: 'frío',
      tick: 200,
    };
    expect(narrate(a)).not.toBe(narrate(b));
  });
});
