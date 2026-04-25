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

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { NPC } from '@/lib/npcs';
import { CASTA } from '@/lib/npcs';
import type { VillageState } from '@/lib/village';
import type { MiracleId } from '@/lib/miracles';
import type { NpcStatusBadge } from '@/components/map/MapView';
import type { Role } from '@/lib/roles';
import {
  MAX_TRAITS_PER_NPC,
  MIRACLES_CATALOG,
} from '@/lib/miracles';
import { roleLabel } from '@/lib/roles';
import { spriteUrlFor, shouldShowCrown } from '@/lib/npc-sprite';
import { LINAJE_COLORS } from '@/lib/npc-marker';
import type { EquippableItem } from '@/lib/items';
import { itemForNpc, ITEM_KIND, itemLabel } from '@/lib/items';

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

const SKILL_INFO = {
  hunting: { label: 'Caza', icon: 'hunt' },
  gathering: { label: 'Recolección', icon: 'gather' },
  crafting: { label: 'Artesanía', icon: 'craft' },
  fishing: { label: 'Pesca', icon: 'fish' },
  healing: { label: 'Sanación', icon: 'heal' },
} as const;

export interface NpcOperationalStatus {
  action: string;
  destination: { x: number; y: number };
  tile: string;
  badges: readonly NpcStatusBadge[];
}

export interface NpcBiography {
  bornDay: number;
  ageDays: number;
  parentNames: [string, string] | null;
  childrenCount: number;
}

export interface NpcSheetProps {
  npc: NPC;
  village: VillageState;
  status?: NpcOperationalStatus;
  biography?: NpcBiography;
  role?: Role;
  toolLabel?: string;
  items?: readonly EquippableItem[];
  onClose: () => void;
  onGrantMiracle: (miracleId: MiracleId) => void;
}

function NpcPortrait({ npc, items = [] }: { npc: NPC; items?: readonly EquippableItem[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteUrl = spriteUrlFor(npc, items);
  const linajeBorder = LINAJE_COLORS[npc.linaje] ?? '#888';
  const isCrown = shouldShowCrown(npc);
  const SIZE = 96;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const cx = SIZE / 2;
    const cy = SIZE / 2;

    ctx.imageSmoothingEnabled = false;
    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, cx - SIZE * 0.38, cy - SIZE * 0.4, SIZE * 0.76, SIZE * 0.76);
    };
    img.src = spriteUrl;
  }, [spriteUrl, linajeBorder, isCrown]);

  return (
    <div className="pixel-box-dark bg-wb-stone border-wb-gold p-1 w-24 h-24 flex flex-col items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} width={SIZE} height={SIZE} className="image-pixelated" />
    </div>
  );
}

const FamilyTree = ({ biography }: { biography?: NpcBiography }) => {
  if (!biography) return null;

  return (
    <div className="flex flex-col gap-2 mt-2 p-2 bg-black/20 border-l-2 border-wb-gold">
      <div className="flex items-center gap-2">
         <div className="w-8 h-[2px] bg-wb-gold/30"></div>
         <div className="text-[10px] text-wb-gold font-bold uppercase">Linaje de Sangre</div>
      </div>
      
      <div className="flex justify-between items-center px-2">
        <div className="flex flex-col items-center">
          <div className="text-[9px] opacity-50 uppercase">Padres</div>
          <div className="text-[11px] font-bold">
            {biography.parentNames ? biography.parentNames.join(' + ') : 'Fundadores'}
          </div>
        </div>
        
        <div className="text-wb-gold">▼</div>
        
        <div className="flex flex-col items-center">
          <div className="text-[9px] opacity-50 uppercase">Hijos</div>
          <div className="text-[11px] font-bold">{biography.childrenCount}</div>
        </div>
      </div>
    </div>
  );
};

export function NpcSheet({
  npc,
  village,
  status,
  biography,
  role,
  toolLabel,
  items = [],
  onClose,
  onGrantMiracle,
}: NpcSheetProps) {
  const atCap = npc.traits.length >= MAX_TRAITS_PER_NPC;
  
  return (
    <aside
      data-testid="npc-sheet"
      className="pixel-box fixed top-4 right-72 w-80 max-h-[90vh] overflow-y-auto z-25 p-4 flex flex-col gap-4 text-wb-stone scrollbar-hide"
    >
      {/* Header */}
      <div className="flex gap-4">
        <NpcPortrait npc={npc} items={items} />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-bold truncate leading-tight">{npc.name}</h2>
            <button onClick={onClose} className="text-[10px] font-bold uppercase text-wb-stone/50 hover:text-wb-stone">
              [Cerrar]
            </button>
          </div>
          <div className="text-[10px] font-bold uppercase text-wb-stone/60 mt-1">
            {npc.casta} · {npc.linaje}
          </div>
          <div className="text-[10px] text-wb-gold font-bold mt-1">
            Vocación: <span className="uppercase">{npc.vocation}</span>
          </div>
          {role && (
            <div className="text-xs text-wb-blood font-bold mt-2">
              Rol Activo: {roleLabel(role)}
            </div>
          )}
        </div>
      </div>

      {/* ADN Section (Constitución) */}
      <section className="bg-black/10 p-2 border border-wb-gold/20 rounded-md">
        <h3 className="text-[10px] font-black uppercase tracking-tighter text-wb-gold/60 mb-2 italic">ADN (Constitución)</h3>
        <div className="grid grid-cols-3 gap-2">
           <div className="flex flex-col items-center">
             <span className="text-[8px] opacity-60 uppercase font-bold">Fuerza</span>
             <span className="text-xs font-mono">{Math.round(npc.attributes.strength)}</span>
             <div className="w-full h-1 bg-black/40 mt-1">
               <div className="h-full bg-red-500/60" style={{ width: `${npc.attributes.strength}%` }} />
             </div>
           </div>
           <div className="flex flex-col items-center">
             <span className="text-[8px] opacity-60 uppercase font-bold">Destreza</span>
             <span className="text-xs font-mono">{Math.round(npc.attributes.dexterity)}</span>
             <div className="w-full h-1 bg-black/40 mt-1">
               <div className="h-full bg-green-500/60" style={{ width: `${npc.attributes.dexterity}%` }} />
             </div>
           </div>
           <div className="flex flex-col items-center">
             <span className="text-[8px] opacity-60 uppercase font-bold">Sabiduría</span>
             <span className="text-xs font-mono">{Math.round(npc.attributes.wisdom)}</span>
             <div className="w-full h-1 bg-black/40 mt-1">
               <div className="h-full bg-blue-500/60" style={{ width: `${npc.attributes.wisdom}%` }} />
             </div>
           </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-black/5 p-2 border-b border-wb-stone/10">
        <h3 className="text-[10px] font-black uppercase tracking-tighter text-wb-stone/40 mb-2">Esencia Vital</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
           <div className="flex flex-col">
             <div className="flex justify-between items-center mb-1">
               <span className="text-[9px] opacity-60">Supervivencia</span>
               <span className="text-[10px] font-bold">{Math.round(npc.stats.supervivencia)}</span>
             </div>
             <div className="pixel-bar-bg h-1.5">
               <div className="pixel-bar-fill bg-wb-blood" style={{ width: `${npc.stats.supervivencia}%` }} />
             </div>
           </div>
           <div className="flex flex-col">
             <div className="flex justify-between items-center mb-1">
               <span className="text-[9px] opacity-60">Socialización</span>
               <span className="text-[10px] font-bold">{Math.round(npc.stats.socializacion)}</span>
             </div>
             <div className="pixel-bar-bg h-1.5">
               <div className="pixel-bar-fill bg-blue-400" style={{ width: `${npc.stats.socializacion}%` }} />
             </div>
           </div>
           <div className="flex flex-col">
             <div className="flex justify-between items-center mb-1">
               <span className="text-[9px] opacity-60">Propósito</span>
               <span className="text-[10px] font-bold">{Math.round(npc.stats.proposito)}</span>
             </div>
             <div className="pixel-bar-bg h-1.5">
               <div className="pixel-bar-fill bg-wb-gold" style={{ width: `${npc.stats.proposito}%` }} />
             </div>
           </div>
           <div className="flex flex-col">
             <div className="flex justify-between items-center mb-1">
               <span className="text-[9px] opacity-60">Miedo</span>
               <span className="text-[10px] font-bold">{Math.round(npc.stats.miedo)}</span>
             </div>
             <div className="pixel-bar-bg h-1.5 bg-purple-900/30">
               <div className="pixel-bar-fill bg-purple-500" style={{ width: `${npc.stats.miedo}%` }} />
             </div>
           </div>
        </div>
      </section>

      {/* Skills Section */}
...
      {/* Cultura Material (Herramientas y Reliquias) */}
      <section className="bg-wb-blood/5 p-2 border border-wb-blood/20 rounded-md">
        <h3 className="text-[10px] font-black uppercase tracking-tighter text-wb-blood/60 mb-2 italic">Cultura Material</h3>
        {npc.equippedItemId ? (() => {
          const item = items.find(i => i.id === npc.equippedItemId);
          if (!item) return <div className="text-[10px] opacity-40 italic">Herramienta perdida...</div>;
          const rankColors = { common: 'text-wb-stone', fine: 'text-blue-400', masterwork: 'text-purple-400', artifact: 'text-orange-500' };
          
          return (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className={`text-xs font-bold ${rankColors[item.rank]}`}>{itemLabel(item)}</span>
                  <span className="text-[9px] opacity-60 uppercase">{item.material} · Nivel {item.level}</span>
                </div>
                <div className="text-right">
                  <div className="text-[8px] opacity-50 uppercase">XP</div>
                  <div className="w-12 h-1 bg-black/40">
                    <div className="h-full bg-blue-500" style={{ width: `${(item.xp / 20) * 100}%` }} />
                  </div>
                </div>
              </div>

              {item.deeds.length > 0 && (
                <div className="mt-1 pt-1 border-t border-wb-blood/10">
                  <div className="text-[8px] font-black uppercase text-wb-blood/40 mb-1">Hazañas Registradas</div>
                  <div className="flex flex-col gap-1">
                    {item.deeds.map((deed, idx) => (
                      <div key={idx} className="text-[10px] leading-tight flex gap-1 italic">
                        <span className="text-wb-gold">✦</span>
                        <span>{deed}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })() : (
          <div className="text-[10px] opacity-40 italic">Sin herramienta equipada</div>
        )}
      </section>

      {/* Biography & Family */}
      <section>
        <h3 className="text-[10px] font-black uppercase tracking-tighter text-wb-stone/40 mb-2">Historia y Sangre</h3>
        <div className="text-xs leading-relaxed">
          Nacido el día <span className="font-bold">{biography?.bornDay ?? '?'}</span>.
          Vive desde hace <span className="font-bold">{biography?.ageDays ?? '?'}</span> días.
        </div>
        <FamilyTree biography={biography} />
      </section>

      {/* Miracles Section */}
      <section className="mt-2 border-t border-wb-stone/10 pt-4">
        <h3 className="text-[10px] font-black uppercase tracking-tighter text-wb-stone/40 mb-3">Intervención Divina</h3>
        <div className="flex flex-col gap-2">
          {Object.values(MIRACLES_CATALOG).map((m) => {
            const alreadyHas = npc.traits.includes(m.traitId);
            const noPool = village.gratitude < m.cost;
            const disabled = !npc.alive || alreadyHas || noPool || atCap;
            
            return (
              <button
                key={m.id}
                disabled={disabled}
                onClick={() => onGrantMiracle(m.id)}
                className={`pixel-button text-[10px] flex justify-between items-center ${
                  disabled ? 'opacity-40 grayscale pointer-events-none' : 'hover:scale-[1.02]'
                }`}
              >
                <span>{m.nameCastellano}</span>
                <div className="flex items-center gap-1">
                  <Image src="/ui/ui_aura_faith.svg" alt="F" width={10} height={10} className="image-pixelated" />
                  <span>{m.cost}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
