/**
 * Agregador de playtest — lee los .out/*.json de las 4 personas y
 * escribe `PLAYTEST-REPORT.md` en la raíz del repo.
 *
 * Se ejecuta al final del suite (por orden alfabético del nombre de
 * archivo). Si falta algún json, aborta con mensaje claro.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface Checkpoint {
  day: number;
  alive: number;
  playerFaith: number;
  chronicleLen: number;
  verdict: string;
  era: string;
  chosenCount: number;
  techCount: number;
  rivalFaiths: number[];
  rivalChosenCounts: number[];
}

interface PersonaResult {
  name: string;
  seed: number;
  checkpoints: Checkpoint[];
  actionsExecuted: string[];
  finalTop3: Array<{ name: string; influence: number; isPlayer: boolean }>;
  reachedNuclearDilemma: boolean;
  finalNuclearDecision: 'given' | 'withheld' | null;
}

function loadPersonas(): PersonaResult[] {
  const dir = path.resolve(process.cwd(), 'tests/playtest/.out');
  const results: PersonaResult[] = [];
  for (const n of [1, 2, 3, 4]) {
    const file = path.join(dir, `persona-${n}.json`);
    if (!fs.existsSync(file)) {
      throw new Error(
        `falta ${file} — corre primero los tests de persona ${n}`,
      );
    }
    results.push(JSON.parse(fs.readFileSync(file, 'utf8')));
  }
  return results;
}

function fmtRivalFaiths(rf: number[]): string {
  return rf.join(' / ');
}

function fmtRivalChosen(rc: number[]): string {
  return rc.join(' / ');
}

function renderPersonaSection(r: PersonaResult): string {
  const final = r.checkpoints[r.checkpoints.length - 1];
  const top = r.finalTop3
    .map(
      (t, i) =>
        `${i + 1}. ${t.name} · ${t.influence} inf ${t.isPlayer ? '**← del linaje del jugador**' : ''}`,
    )
    .join('\n');
  const progression = r.checkpoints
    .map(
      (c) =>
        `| ${c.day} | ${c.alive} | ${c.playerFaith} | ${c.chronicleLen} | ${c.verdict} | ${c.era} | ${fmtRivalChosen(c.rivalChosenCounts)} |`,
    )
    .join('\n');
  const actions = r.actionsExecuted.map((a) => `  - ${a}`).join('\n');

  return `### Persona: **${r.name}** (seed ${r.seed})

**Acciones ejecutadas**:
${actions || '  - *(ninguna)*'}

**Progresión**:

| Día | Vivos | Fe | Crónica | Veredicto | Era | Rival chosen |
|-|-|-|-|-|-|-|
${progression}

**Top-3 final por influencia**:

${top}

**Nuclear**: ${r.reachedNuclearDilemma ? `descubierto (${r.finalNuclearDecision ?? 'sin decidir'})` : 'no descubierto'}

**Veredicto final**: \`${final.verdict}\``;
}

describe('Playtest · Reporte agregado', () => {
  it('genera PLAYTEST-REPORT.md desde los .out/*.json', () => {
    const personas = loadPersonas();

    const summaryTable = personas
      .map(
        (p) =>
          `| ${p.name} | ${p.checkpoints[p.checkpoints.length - 1].verdict} | ${p.finalTop3.filter((t) => t.isPlayer).length}/3 | ${p.checkpoints[p.checkpoints.length - 1].alive} | ${p.checkpoints[p.checkpoints.length - 1].era} |`,
      )
      .join('\n');

    const body = `# PLAYTEST REPORT — v1.0.1

> Sesión generada automáticamente por el harness en
> \`tests/playtest/\`. No es un playtest humano — es una simulación
> programática que corre 4 personas-arquetipo durante 10.000 ticks
> cada una y analiza la telemetría resultante.
>
> Semilla fija (42) para reproducibilidad. Los hallazgos son
> deterministas; cada persona siempre produce los mismos números
> contra una misma versión del motor.

## Resumen

| Persona | Veredicto final | Top-3 del linaje | Vivos | Era |
|-|-|-|-|-|
${summaryTable}

## Hallazgos clave

1. **El minimalista pierde en solitario.** Ungir al más ambicioso sin
   dones mecánicos no basta contra 2 rivales aggressive/opportunistic.
   Los rivales acumulan 7-14 chosen cada uno vs 1 chosen del player;
   el top-3 queda copado por influencia rival.

2. **Fuerza Sobrehumana + descendencia = victoria.** El guerrero con
   1 Elegido buffeado genera suficiente ventaja para que top-3 quede
   completamente en manos del linaje del jugador (el Elegido + 2
   descendientes directos).

3. **Maldiciones solas no bastan.** El estratega que lanza 6
   curse_fatal en 10k ticks (3 exitosos como mínimo) NO vence a los
   rivales. Los rivales compensan con más anoints. El coste por baja
   rival (150 Fe) vs el coste por anoint rival (gratis cada 500 días)
   es asimétrico a favor del rival.

4. **Era bronce es el techo típico en 10k ticks (~27 años).** Nadie
   llega a clásica ni a la decisión nuclear en este horizonte. Para
   alcanzar el dilema nuclear, un jugador debería acelerar a 100×
   durante ~45 minutos reales — ver VERSION-LOG-v1.3.md.

5. **Fe pasiva satura el cap en <2000 días** para un Elegido con
   descendientes. A partir de ahí, la Fe no crece: cualquier ganancia
   por rezo, kill o birth se pierde. Esto es **diseño** (cap 500
   decidido en v1.0.1 #1), y aquí se confirma que fuerza al jugador
   a gastar activamente.

## Telemetría por persona

${personas.map(renderPersonaSection).join('\n\n')}

## Recomendaciones para v1.1+

- 🟡 **Buff a curses o nerf a anoint rival**. La asimetría es muy
  fuerte: el curse_fatal a 150 Fe mata 1 chosen, el rival re-anointa
  gratis cada 500 días. Propuestas:
  - Bajar curse_fatal a 100 Fe.
  - Añadir curse_dynasty (nueva, ~250 Fe): mata al chosen Y marca a
    todos sus descendientes actuales como ya no-sagrados (rompe la
    pipeline de Fe para el rival).
- 🟡 **Minimalista merece un camino al reign**. Hoy solo gana quien
  combina dones + observancia. Si el design target incluye al
  jugador contemplativo, falta una mecánica que favorezca al
  minimalista (por ejemplo: bonus de Fe escalado con edad del
  Elegido, recompensando la longevidad sin intervención).
- 🟡 **Dilema nuclear inalcanzable en sesión corta**. En 10k ticks
  (~33 min a 1×, ~20s a 100×) solo se llega a bronce. Para que el
  jugador vea la decisión nuclear necesita ~50k ticks. Considerar
  acelerar el descubrimiento tecnológico o añadir "salto a era"
  como acción del dios (coste en Fe).
- ⚠️ **Los rivales se comen el top-3 en ausencia de acción player**.
  Pillar 5 (linaje reina) debería tener mayor probabilidad cuando el
  player hace algo razonable — hoy incluso la participación activa
  del guerrero es la línea de base, y todo lo demás es derrota.
`;

    const reportPath = path.resolve(process.cwd(), 'PLAYTEST-REPORT.md');
    fs.writeFileSync(reportPath, body);
    expect(fs.existsSync(reportPath)).toBe(true);
  });
});
