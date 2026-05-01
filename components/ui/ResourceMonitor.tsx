'use client';

import React from 'react';
import Image from 'next/image';

export interface ResourceData {
  id: string;
  name: string;
  amount: number;
  trend?: 'up' | 'down' | 'stable';
}

interface ResourceMonitorProps {
  resources: ResourceData[];
}

export const ResourceMonitor: React.FC<ResourceMonitorProps> = ({ resources }) => {
  return (
    <div className="pixel-box-dark bg-stone-900/90 flex gap-2 p-1.5 items-center border-wb-stone/20 shadow-2xl backdrop-blur-sm">
      {resources.map((res) => (
        <div 
          key={res.id} 
          className="flex items-center gap-2 px-3 py-1 bg-black/40 border-r border-white/5 last:border-0 min-w-[90px]"
          title={res.name}
        >
          <div className="relative w-5 h-5 flex-shrink-0">
             <Image 
              src={`/resources/${res.id}.svg`} 
              alt={res.name}
              width={20}
              height={20}
              className="image-pixelated object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-black text-wb-parchment leading-tight">
              {res.amount >= 1000 ? `${(res.amount / 1000).toFixed(1)}k` : res.amount}
            </span>
            <span className="text-[7px] text-wb-gold/60 uppercase font-bold tracking-tighter">{res.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
