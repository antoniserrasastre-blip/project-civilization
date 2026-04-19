/**
 * Lint del registry de assets — CLAUDE-primigenia §7.
 *
 * Valida que:
 *   1. Cada fichero bajo `assets/` distinto de ORIGINS.md tiene fila
 *      en ORIGINS.md.
 *   2. Cada fila de ORIGINS.md apunta a un fichero existente.
 *   3. El hash SHA-256 declarado coincide con el real del fichero.
 *   4. La licencia está en la lista blanca (CC0 solo en v1 pública).
 *
 * Se ejecuta en el gate vía `pnpm lint:assets`. También se importa
 * desde `tests/unit/asset-registry.test.ts` para validación en
 * vitest.
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface RegistryRow {
  file: string;
  origin: string;
  license: string;
  author: string;
  url: string;
  sha256: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  rows: RegistryRow[];
}

const ORIGINS = 'assets/ORIGINS.md';
const ASSETS_DIR = 'assets';
const LICENSE_WHITELIST = ['CC0'];

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function walkAssets(dir: string, rootForRelative: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(rootForRelative, full);
    // Salta el propio ORIGINS.md — está dentro de assets/ pero no
    // es un asset.
    if (rel.endsWith('ORIGINS.md')) continue;
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkAssets(full, rootForRelative));
    else out.push(rel);
  }
  return out;
}

function parseRegistry(md: string): RegistryRow[] {
  const rows: RegistryRow[] = [];
  const lines = md.split('\n');
  for (const line of lines) {
    // Tabla markdown: 6 columnas separadas por |.
    if (!line.startsWith('|')) continue;
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length !== 6) continue;
    // Saltar cabecera y separador.
    if (cells[0] === 'Fichero' || cells[0].startsWith('-')) continue;
    // Strip backticks del nombre del fichero.
    const file = cells[0].replace(/^`|`$/g, '');
    const sha = cells[5].replace(/^`|`$/g, '');
    rows.push({
      file,
      origin: cells[1],
      license: cells[2],
      author: cells[3],
      url: cells[4],
      sha256: sha,
    });
  }
  return rows;
}

export function validateRegistry(
  originsPath = ORIGINS,
  assetsDir = ASSETS_DIR,
): ValidationResult {
  const errors: string[] = [];
  const md = readFileSync(originsPath, 'utf8');
  const rows = parseRegistry(md);
  const rowsByFile = new Map(rows.map((r) => [r.file, r]));

  for (const row of rows) {
    try {
      const actual = sha256(row.file);
      if (actual !== row.sha256) {
        errors.push(
          `hash mismatch: ${row.file} declared=${row.sha256.slice(
            0,
            12,
          )}… actual=${actual.slice(0, 12)}…`,
        );
      }
    } catch {
      errors.push(`file not found: ${row.file} (declared in ${originsPath})`);
    }
    if (!LICENSE_WHITELIST.includes(row.license)) {
      errors.push(`license not whitelisted: ${row.file} = "${row.license}"`);
    }
  }

  const filesOnDisk = walkAssets(assetsDir, process.cwd());
  for (const f of filesOnDisk) {
    if (!rowsByFile.has(f)) {
      errors.push(`file without registry row: ${f}`);
    }
  }

  return { ok: errors.length === 0, errors, rows };
}

function main() {
  const result = validateRegistry();
  if (!result.ok) {
    console.error(
      `[check-asset-registry] FAIL (${result.errors.length} errores):`,
    );
    for (const e of result.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(
    `[check-asset-registry] OK — ${result.rows.length} assets validados.`,
  );
}

if (process.argv[1]?.endsWith('check-asset-registry.ts')) {
  main();
}
