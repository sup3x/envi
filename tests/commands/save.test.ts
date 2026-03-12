import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runSave } from '../../src/commands/save.js';
import { runInit } from '../../src/commands/init.js';
import { runUse } from '../../src/commands/use.js';

describe('save command', () => {
  let tmpdir: string;

  beforeEach(async () => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-save-'));
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1\nB=2');
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'A=3');
    await runInit(tmpdir);
    await runUse(tmpdir, 'development', { force: true });
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it('saves modified .env back to source', () => {
    fs.writeFileSync(path.join(tmpdir, '.env'), 'A=changed\nB=2');
    const result = runSave(tmpdir);
    const source = fs.readFileSync(path.join(tmpdir, '.env.development'), 'utf-8');
    expect(source).toBe('A=changed\nB=2');
    expect(result.changed).toBe(1);
  });

  it('reports added variables', () => {
    fs.writeFileSync(path.join(tmpdir, '.env'), 'A=1\nB=2\nC=new');
    const result = runSave(tmpdir);
    expect(result.added).toBe(1);
  });

  it('reports removed variables', () => {
    fs.writeFileSync(path.join(tmpdir, '.env'), 'A=1');
    const result = runSave(tmpdir);
    expect(result.removed).toBe(1);
  });

  it('throws when no active environment', async () => {
    const { writeState, readState } = await import('../../src/core/state.js');
    const state = readState(tmpdir)!;
    state.active = null;
    writeState(tmpdir, state);

    expect(() => runSave(tmpdir)).toThrow();
  });

  it('throws when not initialized', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-save-empty-'));
    try {
      expect(() => runSave(emptyDir)).toThrow();
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
