import type { EnvLine, EnvVariable } from '../types.js';

export interface ParseResult {
  lines: EnvLine[];
  lineEnding: '\n' | '\r\n';
}

/**
 * Parse a single raw line text (no newlines) into an EnvLine descriptor.
 */
function parseLine(rawLine: string): EnvLine {
  // Blank line
  if (rawLine.trim() === '') {
    return { type: 'blank', raw: rawLine };
  }

  // Full-line comment
  if (rawLine.trimStart().startsWith('#')) {
    return { type: 'comment', raw: rawLine };
  }

  // Strip optional export prefix
  let working = rawLine;
  if (/^export\s+/.test(working)) {
    working = working.replace(/^export\s+/, '');
  }

  // Must have = to be a variable
  const eqIndex = working.indexOf('=');
  if (eqIndex === -1) {
    // Treat lines without = as comments/unknown — safest fallback
    return { type: 'comment', raw: rawLine };
  }

  const key = working.slice(0, eqIndex).trim();
  const afterEq = working.slice(eqIndex + 1);

  let value: string;
  let inlineComment: string | undefined;

  if (afterEq.startsWith('"')) {
    // Double-quoted: find closing quote (un-escaped)
    const closeIdx = findClosingQuote(afterEq, '"', 1);
    if (closeIdx === -1) {
      // Unterminated quote — treat rest as value
      value = afterEq.slice(1);
    } else {
      value = afterEq.slice(1, closeIdx);
      // Expand escape sequences inside double quotes
      value = expandEscapes(value);
      // Anything after the closing quote is ignored (no inline comments in quoted values)
    }
  } else if (afterEq.startsWith("'")) {
    // Single-quoted: no escape expansion, no inline comments
    const closeIdx = findClosingQuote(afterEq, "'", 1);
    if (closeIdx === -1) {
      value = afterEq.slice(1);
    } else {
      value = afterEq.slice(1, closeIdx);
      // Single-quoted values are literal — no escape expansion
    }
  } else {
    // Unquoted: split on first ` #` (space + hash) to separate inline comment
    const commentMatch = afterEq.match(/^(.*?)\s+(#.*)$/);
    if (commentMatch) {
      value = commentMatch[1]!;
      inlineComment = commentMatch[2]!;
    } else {
      value = afterEq;
    }
  }

  const result: EnvLine = { type: 'variable', raw: rawLine, key, value };
  if (inlineComment !== undefined) {
    result.inlineComment = inlineComment;
  }
  return result;
}

/**
 * Find the index of the closing quote character, starting at `from`.
 * Returns -1 if not found.
 */
function findClosingQuote(str: string, quote: '"' | "'", from: number): number {
  for (let i = from; i < str.length; i++) {
    if (str[i] === '\\' && quote === '"') {
      i++; // skip escaped character
      continue;
    }
    if (str[i] === quote) {
      return i;
    }
  }
  return -1;
}

/**
 * Expand common escape sequences inside double-quoted values.
 */
function expandEscapes(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"');
}

/**
 * Parse a .env file string into an array of EnvLine descriptors.
 * Handles both LF and CRLF line endings. Strips UTF-8 BOM.
 */
export function parse(input: string): EnvLine[] {
  // Strip UTF-8 BOM
  const cleaned = input.startsWith('\uFEFF') ? input.slice(1) : input;

  // Normalise line endings for splitting, but preserve raw lines correctly
  const hasCRLF = cleaned.includes('\r\n');

  const rawLines = hasCRLF
    ? cleaned.split('\r\n')
    : cleaned.split('\n');

  // Remove the trailing empty entry produced by a trailing newline, but only
  // when there is more than one line — a single empty string means the input
  // itself was an empty string representing one blank line.
  if (rawLines.length > 1 && rawLines[rawLines.length - 1] === '') {
    rawLines.pop();
  }

  return rawLines.map(parseLine);
}

/**
 * Parse a .env file string and return parsed lines together with detected
 * line ending style.
 */
export function parseWithMeta(input: string): ParseResult {
  const cleaned = input.startsWith('\uFEFF') ? input.slice(1) : input;
  const lineEnding: '\n' | '\r\n' = cleaned.includes('\r\n') ? '\r\n' : '\n';
  const lines = parse(input);
  return { lines, lineEnding };
}

/**
 * Filter an EnvLine array to only the variable entries, returning
 * them as EnvVariable objects.
 */
export function extractVariables(lines: EnvLine[]): EnvVariable[] {
  return lines
    .filter((l): l is EnvLine & { key: string; value: string } =>
      l.type === 'variable' && l.key !== undefined && l.value !== undefined
    )
    .map(l => {
      const v: EnvVariable = { key: l.key, value: l.value };
      if (l.inlineComment !== undefined) v.inlineComment = l.inlineComment;
      return v;
    });
}
