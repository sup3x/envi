import type { Command } from 'commander';
import chalk from 'chalk';
import { scanEnvFiles } from '../core/scanner.js';
import { readState } from '../core/state.js';
import * as display from '../utils/display.js';
import { EnviError } from '../types.js';

export interface ListEntry {
  name: string;
  filename: string;
  varCount: number;
  active: boolean;
}

export function runList(dir: string): ListEntry[] {
  const state = readState(dir);
  if (!state) {
    throw new EnviError(
      'envi is not initialized in this directory.',
      'Run "envi init" to get started.',
    );
  }

  const envFiles = scanEnvFiles(dir);
  return envFiles.map((f) => ({
    name: f.name,
    filename: f.filename,
    varCount: f.variables.length,
    active: state.active === f.name,
  }));
}

export function registerList(program: Command): void {
  program
    .command('list')
    .alias('ls')
    .description('List all available environments')
    .action(async () => {
      const dir = process.cwd();
      const entries = runList(dir);

      if (entries.length === 0) {
        display.warn('No environment files found. Run "envi init" to scan for .env.* files.');
        return;
      }

      console.error('');
      for (const entry of entries) {
        const marker = entry.active ? chalk.green('●') : chalk.dim('○');
        const name = entry.active ? chalk.green(entry.name) : entry.name;
        const vars = chalk.dim(`(${entry.varCount} vars)`);
        console.error(`  ${marker}  ${name}  ${vars}`);
      }
      console.error('');
    });
}
