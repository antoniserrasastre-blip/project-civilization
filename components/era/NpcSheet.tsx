'use client';

/**
 * NpcSheet — ficha de aventurero (Sprint #3 Fase 5 FICHA-AVENTURERO).
 *
 * Modal lateral que se abre al clicar un NPC. Muestra:
 *   - Identidad: linaje, casta, arquetipo, sexo.
 *   - Stats: supervivencia, socialización.
 *   - Rasgos activos (hasta 3).
 *   - Catálogo de los 5 milagros primigenia (§3.8) con coste en
 *     gratitud; botón deshabilitado si no hay pool o ya hay 3 rasgos.
 *
 * Dumb component — recibe NPC, VillageState y callbacks. La lógica
 * de `grantMiracle` vive en `lib/miracles.ts`; este componente sólo
 * orquesta la interacción.
 */

import type { NPC } from '@/lib/npcs';
import type { VillageState } from '@/lib/village';
import type { MiracleId } from '@/lib/miracles';
import type { NpcStatusBadge } from '@/components/map/MapView';
import {
  MAX_TRAITS_PER_NPC,
  MIRACLES_CATALOG,
} from '@/lib/miracles';

const TRAIT_LABEL: Record<string, string> = {
  hambre_sagrada: 'Hambre sagrada',
  ojo_de_halcon: 'Ojo de halcón',
  voz_de_todos: 'Voz de todos',
  manos_que_recuerdan: 'Manos que recuerdan',
  corazon_fiel: 'Corazón fiel',
};

function traitLabel(traitId: string): string {
  return TRAIT_LABEL[traitId] ?? traitId;
}

const BADGE_LABEL: Record<NpcStatusBadge, string> = {
  critical: 'crítico',
  hungry: 'busca comida',
  lonely: 'aislado',
  swimming: 'nadando',
};

export interface NpcOperationalStatus {
  action: string;
  destination: { x: number; y: number };
  tile: string;
  badges: readonly NpcStatusBadge[];
}

export interface NpcSheetProps {
  npc: NPC;
  village: VillageState;
  status?: NpcOperationalStatus;
  onClose: () => void;
  onGrantMiracle: (miracleId: MiracleId) => void;
}

export function NpcSheet({
  npc,
  village,
  status,
  onClose,
  onGrantMiracle,
}: NpcSheetProps) {
  const atCap = npc.traits.length >= MAX_TRAITS_PER_NPC;
  return (
    <aside
      data-testid="npc-sheet"
      role="dialog"
      aria-label={`Ficha de ${npc.id}`}
      style={{
        position: 'fixed',
        top: 12,
        right: 284,
        width: 300,
        maxHeight: '90vh',
        overflowY: 'auto',
        background: '#0e0e0e',
        color: '#f5f5dc',
        padding: '14px 16px',
        borderRadius: 10,
        border: '1px solid #1e1e1e',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        zIndex: 25,
        fontSize: '0.85rem',
        lineHeight: 1.4,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <h2
          data-testid="npc-sheet-title"
          style={{ margin: 0, fontSize: '1rem' }}
        >
          {npc.name}
        </h2>
        <button
          type="button"
          data-testid="npc-sheet-close"
          onClick={onClose}
          style={{
            background: 'transparent',
            color: '#888',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          cerrar
        </button>
      </div>

      <section
        data-testid="npc-sheet-identity"
        style={{ marginBottom: 10, fontSize: '0.8rem', opacity: 0.85 }}
      >
        <div>
          <span style={{ opacity: 0.7 }}>Linaje: </span>
          <strong data-testid="npc-sheet-linaje">{npc.linaje}</strong>
        </div>
        <div>
          <span style={{ opacity: 0.7 }}>Casta: </span>
          {npc.casta}
        </div>
        {npc.archetype && (
          <div>
            <span style={{ opacity: 0.7 }}>Arquetipo: </span>
            {npc.archetype}
          </div>
        )}
        <div>
          <span style={{ opacity: 0.7 }}>Sexo: </span>
          {npc.sex}
        </div>
      </section>

      <section
        data-testid="npc-sheet-stats"
        style={{ marginBottom: 10 }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Estadísticas</div>
        <div>
          Supervivencia: <strong>{Math.round(npc.stats.supervivencia)}</strong>
        </div>
        <div>
          Socialización: <strong>{Math.round(npc.stats.socializacion)}</strong>
        </div>
      </section>

      <section
        data-testid="npc-sheet-operational"
        style={{
          marginBottom: 10,
          borderTop: '1px solid #242420',
          borderBottom: '1px solid #242420',
          padding: '8px 0',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Estado operativo
        </div>
        <div>
          Acción: <strong>{status?.action ?? 'sin datos'}</strong>
        </div>
        {status && (
          <>
            <div>
              Destino:{' '}
              <strong>
                ({status.destination.x}, {status.destination.y})
              </strong>
            </div>
            <div>
              Terreno: <strong>{status.tile}</strong>
            </div>
            <div>
              Alertas:{' '}
              {status.badges.length > 0
                ? status.badges.map((b) => BADGE_LABEL[b]).join(', ')
                : 'ninguna'}
            </div>
          </>
        )}
        <div style={{ marginTop: 6, opacity: 0.85 }}>
          Inventario: madera {npc.inventory.wood}, piedra {npc.inventory.stone},
          bayas {npc.inventory.berry}, caza {npc.inventory.game}, pescado{' '}
          {npc.inventory.fish}
        </div>
      </section>

      <section
        data-testid="npc-sheet-traits"
        style={{ marginBottom: 10 }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          Rasgos ({npc.traits.length}/{MAX_TRAITS_PER_NPC})
        </div>
        {npc.traits.length === 0 ? (
          <div style={{ opacity: 0.6, fontSize: '0.78rem' }}>
            Sin rasgos aún.
          </div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {npc.traits.map((t) => (
              <li
                key={t}
                data-testid={`npc-trait-${t}`}
                style={{
                  borderLeft: '2px solid #6b5a1f',
                  paddingLeft: 6,
                }}
              >
                {traitLabel(t)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="npc-sheet-miracles">
        <div style={{ fontWeight: 600, marginBottom: 6 }}>
          Milagros disponibles (gratitud: {Math.floor(village.gratitude)})
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {Object.values(MIRACLES_CATALOG).map((m) => {
            const alreadyHas = npc.traits.includes(m.traitId);
            const noPool = village.gratitude < m.cost;
            const disabled = !npc.alive || alreadyHas || noPool || atCap;
            const reason = !npc.alive
              ? 'NPC muerto'
              : alreadyHas
                ? 'rasgo ya activo'
                : atCap
                  ? 'ya tiene 3 rasgos'
                  : noPool
                    ? `gratitud insuficiente (${m.cost})`
                    : `coste ${m.cost}`;
            return (
              <button
                key={m.id}
                type="button"
                data-testid={`miracle-btn-${m.id}`}
                disabled={disabled}
                onClick={() => onGrantMiracle(m.id)}
                title={reason}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: disabled ? '#17170e' : '#2a2a1c',
                  color: disabled ? '#666' : '#f5f5dc',
                  border: `1px solid ${disabled ? '#242420' : '#6b5a1f'}`,
                  borderRadius: 6,
                  padding: '6px 8px',
                  fontSize: '0.82rem',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{m.nameCastellano}</span>
                <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>
                  {m.cost}
                </span>
              </button>
            );
          })}
        </div>
        {atCap && (
          <div
            style={{
              marginTop: 6,
              fontSize: '0.72rem',
              opacity: 0.65,
            }}
          >
            Este NPC ya tiene {MAX_TRAITS_PER_NPC} rasgos. No puede
            recibir más milagros.
          </div>
        )}
      </section>
    </aside>
  );
}
