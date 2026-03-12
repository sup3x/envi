import type { Command } from 'commander';
import chalk from 'chalk';
import { scanEnvFiles, resolveEnvName } from '../core/scanner.js';
import { readState } from '../core/state.js';
import { diff } from '../core/differ.js';
import { maskValue, createTable } from '../utils/display.js';
import { EnviError } from '../types.js';
import type { DiffResult } from '../types.js';

export interface DiffOutput {
  leftName: string;
  rightName: string;
  results: DiffResult[];
}

export function runDiff(
  dir: string,
  env1?: string,
  env2?: string,
): DiffOutput {
  const state = readState(dir);
  if (!state) {
    throw new EnviError('envi is not initialized.', 'Run "envi init" first.');
  }

  const envFiles = scanEnvFiles(dir);

  let leftName: string;
  let rightName: string;

  if (env1 && env2) {
    leftName = env1;
    rightName = env2;
  } else if (env1) {
    if (!state.active) {
      throw new EnviError(
        'No active environment to compare against.',
        'Run "envi use <env>" first, or provide two environment names.',
      );
    }
    leftName = state.active;
    rightName = env1;
  } else {
    throw new EnviError('Provide at least one environment name.');
  }

  const leftFile = resolveEnvName(envFiles, leftName);
  const rightFile = resolveEnvName(envFiles, rightName);

  if (!leftFile) {
    throw new EnviError(`Environment "${leftName}" not found.`);
  }
  if (!rightFile) {
    throw new EnviError(`Environment "${rightName}" not found.`);
  }

  const results = diff(leftFile.variables, rightFile.variables);

  return {
    leftName: leftFile.name,
    rightName: rightFile.name,
    results,
  };
}

export function registerDiff(program: Command): void {
  program
    .command('diff [env1] [env2]')
    .description('Compare two environments')
    .option('--show-values', 'Show actual values instead of masking')
    .action((env1: string | undefined, env2: string | undefined, opts: { showValues?: boolean }) => {
      const dir = process.cwd();
      const state = readState(dir);
      if (!state) {
        throw new EnviError('envi is not initialized.', 'Run "envi init" first.');
      }

      // Zero args: summary mode
      if (!env1) {
        if (!state.active) {
          throw new EnviError('No active environment.', 'Run "envi use <env>" first.');
        }
        const envFiles = scanEnvFiles(dir);
        const activeFile = resolveEnvName(envFiles, state.active);
        if (!activeFile) {
          throw new EnviError(`Active environment "${state.active}" not found.`);
        }

        console.error('');
        console.error(`  Comparing against active: ${chalk.green(state.active)}`);
        console.error('');
        for (const other of envFiles) {
          if (other.name === state.active) continue;
          const results = diff(activeFile.variables, other.variables);
          const missing = results.filter((r) => r.status === 'only_left').length;
          const extra = results.filter((r) => r.status === 'only_right').length;
          const different = results.filter((r) => r.status === 'different').length;
          console.error(
            `  ${other.name}: ${chalk.yellow(different + ' different')}, ` +
              `${chalk.red(missing + ' missing')}, ${chalk.blue(extra + ' extra')}`,
          );
        }
        console.error('');
        return;
      }

      const output = runDiff(dir, env1, env2);
      const showValues = opts.showValues ?? false;

      console.error('');
      console.error(
        `  Comparing ${chalk.bold(output.leftName)} \u2194 ${chalk.bold(output.rightName)}`,
      );
      console.error('');

      const table = createTable(['Variable', output.leftName, output.rightName]);

      for (const r of output.results) {
        const left = r.leftValue !== undefined
          ? (showValues ? r.leftValue : maskValue(r.leftValue))
          : chalk.red('\u2717 missing');
        const right = r.rightValue !== undefined
          ? (showValues ? r.rightValue : maskValue(r.rightValue))
          : chalk.red('\u2717 missing');

        let keyDisplay: string;
        if (r.status === 'same') {
          keyDisplay = chalk.green(r.key);
        } else if (r.status === 'different') {
          keyDisplay = chalk.yellow(r.key);
        } else {
          keyDisplay = chalk.red(r.key);
        }

        table.push([keyDisplay, left, right]);
      }

      console.error(table.toString());

      const summary = output.results.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      console.error('');
      console.error(
        `  Summary: ${summary.different || 0} different, ` +
          `${summary.only_left || 0} only in ${output.leftName}, ` +
          `${summary.only_right || 0} only in ${output.rightName}`,
      );
      console.error('');
    });
}
