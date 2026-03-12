import { describe, it, expect } from 'vitest';
import { parse, parseWithMeta, extractVariables } from '../../src/core/env-parser.js';

// ─── basic KEY=value ──────────────────────────────────────────────────────────
describe('parse – basic KEY=value', () => {
  it('parses a simple assignment', () => {
    const lines = parse('FOO=bar');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'FOO', value: 'bar' });
  });

  it('returns the original raw text', () => {
    const raw = 'APP_NAME=myapp';
    const lines = parse(raw);
    expect(lines[0]!.raw).toBe(raw);
  });

  it('handles KEY with no value (KEY=)', () => {
    const lines = parse('EMPTY=');
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'EMPTY', value: '' });
  });

  it('handles value that contains = sign', () => {
    const lines = parse('BASE64=dGVzdA==');
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'BASE64', value: 'dGVzdA==' });
  });
});

// ─── quoted values ────────────────────────────────────────────────────────────
describe('parse – quoted values', () => {
  it('strips double quotes', () => {
    const lines = parse('NAME="John Doe"');
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'NAME', value: 'John Doe' });
  });

  it('strips single quotes', () => {
    const lines = parse("NAME='Jane Doe'");
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'NAME', value: 'Jane Doe' });
  });

  it('handles empty double-quoted value (KEY="")', () => {
    const lines = parse('EMPTY=""');
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'EMPTY', value: '' });
  });

  it('handles empty single-quoted value (KEY=\'\')', () => {
    const lines = parse("EMPTY=''");
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'EMPTY', value: '' });
  });

  it('does NOT treat # inside double quotes as inline comment', () => {
    const lines = parse('COLOR="#ff0000"');
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'COLOR', value: '#ff0000' });
    expect(lines[0]!.inlineComment).toBeUndefined();
  });

  it('does NOT treat # inside single quotes as inline comment', () => {
    const lines = parse("COLOR='#ff0000'");
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'COLOR', value: '#ff0000' });
    expect(lines[0]!.inlineComment).toBeUndefined();
  });

  it('expands escaped \\n in double-quoted values', () => {
    const lines = parse('MSG="hello\\nworld"');
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'MSG', value: 'hello\nworld' });
  });

  it('does NOT expand escaped \\n in single-quoted values', () => {
    const lines = parse("MSG='hello\\nworld'");
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'MSG', value: 'hello\\nworld' });
  });
});

// ─── export prefix ────────────────────────────────────────────────────────────
describe('parse – export prefix', () => {
  it('strips export keyword', () => {
    const lines = parse('export API_KEY=secret');
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'API_KEY', value: 'secret' });
  });

  it('strips export + whitespace variants', () => {
    const lines = parse('export  DB_URL=postgres://localhost/db');
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'DB_URL', value: 'postgres://localhost/db' });
  });
});

// ─── comments ─────────────────────────────────────────────────────────────────
describe('parse – comments', () => {
  it('parses full-line comment', () => {
    const lines = parse('# This is a comment');
    expect(lines[0]).toMatchObject({ type: 'comment', raw: '# This is a comment' });
    expect(lines[0]!.key).toBeUndefined();
  });

  it('parses comment starting without space', () => {
    const lines = parse('#NO_SPACE=comment');
    expect(lines[0]!.type).toBe('comment');
  });

  it('extracts inline comment from unquoted value', () => {
    const lines = parse('PORT=3000 # web port');
    expect(lines[0]).toMatchObject({
      type: 'variable',
      key: 'PORT',
      value: '3000',
      inlineComment: '# web port',
    });
  });

  it('does not include trailing whitespace in value when inline comment present', () => {
    const lines = parse('HOST=localhost # server host');
    expect(lines[0]!.value).toBe('localhost');
  });
});

// ─── blank lines ──────────────────────────────────────────────────────────────
describe('parse – blank lines', () => {
  it('parses blank line', () => {
    const lines = parse('');
    expect(lines[0]).toMatchObject({ type: 'blank', raw: '' });
  });

  it('parses whitespace-only line as blank', () => {
    const lines = parse('   ');
    expect(lines[0]).toMatchObject({ type: 'blank' });
  });
});

// ─── multiline input ──────────────────────────────────────────────────────────
describe('parse – multiline input', () => {
  it('preserves all lines including blanks and comments', () => {
    const input = [
      '# config',
      'FOO=bar',
      '',
      'BAZ=qux',
    ].join('\n');
    const lines = parse(input);
    expect(lines).toHaveLength(4);
    expect(lines[0]!.type).toBe('comment');
    expect(lines[1]!.type).toBe('variable');
    expect(lines[2]!.type).toBe('blank');
    expect(lines[3]!.type).toBe('variable');
  });

  it('handles Windows CRLF line endings', () => {
    const input = 'FOO=bar\r\nBAZ=qux\r\n';
    const lines = parse(input);
    expect(lines.filter(l => l.type === 'variable')).toHaveLength(2);
    expect(lines.find(l => l.key === 'FOO')!.value).toBe('bar');
    expect(lines.find(l => l.key === 'BAZ')!.value).toBe('qux');
  });
});

// ─── unicode ─────────────────────────────────────────────────────────────────
describe('parse – unicode values', () => {
  it('handles unicode values unquoted', () => {
    const lines = parse('GREETING=こんにちは');
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'GREETING', value: 'こんにちは' });
  });

  it('handles unicode values in double quotes', () => {
    const lines = parse('GREETING="héllo wörld"');
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'GREETING', value: 'héllo wörld' });
  });
});

// ─── BOM stripping ────────────────────────────────────────────────────────────
describe('parse – BOM stripping', () => {
  it('strips UTF-8 BOM from the beginning', () => {
    const bom = '\uFEFF';
    const lines = parse(`${bom}FOO=bar`);
    expect(lines[0]).toMatchObject({ type: 'variable', key: 'FOO', value: 'bar' });
  });
});

// ─── parseWithMeta ────────────────────────────────────────────────────────────
describe('parseWithMeta', () => {
  it('detects LF line endings', () => {
    const result = parseWithMeta('FOO=bar\nBAZ=qux');
    expect(result.lineEnding).toBe('\n');
    expect(result.lines).toHaveLength(2);
  });

  it('detects CRLF line endings', () => {
    const result = parseWithMeta('FOO=bar\r\nBAZ=qux\r\n');
    expect(result.lineEnding).toBe('\r\n');
  });

  it('defaults to LF when no line endings present', () => {
    const result = parseWithMeta('FOO=bar');
    expect(result.lineEnding).toBe('\n');
  });
});

// ─── extractVariables ─────────────────────────────────────────────────────────
describe('extractVariables', () => {
  it('filters only variable lines', () => {
    const lines = parse('# comment\nFOO=bar\n\nBAZ=qux');
    const vars = extractVariables(lines);
    expect(vars).toHaveLength(2);
    expect(vars[0]).toMatchObject({ key: 'FOO', value: 'bar' });
    expect(vars[1]).toMatchObject({ key: 'BAZ', value: 'qux' });
  });

  it('includes inlineComment in result', () => {
    const lines = parse('PORT=3000 # web port');
    const vars = extractVariables(lines);
    expect(vars[0]).toMatchObject({ key: 'PORT', value: '3000', inlineComment: '# web port' });
  });

  it('returns empty array when no variables', () => {
    const lines = parse('# just a comment\n\n');
    const vars = extractVariables(lines);
    expect(vars).toHaveLength(0);
  });
});
