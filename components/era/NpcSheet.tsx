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
import { itemForNpc, ITEM_KIND } from '@/lib/items';

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
    const img = new Image();
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
          {role && (
            <div className="text-xs text-wb-blood font-bold mt-2">
              {roleLabel(role)}
            </div>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <section className="bg-black/5 p-2 border-b border-wb-stone/10">
        <h3 className="text-[10px] font-black uppercase tracking-tighter text-wb-stone/40 mb-2">Esencia Vital</h3>
        <div className="grid grid-cols-2 gap-2">
           <div className="flex flex-col">
             <span className="text-[9px] opacity-60">Supervivencia</span>
             <span className="text-sm font-bold">{Math.round(npc.stats.supervivencia)}</span>
           </div>
           <div className="flex flex-col">
             <span className="text-[9px] opacity-60">Socialización</span>
             <span className="text-sm font-bold">{Math.round(npc.stats.socializacion)}</span>
           </div>
        </div>
      </section>

      {/* Skills Section */}
      <section>
        <h3 className="text-[10px] font-black uppercase tracking-tighter text-wb-stone/40 mb-3">Maestrías</h3>
        <div className="flex flex-col gap-3">
          {(Object.keys(SKILL_INFO) as Array<keyof typeof SKILL_INFO>).map((key) => {
            const skill = SKILL_INFO[key];
            const value = Math.round(npc.skills[key]);
            const pct = Math.max(0, Math.min(100, value));
            
            return (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 relative">
                      <Image 
                        src={`/ui/skill_${skill.icon}.svg`} 
                        alt="" 
                        width={20} 
                        height={20} 
                        className="image-pixelated"
                      />
                    </div>
                    <span className="text-xs font-bold">{skill.label}</span>
                  </div>
                  <span className="text-xs font-mono">{value}</span>
                </div>
                <div className="pixel-bar-bg h-2">
                  <div className="pixel-bar-fill bg-wb-slate" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
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
