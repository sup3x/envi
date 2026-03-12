import fs from 'node:fs';
import path from 'node:path';
import type { EnviState } from '../types.js';

const STATE_FILE = '.envi';

export function createDefaultState(environments: string[]): EnviState {
  return { version: 1, active: null, environments, lastSwitch: null };
}

export function readState(dir: string): EnviState | null {
  const filePath = path.join(dir, STATE_FILE);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as EnviState;
  } catch {
    return null;
  }
}

export function writeState(dir: string, state: EnviState): void {
  const filePath = path.join(dir, STATE_FILE);
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}
