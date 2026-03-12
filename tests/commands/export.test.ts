import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { runExport } from '../../src/commands/export.js';
import { runInit } from '../../src/commands/init.js';

describe('export command', () => {
  let tmpdir: string;

  beforeEach(async () => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-export-'));
    fs.writeFileSync(path.join(tmpdir, '.env.production'), 'API_KEY=secret\nPORT=8080');
    await runInit(tmpdir);
  });

  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it('exports as dotenv format', () => {
    const output = runExport(tmpdir, 'production', { format: 'dotenv' });
    expect(output).toBe('API_KEY=secret\nPORT=8080');
  });

  it('exports as json format', () => {
    const output = runExport(tmpdir, 'production', { format: 'json' });
    const parsed = JSON.parse(output);
    expect(parsed).toEqual({ API_KEY: 'secret', PORT: '8080' });
  });

  it('exports as shell format', () => {
    const output = runExport(tmpdir, 'production', { format: 'shell' });
    expect(output).toContain('export API_KEY="secret"');
    expect(output).toContain('export PORT="8080"');
  });

  it('exports as docker format', () => {
    const output = runExport(tmpdir, 'production', { format: 'docker' });
    expect(output).toBe('API_KEY=secret\nPORT=8080');
  });

  it('exports as yaml format', () => {
    const output = runExport(tmpdir, 'production', { format: 'yaml' });
    expect(output).toContain('API_KEY: secret');
    expect(output).toContain('PORT: "8080"');
  });

  it('masks values with --mask', () => {
    const output = runExport(tmpdir, 'production', { format: 'json', mask: true });
    const parsed = JSON.parse(output);
    expect(parsed.API_KEY).not.toBe('secret');
  });

  it('writes to file with --output option', () => {
    const outputPath = path.join(tmpdir, 'exported.env');
    const output = runExport(tmpdir, 'production', { format: 'json' });
    fs.writeFileSync(outputPath, output + '\n');
    const content = fs.readFileSync(outputPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.API_KEY).toBe('secret');
  });

  it('throws when not initialized', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-export-empty-'));
    try {
      expect(() => runExport(emptyDir, 'production')).toThrow();
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('throws when env not found', () => {
    expect(() => runExport(tmpdir, 'nonexistent')).toThrow();
  });

  it('escapes special characters in shell format', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-export-shell-'));
    try {
      fs.writeFileSync(path.join(dir, '.env.test'), 'MSG=he said "hello"\nPATH=$HOME/bin');
      await runInit(dir);
      const output = runExport(dir, 'test', { format: 'shell' });
      expect(output).toContain('export MSG="he said \\"hello\\""');
      expect(output).toContain('export PATH="\\$HOME/bin"');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
