import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { appendToGitignore, fileExists } from '../../src/utils/fs.js';

describe('fs utils', () => {
  let tmpdir: string;
  beforeEach(() => {
    tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'envi-fs-'));
  });
  afterEach(() => {
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it('appendToGitignore creates .gitignore if missing', () => {
    appendToGitignore(tmpdir, ['.envi']);
    expect(fs.readFileSync(path.join(tmpdir, '.gitignore'), 'utf-8')).toContain('.envi');
  });

  it('appendToGitignore does not duplicate entries', () => {
    fs.writeFileSync(path.join(tmpdir, '.gitignore'), '.envi\n');
    appendToGitignore(tmpdir, ['.envi']);
    const content = fs.readFileSync(path.join(tmpdir, '.gitignore'), 'utf-8');
    expect((content.match(/\.envi/g) || []).length).toBe(1);
  });

  it('appendToGitignore appends to existing content', () => {
    fs.writeFileSync(path.join(tmpdir, '.gitignore'), 'node_modules\n');
    appendToGitignore(tmpdir, ['.envi', '.env.backup']);
    const content = fs.readFileSync(path.join(tmpdir, '.gitignore'), 'utf-8');
    expect(content).toContain('node_modules');
    expect(content).toContain('.envi');
    expect(content).toContain('.env.backup');
  });

  it('fileExists returns false for missing file', () => {
    expect(fileExists(path.join(tmpdir, 'nope'))).toBe(false);
  });
});
