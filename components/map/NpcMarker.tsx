import React from 'react';
import { useUnitSprites } from '@/hooks/use-unit-sprites';
import { useResourceSprites } from '@/hooks/use-resource-sprites';
import type { NPC } from '@/lib/npcs';
import type { EquippableItem } from '@/lib/items';

interface NpcMarkerProps {
  npc: NPC;
  item?: EquippableItem | null;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Renderiza un NPC con efectos visuales dinámicos basados en el rango de su artefacto.
 */
export const NpcMarker: React.FC<NpcMarkerProps> = ({ npc, item, selected, onClick }) => {
  const baseSprite = useUnitSprites(npc.casta.toLowerCase());
  const itemSprite = useResourceSprites(item?.kind || '');

  const opacity = npc.alive ? 1 : 0.4;
  
  // EFECTOS VISUALES POR RANGO (DF STYLE)
  let glow = 'none';
  if (item) {
    if (item.rank === 'fine') glow = 'drop-shadow(0 0 2px white)';
    if (item.rank === 'masterwork') glow = 'drop-shadow(0 0 4px gold) brightness(1.1)';
    if (item.rank === 'artifact') glow = 'drop-shadow(0 0 6px #00ffff) drop-shadow(0 0 2px white) brightness(1.2)';
  }

  const selectionFilter = selected ? 'drop-shadow(0 0 6px white) scale(1.1)' : 'none';
  const combinedFilter = `${glow} ${selectionFilter}`.trim();

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${npc.position.x * 32}px`,
        top: `${npc.position.y * 32}px`,
        width: '32px',
        height: '32px',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, filter 0.3s ease',
        zIndex: selected ? 10 : 2,
        opacity,
        filter: combinedFilter,
        transform: selected ? 'scale(1.1)' : 'scale(1)',
      }}
      data-testid={`npc-marker-${npc.id}`}
    >
      {/* CAPA 1: NPC BASE */}
      <img
        src={baseSprite}
        alt={npc.name}
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      />

      {/* CAPA 2: HERRAMIENTA EQUIPADA */}
      {npc.alive && itemSprite && (
        <img
          src={itemSprite}
          alt={item?.name}
          style={{
            width: '60%',
            height: '60%',
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))',
          }}
        />
      )}

      {/* CAPA 3: INDICADOR DE ARTEFACTO (Punto de estatus) */}
      {item && item.rank !== 'common' && (
        <div
          style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '6px',
            height: '6px',
            backgroundColor: item.rank === 'artifact' ? '#00ffff' : 'gold',
            borderRadius: '50%',
            boxShadow: '0 0 2px black',
          }}
        />
      )}
    </div>
  );
};
