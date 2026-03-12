import { describe, it, expect } from 'vitest';
import { write, updateValue } from '../../src/core/env-writer.js';
import { parse } from '../../src/core/env-parser.js';

// ─── write ────────────────────────────────────────────────────────────────────
describe('write – round-trip', () => {
  it('round-trips basic variables', () => {
    const input = 'FOO=bar\nBAZ=qux';
    const lines = parse(input);
    expect(write(lines)).toBe(input);
  });

  it('round-trips comments and blank lines', () => {
    const input = '# comment\nFOO=bar\n\nBAZ=qux';
    const lines = parse(input);
    expect(write(lines)).toBe(input);
  });

  it('round-trips double-quoted values', () => {
    const input = 'NAME="John Doe"\nDB_URL="postgres://localhost/db"';
    const lines = parse(input);
    expect(write(lines)).toBe(input);
  });

  it('round-trips single-quoted values', () => {
    const input = "NAME='Jane Doe'\nTOKEN='abc123'";
    const lines = parse(input);
    expect(write(lines)).toBe(input);
  });

  it('round-trips export prefix', () => {
    const input = 'export API_KEY=secret\nexport DB_PASS=hunter2';
    const lines = parse(input);
    expect(write(lines)).toBe(input);
  });

  it('round-trips inline comments', () => {
    const input = 'PORT=3000 # web port\nHOST=localhost # server host';
    const lines = parse(input);
    expect(write(lines)).toBe(input);
  });

  it('preserves original formatting of a complex multi-line file exactly', () => {
    const input = [
      '# Application config',
      'APP_NAME=myapp',
      'APP_ENV=production',
      '',
      '# Database',
      'DB_HOST=localhost # primary',
      'DB_PORT=5432',
      'DB_NAME="my_database"',
      "DB_PASS='secret'",
      '',
      'export SECRET_KEY=abc123',
    ].join('\n');
    const lines = parse(input);
    expect(write(lines)).toBe(input);
  });

  it('uses LF by default', () => {
    const lines = parse('FOO=bar\nBAZ=qux');
    const result = write(lines);
    expect(result).not.toContain('\r\n');
  });

  it('uses CRLF when specified', () => {
    const lines = parse('FOO=bar\nBAZ=qux');
    const result = write(lines, '\r\n');
    expect(result).toBe('FOO=bar\r\nBAZ=qux');
  });
});

// ─── updateValue ─────────────────────────────────────────────────────────────
describe('updateValue', () => {
  it('updates value of an existing key', () => {
    const lines = parse('FOO=bar\nBAZ=qux');
    const updated = updateValue(lines, 'FOO', 'newvalue');
    expect(write(updated)).toBe('FOO=newvalue\nBAZ=qux');
  });

  it('preserves other lines unchanged', () => {
    const lines = parse('# comment\nFOO=bar\n\nBAZ=qux');
    const updated = updateValue(lines, 'BAZ', 'new');
    const result = write(updated);
    expect(result).toBe('# comment\nFOO=bar\n\nBAZ=new');
  });

  it('returns lines unchanged when key not found', () => {
    const lines = parse('FOO=bar');
    const updated = updateValue(lines, 'MISSING', 'val');
    expect(write(updated)).toBe('FOO=bar');
  });

  it('preserves double-quote style when updating', () => {
    const lines = parse('NAME="John Doe"');
    const updated = updateValue(lines, 'NAME', 'Jane Doe');
    expect(write(updated)).toBe('NAME="Jane Doe"');
  });

  it('preserves single-quote style when updating', () => {
    const lines = parse("NAME='John Doe'");
    const updated = updateValue(lines, 'NAME', 'Jane Doe');
    expect(write(updated)).toBe("NAME='Jane Doe'");
  });

  it('preserves export prefix when updating', () => {
    const lines = parse('export API_KEY=oldvalue');
    const updated = updateValue(lines, 'API_KEY', 'newvalue');
    expect(write(updated)).toBe('export API_KEY=newvalue');
  });

  it('preserves inline comment when updating', () => {
    const lines = parse('PORT=3000 # web port');
    const updated = updateValue(lines, 'PORT', '4000');
    expect(write(updated)).toBe('PORT=4000 # web port');
  });

  it('does not mutate original lines array', () => {
    const lines = parse('FOO=bar');
    const updated = updateValue(lines, 'FOO', 'new');
    expect(lines[0]!.raw).toBe('FOO=bar');
    expect(updated[0]!.raw).toBe('FOO=new');
  });
});
