import type { EnvVariable, DiffResult } from '../types.js';

export function diff(left: EnvVariable[], right: EnvVariable[]): DiffResult[] {
  const leftMap = new Map(left.map((v) => [v.key, v.value]));
  const rightMap = new Map(right.map((v) => [v.key, v.value]));
  const allKeys = new Set([...leftMap.keys(), ...rightMap.keys()]);

  const results: DiffResult[] = [];

  for (const key of allKeys) {
    const lv = leftMap.get(key);
    const rv = rightMap.get(key);

    if (lv !== undefined && rv !== undefined) {
      results.push({
        key,
        status: lv === rv ? 'same' : 'different',
        leftValue: lv,
        rightValue: rv,
      });
    } else if (lv !== undefined) {
      results.push({ key, status: 'only_left', leftValue: lv });
    } else if (rv !== undefined) {
      results.push({ key, status: 'only_right', rightValue: rv });
    }
  }

  return results.sort((a, b) => a.key.localeCompare(b.key));
}
