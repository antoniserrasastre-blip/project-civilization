'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, Map as MapIcon, Layers, Info, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  classifyPixel,
  GRID_SIZE,
  type TerrainCell,
} from '@/lib/pixel-parser';

export default function MapGenerator() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [grid, setGrid] = useState<TerrainCell[][] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        processImage(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const processImage = (img: HTMLImageElement) => {
    setIsProcessing(true);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // We process at a fixed resolution for the game grid
    canvas.width = GRID_SIZE;
    canvas.height = GRID_SIZE;
    ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE);

    const imageData = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;
    const newGrid: TerrainCell[][] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      const row: TerrainCell[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const idx = (y * GRID_SIZE + x) * 4;
        const r = imageData[idx];
        const g = imageData[idx + 1];
        const b = imageData[idx + 2];

        row.push(classifyPixel(r, g, b));
      }
      newGrid.push(row);
    }

    setGrid(newGrid);
    setIsProcessing(false);
  };

  const drawTacticalMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !grid) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = grid[y][x];
        ctx.fillStyle = cell.color;
        
        // Draw the tactical square
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

        // Add "OpenFront" style grid/details
        if (cellSize > 4) {
            ctx.strokeStyle = 'rgba(0,0,0,0.05)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }

        // Add icons or markers for specific heights/depths
        if (cell.type === 'mountain' && cell.intensity > 0.7) {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.moveTo(x * cellSize + cellSize/2, y * cellSize + 2);
            ctx.lineTo(x * cellSize + 2, y * cellSize + cellSize - 2);
            ctx.lineTo(x * cellSize + cellSize - 2, y * cellSize + cellSize - 2);
            ctx.fill();
        }
      }
    }
  }, [grid]);

  useEffect(() => {
    if (grid && canvasRef.current) {
      drawTacticalMap();
    }
  }, [grid, drawTacticalMap]);

  return (
    <Card className="border-slate-200 overflow-hidden bg-white shadow-sm">
      <CardHeader className="p-6 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 tracking-tight">
            <MapIcon className="w-5 h-5 text-orange-500" />
            CARTOGRAFÍA DIVINA (Image-to-World)
          </CardTitle>
          <CardDescription>Sube una imagen para generar la topografía del mundo.</CardDescription>
        </div>
        <div className="flex gap-2">
           <Input 
             type="file" 
             accept="image/*" 
             onChange={handleFileUpload} 
             className="hidden" 
             id="map-upload"
           />
           <Button variant="outline" size="sm" onClick={() => document.getElementById('map-upload')?.click()}>
             <Upload className="w-4 h-4" /> Importar Mapa
           </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Visualizer */}
          <div className="lg:col-span-8 bg-slate-100 rounded-2xl aspect-square relative overflow-hidden flex items-center justify-center border-2 border-slate-200 shadow-inner">
            {grid ? (
              <canvas 
                ref={canvasRef} 
                width={800} 
                height={800} 
                className="w-full h-full object-contain cursor-crosshair transition-transform active:scale-[1.02]"
              />
            ) : (
              <div className="text-center p-8">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-400 font-medium italic">Esperando datos cartográficos...</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-2">Sube una imagen para procesar el terreno</p>
              </div>
            )}
            {isProcessing && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Analizando Píxeles...</p>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Leyenda de Terreno</h4>
              <div className="space-y-3">
                {[
                  { label: 'Océanos/Lagos', color: 'bg-blue-500', desc: 'Navegación & Pesca', type: 'water' },
                  { label: 'Tierras Fértiles', color: 'bg-emerald-500', desc: 'Agricultura & Madera', type: 'plain' },
                  { label: 'Macizos Montañosos', color: 'bg-slate-500', desc: 'Minería & Defensa', type: 'mountain' },
                  { label: 'Áreas Glaciares', color: 'bg-slate-100 border border-slate-200', desc: 'Supervivencia Extrema', type: 'glacier' },
                ].map((item) => (
                  <div key={item.type} className="flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-slate-100 transition-all cursor-default group">
                    <div className={`w-10 h-10 rounded-lg ${item.color} shrink-0 shadow-sm`} />
                    <div>
                      <p className="text-xs font-bold text-slate-900 group-hover:text-orange-600 transition-colors uppercase tracking-tight">{item.label}</p>
                      <p className="text-[10px] text-slate-500 italic">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Análisis Geográfico</h4>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {grid ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-tight">
                      <span className="text-slate-500 italic">Prevalencia:</span>
                      <span className="text-orange-600">Terreno Detectado</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex">
                        <div className="h-full bg-blue-400" style={{ width: '40%' }} />
                        <div className="h-full bg-emerald-400" style={{ width: '30%' }} />
                        <div className="h-full bg-slate-400" style={{ width: '20%' }} />
                        <div className="h-full bg-slate-50" style={{ width: '10%' }} />
                    </div>
                    <p className="text-[9px] text-slate-400 italic mt-2">
                      * El sistema ha identificado biomas viables para la expansión de civilizaciones.
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center py-4">No hay datos para mostrar</p>
                )}
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-orange-400 shrink-0" />
                <p className="text-[10px] text-orange-700 leading-relaxed italic">
                  <strong>TIP DIVINO:</strong> Los colores más oscuros en el mapa sugieren mayor profundidad o elevación. Los &quot;Hijos del Viento&quot; buscarán las zonas verdes más intensas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
