import { faker } from '@faker-js/faker';
import type { PRNGState } from './prng';
import { nextInt } from './prng';
import { TICKS_PER_DAY } from './resources';

export type LegendaryEntityType = 'npc' | 'item' | 'animal';

export interface LegendaryEntity {
  id: string;
  name: string;
  type: LegendaryEntityType;
  description: string;
}

export interface NarrativeThread {
  id: string;
  entities: string[]; // IDs de LegendaryEntity
  action: string;
  day: number;
  tick: number;
  saga: string;
}

export interface LegendState {
  entities: LegendaryEntity[];
  threads: NarrativeThread[];
}

export const LEGEND_MAX = 50;

export function initialLegendState(): LegendState {
  return {
    entities: [],
    threads: [],
  };
}

const POETIC_ADJECTIVES = [
  'ancestral', 'eterno', 'sangriento', 'glorioso', 'olvidado', 'primigenio', 'sagrado', 'temible'
];

const SAGA_TEMPLATES = [
  'En la noche del día [DAY], [ENTITY_0] [ACTION] a [ENTITY_1]. El clan recordará este acto [ADJ].',
  'Se cuenta que [ENTITY_0], portando a [ENTITY_1], [ACTION] con fuerza [ADJ] en el día [DAY].',
  'La memoria del clan guarda cómo [ENTITY_0] [ACTION] a [ENTITY_1] usando [ENTITY_2]. Fue un momento [ADJ].',
  'Bajo las estrellas del día [DAY], [ENTITY_0] y [ENTITY_1] se unieron para [ACTION]. Un hito [ADJ] para nuestra estirpe.',
  '[ENTITY_0] salvó al clan del destino cruel al [ACTION] a [ENTITY_1] con [ENTITY_2], un gesto [ADJ].',
];

export function generateSaga(
  prng: PRNGState,
  day: number,
  entities: LegendaryEntity[],
  action: string,
): { saga: string; next: PRNGState } {
  let currentPrng = prng;
  const { value: templateIdx, next: n1 } = nextInt(currentPrng, 0, SAGA_TEMPLATES.length);
  const { value: adjIdx, next: n2 } = nextInt(n1, 0, POETIC_ADJECTIVES.length);
  currentPrng = n2;

  let saga = SAGA_TEMPLATES[templateIdx];
  const adj = POETIC_ADJECTIVES[adjIdx];
  
  saga = saga.replace('[DAY]', day.toString());
  saga = saga.replace('[ACTION]', action);
  saga = saga.replace('[ADJ]', adj);
  
  entities.forEach((ent, i) => {
    saga = saga.replace(`[ENTITY_${i}]`, ent.name);
  });
  
  // Limpieza de placeholders restantes
  saga = saga.replace(/\[ENTITY_\d+\]/g, 'un misterio');
  
  return { saga, next: currentPrng };
}

export function recordLegend(
  state: LegendState,
  entities: LegendaryEntity[],
  action: string,
  tick: number,
  prng: PRNGState
): { state: LegendState; next: PRNGState } {
  const day = Math.floor(tick / TICKS_PER_DAY);
  const { saga, next: nextP } = generateSaga(prng, day, entities, action);
  
  const { value: randId, next: nextP2 } = nextInt(nextP, 0, 10000);

  const thread: NarrativeThread = {
    id: `thread-${tick}-${randId}`,
    entities: entities.map(e => e.id),
    action,
    day,
    tick,
    saga,
  };
  
  const nextEntities = [...state.entities];
  entities.forEach(ent => {
    if (!nextEntities.find(e => e.id === ent.id)) {
      nextEntities.push(ent);
    }
  });
  
  // Poda FIFO: mantenemos solo las 50 más recientes
  const nextThreads = [thread, ...state.threads].slice(0, LEGEND_MAX);
  
  return {
    state: {
      entities: nextEntities,
      threads: nextThreads,
    },
    next: nextP2,
  };
}
