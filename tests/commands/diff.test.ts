import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runDiff } from '../../src/commands/diff.js';
import { runInit } from '../../src/commands/init.js';
import { runUse } from '../../src/commands/use.js';

describe('diff command', () => {
  let tmpdir: string;

  beforeEach(async () => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-diff-'));
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1\nB=2\nC=3');
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'A=1\nB=99\nD=4');
    await runInit(tmpdir);
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it('diffs two named environments', () => {
    const result = runDiff(tmpdir, 'development', 'production');
    expect(result.results.find((r) => r.key === 'A')!.status).toBe('same');
    expect(result.results.find((r) => r.key === 'B')!.status).toBe('different');
    expect(result.results.find((r) => r.key === 'C')!.status).toBe('only_left');
    expect(result.results.find((r) => r.key === 'D')!.status).toBe('only_right');
  });

  it('diffs one env against active', async () => {
    await runUse(tmpdir, 'development', { force: true });
    const result = runDiff(tmpdir, 'production');
    expect(result.leftName).toBe('development');
    expect(result.rightName).toBe('production');
  });

  it('throws when no active and only one arg', () => {
    expect(() => runDiff(tmpdir, 'production')).toThrow();
  });

  it('supports partial name matching', () => {
    const result = runDiff(tmpdir, 'dev', 'prod');
    expect(result.leftName).toBe('development');
    expect(result.rightName).toBe('production');
  });

  it('returns summary for zero-args mode (requires active env)', async () => {
    await runUse(tmpdir, 'development', { force: true });
    const { scanEnvFiles } = await import('../../src/core/scanner.js');
    const { diff } = await import('../../src/core/differ.js');
    const envFiles = scanEnvFiles(tmpdir);
    const active = envFiles.find(f => f.name === 'development')!;
    const other = envFiles.find(f => f.name === 'production')!;
    const results = diff(active.variables, other.variables);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.status !== 'same')).toBe(true);
  });
});
