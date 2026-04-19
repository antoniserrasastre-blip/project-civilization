/**
 * Página principal — Edad Primigenia.
 *
 * Monta el MapView en pantalla completa. NPCs, recursos, HUD y
 * modal diario llegarán en Fases 2-5. Hasta entonces la pantalla
 * es el tablero puro.
 */

import { MapView } from '@/components/map/MapView';

export default function Page() {
  return (
    <main
      data-testid="primigenia-page"
      style={{ margin: 0, padding: 0, height: '100vh', overflow: 'hidden' }}
    >
      <MapView />
    </main>
  );
}
