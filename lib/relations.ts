/**
 * Grafo de relaciones NPC×NPC — Sprint 4.4.
 *
 * CLAUDE-primigenia §1: shape canónico Array<Edge> ordenada por
 * (type, from, to) lex. Sin Map/Set en el estado. Ops puras. Enteros.
 *
 * Consumidores:
 *   - tickNeeds (Sprint 4.1+): deuda impagada drena socialización.
 *   - crónica: puede narrar deudas y salvamentos.
 *   - verdict (Fase 6): cuenta favores para el balance final.
 */

export type RelationType = 'debt' | 'favor' | 'kinship' | 'saved';

export interface Edge {
  from: string;
  to: string;
  type: RelationType;
  /** Entero. Para debt: cantidad debida. Para saved: nº de salvamentos. */
  weight: number;
  createdAtTick: number;
  /** null = permanente. Número = tick en que caduca y debe eliminarse. */
  expiresAtTick: number | null;
}

function typeOrder(t: RelationType): number {
  switch (t) {
    case 'debt':
      return 0;
    case 'favor':
      return 1;
    case 'kinship':
      return 2;
    case 'saved':
      return 3;
  }
}

function compareEdges(a: Edge, b: Edge): number {
  const dt = typeOrder(a.type) - typeOrder(b.type);
  if (dt !== 0) return dt;
  if (a.from !== b.from) return a.from < b.from ? -1 : 1;
  if (a.to !== b.to) return a.to < b.to ? -1 : 1;
  return 0;
}

function sortCanonical(edges: readonly Edge[]): Edge[] {
  return [...edges].sort(compareEdges);
}

function findIdx(
  edges: readonly Edge[],
  type: RelationType,
  from: string,
  to: string,
): number {
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    if (e.type === type && e.from === from && e.to === to) return i;
  }
  return -1;
}

export function addDebt(
  edges: readonly Edge[],
  from: string,
  to: string,
  amount: number,
  tick: number,
): Edge[] {
  if (amount <= 0) return sortCanonical(edges);
  const idx = findIdx(edges, 'debt', from, to);
  if (idx >= 0) {
    const next = [...edges];
    next[idx] = { ...next[idx], weight: next[idx].weight + amount };
    return sortCanonical(next);
  }
  const edge: Edge = {
    from,
    to,
    type: 'debt',
    weight: amount,
    createdAtTick: tick,
    expiresAtTick: null,
  };
  return sortCanonical([...edges, edge]);
}

export function settleFavor(
  edges: readonly Edge[],
  from: string,
  to: string,
  amount: number,
): Edge[] {
  const idx = findIdx(edges, 'debt', from, to);
  if (idx < 0) return sortCanonical(edges);
  const current = edges[idx];
  const newWeight = current.weight - amount;
  if (newWeight <= 0) {
    // Eliminar edge.
    const next = edges.filter((_, i) => i !== idx);
    return sortCanonical(next);
  }
  const next = [...edges];
  next[idx] = { ...current, weight: newWeight };
  return sortCanonical(next);
}

export function recordSaved(
  edges: readonly Edge[],
  savior: string,
  saved: string,
  tick: number,
): Edge[] {
  const idx = findIdx(edges, 'saved', savior, saved);
  if (idx >= 0) {
    const next = [...edges];
    next[idx] = { ...next[idx], weight: next[idx].weight + 1 };
    return sortCanonical(next);
  }
  const edge: Edge = {
    from: savior,
    to: saved,
    type: 'saved',
    weight: 1,
    createdAtTick: tick,
    expiresAtTick: null,
  };
  return sortCanonical([...edges, edge]);
}

/** Consulta derivada (no persiste índice). Devuelve 0 si no hay
 *  deuda. */
export function debtBetween(
  edges: readonly Edge[],
  from: string,
  to: string,
): number {
  const idx = findIdx(edges, 'debt', from, to);
  return idx >= 0 ? edges[idx].weight : 0;
}
