import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runInit } from '../../src/commands/init.js';
import { readState } from '../../src/core/state.js';

describe('init command', () => {
  let tmpdir: string;
  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-init-'));
  });
  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it('creates .envi state file with found environments', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1');
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'A=2');
    await runInit(tmpdir);
    const state = readState(tmpdir);
    expect(state).not.toBeNull();
    expect(state!.version).toBe(1);
    expect(state!.environments.sort()).toEqual(['development', 'production']);
  });

  it('adds .envi and .env.backup to .gitignore', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1');
    await runInit(tmpdir);
    const gitignore = fs.readFileSync(path.join(tmpdir, '.gitignore'), 'utf-8');
    expect(gitignore).toContain('.envi');
    expect(gitignore).toContain('.env.backup');
  });

  it('does not duplicate .gitignore entries on re-init', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1');
    fs.writeFileSync(path.join(tmpdir, '.gitignore'), '.envi\n.env.backup\n');
    await runInit(tmpdir);
    const gitignore = fs.readFileSync(path.join(tmpdir, '.gitignore'), 'utf-8');
    expect((gitignore.match(/\.envi/g) || []).length).toBe(1);
  });

  it('returns found environment names', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1');
    fs.writeFileSync(path.join(tmpdir, '.env.staging'), 'A=2');
    const result = await runInit(tmpdir);
    expect(result.environments.sort()).toEqual(['development', 'staging']);
  });

  it('detects bare .env without .env.* files', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env'), 'A=1');
    const result = await runInit(tmpdir);
    expect(result.hasBareEnv).toBe(true);
  });

  it('throws when no .env files exist at all', async () => {
    await expect(runInit(tmpdir)).rejects.toThrow('No .env files found');
  });

  it('preserves active env across re-init when env still exists', async () => {
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'A=1');
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'A=2');
    const first = await runInit(tmpdir);
    // Manually set active to development
    const state = readState(tmpdir)!;
    state.active = 'development';
    const { writeState } = await import('../../src/core/state.js');
    writeState(tmpdir, state);
    // Re-init
    await runInit(tmpdir);
    const newState = readState(tmpdir);
    expect(newState!.active).toBe('development');
    expect(first.alreadyInitialized).toBe(false);
  });
});
