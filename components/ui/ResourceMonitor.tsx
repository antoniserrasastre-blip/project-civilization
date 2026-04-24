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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
      <div className="pixel-box-dark bg-wb-stone/90 flex gap-1 p-1 items-center border-wb-slate">
        {resources.map((res) => (
          <div 
            key={res.id} 
            className="flex items-center gap-2 px-3 py-1 bg-black/20 border-r border-wb-slate last:border-0 min-w-[80px]"
            title={res.name}
          >
            <div className="relative w-6 h-6 flex-shrink-0">
               <Image 
                src={`/resources/${res.id}.svg`} 
                alt={res.name}
                width={24}
                height={24}
                className="image-pixelated object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-wb-parchment leading-none">
                {res.amount >= 1000 ? `${(res.amount / 1000).toFixed(1)}k` : res.amount}
              </span>
              {res.trend && (
                <span className={`text-[8px] font-bold uppercase leading-none ${
                  res.trend === 'up' ? 'text-green-400' : res.trend === 'down' ? 'text-red-400' : 'text-wb-slate'
                }`}>
                  {res.trend === 'up' ? '▲' : res.trend === 'down' ? '▼' : '●'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
