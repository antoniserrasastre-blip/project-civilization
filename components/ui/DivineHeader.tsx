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
      <div className="flex justify-between items-start max-w-7xl mx-auto">
        {/* God Section */}
        <div className="flex gap-4 items-center pointer-events-auto">
          <div className="pixel-box-dark w-24 h-24 flex items-center justify-center bg-wb-stone overflow-hidden border-wb-gold">
            <Image 
              src={portraitSrc} 
              alt={`Portrait of ${godType} God`} 
              width={80} 
              height={80} 
              className="image-pixelated"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            {/* Faith Bar */}
            <div className="w-64">
              <div className="flex justify-between text-xs font-bold uppercase text-wb-stone mb-1 tracking-wider">
                <span>Fe Sagrada</span>
                <span>{Math.floor(faith)}/{maxFaith}</span>
              </div>
              <div className="pixel-bar-bg bg-wb-slate/30 border-wb-stone h-6">
                <div 
                  className="pixel-bar-fill bg-wb-cyan shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.3)]" 
                  style={{ width: `${faithPct}%` }}
                />
              </div>
            </div>

            {/* Gratitude Bar */}
            <div className="w-64">
              <div className="flex justify-between text-xs font-bold uppercase text-wb-stone mb-1 tracking-wider">
                <span>Gratitud Colectiva</span>
                <span>{Math.floor(gratitude)}/{maxGratitude}</span>
              </div>
              <div className="pixel-bar-bg bg-wb-slate/30 border-wb-stone h-6">
                <div 
                  className="pixel-bar-fill bg-wb-gold shadow-[inset_0_-2px_0_0_rgba(0,0,0,0.3)]" 
                  style={{ width: `${gratitudePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Wind Indicator Section */}
        <div className="pointer-events-auto flex flex-col items-center">
          <div className="pixel-box-dark p-2 flex flex-col items-center bg-wb-stone border-wb-gold">
             <div className="text-[10px] font-bold uppercase text-wb-gold mb-1">Viento del Día</div>
             <div className="relative w-16 h-16">
                <Image 
                  src="/ui/ui_compass_vientos.svg" 
                  alt="Wind Compass" 
                  width={64} 
                  height={64}
                  className="image-pixelated"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white font-bold text-xs shadow-black drop-shadow-md">{currentWind}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </header>
  );
};
