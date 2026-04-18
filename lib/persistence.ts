/**
 * Persistencia en localStorage — snapshot simple del estado del mundo.
 *
 * No versiona schema. Si el esquema cambia (campos nuevos, renombres),
 * un save antiguo puede fallar en silencio al cargar. En v0.2 se añadirá
 * un campo `schema_version` al estado y migraciones. Para el MVP basta
 * con "si el parseo falla, empiezas partida nueva".
 *
 * La clave `STORAGE_KEY` incluye `.v1` precisamente para invalidar de
 * golpe todos los saves antiguos cuando cambiemos el shape.
 */

import type { WorldState } from './world-state';

// v3 desde Sprint 9: el estado soporta multi-grupo. Saves v2 o anteriores
// no tienen `playerGroupId` ni rival_gods poblados; la invalidación es
// brutal pero evita inconsistencias.
export const STORAGE_KEY = 'godgame.state.v3';

function hasLocalStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Guarda el estado en localStorage. No-op si no hay localStorage
 * disponible (por ejemplo corriendo tests en Node sin jsdom).
 */
export function saveSnapshot(state: WorldState): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Carga el último snapshot. Devuelve `null` si no hay save o si el
 * parseo falla (save corrupto o de una versión incompatible).
 */
export function loadSnapshot(): WorldState | null {
  if (!hasLocalStorage()) return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WorldState;
  } catch {
    return null;
  }
}

/** Borra el save. Útil para un botón "reset" en la UI. */
export function clearSnapshot(): void {
  if (!hasLocalStorage()) return;
  localStorage.removeItem(STORAGE_KEY);
}
