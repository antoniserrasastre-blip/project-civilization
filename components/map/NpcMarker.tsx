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
 * Renderiza un NPC en el mapa con su herramienta equipada superpuesta.
 */
export const NpcMarker: React.FC<NpcMarkerProps> = ({ npc, item, selected, onClick }) => {
  const baseSprite = useUnitSprites(npc.casta.toLowerCase());
  const itemSprite = useResourceSprites(item?.kind || '');

  const opacity = npc.alive ? 1 : 0.4;
  const filter = selected ? 'drop-shadow(0 0 4px white) brightness(1.2)' : 'none';

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
        transition: 'all 0.2s ease',
        zIndex: selected ? 10 : 2,
        opacity,
        filter,
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

      {/* CAPA 3: INDICADOR DE SELECCIÓN */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '8px',
            height: '8px',
            backgroundColor: 'white',
            borderRadius: '50%',
            boxShadow: '0 0 4px rgba(0,0,0,0.5)',
          }}
        />
      )}
    </div>
  );
};
