import type { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import { scanEnvFiles, resolveEnvName, getPartialMatches } from '../core/scanner.js';
import { readState, writeState } from '../core/state.js';
import { parse, extractVariables } from '../core/env-parser.js';
import { diff } from '../core/differ.js';
import { copyFile, fileExists } from '../utils/fs.js';
import * as display from '../utils/display.js';
import { EnviError } from '../types.js';

export interface UseOptions {
  force?: boolean;
}

export interface UseResult {
  previousEnv: string | null;
  newEnv: string;
  backedUp: boolean;
}

export async function runUse(
  dir: string,
  envName: string,
  options: UseOptions = {},
): Promise<UseResult> {
  const state = readState(dir);
  if (!state) {
    throw new EnviError(
      'envi is not initialized in this directory.',
      'Run "envi init" to get started.',
    );
  }

  const envFiles = scanEnvFiles(dir);

  // Resolve potentially partial name
  const resolved = resolveEnvName(envFiles, envName);
  if (!resolved) {
    const matches = getPartialMatches(envFiles, envName);
    if (matches.length > 1) {
      throw new EnviError(
        `Ambiguous environment name "${envName}". Matches: ${matches.map((m) => m.name).join(', ')}.`,
        'Provide a more specific name.',
      );
    }
    throw new EnviError(
      `Unknown environment "${envName}".`,
      `Available: ${envFiles.map((f) => f.name).join(', ')}`,
    );
  }

  // Detect unsaved changes: compare .env with .env.<active>
  if (!options.force && state.active) {
    const dotEnvPath = path.join(dir, '.env');
    const activeEnvFile = envFiles.find((f) => f.name === state.active);
    if (activeEnvFile && fileExists(dotEnvPath)) {
      const currentContent = fs.readFileSync(dotEnvPath, 'utf-8');
      const currentVars = extractVariables(parse(currentContent));
      const diffs = diff(currentVars, activeEnvFile.variables);
      const hasChanges = diffs.some((d) => d.status !== 'same');
      if (hasChanges) {
        throw new EnviError(
          `Unsaved changes detected in .env (differs from .env.${state.active}).`,
          'Run "envi save" to save your changes, or use --force to discard them.',
        );
      }
    }
  }

  // Backup current .env if it exists
  const dotEnvPath = path.join(dir, '.env');
  const backupPath = path.join(dir, '.env.backup');
  let backedUp = false;
  if (fileExists(dotEnvPath)) {
    copyFile(dotEnvPath, backupPath);
    backedUp = true;
  }

  // Copy target env file to .env
  copyFile(resolved.path, dotEnvPath);

  // Update state
  const previousEnv = state.active;
  state.active = resolved.name;
  state.lastSwitch = new Date().toISOString();
  writeState(dir, state);

  return { previousEnv, newEnv: resolved.name, backedUp };
}

export function registerUse(program: Command): void {
  program
    .command('use <environment>')
    .description('Switch to a specific environment')
    .option('-f, --force', 'Discard unsaved changes without prompting')
    .action(async (environment: string, opts: { force?: boolean }) => {
      const dir = process.cwd();
      const result = await runUse(dir, environment, { force: opts.force });
      if (result.previousEnv) {
        display.success(`Switched from ${result.previousEnv} → ${result.newEnv}`);
      } else {
        display.success(`Switched to ${result.newEnv}`);
      }
      if (result.backedUp) {
        display.info('Previous .env backed up to .env.backup');
      }
    });
}
