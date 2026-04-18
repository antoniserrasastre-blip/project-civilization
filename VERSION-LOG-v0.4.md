# VERSION LOG — v0.4 Generative Chronicle

**Estado**: ✅ shipped (commit `6b26cb7` tras polish)
**Sprints**: 12 (LLM chronicle provider layer) + Polish.

## Qué hace esta versión

- **Capa generativa** de la crónica separada del core. El estado sigue
  guardando entradas de plantilla deterministas; el provider
  transforma en RENDER. Swap del provider no afecta al determinismo.
- 3 providers enchufables:
  - `templateProvider` (default): identidad.
  - `mockLLMProvider`: prepende fórmulas partisanas preescritas
    ("Dicen los viejos que…", "Cuenta la memoria que…") — determinista
    en función del día de la entrada.
  - `claudeProvider`: scaffold. Fetch a `/api/chronicle/enhance` que
    **hoy devuelve 501** (sin API key). Cable listo para activar.
- Endpoint server-side stub `app/api/chronicle/enhance/route.ts`.
- Selector `<select>` en ChroniclePanel permite cambiar provider en
  vivo. Preferencia persistida en `localStorage`.

## Por qué y cómo encaja con la visión

- §9 Vision: "voz partisana del cronista" debe escalar de plantillas
  fijas a narración generativa sin romper el tono. La arquitectura
  provider lo consigue: el system prompt de Claude se pensará para
  preservar el partidismo, pero la capa de plantillas queda intacta
  como fallback **y** como corpus de entrenamiento del prompt.
- Razón para mantener plantillas en el estado (no texto LLM): replays
  deterministas siguen posibles. Si grabo una partida y la cargo en
  otro dispositivo, veo exactamente la misma crónica plantilla; la
  capa LLM es decorativa.

## Perspectiva del jugador

> Mi partida lleva 15 min. La crónica tiene 20 entradas. En la
> cabecera del panel veo un `<select>` "Plantilla (determinista)".
> Lo cambio a "LLM simulado (offline)". Todas las entradas se
> reescriben en vivo con aperturas del tipo "Cuenta la memoria que…"
> — el mismo hecho suena distinto, como si un abuelo me lo contara.
> Cambio a "Claude (requiere ANTHROPIC_API_KEY)": el texto vuelve a
> ser plantilla (fallback) — un toast silencioso me dice que aún no
> hay key. Sé que si la configuro, el cronista será Claude.

## Balance

No hay balance mecánico en esta versión — es una feature de
presentación. El único valor a afinar es:

- **Frecuencia de fórmulas del mockLLM**: 6 aperturas rotando por
  `day % 6`. Con 50+ entradas, cada apertura se repite muchas veces.
  Si el Director quiere más variedad, ampliar `MOCK_OPENERS` en
  `lib/chronicle-provider.ts`.

## 🚩 Flags para supervisión humana

- ⚠️ **Activación Claude pendiente del Director Creativo**. Checklist:
  1. Generar una API key de Anthropic (console.anthropic.com) y
     guardarla como `ANTHROPIC_API_KEY` en `.env.local` (server-side,
     NUNCA en chat ni cliente).
  2. Implementar el fetch real en `app/api/chronicle/enhance/route.ts`
     — ahora mismo devuelve 501. El pseudo-código:
     ```ts
     const resp = await fetch('https://api.anthropic.com/v1/messages', {
       method: 'POST',
       headers: {
         'x-api-key': key,
         'anthropic-version': '2023-06-01',
         'content-type': 'application/json',
       },
       body: JSON.stringify({
         model: 'claude-sonnet-4-6',
         max_tokens: 256,
         system: SYSTEM_PROMPT_PARTISANO,
         messages: [{ role: 'user', content: body.text }],
       }),
     });
     ```
  3. Añadir rate limiting (ej. `p-limit` o similar).
  4. Poner `claudeProvider.enabled = true`.
- ⚠️ **Latencia con LLM real**: las entradas de crónica son ~20-100
  durante una partida típica. Llamar al LLM en serie por cada una
  es caro (~5s × 30 entradas = 2.5 min por render). Diseñar
  batching o solo enriquecer las últimas N.
- ⚠️ **Coste por partida**: con ~30 entradas × ~150 tokens = 4500
  tokens/render. Si el jugador cambia de provider 10 veces, son
  45k tokens. Budget a decidir por el Director.
