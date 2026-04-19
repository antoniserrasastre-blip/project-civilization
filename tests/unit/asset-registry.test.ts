/**
 * Tests del lint del registry de assets.
 *
 * Invoca `validateRegistry()` como función pura (sin fork de proceso)
 * y asserta que el registry checkeado en el repo pasa.
 *
 * También cubre casos de fallo: fila sin fichero, fichero sin fila,
 * hash mismatch, licencia no whitelisted. Para eso usamos un
 * directorio temp con registry y assets sintéticos.
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { validateRegistry } from '@/scripts/check-asset-registry';

describe('validateRegistry — repo real (gate)', () => {
  it('el registry checkeado en el repo pasa el lint', () => {
    const result = validateRegistry('assets/ORIGINS.md', 'assets');
    if (!result.ok) {
      console.error('errores del registry:', result.errors);
    }
    expect(result.ok).toBe(true);
    expect(result.rows.length).toBeGreaterThan(0);
  });
});

describe('validateRegistry — casos sintéticos', () => {
  function setupTempRegistry(content: string, files: Array<[string, string]>) {
    const dir = mkdtempSync(join(tmpdir(), 'asset-lint-'));
    const origins = join(dir, 'ORIGINS.md');
    writeFileSync(origins, content);
    const assetsDir = join(dir, 'assets');
    mkdirSync(assetsDir, { recursive: true });
    // Copiar ORIGINS a assets/ORIGINS.md para que el walker la salte:
    // el validador espera assetsDir como raíz de búsqueda.
    for (const [rel, body] of files) {
      const full = join(dir, rel);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, body);
    }
    return { dir, origins, assetsDir };
  }

  function sha(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  it('happy path: 1 fila + 1 fichero con hash correcto', () => {
    const body = 'hello';
    const h = sha(body);
    const md = [
      '| Fichero | Origen | Licencia | Autor | URL | SHA-256 |',
      '|-|-|-|-|-|-|',
      `| \`assets/x.txt\` | test | CC0 | yo | — | \`${h}\` |`,
    ].join('\n');
    const { origins, assetsDir, dir } = setupTempRegistry(md, [
      ['assets/x.txt', body],
    ]);
    // Cambio cwd para resolver rutas declaradas en md.
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const r = validateRegistry(origins, assetsDir);
      expect(r.ok).toBe(true);
      expect(r.rows.length).toBe(1);
    } finally {
      process.chdir(prev);
      rmSync(dir, { recursive: true });
    }
  });

  it('fallo: fichero sin fila en registry', () => {
    const md = [
      '| Fichero | Origen | Licencia | Autor | URL | SHA-256 |',
      '|-|-|-|-|-|-|',
    ].join('\n');
    const { origins, assetsDir, dir } = setupTempRegistry(md, [
      ['assets/huerfano.txt', 'data'],
    ]);
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const r = validateRegistry(origins, assetsDir);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes('without registry row'))).toBe(
        true,
      );
    } finally {
      process.chdir(prev);
      rmSync(dir, { recursive: true });
    }
  });

  it('fallo: hash declarado no coincide con fichero', () => {
    const md = [
      '| Fichero | Origen | Licencia | Autor | URL | SHA-256 |',
      '|-|-|-|-|-|-|',
      '| `assets/x.txt` | test | CC0 | yo | — | `deadbeef` |',
    ].join('\n');
    const { origins, assetsDir, dir } = setupTempRegistry(md, [
      ['assets/x.txt', 'otro contenido'],
    ]);
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const r = validateRegistry(origins, assetsDir);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes('hash mismatch'))).toBe(true);
    } finally {
      process.chdir(prev);
      rmSync(dir, { recursive: true });
    }
  });

  it('fallo: licencia no whitelisted (CC-BY)', () => {
    const body = 'x';
    const h = sha(body);
    const md = [
      '| Fichero | Origen | Licencia | Autor | URL | SHA-256 |',
      '|-|-|-|-|-|-|',
      `| \`assets/x.txt\` | test | CC-BY | yo | — | \`${h}\` |`,
    ].join('\n');
    const { origins, assetsDir, dir } = setupTempRegistry(md, [
      ['assets/x.txt', body],
    ]);
    const prev = process.cwd();
    process.chdir(dir);
    try {
      const r = validateRegistry(origins, assetsDir);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e) => e.includes('license not whitelisted'))).toBe(
        true,
      );
    } finally {
      process.chdir(prev);
      rmSync(dir, { recursive: true });
    }
  });
});
