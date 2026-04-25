import type { GameState } from './game-state';
import type { Animal, AnimalKind, WorldMap } from './world-state';
import { ANIMAL_STATS, TILE } from './world-state';
import { nextInt, type PRNGState } from './prng';
import { TICKS_PER_DAY } from './resources';
import { manhattan } from './utils';
import type { NPC } from './npcs';

/** Frecuencia de chequeo de spawn salvaje. */
const SPAWN_CHECK_INTERVAL = TICKS_PER_DAY;
const MAX_ANIMALS_TOTAL = 30;

export function tickAnimals(state: GameState): GameState {
  let { animals, prng, tick, world } = state;
  let currentPrng = prng;
  
  // 1. GESTIÓN DE POBLACIÓN (Spawn)
  if (tick % SPAWN_CHECK_INTERVAL === 0 && animals.filter(a => a.alive).length < MAX_ANIMALS_TOTAL) {
    const spawnRes = trySpawnAnimal(world, currentPrng, tick);
    if (spawnRes.animal) {
      animals = [...animals, spawnRes.animal];
    }
    currentPrng = spawnRes.prng;
  }

  // 2. SIMULACIÓN DE AGENTES SALVAJES
  const nextAnimals: Animal[] = [];
  const nextNpcs = [...state.npcs];

  for (const animal of animals) {
    if (!animal.alive) continue;

    let ax = animal.x;
    let ay = animal.y;
    let hp = animal.hp;
    let alive = true;

    // IA básica: ¿Hay NPCs cerca para atacar o huir?
    const stats = ANIMAL_STATS[animal.kind];
    const targetNpc = nextNpcs.find(n => n.alive && manhattan(n.position.x, n.position.y, ax, ay) <= stats.fearRadius);

    if (targetNpc) {
      // Si es depredador (lobo/oso), ataca. Si es jabalí, solo si está muy cerca.
      const dist = manhattan(targetNpc.position.x, targetNpc.position.y, ax, ay);
      if (animal.kind !== 'boar' || dist <= 1) {
        // Moverse hacia el NPC
        if (dist > 0) {
          if (ax < targetNpc.position.x) ax++; else if (ax > targetNpc.position.x) ax--;
          if (ay < targetNpc.position.y) ay++; else if (ay > targetNpc.position.y) ay--;
        }
        
        // Atacar si está adyacente
        if (manhattan(targetNpc.position.x, targetNpc.position.y, ax, ay) <= 1) {
          // El NPC recibe daño (reducido por ahora para balance)
          const damage = stats.attack / 5;
          targetNpc.stats.supervivencia = Math.max(0, targetNpc.stats.supervivencia - damage);
          targetNpc.stats.miedo = Math.min(100, targetNpc.stats.miedo + 20);
          
          // El NPC contraataca si es Guerrero o tiene arma
          const counterDamage = (targetNpc.vocation === 'guerrero' ? 15 : 5);
          hp -= counterDamage;
          if (hp <= 0) {
            alive = false;
            // Registrar hazaña si el NPC lo mató
            // (Esto se procesará en el loop principal para evitar duplicados)
          }
        }
      }
    } else {
      // Deambular aleatoriamente
      const { value: moveRoll, next: nP } = nextInt(currentPrng, 0, 4);
      currentPrng = nP;
      if (moveRoll === 0 && ax > 0) ax--;
      if (moveRoll === 1 && ax < world.width - 1) ax++;
      if (moveRoll === 2 && ay > 0) ay--;
      if (moveRoll === 3 && ay < world.height - 1) ay++;
    }

    // Evitar agua profunda
    const tile = world.tiles[ay * world.width + ax];
    if (tile === TILE.WATER) {
      ax = animal.x; ay = animal.y;
    }

    nextAnimals.push({ ...animal, x: ax, y: ay, hp, alive });
  }

  // 3. REPRODUCCIÓN DE MANADAS
  if (tick % (TICKS_PER_DAY * 3) === 0) {
    const newborns: Animal[] = [];
    const packs = new Map<string, number>();
    for (const a of nextAnimals) {
      if (a.packId) packs.set(a.packId, (packs.get(a.packId) || 0) + 1);
    }

    for (const a of nextAnimals) {
      const packSize = a.packId ? (packs.get(a.packId) || 0) : 1;
      if (packSize >= 2 && packSize < 5) {
        const { value: reproRoll, next: nP } = nextInt(currentPrng, 0, 100);
        currentPrng = nP;
        if (reproRoll < 10) { // 10% probabilidad si hay pareja y hueco
          newborns.push({
            id: `ani-born-${tick}-${reproRoll}`,
            kind: a.kind,
            x: a.x, y: a.y,
            hp: ANIMAL_STATS[a.kind].hp,
            maxHp: ANIMAL_STATS[a.kind].hp,
            hunger: 100,
            packId: a.packId,
            alive: true,
            birthTick: tick
          });
        }
      }
    }
    nextAnimals.push(...newborns);
  }

  return { ...state, animals: nextAnimals, npcs: nextNpcs, prng: currentPrng };
}

function trySpawnAnimal(world: WorldMap, prng: PRNGState, tick: number): { animal: Animal | null, prng: PRNGState } {
  const { value: kindRoll, next: p1 } = nextInt(prng, 0, 100);
  const { value: x, next: p2 } = nextInt(p1, 0, world.width);
  const { value: y, next: p3 } = nextInt(p2, 0, world.height);
  
  // Solo spawn en tierra
  const tile = world.tiles[y * world.width + x];
  if (tile === TILE.WATER || tile === TILE.SHALLOW_WATER) return { animal: null, prng: p3 };

  let kind: AnimalKind = 'boar';
  if (kindRoll > 85) kind = 'bear';
  else if (kindRoll > 60) kind = 'wolf';

  const animal: Animal = {
    id: `ani-${kind}-${tick}`,
    kind,
    x, y,
    hp: ANIMAL_STATS[kind].hp,
    maxHp: ANIMAL_STATS[kind].hp,
    hunger: 100,
    packId: kind === 'wolf' ? `pack-wolf-${x}-${y}` : null,
    alive: true,
    birthTick: tick
  };

  return { animal, prng: p3 };
}
