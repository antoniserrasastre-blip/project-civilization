/**
 * Página principal — Edad Primigenia jugable.
 *
 * Server component: lee `?seed=` de la URL, lo normaliza a entero y
 * delega al `GameShell` (client component). La separación evita el
 * patrón "setState dentro de useEffect" al leer `window.location` y
 * mantiene hidratación limpia: SSR y cliente renderizan el mismo
 * seed.
 *
 * Fallback seed `1` documentado; cualquier `?seed=N` entero positivo
 * o negativo se usa tal cual. Inputs inválidos caen al default.
 */

import { GameShell } from '@/components/era/GameShell';

const DEFAULT_SEED = 1;

function parseSeed(raw: string | string[] | undefined): number {
  if (typeof raw !== 'string') return DEFAULT_SEED;
  const n = Number(raw);
  return Number.isFinite(n) && Number.isInteger(n) ? n : DEFAULT_SEED;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const seed = parseSeed(params.seed);
  return <GameShell seed={seed} />;
}
