'use client';

import React from 'react';
import Image from 'next/image';

interface DivineHeaderProps {
  godType: 'sea' | 'stone' | 'wind';
  faith: number;
  maxFaith: number;
  gratitude: number;
  maxGratitude: number;
  currentWind: string;
}

export const DivineHeader: React.FC<DivineHeaderProps> = ({
  godType,
  faith,
  maxFaith,
  gratitude,
  maxGratitude,
  currentWind
}) => {
  const portraitSrc = `/ui/god_portrait_${godType}.svg`;
  
  const faithPct = Math.min(100, (faith / maxFaith) * 100);
  const gratitudePct = Math.min(100, (gratitude / maxGratitude) * 100);

  return (
    <header className="fixed top-0 left-0 w-full p-4 pointer-events-none z-50">
      <div className="flex flex-col items-center gap-4 max-w-7xl mx-auto">
        {/* Top Row: God (Left) and Wind (Right) - Simplified to avoid right edge */}
        <div className="flex justify-between w-full items-start">
          <div className="flex gap-4 items-center pointer-events-auto">
            <div className="pixel-box-dark w-20 h-24 flex items-center justify-center bg-wb-stone overflow-hidden border-wb-gold">
              <Image 
                src={portraitSrc} 
                alt={`Portrait of ${godType} God`} 
                width={70} 
                height={70} 
                className="image-pixelated"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              {/* Faith Bar */}
              <div className="w-56">
                <div className="flex justify-between text-[10px] font-bold uppercase text-wb-stone mb-0.5">
                  <span>Fe Sagrada</span>
                  <span>{Math.floor(faith)}/{maxFaith}</span>
                </div>
                <div className="pixel-bar-bg bg-wb-slate/30 border-wb-stone h-4">
                  <div 
                    className="pixel-bar-fill bg-wb-cyan shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.3)]" 
                    style={{ width: `${faithPct}%` }}
                  />
                </div>
              </div>

              {/* Gratitude Bar */}
              <div className="w-56">
                <div className="flex justify-between text-[10px] font-bold uppercase text-wb-stone mb-0.5">
                  <span>Gratitud</span>
                  <span>{Math.floor(gratitude)}/{maxGratitude}</span>
                </div>
                <div className="pixel-bar-bg bg-wb-slate/30 border-wb-stone h-4">
                  <div 
                    className="pixel-bar-fill bg-wb-gold shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.3)]" 
                    style={{ width: `${gratitudePct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Wind Indicator Section - Moved slightly away from the right edge */}
          <div className="pointer-events-auto flex flex-col items-center mr-80">
            <div className="pixel-box-dark p-1.5 flex flex-col items-center bg-wb-stone border-wb-gold">
               <div className="text-[9px] font-bold uppercase text-wb-gold mb-1">Viento</div>
               <div className="relative w-12 h-12">
                  <Image 
                    src="/ui/ui_compass_vientos.svg" 
                    alt="Wind Compass" 
                    width={48} 
                    height={48}
                    className="image-pixelated"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-bold text-[9px] shadow-black drop-shadow-md">{currentWind}</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
