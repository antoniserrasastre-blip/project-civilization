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
 *   obra el clan sigue operativo.
 */

import { CRAFTABLE, type CraftableId } from './crafting';
import { hasStructure, type Structure } from './structures';
import type { NPC } from './npcs';
import type { VillageState } from './village';

const REQUIRED_CRAFTABLES: CraftableId[] = [
  CRAFTABLE.REFUGIO,
  CRAFTABLE.FOGATA_PERMANENTE,
  CRAFTABLE.PIEL_ROPA,
  CRAFTABLE.HERRAMIENTA_SILEX,
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
