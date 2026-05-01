'use client';

import { useEffect, useRef } from 'react';
import Stats from 'stats.js';

export function PerformanceStats() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    
    const dom = stats.dom;
    dom.style.position = 'fixed';
    dom.style.bottom = '10px';
    dom.style.right = '10px';
    dom.style.top = 'auto';
    dom.style.left = 'auto';
    dom.style.zIndex = '10000';
    
    containerRef.current?.appendChild(dom);

    const animate = () => {
      stats.begin();
      stats.end();
      requestAnimationFrame(animate);
    };

    const rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      containerRef.current?.removeChild(dom);
    };
  }, []);

  return <div ref={containerRef} />;
}
