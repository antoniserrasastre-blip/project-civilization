/**
 * NPC test fixtures — Test data hygiene factory.
 *
 * Reexports / wraps makeTestNPC from the SSOT in lib/npcs.ts.
 * Adds makeFullInventory derived from it (so shape stays in sync, pure, no
 * duplicated literals for the 11-item inventory).
 *
 * Also provides makeTestDestinationContext to deduplicate the required
 * DestinationContext boilerplate (currentTick, ticksPerDay, prng, synergies)
 * that was causing disjoint partial literals in unit tests after ctx expansion.
 *
 * Rules:
 * - Pure: state -> new_state. No mutation.
 * - Deterministic: fixed seeds/defaults.
 * - Round-trip: all values JSON serializable, integers.
 * - Uses existing makeTestNPC; never reimplements NPC shape here.
 */

import {
  makeTestNPC as _makeTestNPC,
  type NPC,
  type NPCInventory,
  CASTA,
  LINAJE,
  SEX,
  ARCHETYPE,
  VOCATION,
  makeEmptyInventory,
  defaultStats,
} from '../../lib/npcs';

// Type-only imports (erased at emit; no runtime dep on these modules when
// only importing makeTestNPC from this file).
import type { DestinationContext } from '../../lib/needs';
import type { WorldMap } from '../../lib/world-state';
import type { PRNGState } from '../../lib/prng';
import type { Synergy } from '../../lib/synergies';

// Re-export makeTestNPC + the most common constants from SSOT so test files
// can do single import and avoid drift on literals for casta/linaje etc.
export {
  _makeTestNPC as makeTestNPC,
  CASTA,
  LINAJE,
  SEX,
  ARCHETYPE,
  VOCATION,
  type NPC,
  type NPCInventory,
  makeEmptyInventory,
  defaultStats,
};

/**
 * makeFullInventory — returns a complete NPCInventory (all keys present,
 * integers) with optional overrides. Derives the baseline from a call to
 * makeTestNPC so any future field additions in lib/npcs (e.g. new resources)
 * are picked up automatically without touching this file or test call sites.
 */
export function makeFullInventory(overrides: Partial<NPCInventory> = {}): NPCInventory {
  // Dummy to extract the canonical default inventory shape + values.
  // Pure, no side effects, id is internal only.
  const dummy = _makeTestNPC({ id: '__makeFullInventory-dummy__' });
  return {
    ...dummy.inventory,
    ...overrides,
  };
}

/**
 * makeTestDestinationContext — minimal valid DestinationContext for tests
 * that exercise decideDestination / needs logic.
 *
 * Provides the *required* fields that were missing in disjoint test literals
 * (work-impulse, needs-tool-affinity, etc.):
 *   - currentTick, ticksPerDay, prng, synergies
 *
 * Optional fields (items, structures, firePosition, ...) can be passed in
 * overrides. This replaces ad-hoc { world, npcs } objects.
 *
 * Callers that need more (e.g. items for tool-affinity) pass them.
 */
export function makeTestDestinationContext(
  overrides: Partial<DestinationContext> & { world: WorldMap; npcs: readonly NPC[] },
): DestinationContext {
  return {
    // Required baseline (deterministic, no real PRNG use in most decide paths
    // that the targeted tests exercise; they rely on world state).
    currentTick: 0,
    ticksPerDay: 100,
    prng: { seed: 1, cursor: 0 } satisfies PRNGState,
    synergies: [] satisfies Synergy[],
    // Allow caller to override anything (including prng for determinism tests).
    ...overrides,
  };
}
