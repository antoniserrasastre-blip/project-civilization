'use client';

/**
 * Panel de debug en pantalla — activar/desactivar con Ctrl+D.
 * Muestra estado por NPC: rol, stats, destino, razón de la decisión.
 * Solo para desarrollo — no afecta la lógica del juego.
 */

import React, { useEffect, useState } from 'react';
import type { NPC } from '@/lib/npcs';
import type { GameState } from '@/lib/game-state';
import { computeRole } from '@/lib/roles';
import { TICKS_PER_DAY } from '@/lib/resources';
import { NEED_THRESHOLDS } from '@/lib/needs';

interface Props {
  state: GameState;
}

function dayPhaseLabel(tick: number): string {
  const pos = tick % TICKS_PER_DAY;
  const pct = pos / TICKS_PER_DAY;
  if (pct < 0.70) return `Día ${(pct * 100).toFixed(0)}%`;
  if (pct < 0.85) return `🌇 Atardecer ${(pct * 100).toFixed(0)}%`;
  return `🌙 Noche ${(pct * 100).toFixed(0)}%`;
}

function npcReason(npc: NPC, state: GameState): string {
  const sv = npc.stats.supervivencia;
  const soc = npc.stats.socializacion;
  const pos = state.tick % TICKS_PER_DAY;
  const pct = pos / TICKS_PER_DAY;
  const dest = npc.destination;
  const atDest = dest && dest.x === npc.position.x && dest.y === npc.position.y;

  if (!npc.alive) return '💀 muerto';
  if (pct >= 0.85 && sv >= NEED_THRESHOLDS.supervivenciaBuildReady) return '🌙 dusk-profundo→fuego';
  if (pct >= 0.85) {
    const inv = (npc.inventory.berry ?? 0) + (npc.inventory.game ?? 0) + (npc.inventory.fish ?? 0);
    if (inv > 0) return '🌙 dusk-profundo+comida→fuego';
    return `🌙 dusk-profundo sin comida (sv=${sv})`;
  }
  if (pct >= 0.70 && sv >= NEED_THRESHOLDS.supervivenciaBuildReady) return '🌇 dusk-temprano→fuego';
  if (sv < NEED_THRESHOLDS.supervivenciaCritical) return `🚨 sv crítica=${sv}→agua`;
  if (sv < NEED_THRESHOLDS.supervivenciaBuildReady) {
    const inv = (npc.inventory.berry ?? 0) + (npc.inventory.game ?? 0) + (npc.inventory.fish ?? 0);
    if (inv > 0) return `🍖 tiene comida inv=${inv} sv=${sv}`;
    return `🍖 busca comida sv=${sv}`;
  }
  if (soc < NEED_THRESHOLDS.socializacionLow) return `💬 soc baja=${soc}→centroide`;
  if (atDest) return `✅ en destino (${dest?.x},${dest?.y})`;
  if (!dest || (dest.x === npc.position.x && dest.y === npc.position.y)) return '😴 sin destino';
  return `🔨 rol: herramienta/oficio`;
}

function npcDestLabel(npc: NPC): string {
  if (!npc.destination) return '—';
  const { x, y } = npc.destination;
  const atPos = x === npc.position.x && y === npc.position.y;
  return atPos ? `(${x},${y}) ✓aquí` : `→(${x},${y})`;
}

export function DebugOverlay({ state }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'd') { e.preventDefault(); setVisible((v) => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!visible) {
    return (
      <div style={{ position: 'fixed', bottom: 8, right: 8, fontSize: 10, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
        Ctrl+D debug
      </div>
    );
  }

  const fire = state.structures.find((s) => s.kind === 'fogata_permanente');
  const pos = state.tick % TICKS_PER_DAY;
  const alive = state.npcs.filter((n) => n.alive);

  return (
    <div style={{
      position: 'fixed', top: 8, right: 8, width: 340, maxHeight: '90vh',
      overflowY: 'auto', background: 'rgba(0,0,0,0.88)', color: '#e8e0c8',
      fontFamily: 'monospace', fontSize: 11, padding: '8px 10px', borderRadius: 6,
      zIndex: 9999, lineHeight: 1.4, border: '1px solid rgba(255,200,80,0.3)',
    }}>
      <div style={{ color: '#ffd080', marginBottom: 4, fontWeight: 'bold' }}>
        🛠 DEBUG — Ctrl+D cierra
      </div>
      <div>Tick {state.tick} | Día {Math.floor(state.tick / TICKS_PER_DAY)} | {dayPhaseLabel(state.tick)}</div>
      <div>posEnDía {pos}/{TICKS_PER_DAY} ({(pos / TICKS_PER_DAY * 100).toFixed(0)}%)</div>
      <div>Fuego: {fire ? `(${fire.position.x},${fire.position.y})` : 'sin construir'}</div>
      <div>NPCs vivos: {alive.length} / {state.npcs.length}</div>
      <div>Recursos activos: {state.world.resources.filter((r) => r.quantity > 0).length}</div>
      <hr style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '4px 0' }} />
      {state.npcs.map((npc) => {
        const role = computeRole(npc, state.items?.find((i) => i.id === npc.equippedItemId) ?? null);
        const inv = npc.inventory;
        const invStr = Object.entries(inv).filter(([, v]) => v > 0).map(([k, v]) => `${k[0]}:${v}`).join(' ');
        return (
          <div key={npc.id} style={{ marginBottom: 5, padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: npc.alive ? '#a8d8a8' : '#888' }}>
              <b>{npc.name}</b> [{role}] pos({npc.position.x},{npc.position.y})
            </div>
            <div style={{ color: '#ccc' }}>
              sv:{npc.stats.supervivencia} soc:{npc.stats.socializacion} | dest:{npcDestLabel(npc)}
            </div>
            <div style={{ color: '#ffd080' }}>{npcReason(npc, state)}</div>
            {invStr && <div style={{ color: '#88bbff' }}>inv: {invStr}</div>}
          </div>
        );
      })}
    </div>
  );
}
