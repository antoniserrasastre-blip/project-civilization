/**
 * Economía de Fe — cap y helpers — v1.0.1 decisión #1.
 *
 * `FAITH_CAP` limita el acumulado tanto del player como de cada rival
 * a un techo absoluto. Diseño decidido en `DECISIONS-PENDING.md`:
 *   - Cap duro (no decay, no acumulación infinita).
 *   - El overflow se PIERDE al ganar, no se difiere.
 *   - El cap se aplica al ENTRAR Fe (events `faith_gained` y
 *     `rival_faith_gained`), no como guardián en cada render: si un
 *     save antiguo tiene faith > cap, se respeta hasta el próximo
 *     ingreso (que lo recortará).
 *
 * Por qué 500: permite un `curse_fatal` (150 Fe) sin vaciarte y deja
 * margen para combinar 2-3 dones. Limita el hoarding infinito que
 * trivializaba mecánicas caras en partidas largas.
 */

export const FAITH_CAP = 500;

/**
 * Trunca un valor de Fe a `[0, FAITH_CAP]`. Pura, determinista, sin
 * PRNG. Usada en `applyEvents` cuando entra un `faith_gained`.
 */
export function clampFaith(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(FAITH_CAP, n));
}
