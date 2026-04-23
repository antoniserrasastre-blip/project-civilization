'use client';

import React from 'react';
import Image from 'next/image';

export interface EurekaEvent {
  id: string;
  techId: string;
  techName: string;
  progress: number;
  description: string;
}

interface EurekaToastProps {
  events: EurekaEvent[];
}

export const EurekaToast: React.FC<EurekaToastProps> = ({ events }) => {
  return (
    <div className="fixed bottom-20 left-4 flex flex-col gap-3 z-50 pointer-events-none">
      {events.map((event) => (
        <div 
          key={event.id}
          className="pixel-box p-3 w-80 flex gap-4 animate-in slide-in-from-left duration-300 pointer-events-auto bg-wb-parchment"
        >
          {/* Tech Icon Area */}
          <div className="flex-shrink-0 w-16 h-16 bg-wb-stone/10 border-2 border-wb-stone flex items-center justify-center p-1">
            <div className="relative w-full h-full">
               <Image 
                src={`/ui/tech_${event.techId}.svg`} 
                alt={event.techName}
                fill
                className="image-pixelated object-contain"
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-grow flex flex-col justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-wb-stone/60 font-bold uppercase">¡Eureka! Nueva Idea</span>
              <h3 className="text-sm font-bold text-wb-stone leading-tight">{event.techName}</h3>
            </div>
            
            <div className="mt-2">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-[9px] text-wb-stone/70 font-mono">PROGRESO</span>
                <span className="text-[9px] font-bold text-wb-stone">{event.progress}%</span>
              </div>
              <div className="pixel-bar-bg h-3 relative">
                 {/* Progress Frame Overlay */}
                 <div className="absolute inset-0 z-10 opacity-30 pointer-events-none">
                    <Image 
                      src="/ui/ui_progress_frame.svg" 
                      alt="" 
                      fill
                      className="object-stretch"
                    />
                 </div>
                 <div 
                  className="pixel-bar-fill bg-wb-gold relative z-0" 
                  style={{ width: `${event.progress}%` }}
                 />
              </div>
            </div>
          </div>

          {/* Sparkle Decoration */}
          <div className="absolute -top-2 -right-2">
             <Image 
                src="/ui/vfx_eureka_moment.svg" 
                alt="" 
                width={24} 
                height={24}
                className="image-pixelated"
              />
          </div>
        </div>
      ))}
    </div>
  );
};
