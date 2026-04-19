/**
 * Disclaimer editorial sobre esclavitud (decisión #28).
 *
 * Firma del Director humano por delegación del Director Creativo:
 * implementar la esclavitud como vía emergente (§3.2) + aviso en
 * pantalla de inicio. Este módulo contiene la lógica de
 * persistencia dismissal.
 *
 * El componente React (`components/disclaimer/SlaveryDisclaimer`)
 * usa estas funciones para decidir si mostrar el modal y grabar el
 * "accepted" cuando el jugador confirma.
 *
 * NO toca `state.prng` — es UI-only, previa al drafting.
 */

export const DISCLAIMER_STORAGE_KEY = 'primigenia.disclaimer.v1';

/** Copy editorial — placeholder hasta firma del Director Creativo.
 *  Director humano puede editar libremente; testear solo que cubre
 *  los temas clave. */
export const SLAVERY_DISCLAIMER_COPY = [
  'Este juego representa una sociedad pre-moderna en la que la',
  'esclavitud existe como institución social realista.',
  '',
  'Ningún NPC nace esclavo en el drafting inicial. La representación',
  'de la esclavitud emerge por eventos de ruina (hambre extrema,',
  'deuda impagada, crimen grave) y es una de las lentes narrativas',
  'con las que el juego habla de la fragilidad humana.',
  '',
  'Si este material puede afectarte, cierra esta pestaña.',
].join(' ');

/** Devuelve true si el jugador ya vio y aceptó el disclaimer. */
export function hasAcceptedDisclaimer(storage: Storage | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(DISCLAIMER_STORAGE_KEY) !== null;
  } catch {
    // SSR / storage inaccesible → comportamiento seguro: mostrar.
    return false;
  }
}

/** Marca el disclaimer como aceptado. Idempotente. No crashea si
 *  storage es null (SSR / entorno sin Storage). */
export function markDisclaimerAccepted(storage: Storage | null): void {
  if (!storage) return;
  try {
    storage.setItem(DISCLAIMER_STORAGE_KEY, 'accepted');
  } catch {
    // Storage full / privacy mode — silencioso. El jugador volverá
    // a ver el modal en la próxima sesión, no es gravísimo.
  }
}
