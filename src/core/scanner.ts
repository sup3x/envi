import fs from 'node:fs';
import path from 'node:path';
import type { EnvFile } from '../types.js';
import { parse, extractVariables } from './env-parser.js';

const ENV_PATTERN = /^\.env\.([a-zA-Z0-9_-]+)$/;
const EXCLUDED_NAMES = new Set(['backup', 'example', 'sample', 'template']);

export function scanEnvFiles(dir: string): EnvFile[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }

  const envFiles: EnvFile[] = [];

  for (const entry of entries) {
    // Exclude any .env.*.local files
    if (entry.endsWith('.local')) continue;

    const match = ENV_PATTERN.exec(entry);
    if (!match?.[1]) continue;

    const name = match[1];
    if (EXCLUDED_NAMES.has(name)) continue;

    const filePath = path.join(dir, entry);
    try {
      if (!fs.statSync(filePath).isFile()) continue;
    } catch {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = parse(content);
    const variables = extractVariables(lines);

    envFiles.push({ name, filename: entry, path: filePath, lines, variables });
  }

  return envFiles.sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveEnvName(envFiles: EnvFile[], partial: string): EnvFile | null {
  // Exact match takes priority
  const exact = envFiles.find((f) => f.name === partial);
  if (exact) return exact;

  // Partial prefix match — only unambiguous (exactly one result)
  const matches = envFiles.filter((f) => f.name.startsWith(partial));
  if (matches.length === 1) return matches[0]!;

  return null;
}

export function getPartialMatches(envFiles: EnvFile[], partial: string): EnvFile[] {
  return envFiles.filter((f) => f.name.startsWith(partial));
}
