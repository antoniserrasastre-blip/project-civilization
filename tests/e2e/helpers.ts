/**
 * Helpers compartidos entre E2E specs.
 *
 * `goHomeFresh` limpia localStorage, recarga y despacha:
 *   1. El selector de grupos (elige Tramuntana por defecto).
 *   2. El tutorial intro (saltado) — salvo que `{ keepTutorial: true }`.
 *
 * Con eso los specs que no son del tutorial llegan a un HUD limpio y
 * listo para interactuar. El spec del tutorial pasa `keepTutorial: true`
 * para observar la intro.
 */

import { type Page } from '@playwright/test';

export interface GoHomeOptions {
  /** Si true, no dispara `tutorial-skip` — tests que validen la intro. */
  keepTutorial?: boolean;
  /** Qué grupo elegir. Default `tramuntana`. */
  groupId?: 'tramuntana' | 'llevant' | 'migjorn';
}

export async function goHomeFresh(page: Page, options: GoHomeOptions = {}) {
  const { keepTutorial = false, groupId = 'tramuntana' } = options;
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('networkidle');

  const pickBtn = page.getByTestId(`pick-group-${groupId}`);
  // El selector aparece tras hydration (useEffect). `networkidle` no lo
  // garantiza, así que esperamos explícitamente hasta 5 s.
  try {
    await pickBtn.waitFor({ state: 'visible', timeout: 5000 });
    await pickBtn.click();
  } catch {
    /* selector ya estaba dismissed (p.ej. snapshot cargado) */
  }

  if (!keepTutorial) {
    const skipBtn = page.getByTestId('tutorial-skip-intro');
    // Esperar brevemente; la intro se monta tras el pick. Max 3s.
    try {
      await skipBtn.waitFor({ state: 'visible', timeout: 3000 });
      await skipBtn.click();
    } catch {
      /* tutorial ya se había desmontado — partida continúa */
    }
  }
}
