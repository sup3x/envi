import type { Command } from 'commander';
import { scanEnvFiles, resolveEnvName } from '../core/scanner.js';
import { readState } from '../core/state.js';
import { maskValue } from '../utils/display.js';
import { writeFileContent } from '../utils/fs.js';
import * as display from '../utils/display.js';
import { EnviError } from '../types.js';
import type { EnvVariable, ExportFormat } from '../types.js';

interface ExportOptions {
  format?: ExportFormat;
  mask?: boolean;
  output?: string;
}

export function runExport(
  dir: string,
  envName: string,
  options: ExportOptions = {},
): string {
  const state = readState(dir);
  if (!state) {
    throw new EnviError('envi is not initialized.', 'Run "envi init" first.');
  }

  const envFiles = scanEnvFiles(dir);
  const target = resolveEnvName(envFiles, envName);
  if (!target) {
    throw new EnviError(`Environment "${envName}" not found.`);
  }

  const format = options.format ?? 'dotenv';
  const vars = options.mask
    ? target.variables.map((v) => ({ ...v, value: maskValue(v.value) }))
    : target.variables;

  return formatOutput(vars, format);
}

function formatOutput(vars: EnvVariable[], format: ExportFormat): string {
  switch (format) {
    case 'dotenv':
      return vars.map((v) => `${v.key}=${v.value}`).join('\n');

    case 'json':
      return JSON.stringify(
        Object.fromEntries(vars.map((v) => [v.key, v.value])),
        null,
        2,
      );

    case 'shell':
      return vars.map((v) => {
        // Escape backslashes, double quotes, and dollar signs for shell safety
        const escaped = v.value
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\$/g, '\\$');
        return `export ${v.key}="${escaped}"`;
      }).join('\n');

    case 'docker':
      return vars.map((v) => `${v.key}=${v.value}`).join('\n');

    case 'yaml':
      return vars
        .map((v) => {
          // Quote numeric values to keep them as strings in YAML
          const needsQuote = /^\d+$/.test(v.value) || v.value === '';
          return `${v.key}: ${needsQuote ? `"${v.value}"` : v.value}`;
        })
        .join('\n');
  }
}

export function registerExport(program: Command): void {
  program
    .command('export <environment>')
    .description('Export environment in different formats')
    .option('--format <format>', 'Output format: dotenv, json, shell, docker, yaml', 'dotenv')
    .option('--mask', 'Mask values for review')
    .option('--output <file>', 'Write to file instead of stdout')
    .action((environment: string, opts: { format: string; mask?: boolean; output?: string }) => {
      const format = opts.format as ExportFormat;
      const validFormats = ['dotenv', 'json', 'shell', 'docker', 'yaml'];
      if (!validFormats.includes(format)) {
        throw new EnviError(
          `Invalid format "${format}".`,
          `Available: ${validFormats.join(', ')}`,
        );
      }

      const output = runExport(process.cwd(), environment, {
        format,
        mask: opts.mask,
      });

      if (opts.output) {
        writeFileContent(opts.output, output + '\n');
        display.success(`Exported to ${opts.output}`);
      } else {
        // Export goes to stdout (pipe-friendly)
        process.stdout.write(output + '\n');
      }
    });
}
