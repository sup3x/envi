import { describe, it, expect } from 'vitest';
import { diff } from '../../src/core/differ.js';
import type { EnvVariable, DiffResult } from '../../src/types.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

function v(key: string, value: string): EnvVariable {
  return { key, value };
}

// ─── same values ──────────────────────────────────────────────────────────────

describe('diff – same values', () => {
  it('detects same value for a single key', () => {
    const result = diff([v('FOO', 'bar')], [v('FOO', 'bar')]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<DiffResult>({
      key: 'FOO',
      status: 'same',
      leftValue: 'bar',
      rightValue: 'bar',
    });
  });

  it('treats empty string values as same when both sides have empty', () => {
    const result = diff([v('KEY', '')], [v('KEY', '')]);
    expect(result[0]!.status).toBe('same');
  });
});

// ─── different values ─────────────────────────────────────────────────────────

describe('diff – different values', () => {
  it('detects different value for a single key', () => {
    const result = diff([v('DB_URL', 'postgres://localhost/dev')], [v('DB_URL', 'postgres://localhost/prod')]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<DiffResult>({
      key: 'DB_URL',
      status: 'different',
      leftValue: 'postgres://localhost/dev',
      rightValue: 'postgres://localhost/prod',
    });
  });

  it('detects different when one side has empty string and other does not', () => {
    const result = diff([v('FOO', '')], [v('FOO', 'value')]);
    expect(result[0]!.status).toBe('different');
    expect(result[0]!.leftValue).toBe('');
    expect(result[0]!.rightValue).toBe('value');
  });
});

// ─── only_left ────────────────────────────────────────────────────────────────

describe('diff – only_left', () => {
  it('detects key present only in left', () => {
    const result = diff([v('SECRET', 'x')], []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<DiffResult>({
      key: 'SECRET',
      status: 'only_left',
      leftValue: 'x',
    });
    expect(result[0]!.rightValue).toBeUndefined();
  });

  it('detects multiple only_left keys', () => {
    const result = diff([v('A', '1'), v('B', '2')], []);
    expect(result.every((r) => r.status === 'only_left')).toBe(true);
    expect(result.map((r) => r.key).sort()).toEqual(['A', 'B']);
  });
});

// ─── only_right ───────────────────────────────────────────────────────────────

describe('diff – only_right', () => {
  it('detects key present only in right', () => {
    const result = diff([], [v('NEW_KEY', 'hello')]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<DiffResult>({
      key: 'NEW_KEY',
      status: 'only_right',
      rightValue: 'hello',
    });
    expect(result[0]!.leftValue).toBeUndefined();
  });

  it('detects multiple only_right keys', () => {
    const result = diff([], [v('C', '3'), v('D', '4')]);
    expect(result.every((r) => r.status === 'only_right')).toBe(true);
    expect(result.map((r) => r.key).sort()).toEqual(['C', 'D']);
  });
});

// ─── mixed scenarios ──────────────────────────────────────────────────────────

describe('diff – mixed scenarios', () => {
  it('handles a realistic multi-key comparison', () => {
    const left: EnvVariable[] = [
      v('APP_NAME', 'myapp'),      // same
      v('DB_URL', 'dev-db'),       // different
      v('SECRET', 'abc123'),       // only_left
    ];
    const right: EnvVariable[] = [
      v('APP_NAME', 'myapp'),      // same
      v('DB_URL', 'prod-db'),      // different
      v('API_KEY', 'xyz789'),      // only_right
    ];

    const result = diff(left, right);

    // Should have 4 entries, sorted alphabetically
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.key)).toEqual(['API_KEY', 'APP_NAME', 'DB_URL', 'SECRET']);

    const byKey = Object.fromEntries(result.map((r) => [r.key, r]));
    expect(byKey['API_KEY']!.status).toBe('only_right');
    expect(byKey['APP_NAME']!.status).toBe('same');
    expect(byKey['DB_URL']!.status).toBe('different');
    expect(byKey['SECRET']!.status).toBe('only_left');
  });

  it('handles duplicate keys in input (last-write-wins via Map)', () => {
    // Map constructor: last duplicate wins
    const left = [v('FOO', 'first'), v('FOO', 'second')];
    const right = [v('FOO', 'second')];
    const result = diff(left, right);
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe('same');
  });
});

// ─── both empty ───────────────────────────────────────────────────────────────

describe('diff – both empty', () => {
  it('returns empty array when both sides are empty', () => {
    const result = diff([], []);
    expect(result).toHaveLength(0);
  });
});

// ─── sort order ───────────────────────────────────────────────────────────────

describe('diff – sort order', () => {
  it('sorts results by key alphabetically', () => {
    const left = [v('ZEBRA', '1'), v('ALPHA', '2'), v('MIDDLE', '3')];
    const right = [v('ZEBRA', '1'), v('ALPHA', '2'), v('MIDDLE', '3')];
    const result = diff(left, right);
    expect(result.map((r) => r.key)).toEqual(['ALPHA', 'MIDDLE', 'ZEBRA']);
  });

  it('sorts mixed statuses by key (not by status)', () => {
    const left = [v('Z_ONLY_LEFT', 'x'), v('A_SAME', 'v')];
    const right = [v('M_ONLY_RIGHT', 'y'), v('A_SAME', 'v')];
    const result = diff(left, right);
    expect(result.map((r) => r.key)).toEqual(['A_SAME', 'M_ONLY_RIGHT', 'Z_ONLY_LEFT']);
  });
});
