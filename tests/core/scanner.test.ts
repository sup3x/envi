import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanEnvFiles, resolveEnvName, getPartialMatches } from '../../src/core/scanner.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

let tmpDir: string;

function writeFile(name: string, content = ''): void {
  fs.writeFileSync(path.join(tmpDir, name), content, 'utf-8');
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-scanner-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─── scanEnvFiles – inclusion ─────────────────────────────────────────────────

describe('scanEnvFiles – inclusion', () => {
  it('finds .env.* files and returns them sorted by name', () => {
    writeFile('.env.prod', 'APP=prod');
    writeFile('.env.dev', 'APP=dev');
    writeFile('.env.staging', 'APP=staging');

    const files = scanEnvFiles(tmpDir);
    expect(files.map((f) => f.name)).toEqual(['dev', 'prod', 'staging']);
  });

  it('sets correct name, filename, and path on each result', () => {
    writeFile('.env.dev', 'FOO=bar');
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(1);
    expect(files[0]!.name).toBe('dev');
    expect(files[0]!.filename).toBe('.env.dev');
    expect(files[0]!.path).toBe(path.join(tmpDir, '.env.dev'));
  });

  it('handles names with hyphens', () => {
    writeFile('.env.my-env', 'X=1');
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(1);
    expect(files[0]!.name).toBe('my-env');
  });

  it('handles names with underscores', () => {
    writeFile('.env.my_env', 'X=1');
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(1);
    expect(files[0]!.name).toBe('my_env');
  });
});

// ─── scanEnvFiles – exclusion ─────────────────────────────────────────────────

describe('scanEnvFiles – exclusion', () => {
  it('excludes bare .env file', () => {
    writeFile('.env', 'SECRET=x');
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(0);
  });

  it('excludes .env.backup', () => {
    writeFile('.env.backup', 'OLD=1');
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(0);
  });

  it('excludes .env.example', () => {
    writeFile('.env.example', 'FOO=');
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(0);
  });

  it('excludes .env.sample', () => {
    writeFile('.env.sample', 'FOO=');
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(0);
  });

  it('excludes .env.template', () => {
    writeFile('.env.template', 'FOO=');
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(0);
  });

  it('excludes .env.*.local files', () => {
    writeFile('.env.dev.local', 'SECRET=local');
    writeFile('.env.prod.local', 'SECRET=local');
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(0);
  });

  it('excludes .env.local', () => {
    writeFile('.env.local', 'SECRET=local');
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(0);
  });

  it('does not recurse into subdirectories', () => {
    const subDir = path.join(tmpDir, 'nested');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(subDir, '.env.dev'), 'X=1', 'utf-8');
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(0);
  });
});

// ─── scanEnvFiles – empty / missing directory ─────────────────────────────────

describe('scanEnvFiles – edge cases', () => {
  it('returns empty array for an empty directory', () => {
    const files = scanEnvFiles(tmpDir);
    expect(files).toHaveLength(0);
  });

  it('returns empty array for a non-existent directory', () => {
    const files = scanEnvFiles(path.join(tmpDir, 'does-not-exist'));
    expect(files).toHaveLength(0);
  });
});

// ─── scanEnvFiles – EnvFile content ───────────────────────────────────────────

describe('scanEnvFiles – EnvFile population', () => {
  it('populates lines via parse()', () => {
    writeFile('.env.dev', '# comment\nFOO=bar\n');
    const files = scanEnvFiles(tmpDir);
    expect(files[0]!.lines).toHaveLength(2);
    expect(files[0]!.lines[0]!.type).toBe('comment');
    expect(files[0]!.lines[1]!.type).toBe('variable');
  });

  it('populates variables via extractVariables()', () => {
    writeFile('.env.dev', '# comment\nFOO=bar\nBAZ=qux\n');
    const files = scanEnvFiles(tmpDir);
    expect(files[0]!.variables).toHaveLength(2);
    expect(files[0]!.variables[0]).toMatchObject({ key: 'FOO', value: 'bar' });
    expect(files[0]!.variables[1]).toMatchObject({ key: 'BAZ', value: 'qux' });
  });

  it('handles empty .env.* file (no variables)', () => {
    writeFile('.env.dev', '');
    const files = scanEnvFiles(tmpDir);
    expect(files[0]!.variables).toHaveLength(0);
  });
});

// ─── resolveEnvName ───────────────────────────────────────────────────────────

describe('resolveEnvName', () => {
  it('resolves exact match', () => {
    writeFile('.env.dev', '');
    writeFile('.env.development', '');
    const files = scanEnvFiles(tmpDir);
    const result = resolveEnvName(files, 'dev');
    expect(result?.name).toBe('dev');
  });

  it('resolves unambiguous partial match', () => {
    writeFile('.env.staging', '');
    const files = scanEnvFiles(tmpDir);
    const result = resolveEnvName(files, 'sta');
    expect(result?.name).toBe('staging');
  });

  it('returns null for ambiguous partial match', () => {
    writeFile('.env.staging', '');
    writeFile('.env.stable', '');
    const files = scanEnvFiles(tmpDir);
    const result = resolveEnvName(files, 'sta');
    expect(result).toBeNull();
  });

  it('returns null when no match found', () => {
    writeFile('.env.dev', '');
    const files = scanEnvFiles(tmpDir);
    const result = resolveEnvName(files, 'xyz');
    expect(result).toBeNull();
  });

  it('prefers exact match over partial when both could match', () => {
    writeFile('.env.dev', '');
    writeFile('.env.development', '');
    const files = scanEnvFiles(tmpDir);
    // 'dev' is exact AND a prefix of 'development' — exact must win
    const result = resolveEnvName(files, 'dev');
    expect(result?.name).toBe('dev');
  });

  it('returns null for empty files list', () => {
    const result = resolveEnvName([], 'dev');
    expect(result).toBeNull();
  });
});

// ─── getPartialMatches ────────────────────────────────────────────────────────

describe('getPartialMatches', () => {
  it('returns all files whose name starts with partial', () => {
    writeFile('.env.staging', '');
    writeFile('.env.stable', '');
    writeFile('.env.dev', '');
    const files = scanEnvFiles(tmpDir);
    const matches = getPartialMatches(files, 'st');
    expect(matches.map((f) => f.name).sort()).toEqual(['stable', 'staging'].sort());
  });

  it('returns empty array when no files match', () => {
    writeFile('.env.dev', '');
    const files = scanEnvFiles(tmpDir);
    const matches = getPartialMatches(files, 'xyz');
    expect(matches).toHaveLength(0);
  });

  it('returns all files when partial is empty string', () => {
    writeFile('.env.dev', '');
    writeFile('.env.prod', '');
    const files = scanEnvFiles(tmpDir);
    const matches = getPartialMatches(files, '');
    expect(matches).toHaveLength(2);
  });
});
