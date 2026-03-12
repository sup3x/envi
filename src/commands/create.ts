import type { Command } from 'commander';
import path from 'node:path';
import { scanEnvFiles, resolveEnvName } from '../core/scanner.js';
import { readState } from '../core/state.js';
import { parse } from '../core/env-parser.js';
import { fileExists, readFileContent, writeFileContent } from '../utils/fs.js';
import * as display from '../utils/display.js';
import { EnviError } from '../types.js';

interface CreateOptions {
  from?: string;
  empty?: boolean;
}

export function runCreate(
  dir: string,
  name: string,
  options: CreateOptions = {},
): void {
  const state = readState(dir);
  if (!state) {
    throw new EnviError('envi is not initialized.', 'Run "envi init" first.');
  }

  const targetPath = path.join(dir, `.env.${name}`);
  if (fileExists(targetPath)) {
    throw new EnviError(`Environment "${name}" already exists.`);
  }

  const envFiles = scanEnvFiles(dir);

  // Determine source
  let sourceFrom = options.from;
  if (!sourceFrom && state.active) {
    sourceFrom = state.active;
  }
  if (!sourceFrom && envFiles.length > 0) {
    sourceFrom = envFiles[0]!.name;
  }
  if (!sourceFrom) {
    throw new EnviError('No source environment to copy from.', 'Use --from <env> to specify.');
  }

  const sourceFile = resolveEnvName(envFiles, sourceFrom);
  if (!sourceFile) {
    throw new EnviError(`Source environment "${sourceFrom}" not found.`);
  }

  let content = readFileContent(sourceFile.path);

  if (options.empty) {
    // Keep keys, clear values
    const lines = parse(content);
    const emptyLines = lines.map((line) => {
      if (line.type === 'variable' && line.key) {
        return `${line.key}=`;
      }
      return line.raw;
    });
    content = emptyLines.join('\n');
  }

  writeFileContent(targetPath, content);
}

export function registerCreate(program: Command): void {
  program
    .command('create <name>')
    .description('Create a new environment')
    .option('--from <env>', 'Copy from specific environment')
    .option('--empty', 'Copy keys only, leave values blank')
    .action((name: string, opts: { from?: string; empty?: boolean }) => {
      runCreate(process.cwd(), name, opts);
      console.error('');
      display.success(`Created .env.${name}`);
      console.error('');
    });
}
