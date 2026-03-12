import type { Command } from 'commander';
import { scanEnvFiles } from '../core/scanner.js';
import { createDefaultState, readState, writeState } from '../core/state.js';
import { appendToGitignore, fileExists } from '../utils/fs.js';
import * as display from '../utils/display.js';
import { EnviError } from '../types.js';
import path from 'node:path';

export interface InitResult {
  environments: string[];
  alreadyInitialized: boolean;
  hasBareEnv: boolean;
}

export async function runInit(dir: string): Promise<InitResult> {
  const existing = readState(dir);
  const envFiles = scanEnvFiles(dir);

  if (envFiles.length === 0) {
    const bareEnvPath = path.join(dir, '.env');
    if (fileExists(bareEnvPath)) {
      return { environments: [], alreadyInitialized: existing !== null, hasBareEnv: true };
    }
    throw new EnviError(
      'No .env files found in this directory.',
      'Create .env.development, .env.production, etc. and run envi init again.',
    );
  }

  const envNames = envFiles.map((f) => f.name);
  const state = createDefaultState(envNames);
  if (existing?.active && envNames.includes(existing.active)) {
    state.active = existing.active;
    state.lastSwitch = existing.lastSwitch;
  }
  writeState(dir, state);
  appendToGitignore(dir, ['.envi', '.env.backup']);
  return { environments: envNames, alreadyInitialized: existing !== null, hasBareEnv: false };
}

export function registerInit(program: Command): void {
  program
    .command('init')
    .description('Initialize envi in the current directory')
    .action(async () => {
      const dir = process.cwd();
      const result = await runInit(dir);
      if (result.hasBareEnv) {
        display.info('Found .env but no environment files (.env.development, etc.).');
        display.info(
          'Rename your .env to .env.<name> (e.g., .env.development) and run envi init again.',
        );
        return;
      }
      if (result.alreadyInitialized) display.info('Re-initialized envi.');
      console.error('');
      console.error('  Found ' + result.environments.length + ' environment files:');
      for (const env of result.environments) console.error('    .env.' + env);
      console.error('');
      display.success('envi initialized. Use "envi use <env>" to switch environments.');
    });
}
