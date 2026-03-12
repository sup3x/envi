import type { Command } from 'commander';
import path from 'node:path';
import { readState } from '../core/state.js';
import { parse, extractVariables } from '../core/env-parser.js';
import { fileExists, readFileContent, writeFileContent } from '../utils/fs.js';
import * as display from '../utils/display.js';
import { EnviError } from '../types.js';

interface SaveResult {
  added: number;
  changed: number;
  removed: number;
}

export function runSave(dir: string): SaveResult {
  const state = readState(dir);
  if (!state) {
    throw new EnviError('envi is not initialized.', 'Run "envi init" first.');
  }
  if (!state.active) {
    throw new EnviError(
      'No active environment.',
      'Run "envi use <env>" first.',
    );
  }

  const envPath = path.join(dir, '.env');
  const sourcePath = path.join(dir, `.env.${state.active}`);

  if (!fileExists(envPath)) {
    throw new EnviError('No .env file found.', 'Run "envi use <env>" first.');
  }

  const currentContent = readFileContent(envPath);
  const sourceContent = fileExists(sourcePath) ? readFileContent(sourcePath) : '';

  const currentVars = extractVariables(parse(currentContent));
  const sourceVars = extractVariables(parse(sourceContent));

  const sourceMap = new Map(sourceVars.map((v) => [v.key, v.value]));
  const currentMap = new Map(currentVars.map((v) => [v.key, v.value]));

  let added = 0;
  let changed = 0;
  let removed = 0;

  for (const [key, value] of currentMap) {
    if (!sourceMap.has(key)) added++;
    else if (sourceMap.get(key) !== value) changed++;
  }
  for (const key of sourceMap.keys()) {
    if (!currentMap.has(key)) removed++;
  }

  // Write current .env content to source file
  writeFileContent(sourcePath, currentContent);

  return { added, changed, removed };
}

export function registerSave(program: Command): void {
  program
    .command('save')
    .description('Save current .env changes back to source environment file')
    .action(() => {
      const dir = process.cwd();
      const state = readState(dir);
      const result = runSave(dir);

      console.error('');
      display.success(`Changes saved to .env.${state!.active}`);
      if (result.added > 0) console.error(`    + ${result.added} added`);
      if (result.changed > 0) console.error(`    ~ ${result.changed} changed`);
      if (result.removed > 0) console.error(`    - ${result.removed} removed`);
      console.error('');
    });
}
