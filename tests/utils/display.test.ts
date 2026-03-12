import { describe, it, expect } from 'vitest';
import { maskValue } from '../../src/utils/display.js';

describe('display utils', () => {
  it('maskValue returns block characters', () => {
    const masked = maskValue('secret123');
    expect(masked).not.toContain('secret');
    expect(masked.length).toBe(9);
  });

  it('maskValue caps at 10 chars', () => {
    expect(maskValue('a'.repeat(50)).length).toBe(10);
  });
});
