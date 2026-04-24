'use client';

import React from 'react';
import Image from 'next/image';

export interface EurekaEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface EurekaToastProps {
  events: EurekaEvent[];
  onDismiss: (id: string) => void;
}

export const EurekaToast: React.FC<EurekaToastProps> = ({ events, onDismiss }) => {
  return (
    <div className="fixed bottom-24 left-4 flex flex-col gap-3 z-50 pointer-events-none">
      {events.map((event) => (
        <div 
          key={event.id}
          onClick={() => onDismiss(event.id)}
          className="pixel-box relative p-3 w-80 flex gap-4 animate-in slide-in-from-left duration-500 pointer-events-auto bg-wb-parchment shadow-2xl cursor-pointer hover:brightness-110 active:translate-y-0.5 transition-all"
          title="Click para descartar"
        >
          {/* Tech Icon Area */}
          <div className="flex-shrink-0 w-16 h-16 bg-wb-stone/10 border-2 border-wb-stone flex items-center justify-center p-1">
            <div className="relative w-full h-full">
               <Image 
                src={event.icon} 
                alt={event.title}
                fill
                className="image-pixelated object-contain"
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-grow flex flex-col justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] text-wb-stone/60 font-bold uppercase">¡Eureka! Nueva Idea</span>
              <h3 className="text-sm font-bold text-wb-stone leading-tight">{event.title}</h3>
            </div>
            <p className="text-[10px] text-wb-stone/80 mt-1">{event.description}</p>
          </div>

          {/* Sparkle Decoration */}
          <div className="absolute -top-2 -right-2">
             <Image 
                src="/ui/vfx_eureka_moment.svg" 
                alt="Eureka Sparkle" 
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
