/**
 * Simulación — tick puro del mundo primigenia.
 *
 * `tick(state): GameState'` avanza un paso simulado. Sin side
 * effects, sin mutación. §A4.
 *
 * Responsabilidades actuales (Sprint 3.3):
 *   - Decidir destino de cada NPC vivo (needs).
 *   - Encontrar ruta (A*) y mover 1 tile en su dirección.
 *   - Regenerar recursos agotados (tickResources).
 *   - Actualizar fog con radio de visión.
 *
 * Las necesidades-que-consumen (supervivencia baja por hambre,
 * socialización) llegan en Sprint 4.1.
 */

import { decideDestination, tickNeeds } from './needs';
import { findPath } from './pathfinding';
import type { GameState } from './game-state';
import type { NPC } from './npcs';
import { tickResources } from './resources';
import { tickHarvests } from './harvest';
import { markDiscovered } from './fog';
import type { FogState } from './fog';

export function tick(state: GameState): GameState {
  const ctx = { world: state.world, npcs: state.npcs };
  const newNPCs: NPC[] = [];
  let prng = state.prng;
  let fog: FogState = state.fog;

  for (const npc of state.npcs) {
    if (!npc.alive) {
      newNPCs.push(npc);
      continue;
    }
    const dest = decideDestination(npc, ctx);
    if (dest.x === npc.position.x && dest.y === npc.position.y) {
      newNPCs.push(npc);
      fog = markDiscovered(fog, npc.position.x, npc.position.y, npc.visionRadius);
      continue;
    }
    const r = findPath(
      state.world,
      npc.position,
      dest,
      prng,
      { maxExpand: 2000 },
    );
    prng = r.next;
    if (!r.path || r.path.length < 2) {
      // Sin ruta o ya está — se queda quieto.
      newNPCs.push(npc);
      fog = markDiscovered(fog, npc.position.x, npc.position.y, npc.visionRadius);
      continue;
    }
    const nextStep = r.path[1];
    const moved: NPC = { ...npc, position: { ...nextStep } };
    newNPCs.push(moved);
    fog = markDiscovered(fog, moved.position.x, moved.position.y, moved.visionRadius);
  }

  const regen = tickResources(state.world.resources, state.tick + 1);
  // Recolección ANTES de tickNeeds para que el inventario post-harvest
  // pueda usarse en sprints siguientes. El estado "on-the-spot" de
  // needs también puede ver el mismo spawn antes de agotarse.
  const harvested = tickHarvests(newNPCs, regen, state.tick + 1);
  const nextWorld = { ...state.world, resources: harvested.resources };
  const npcsAfterNeeds = tickNeeds(harvested.npcs, {
    world: nextWorld,
    npcs: harvested.npcs,
  });

  return {
    world: nextWorld,
    npcs: npcsAfterNeeds,
    fog,
    tick: state.tick + 1,
    prng,
  };
}
