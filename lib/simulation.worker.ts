import { tick } from './simulation';
import type { GameState } from './game-state';

const LOG_INTERVAL = 96;      // resumen cada ~12s de juego
const DETAIL_INTERVAL = 480;  // detalle completo cada día
const LOOP_WINDOW = 10;        // ticks de historial para detectar bucle

// Historial de destinos por NPC para detectar oscilaciones
const destHistory = new Map<string, Array<string>>();

function invStr(inv: any): string {
  const parts: string[] = [];
  if (inv.berry  > 0) parts.push(`🍇${inv.berry}`);
  if (inv.fish   > 0) parts.push(`🐟${inv.fish}`);
  if (inv.game   > 0) parts.push(`🦌${inv.game}`);
  if (inv.wood   > 0) parts.push(`🪵${inv.wood}`);
  if (inv.stone  > 0) parts.push(`🪨${inv.stone}`);
  if (inv.shell  > 0) parts.push(`🐚${inv.shell}`);
  if (inv.obsidian > 0) parts.push(`💎${inv.obsidian}`);
  return parts.length ? parts.join(' ') : '∅';
}

function totalInv(inv: any): number {
  return (inv.berry||0)+(inv.fish||0)+(inv.game||0)+
         (inv.wood||0)+(inv.stone||0)+(inv.shell||0)+
         (inv.obsidian||0)+(inv.clay||0)+(inv.coconut||0);
}

function detectLoop(npcId: string, dest: string): boolean {
  const hist = destHistory.get(npcId) ?? [];
  hist.push(dest);
  if (hist.length > LOOP_WINDOW) hist.shift();
  destHistory.set(npcId, hist);
  if (hist.length < LOOP_WINDOW) return false;
  // Bucle = alternancia entre exactamente 2 posiciones distintas
  const unique = new Set(hist);
  return unique.size === 2;
}

self.onmessage = (e: MessageEvent) => {
  const { type, state } = e.data;

  if (type !== 'TICK') return;

  try {
    const nextState = tick(state as GameState);
    const t = nextState.tick;
    const day = Math.floor(t / 480);
    const alive = nextState.npcs.filter((n: any) => n.alive);

    // ── RESUMEN PERIÓDICO ──────────────────────────────────────────────
    if (t % LOG_INTERVAL === 0) {
      const avgSv  = alive.length ? Math.round(alive.reduce((s: number, n: any) => s + n.stats.supervivencia,  0) / alive.length) : 0;
      const avgSoc = alive.length ? Math.round(alive.reduce((s: number, n: any) => s + n.stats.socializacion, 0) / alive.length) : 0;
      const avgFear= alive.length ? Math.round(alive.reduce((s: number, n: any) => s + (n.stats.miedo||0),    0) / alive.length) : 0;
      const atDest = alive.filter((n: any) => n.destination?.x === n.position.x && n.destination?.y === n.position.y).length;
      const totalFood = alive.reduce((s: number, n: any) => s + n.inventory.berry + n.inventory.fish + n.inventory.game, 0);
      const structs = nextState.structures.map((s: any) => s.kind).join(' ') || '—';
      const techs   = nextState.tech?.unlocked?.join(' ') || '—';
      console.log(
        `%c[T${t}|D${day}] sv:${avgSv} soc:${avgSoc} miedo:${avgFear} | food:${totalFood} | parados:${atDest}/${alive.length} | fe:${Math.floor(nextState.village.faith)} grat:${Math.floor(nextState.village.gratitude)}`,
        'color:#ffd080'
      );
      console.log(`         structs:[${structs}] | techs:[${techs}]`);
    }

    // ── DETALLE COMPLETO POR DÍA ───────────────────────────────────────
    if (t % DETAIL_INTERVAL === 0 && t > 0) {
      console.group(`%c📋 DÍA ${day} — Estado detallado`, 'color:#88ffaa;font-weight:bold');

      // Items en circulación
      const items = nextState.items ?? [];
      if (items.length > 0) {
        console.group('🔧 Items');
        items.forEach((it: any) => {
          const owner = nextState.npcs.find((n: any) => n.id === it.ownerNpcId);
          const equipped = owner?.equippedItemId === it.id;
          console.log(`  ${equipped ? '⚔' : '○'} [${it.rank}] ${it.name} (${it.kind}) — ${owner?.name ?? 'sin dueño'} dur:${Math.round(it.durability)}/${it.maxDurability}`);
        });
        console.groupEnd();
      } else {
        console.log('🔧 Items: ninguno fabricado aún');
      }

      // Estado por NPC
      console.group('👥 NPCs');
      alive.forEach((n: any) => {
        const dest = n.destination;
        const atPos = dest?.x === n.position.x && dest?.y === n.position.y;
        const destKey = dest ? `${dest.x},${dest.y}` : 'null';
        const isLoop = detectLoop(n.id, destKey);
        const item = items.find((it: any) => it.id === n.equippedItemId);
        const sv   = Math.round(n.stats.supervivencia);
        const soc  = Math.round(n.stats.socializacion);
        const fear = Math.round(n.stats.miedo || 0);
        const prop = Math.round(n.stats.proposito || 0);
        const inv  = invStr(n.inventory);
        const cap  = totalInv(n.inventory);
        const svColor = sv < 25 ? '🔴' : sv < 45 ? '🟡' : '🟢';
        const loopWarn = isLoop ? ' ♻️BUCLE' : '';
        const stuckWarn = atPos ? ' 🔴PARADO' : '';
        console.log(
          `  ${svColor}${n.name} [${n.vocation}] pos(${n.position.x},${n.position.y}) dest→(${dest?.x??'?'},${dest?.y??'?'})${stuckWarn}${loopWarn}`,
        );
        console.log(
          `     sv:${sv} soc:${soc} miedo:${fear} prop:${prop} | inv(${cap}/140): ${inv} | item:${item ? item.name : '—'}`
        );
      });
      console.groupEnd();

      // Inventario del clan agregado
      const clanInv = alive.reduce((acc: any, n: any) => {
        Object.keys(n.inventory).forEach(k => { acc[k] = (acc[k]||0) + n.inventory[k]; });
        return acc;
      }, {} as any);
      console.log('📦 Clan inv:', Object.entries(clanInv).filter(([,v]) => (v as number) > 0).map(([k,v]) => `${k}:${v}`).join(' ') || '∅');

      console.groupEnd();
    }

    // ── DETECCIÓN DE BUCLES TICK A TICK ──────────────────────────────
    // Solo activo los primeros días para no saturar la consola
    if (t < 960) {
      alive.forEach((n: any) => {
        const dest = n.destination;
        const destKey = dest ? `${dest.x},${dest.y}` : 'null';
        if (detectLoop(n.id, destKey)) {
          const hist = destHistory.get(n.id) ?? [];
          const unique = [...new Set(hist)];
          console.warn(`♻️ BUCLE [T${t}] ${n.name} [${n.vocation}] oscila entre ${unique.join(' ↔ ')} sv:${Math.round(n.stats.supervivencia)} inv:${invStr(n.inventory)}`);
        }
      });
    }

    self.postMessage({ type: 'TICK_SUCCESS', state: nextState });
  } catch (error) {
    console.error('[SimulationWorker] Error during tick:', error);
    self.postMessage({ type: 'TICK_ERROR', error: (error as Error).message });
  }
};
