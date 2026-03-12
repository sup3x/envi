import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runCreate } from '../../src/commands/create.js';
import { runInit } from '../../src/commands/init.js';

describe('create command', () => {
  let tmpdir: string;

  beforeEach(async () => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-create-'));
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1\nB=2');
    await runInit(tmpdir);
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it('creates new env from existing', () => {
    runCreate(tmpdir, 'staging', { from: 'development' });
    const content = fs.readFileSync(path.join(tmpdir, '.env.staging'), 'utf-8');
    expect(content).toBe('A=1\nB=2');
  });

  it('creates empty env with --empty', () => {
    runCreate(tmpdir, 'staging', { from: 'development', empty: true });
    const content = fs.readFileSync(path.join(tmpdir, '.env.staging'), 'utf-8');
    expect(content).toBe('A=\nB=');
  });

  it('throws if env already exists', () => {
    expect(() => runCreate(tmpdir, 'development', { from: 'development' })).toThrow();
  });

  it('throws when not initialized', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-create-empty-'));
    try {
      expect(() => runCreate(emptyDir, 'staging')).toThrow();
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('uses active env as default source when no --from', async () => {
    const { runUse } = await import('../../src/commands/use.js');
    await runUse(tmpdir, 'development', { force: true });
    runCreate(tmpdir, 'staging', {});
    const content = fs.readFileSync(path.join(tmpdir, '.env.staging'), 'utf-8');
    expect(content).toBe('A=1\nB=2');
  });
});
