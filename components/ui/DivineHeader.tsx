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
    <div className="flex gap-4 items-center pointer-events-auto">
      <div className="pixel-box-dark w-16 h-20 flex items-center justify-center bg-wb-stone overflow-hidden border-wb-gold">
        <Image 
          src={portraitSrc} 
          alt={`Portrait of ${godType} God`} 
          width={56} 
          height={56} 
          className="image-pixelated"
        />
      </div>
      
      <div className="flex flex-col gap-1">
        {/* Faith Bar */}
        <div className="w-48">
          <div className="flex justify-between text-[9px] font-bold uppercase text-wb-stone mb-0.5">
            <span>Fe Sagrada</span>
            <span>{Math.floor(faith)}</span>
          </div>
          <div className="pixel-bar-bg bg-wb-slate/30 border-wb-stone h-2">
            <div 
              className="pixel-bar-fill bg-wb-cyan shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.3)]" 
              style={{ width: `${faithPct}%` }}
            />
          </div>
        </div>

        {/* Gratitude Bar */}
        <div className="w-48">
          <div className="flex justify-between text-[9px] font-bold uppercase text-wb-stone mb-0.5">
            <span>Gratitud</span>
            <span>{Math.floor(gratitude)}</span>
          </div>
          <div className="pixel-bar-bg bg-wb-slate/30 border-wb-stone h-2">
            <div 
              className="pixel-bar-fill bg-wb-gold shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.3)]" 
              style={{ width: `${gratitudePct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
