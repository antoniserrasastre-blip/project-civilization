/**
 * Endpoint stub para enriquecimiento de crónica vía LLM — v0.4.
 *
 * Responde 501 cuando `ANTHROPIC_API_KEY` no está configurado. Cuando
 * se configure la clave y se implemente la llamada real, esta ruta
 * recibirá `{ day, text, context }` y devolverá `{ text: enhanced }`
 * tras pasar por Claude con el system prompt partisano de §9.
 *
 * Contrato de seguridad (ver NOTES-OVERNIGHT.md):
 *   - La API key NUNCA se expone al cliente.
 *   - Las llamadas al LLM se rate-limitan (TODO).
 *   - El cliente recibe el texto ya filtrado.
 */

import { NextResponse } from 'next/server';

export async function POST() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error: 'ANTHROPIC_API_KEY no configurada',
        hint: 'Añade la key en .env.local y reinicia el servidor',
      },
      { status: 501 },
    );
  }
  // Activación real pendiente — implementación documentada en
  // NOTES-OVERNIGHT.md (sección Sprint 12 + Polish v0.4).
  return NextResponse.json(
    {
      error: 'Endpoint LLM aún no cableado',
      hint: 'Ver NOTES-OVERNIGHT.md para checklist de activación',
    },
    { status: 501 },
  );
}
