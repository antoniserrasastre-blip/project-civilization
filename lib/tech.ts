/**
 * Tecnología y transición de era — Sprint 8 (v0.2).
 *
 * El motor de eras está pensado para escalar: cada era tiene un pool de
 * tecnologías que los NPCs pueden descubrir. Cuando el pool de una era
 * queda completado, la civilización avanza a la siguiente. Nada aquí es
 * específico al pilar de diseño; es puro metadato + transición.
 *
 * Pureza / determinismo §A4:
 *   - Los pools son constantes.
 *   - El orden de las eras es fijo.
 *   - La transición es una consulta (`shouldAdvanceEra`) que opera sobre
 *     `technologies` sin PRNG. El scheduler es quien orquesta el evento.
 */

import type { Era, WorldState } from './world-state';

export interface TechDef {
  id: string;
  name: string;
  era: Era;
}

/**
 * Catálogo de tecnologías por era. La era tribal arranca con `fuego` ya
 * descubierto (generado en `initialState`), pero se incluye igualmente
 * en el pool para que `shouldAdvanceEra` tenga un criterio uniforme.
 */
export const TECH_POOLS: Record<Era, TechDef[]> = {
  tribal: [
    { id: 'fuego', name: 'Fuego', era: 'tribal' },
    { id: 'herramientas_piedra', name: 'Herramientas de piedra', era: 'tribal' },
    { id: 'escritura_primitiva', name: 'Escritura primitiva', era: 'tribal' },
  ],
  bronce: [
    { id: 'metalurgia_bronce', name: 'Metalurgia del bronce', era: 'bronce' },
    { id: 'agricultura_intensiva', name: 'Agricultura intensiva', era: 'bronce' },
    { id: 'navegacion_costera', name: 'Navegación costera', era: 'bronce' },
  ],
  clasica: [],
  medieval: [],
  industrial: [],
  atomica: [],
};

export const ERA_ORDER: Era[] = [
  'tribal',
  'bronce',
  'clasica',
  'medieval',
  'industrial',
  'atomica',
];

/** Devuelve la siguiente era canónica o `null` si ya estamos en la última. */
export function nextEra(era: Era): Era | null {
  const idx = ERA_ORDER.indexOf(era);
  if (idx < 0 || idx >= ERA_ORDER.length - 1) return null;
  return ERA_ORDER[idx + 1];
}

/** IDs de las tecnologías del pool de una era. */
export function techIdsOfEra(era: Era): string[] {
  return TECH_POOLS[era].map((t) => t.id);
}

/** Lista de tecnologías aún no descubiertas dentro de la era actual. */
export function pendingTechs(state: WorldState): TechDef[] {
  const known = new Set(state.technologies);
  return TECH_POOLS[state.era].filter((t) => !known.has(t.id));
}

/**
 * ¿Debería la civilización avanzar de era? Sí cuando TODO el pool de la
 * era actual está completo y existe una era siguiente. Puro.
 */
export function shouldAdvanceEra(state: WorldState): boolean {
  const pool = techIdsOfEra(state.era);
  if (pool.length === 0) return false;
  const known = new Set(state.technologies);
  for (const id of pool) {
    if (!known.has(id)) return false;
  }
  return nextEra(state.era) !== null;
}
