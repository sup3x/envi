import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runUse } from '../../src/commands/use.js';
import { runInit } from '../../src/commands/init.js';
import { readState } from '../../src/core/state.js';
import { EnviError } from '../../src/types.js';

describe('use command', () => {
  let tmpdir: string;
  beforeEach(async () => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-use-'));
    fs.writeFileSync(path.join(tmpdir, '.env.development'), 'NODE_ENV=development\nDEBUG=true\nPORT=3000');
    fs.writeFileSync(path.join(tmpdir, '.env.staging'), 'NODE_ENV=staging\nDEBUG=false\nPORT=4000');
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'NODE_ENV=production\nDEBUG=false\nPORT=8080');
    await runInit(tmpdir);
  });
  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it('throws when not initialized', async () => {
    const fresh = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-use-fresh-'));
    try {
      await expect(runUse(fresh, 'development')).rejects.toThrow(EnviError);
    } finally {
      fs.rmSync(fresh, { recursive: true, force: true });
    }
  });

  it('copies env file to .env', async () => {
    await runUse(tmpdir, 'development', { force: true });
    const dotEnv = fs.readFileSync(path.join(tmpdir, '.env'), 'utf-8');
    expect(dotEnv).toContain('NODE_ENV=development');
  });

  it('creates .env.backup before switching', async () => {
    // First switch
    await runUse(tmpdir, 'development', { force: true });
    // Second switch — should back up the .env (which is now development)
    await runUse(tmpdir, 'staging', { force: true });
    const backup = fs.readFileSync(path.join(tmpdir, '.env.backup'), 'utf-8');
    expect(backup).toContain('NODE_ENV=development');
  });

  it('updates state with active environment', async () => {
    await runUse(tmpdir, 'production', { force: true });
    const state = readState(tmpdir);
    expect(state?.active).toBe('production');
  });

  it('updates lastSwitch timestamp', async () => {
    await runUse(tmpdir, 'staging', { force: true });
    const state = readState(tmpdir);
    expect(state?.lastSwitch).not.toBeNull();
    expect(new Date(state!.lastSwitch!).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('supports partial matching', async () => {
    await runUse(tmpdir, 'dev', { force: true });
    const state = readState(tmpdir);
    expect(state?.active).toBe('development');
  });

  it('throws on unknown environment', async () => {
    await expect(runUse(tmpdir, 'unknown')).rejects.toThrow(EnviError);
  });

  it('throws on ambiguous partial match', async () => {
    // 'dev' matches 'development' only — use 'st' to match staging+staging won't work
    // We need two envs with same prefix, e.g. 'staging' and 'staging2'
    fs.writeFileSync(path.join(tmpdir, '.env.staging2'), 'NODE_ENV=staging2');
    await runInit(tmpdir);
    await expect(runUse(tmpdir, 'sta')).rejects.toThrow(EnviError);
  });

  it('returns previous environment', async () => {
    await runUse(tmpdir, 'development', { force: true });
    const result = await runUse(tmpdir, 'staging', { force: true });
    expect(result.previousEnv).toBe('development');
    expect(result.newEnv).toBe('staging');
  });

  it('detects unsaved changes and throws without force', async () => {
    // Switch to development first
    await runUse(tmpdir, 'development', { force: true });
    // Modify .env to differ from .env.development
    fs.writeFileSync(path.join(tmpdir, '.env'), 'NODE_ENV=development\nDEBUG=true\nPORT=9999');
    // Switching without force should throw
    await expect(runUse(tmpdir, 'staging')).rejects.toThrow(/unsaved changes/i);
  });

  it('succeeds with force even when unsaved changes exist', async () => {
    // Switch to development
    await runUse(tmpdir, 'development', { force: true });
    // Modify .env
    fs.writeFileSync(path.join(tmpdir, '.env'), 'NODE_ENV=development\nDEBUG=true\nPORT=9999');
    // Switching with force should succeed
    const result = await runUse(tmpdir, 'staging', { force: true });
    expect(result.newEnv).toBe('staging');
    const dotEnv = fs.readFileSync(path.join(tmpdir, '.env'), 'utf-8');
    expect(dotEnv).toContain('NODE_ENV=staging');
  });
});
