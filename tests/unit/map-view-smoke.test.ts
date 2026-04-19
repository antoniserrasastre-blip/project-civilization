/**
 * Smoke test del módulo MapView.
 *
 * En un entorno sin Playwright browser (bloqueado por sandbox, ver
 * NOTES-OVERNIGHT.md § Bloqueo Sprint 1.5 E2E), este test sirve
 * como mínimo de compile+export. La interacción real (pan, zoom,
 * clicks) se cubrirá en E2E cuando haya entorno de browser.
 *
 * La matemática del viewport tiene cobertura unit completa en
 * tests/unit/viewport.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { MapView } from '@/components/map/MapView';

describe('MapView — smoke (compile + export)', () => {
  it('exporta un componente React como función', () => {
    expect(typeof MapView).toBe('function');
  });
});
