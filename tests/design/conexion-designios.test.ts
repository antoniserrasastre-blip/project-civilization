/**
 * Suite de diseño TDD — Sprint 05 (scope 4): CONEXIÓN — cumplimiento del
 * designio en el informe del amanecer.
 *
 * El playtest dictó: "no sientes conexión; un dios al que nadie responde es
 * un salvapantallas". Primera pasada: el informe debe decir si el clan hizo
 * LO QUE EL JUGADOR PIDIÓ.
 *
 * Contrato (decidido por el orquestador — sim-side; la prosa 2ª persona es
 * UI con plantillas deterministas, fuera de este contrato):
 *  - Las entradas de `DawnReport.npcs` ganan
 *    `cumplido: 'cumplido' | 'fallido' | null`:
 *      · null       ⟺ el NPC no tenía designio ese día.
 *      · 'cumplido' ⟺ tenía designio Y actividad > 0 en su dominio:
 *                     recoleccion→harvested, construccion→built,
 *                     exploracion→discovered.
 *      · 'fallido'  ⟺ tenía designio y actividad 0 en su dominio.
 *  - `DawnReport.clan` gana `designiosCumplidos: number` y
 *    `designiosDados: number` (dados = NPCs vivos con designio ≠ null al
 *    cierre del día).
 *  - Se calcula en el paso 'informe-amanecer' del DAWN_PIPELINE
 *    (lib/dawn.ts) — antes de reset-diario, que borra dailyActivity.
 *  - §A4: determinismo (mismo seed + mismos designios → mismo informe) y
 *    round-trip JSON sin pérdida.
 *  - Compat: solo AÑADE campos — el resto del informe no cambia.
 *
 * Los tests escriben contra el contrato futuro: los campos nuevos hoy NO
 * existen (vitest transpila sin type-check → el rojo es `undefined` en las
 * aserciones, legible test a test).
 *
 * Fixture: el Laboratorio (32×32, 4 NPCs, flags OFF — barato y determinista).
 * Seed 1 elegido tras sondear la sim real: con los designios de abajo, el
 * día 1 produce actividad > 0 en recolección y exploración, y built = 0 para
 * el NPC con designio de construcción (sin obra activa) — cada caso del
 * contrato ocurre DE VERDAD, verificado sobre campos existentes antes de
 * asertar el campo nuevo (sin tautologías).
 */

import { describe, it, expect } from 'vitest';
import { tick } from '@/lib/simulation';
import { applyAssignments, computeDawnReport, UMBRAL_CUMPLIDO } from '@/lib/dawn';
import { TICKS_PER_DAY } from '@/lib/resources';
import { makeLaboratorioState } from '@/lib/laboratorio';
import type { DawnReport, GameState } from '@/lib/game-state';
import type { AssignmentDomain } from '@/lib/npcs';

// ————————————————————————————————————————————————————————————————
// Helpers + fixture canónica
// ————————————————————————————————————————————————————————————————

/** Corre la sim hasta el anochecer (phasedMode pausa en 'preparation').
 *  Guard duro: si en TICKS_PER_DAY + 5 ticks no llegó, el loop está roto. */
function correHastaAnochecer(s: GameState): GameState {
  let guard = 0;
  while (s.phase !== 'preparation') {
    s = tick(s);
    if (++guard > TICKS_PER_DAY + 5) {
      throw new Error('nunca llegó a preparation — la máquina de fases no pausa');
    }
  }
  return s;
}

/** Dominio del designio → campo de actividad del informe (el mapa del contrato). */
const DOMINIO_A_ACTIVIDAD: Record<AssignmentDomain, 'harvested' | 'built' | 'discovered'> = {
  recoleccion: 'harvested',
  construccion: 'built',
  exploracion: 'discovered',
};

/**
 * Partida canónica: laboratorio seed 1.
 *  - Día 0 corre sin designios.
 *  - Al anochecer se asignan: npc[0]→recoleccion, npc[1]→exploracion,
 *    npc[3]→construccion (npc[2] queda SIN designio).
 *  - Día 1 corre entero con esos designios.
 *  - El segundo amanecer se cruza con asignación VACÍA a propósito: así el
 *    informe del día 1 lee los designios que estuvieron activos ese día
 *    (applyAssignments sobreescribe designios ANTES de correr el amanecer —
 *    asignar aquí contaminaría el informe con designios de mañana).
 * Devuelve el estado tras ese segundo amanecer: `dawnReport` es el del día 1.
 */
function partidaConDesignios(): GameState {
  let s = makeLaboratorioState(1);
  s = correHastaAnochecer(s); // día 0 entero
  const ids = s.npcs.map((n) => n.id);
  s = applyAssignments(s, {
    [ids[0]]: 'recoleccion',
    [ids[1]]: 'exploracion',
    [ids[3]]: 'construccion',
  });
  s = correHastaAnochecer(s); // día 1 entero, con designios
  return applyAssignments(s, {}); // amanecer: informe del día 1
}

/** Partida sin ningún designio: un solo día y su amanecer (informe del día 0). */
function partidaSinDesignios(): GameState {
  let s = makeLaboratorioState(1);
  s = correHastaAnochecer(s);
  return applyAssignments(s, {});
}

/** Entrada del informe por id, con guard (las suites no toleran undefined silencioso). */
function entrada(rep: DawnReport, id: string) {
  const e = rep.npcs.find((n) => n.id === id);
  if (!e) throw new Error(`el informe no trae al NPC ${id}`);
  return e;
}

// Cache de la partida canónica (pura y determinista → reusable entre tests).
let _canon: GameState | null = null;
function canon(): GameState {
  if (!_canon) _canon = partidaConDesignios();
  return _canon;
}

// ————————————————————————————————————————————————————————————————
// 1. Sin designio → cumplido === null
// ————————————————————————————————————————————————————————————————

describe('Conexión — cumplido es null exactamente cuando no hubo designio', () => {
  it('el NPC que pasó el día sin designio sale con cumplido === null (no "fallido")', () => {
    const s = canon();
    const rep = s.dawnReport!;
    const libre = entrada(rep, s.npcs[2].id);
    // Precondición sobre campos existentes: de verdad no tenía designio.
    expect(libre.designio).toBeNull();
    // Contrato nuevo: null, no 'fallido' ni undefined.
    expect(libre.cumplido).toBeNull();
  });
});

// ————————————————————————————————————————————————————————————————
// 2. Designio con actividad > 0 en su dominio → 'cumplido'
// ————————————————————————————————————————————————————————————————

describe('Conexión — el designio atendido se reporta como cumplido', () => {
  it('recoleccion con harvested > 0 ese día → cumplido === "cumplido"', () => {
    const s = canon();
    const rep = s.dawnReport!;
    const recolector = entrada(rep, s.npcs[0].id);
    // Preconditions sobre campos existentes (sin tautología): tenía el
    // designio Y de verdad cosechó. Si esto falla, el fixture eligió mal
    // el seed — señal real, no flaky (la sim es determinista).
    expect(recolector.designio).toBe('recoleccion');
    expect(recolector.harvested).toBeGreaterThan(0);
    expect(recolector.cumplido).toBe('cumplido');
  });

  it('exploracion con discovered > 0 ese día → cumplido === "cumplido"', () => {
    const s = canon();
    const rep = s.dawnReport!;
    const explorador = entrada(rep, s.npcs[1].id);
    expect(explorador.designio).toBe('exploracion');
    expect(explorador.discovered).toBeGreaterThan(0);
    expect(explorador.cumplido).toBe('cumplido');
  });
});

// ————————————————————————————————————————————————————————————————
// 3. Designio con actividad 0 en su dominio → 'fallido'
// ————————————————————————————————————————————————————————————————

describe('Conexión — el designio desatendido se reporta como fallido', () => {
  // Reescritos 11-06-2026 (decisión de spec 05b): la versión original dependía
  // de la sonda "seed 1, día 1: el constructor acaba con built=0", y la escasez
  // del laboratorio (05b.3) movió esa lotería de la sim. El contrato se fija
  // ahora directamente sobre computeDawnReport (pura) con la actividad montada
  // a mano — mismo contrato, sin depender del caos de la sim.
  it('construccion con built === 0 ese día → cumplido === "fallido"', () => {
    const s = canon();
    const npcs = s.npcs.map((n, i) =>
      i === 3
        ? { ...n, designio: 'construccion' as const, dailyActivity: { harvested: 0, built: 0, discovered: 0 } }
        : n,
    );
    const rep = computeDawnReport({ ...s, npcs });
    const constructor = entrada(rep, npcs[3].id);
    expect(constructor.designio).toBe('construccion');
    expect(constructor.built).toBe(0);
    expect(constructor.cumplido).toBe('fallido');
  });

  it('la actividad en OTROS dominios no salva el designio (cosechó pero su designio era construir)', () => {
    const s = canon();
    const npcs = s.npcs.map((n, i) =>
      i === 3
        ? { ...n, designio: 'construccion' as const, dailyActivity: { harvested: 12, built: 0, discovered: 7 } }
        : n,
    );
    const rep = computeDawnReport({ ...s, npcs });
    const constructor = entrada(rep, npcs[3].id);
    expect(constructor.harvested + constructor.discovered).toBeGreaterThan(0);
    expect(constructor.built).toBe(0);
    expect(constructor.cumplido).toBe('fallido');
  });
});

// ————————————————————————————————————————————————————————————————
// 4. Contadores del clan
// ————————————————————————————————————————————————————————————————

describe('Conexión — contadores del clan cuadran con las entradas', () => {
  it('designiosDados = nº de vivos con designio ≠ null al cierre (aquí: 3 de 4)', () => {
    const s = canon();
    const rep = s.dawnReport!;
    // Precondición: nadie murió — los 4 asignables siguen vivos y en el informe.
    expect(s.npcs.filter((n) => n.alive)).toHaveLength(4);
    expect(rep.npcs).toHaveLength(4);
    expect(rep.clan.designiosDados).toBe(3);
  });

  it('designiosCumplidos = nº de entradas con cumplido === "cumplido"', () => {
    const rep = canon().dawnReport!;
    const cumplidos = rep.npcs.filter((n) => n.cumplido === 'cumplido').length;
    expect(rep.clan.designiosCumplidos).toBe(cumplidos);
    // Y en esta partida sabemos que hubo al menos uno real (precondición
    // verificada en los tests de arriba sobre campos existentes).
    expect(rep.clan.designiosCumplidos).toBeGreaterThanOrEqual(1);
  });

  it('coherencia entrada a entrada: cumplido se deduce del designio y la actividad del dominio', () => {
    // 05b: el ✓ tiene precio — cumplido ⟺ actividad ≥ UMBRAL_CUMPLIDO[dominio]
    // (antes > 0, que regalaba el ✓ por rozar el dominio de pasada).
    const rep = canon().dawnReport!;
    for (const n of rep.npcs) {
      if (n.designio === null) {
        expect(n.cumplido).toBeNull();
      } else {
        const actividad = n[DOMINIO_A_ACTIVIDAD[n.designio]];
        expect(n.cumplido).toBe(actividad >= UMBRAL_CUMPLIDO[n.designio] ? 'cumplido' : 'fallido');
      }
    }
    // Los dos contadores son exactamente los conteos sobre las entradas.
    expect(rep.clan.designiosDados).toBe(rep.npcs.filter((n) => n.designio !== null).length);
    expect(rep.clan.designiosCumplidos).toBe(rep.npcs.filter((n) => n.cumplido === 'cumplido').length);
  });
});

// ————————————————————————————————————————————————————————————————
// 5. Round-trip JSON (§A4)
// ————————————————————————————————————————————————————————————————

describe('Conexión — round-trip JSON del informe extendido', () => {
  it('el informe con cumplido + contadores sobrevive JSON sin pérdida', () => {
    const rep = canon().dawnReport!;
    const revived = JSON.parse(JSON.stringify(rep)) as DawnReport;
    expect(revived).toEqual(rep);
    // Los campos nuevos EXISTEN tras revivir (no se perdieron como undefined).
    expect(typeof revived.clan.designiosDados).toBe('number');
    expect(typeof revived.clan.designiosCumplidos).toBe('number');
    for (const n of revived.npcs) {
      expect([null, 'cumplido', 'fallido']).toContain(n.cumplido);
    }
    // Byte-estable: nada de undefined/NaN colados en el informe.
    expect(JSON.stringify(revived)).toBe(JSON.stringify(rep));
  });
});

// ————————————————————————————————————————————————————————————————
// 6. Determinismo (§A4)
// ————————————————————————————————————————————————————————————————

describe('Conexión — determinismo del informe extendido', () => {
  it(
    'misma partida + mismos designios dos veces → informes byte-idénticos (y con los campos nuevos)',
    () => {
      const a = partidaConDesignios().dawnReport!;
      const b = partidaConDesignios().dawnReport!;
      const ja = JSON.stringify(a);
      expect(ja).toBe(JSON.stringify(b));
      // El informe serializado lleva el contrato nuevo de verdad.
      expect(ja).toContain('"cumplido"');
      expect(ja).toContain('"designiosDados"');
      expect(ja).toContain('"designiosCumplidos"');
    },
    30_000,
  );
});

// ————————————————————————————————————————————————————————————————
// 7. Regresión: sin designios, el resto del informe es el de hoy
// ————————————————————————————————————————————————————————————————

describe('Conexión — regresión: el informe clásico no cambia, solo gana campos', () => {
  it('sin designios: harvested/built/discovered/deaths/day siguen cuadrando como hoy', () => {
    const s = partidaSinDesignios();
    const rep = s.dawnReport!;
    expect(rep.day).toBe(0);
    expect(rep.npcs).toHaveLength(4);
    // Cada entrada corresponde a un NPC vivo real y nadie tiene designio.
    const ids = new Set(s.npcs.filter((n) => n.alive).map((n) => n.id));
    for (const n of rep.npcs) {
      expect(ids.has(n.id)).toBe(true);
      expect(n.designio).toBeNull();
      expect(Number.isInteger(n.harvested)).toBe(true);
      expect(Number.isInteger(n.built)).toBe(true);
      expect(Number.isInteger(n.discovered)).toBe(true);
    }
    // Los agregados del clan son la suma de las entradas (contrato 04a intacto).
    const suma = (k: 'harvested' | 'built' | 'discovered') =>
      rep.npcs.reduce((acc, n) => acc + n[k], 0);
    expect(rep.clan.harvested).toBe(suma('harvested'));
    expect(rep.clan.built).toBe(suma('built'));
    expect(rep.clan.discovered).toBe(suma('discovered'));
    expect(rep.clan.deaths).toBe(0);
  });

  it('sin designios: cumplido === null en todas las entradas y contadores a 0', () => {
    const rep = partidaSinDesignios().dawnReport!;
    for (const n of rep.npcs) {
      expect(n.cumplido).toBeNull();
    }
    expect(rep.clan.designiosDados).toBe(0);
    expect(rep.clan.designiosCumplidos).toBe(0);
  });
});
