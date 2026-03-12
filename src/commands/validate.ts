import type { Command } from 'commander';
import chalk from 'chalk';
import { scanEnvFiles, resolveEnvName } from '../core/scanner.js';
import { readState } from '../core/state.js';
import * as display from '../utils/display.js';
import { EnviError } from '../types.js';
import type { ValidationResult } from '../types.js';

interface ValidateOptions {
  strict?: boolean;
  env?: string;
}

export function runValidate(
  dir: string,
  options: ValidateOptions = {},
): ValidationResult[] {
  const state = readState(dir);
  if (!state) {
    throw new EnviError('envi is not initialized.', 'Run "envi init" first.');
  }

  let envFiles = scanEnvFiles(dir);

  if (options.env) {
    const target = resolveEnvName(envFiles, options.env);
    if (!target) {
      throw new EnviError(`Environment "${options.env}" not found.`);
    }
    envFiles = [target];
  }

  // Collect all unique variable names across all scanned environments
  const allEnvFiles = scanEnvFiles(dir);
  const allKeys = new Set<string>();
  for (const f of allEnvFiles) {
    for (const v of f.variables) {
      allKeys.add(v.key);
    }
  }

  const results: ValidationResult[] = [];

  for (const envFile of envFiles) {
    const presentKeys = new Set(envFile.variables.map((v) => v.key));
    const missing = [...allKeys].filter((k) => !presentKeys.has(k)).sort();

    let empty: string[] = [];
    if (options.strict) {
      empty = envFile.variables
        .filter((v) => v.value === '')
        .map((v) => v.key)
        .sort();
    }

    results.push({
      environment: envFile.name,
      missing,
      empty,
      total: allKeys.size,
    });
  }

  return results;
}

export function registerValidate(program: Command): void {
  program
    .command('validate')
    .description('Check all environments for missing variables')
    .option('--strict', 'Also flag empty values')
    .option('--env <name>', 'Validate a single environment')
    .action((opts: { strict?: boolean; env?: string }) => {
      const results = runValidate(process.cwd(), opts);
      let hasIssues = false;

      console.error('');
      for (const r of results) {
        if (r.missing.length > 0) {
          hasIssues = true;
          display.warn(`${r.environment}: missing ${r.missing.length} variables`);
          for (const key of r.missing) {
            console.error(chalk.red(`    - ${key}`));
          }
        }
        if (r.empty.length > 0) {
          hasIssues = true;
          display.warn(`${r.environment}: ${r.empty.length} empty values`);
          for (const key of r.empty) {
            console.error(chalk.yellow(`    - ${key}`));
          }
        }
        if (r.missing.length === 0 && r.empty.length === 0) {
          display.success(`${r.environment}: all ${r.total} variables present`);
        }
      }
      console.error('');

      if (hasIssues) {
        process.exit(1);
      }
    });
}
