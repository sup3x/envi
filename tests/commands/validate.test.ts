import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runValidate } from '../../src/commands/validate.js';
import { runInit } from '../../src/commands/init.js';

describe('validate command', () => {
  let tmpdir: string;

  beforeEach(async () => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-val-'));
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it('returns no missing when all envs have all vars', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1\nB=2');
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'A=3\nB=4');
    await runInit(tmpdir);

    const results = runValidate(tmpdir);
    expect(results.every((r) => r.missing.length === 0)).toBe(true);
  });

  it('detects missing variables', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1\nB=2\nC=3');
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'A=1');
    await runInit(tmpdir);

    const results = runValidate(tmpdir);
    const prod = results.find((r) => r.environment === 'production')!;
    expect(prod.missing.sort()).toEqual(['B', 'C']);
  });

  it('detects empty values in strict mode', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1\nB=');
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'A=1\nB=2');
    await runInit(tmpdir);

    const results = runValidate(tmpdir, { strict: true });
    const dev = results.find((r) => r.environment === 'development')!;
    expect(dev.empty).toEqual(['B']);
  });

  it('validates single environment with --env flag', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1');
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'A=1\nB=2');
    await runInit(tmpdir);

    const results = runValidate(tmpdir, { env: 'development' });
    expect(results).toHaveLength(1);
    expect(results[0]!.environment).toBe('development');
  });

  it('throws when not initialized', () => {
    expect(() => runValidate(tmpdir)).toThrow();
  });
});
