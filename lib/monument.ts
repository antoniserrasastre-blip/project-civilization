/**
 * Monumento — desbloqueo y construcción — Fase 6.
 *
 * Desbloqueo (decisión #15, #26, Sprint 6.1):
 *   1. Los 5 crafteables umbral construidos.
 *   2. ≥ 10 noches consecutivas alrededor de la fogata.
 *   3. ≥ 1 creyente vivo de cada linaje presente en el clan.
 *
 * Construcción (Sprint 6.2):
 *   200 piedra + 50 leña + 60 días-hombre trabajando. Durante la
 *   obra el clan sigue operativo. Colapso → ruina.
 */

import { CRAFTABLE, clanInventoryTotal, consumeForRecipe, type CraftableId } from './crafting';
import { hasStructure, type Structure } from './structures';
import type { NPC } from './npcs';
import type { VillageState } from './village';
import { TICKS_PER_DAY } from './resources';

// Sprint 9: HERRAMIENTA_SILEX migrado a items; los 4 edificios son el umbral.
const REQUIRED_CRAFTABLES: CraftableId[] = [
  CRAFTABLE.REFUGIO,
  CRAFTABLE.FOGATA_PERMANENTE,
  CRAFTABLE.PIEL_ROPA,
  CRAFTABLE.DESPENSA,
];

export const MIN_CONSECUTIVE_NIGHTS = 10;

export interface MonumentCheckResult {
  unlocked: boolean;
  reasons: string[];
}

export function monumentUnlockStatus(
  structures: readonly Structure[],
  npcs: readonly NPC[],
  village: VillageState,
): MonumentCheckResult {
  const reasons: string[] = [];

  for (const req of REQUIRED_CRAFTABLES) {
    if (!hasStructure(structures, req)) reasons.push(`falta ${req}`);
  }

  if (village.consecutiveNightsAtFire < MIN_CONSECUTIVE_NIGHTS) {
    reasons.push(
      `noches consecutivas: ${village.consecutiveNightsAtFire}/${MIN_CONSECUTIVE_NIGHTS}`,
    );
  }

  const livingByLinaje = new Map<string, number>();
  for (const n of npcs) {
    if (!n.alive) continue;
    livingByLinaje.set(n.linaje, (livingByLinaje.get(n.linaje) ?? 0) + 1);
  }
  // "Linajes presentes" = los que están en el clan vivo + los
  // fallecidos (para que muerte total de un linaje también se
  // marque). Para primigenia simple: los drafteados iniciales son
  // los linajes presentes.
  const allLinajes = new Set(npcs.map((n) => n.linaje));
  for (const lj of allLinajes) {
    if (!livingByLinaje.has(lj)) {
      reasons.push(`linaje ${lj} sin creyente vivo`);
    }
  }

  return { unlocked: reasons.length === 0, reasons };
}

export function isMonumentUnlocked(
  structures: readonly Structure[],
  npcs: readonly NPC[],
  village: VillageState,
): boolean {
  return monumentUnlockStatus(structures, npcs, village).unlocked;
}

// --- Sprint 6.2: construcción ---

export type MonumentPhase = 'none' | 'unlocked' | 'building' | 'built' | 'ruin';

export interface MonumentState {
  phase: MonumentPhase;
  /** Ticks-hombre acumulados. Objetivo = BUILD_TICK_HOURS. */
  progress: number;
  startedAtTick: number | null;
}

export const MONUMENT_COST = {
  stone: 200,
  wood: 50,
  daysWork: 60,
};

export const BUILD_TICK_HOURS = MONUMENT_COST.daysWork * TICKS_PER_DAY;
/** Umbral mínimo de NPCs vivos para que la obra no colapse. */
export const MIN_WORKERS = 3;

export function initialMonumentState(): MonumentState {
  return { phase: 'none', progress: 0, startedAtTick: null };
}

/** Devuelve un NPCs con inventario reducido para pagar el coste.
 *  No valida desbloqueo ni fase — eso es trabajo del caller. */
function payBuildCost(
  npcs: readonly NPC[],
  structures: readonly Structure[],
): { npcs: NPC[]; structures: Structure[] } {
  return consumeForRecipe(npcs, {
    id: 'monumento' as any,
    inputs: MONUMENT_COST,
    daysWork: 0,
    minSkill: 0,
  }, structures);
}

export function canStartMonument(
  structures: readonly Structure[],
  npcs: readonly NPC[],
  village: VillageState,
  monument: MonumentState,
): boolean {
  if (monument.phase === 'built' || monument.phase === 'building') return false;
  if (!isMonumentUnlocked(structures, npcs, village)) return false;
  const inv = clanInventoryTotal(npcs, structures);
  return inv.stone >= MONUMENT_COST.stone && inv.wood >= MONUMENT_COST.wood;
}

export function startMonument(
  npcs: readonly NPC[],
  structures: readonly Structure[],
  monument: MonumentState,
  tick: number,
): { npcs: NPC[]; structures: Structure[]; monument: MonumentState } {
  if (monument.phase === 'built' || monument.phase === 'building') {
    throw new Error(`monumento en fase ${monument.phase}, no iniciable`);
  }
  const { npcs: nextNpcs, structures: nextStructures } = payBuildCost(npcs, structures);
  return {
    npcs: nextNpcs,
    structures: nextStructures,
    monument: { phase: 'building', progress: 0, startedAtTick: tick },
  };
}

/** Avanza progreso del monumento un tick. Cada NPC vivo aporta 1
 *  hora-hombre. Si < MIN_WORKERS vivos → ruina irreversible. */
export function tickMonumentProgress(
  monument: MonumentState,
  npcs: readonly NPC[],
): MonumentState {
  if (monument.phase !== 'building') return monument;
  const alive = npcs.filter((n) => n.alive).length;
  if (alive < MIN_WORKERS) {
    return { ...monument, phase: 'ruin' };
  }
  const progress = monument.progress + alive;
  if (progress >= BUILD_TICK_HOURS) {
    return { ...monument, phase: 'built', progress: BUILD_TICK_HOURS };
  }
  return { ...monument, progress };
}
