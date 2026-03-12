import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runList } from '../../src/commands/list.js';
import { runInit } from '../../src/commands/init.js';
import { runUse } from '../../src/commands/use.js';
import { EnviError } from '../../src/types.js';

describe('list command', () => {
  let tmpdir: string;
  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-list-'));
  });
  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it('throws when not initialized', () => {
    expect(() => runList(tmpdir)).toThrow(EnviError);
  });

  it('lists all environments', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1\nB=2');
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'A=3');
    await runInit(tmpdir);
    const entries = runList(tmpdir);
    expect(entries.map((e) => e.name).sort()).toEqual(['development', 'production']);
  });

  it('marks active environment', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1');
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'A=2');
    await runInit(tmpdir);
    await runUse(tmpdir, 'development', { force: true });
    const entries = runList(tmpdir);
    const dev = entries.find((e) => e.name === 'development');
    const prod = entries.find((e) => e.name === 'production');
    expect(dev?.active).toBe(true);
    expect(prod?.active).toBe(false);
  });

  it('returns correct var counts', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1\nB=2\nC=3');
    await runInit(tmpdir);
    const entries = runList(tmpdir);
    const dev = entries.find((e) => e.name === 'development');
    expect(dev?.varCount).toBe(3);
  });

  it('returns filename for each entry', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.staging'), 'X=1');
    await runInit(tmpdir);
    const entries = runList(tmpdir);
    const staging = entries.find((e) => e.name === 'staging');
    expect(staging?.filename).toBe('.env.staging');
  });
});
