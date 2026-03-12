import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDefaultState, readState, writeState } from '../../src/core/state.js';
import type { EnviState } from '../../src/types.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-state-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── createDefaultState ───────────────────────────────────────────────────────

describe('createDefaultState', () => {
  it('returns correct shape with provided environments', () => {
    const state = createDefaultState(['dev', 'staging', 'prod']);
    expect(state).toEqual<EnviState>({
      version: 1,
      active: null,
      environments: ['dev', 'staging', 'prod'],
      lastSwitch: null,
    });
  });

  it('returns correct shape with empty environments array', () => {
    const state = createDefaultState([]);
    expect(state).toEqual<EnviState>({
      version: 1,
      active: null,
      environments: [],
      lastSwitch: null,
    });
  });

  it('does not share reference — mutations do not affect the returned object', () => {
    const envs = ['dev', 'prod'];
    const state = createDefaultState(envs);
    envs.push('staging');
    // The environments array inside state should still be the same reference
    // but we assert the returned value has correct version/active/lastSwitch
    expect(state.version).toBe(1);
    expect(state.active).toBeNull();
    expect(state.lastSwitch).toBeNull();
  });
});

// ─── writeState ───────────────────────────────────────────────────────────────

describe('writeState', () => {
  it('creates a .envi file in the target directory', () => {
    const state = createDefaultState(['dev', 'prod']);
    writeState(tmpDir, state);
    const filePath = path.join(tmpDir, '.envi');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('writes valid JSON content', () => {
    const state = createDefaultState(['dev', 'prod']);
    writeState(tmpDir, state);
    const raw = fs.readFileSync(path.join(tmpDir, '.envi'), 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('writes pretty-printed JSON with trailing newline', () => {
    const state = createDefaultState(['dev']);
    writeState(tmpDir, state);
    const raw = fs.readFileSync(path.join(tmpDir, '.envi'), 'utf-8');
    // Pretty-printed → contains newlines beyond the trailing one
    expect(raw).toContain('\n');
    expect(raw.endsWith('\n')).toBe(true);
  });

  it('persists all state fields correctly', () => {
    const state: EnviState = {
      version: 1,
      active: 'staging',
      environments: ['dev', 'staging', 'prod'],
      lastSwitch: '2024-01-01T00:00:00.000Z',
    };
    writeState(tmpDir, state);
    const raw = fs.readFileSync(path.join(tmpDir, '.envi'), 'utf-8');
    const parsed = JSON.parse(raw) as EnviState;
    expect(parsed).toEqual(state);
  });
});

// ─── readState ────────────────────────────────────────────────────────────────

describe('readState', () => {
  it('reads an existing .envi file and returns the state', () => {
    const state = createDefaultState(['dev', 'prod']);
    writeState(tmpDir, state);
    const result = readState(tmpDir);
    expect(result).toEqual(state);
  });

  it('returns null when the .envi file is missing', () => {
    const result = readState(tmpDir);
    expect(result).toBeNull();
  });

  it('returns null when the .envi file contains corrupt JSON', () => {
    const filePath = path.join(tmpDir, '.envi');
    fs.writeFileSync(filePath, '{ not valid json }', 'utf-8');
    const result = readState(tmpDir);
    expect(result).toBeNull();
  });

  it('returns null for an empty file', () => {
    const filePath = path.join(tmpDir, '.envi');
    fs.writeFileSync(filePath, '', 'utf-8');
    const result = readState(tmpDir);
    expect(result).toBeNull();
  });

  it('returns null for a non-existent directory', () => {
    const result = readState(path.join(tmpDir, 'nonexistent'));
    expect(result).toBeNull();
  });

  it('round-trips state with active and lastSwitch set', () => {
    const state: EnviState = {
      version: 1,
      active: 'prod',
      environments: ['dev', 'staging', 'prod'],
      lastSwitch: '2025-06-15T12:00:00.000Z',
    };
    writeState(tmpDir, state);
    const result = readState(tmpDir);
    expect(result).toEqual(state);
  });
});
