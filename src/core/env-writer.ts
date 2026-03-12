import type { EnvLine } from '../types.js';

/**
 * Serialise an array of EnvLine back to a .env file string.
 * Each line's `.raw` property is used as-is to guarantee round-trip fidelity.
 * @param lines      Parsed env lines.
 * @param lineEnding Line-ending character(s) to use. Defaults to '\n'.
 */
export function write(lines: EnvLine[], lineEnding: '\n' | '\r\n' = '\n'): string {
  return lines.map(l => l.raw).join(lineEnding);
}

/**
 * Return a new lines array where the given key's value has been replaced with
 * `newValue`. The original quoting style (none / double-quote / single-quote)
 * and the `export` prefix are preserved. Inline comments are preserved.
 * If the key does not exist the original array is returned unchanged.
 *
 * Does NOT mutate the input array.
 */
export function updateValue(lines: EnvLine[], key: string, newValue: string): EnvLine[] {
  return lines.map(line => {
    if (line.type !== 'variable' || line.key !== key) {
      return line;
    }

    const raw = line.raw;

    // ── Detect export prefix ──────────────────────────────────────────────────
    const exportMatch = /^(export\s+)/.exec(raw);
    const prefix = exportMatch ? exportMatch[1]! : '';
    const withoutExport = exportMatch ? raw.slice(exportMatch[1]!.length) : raw;

    // ── Detect quoting style ──────────────────────────────────────────────────
    const eqIndex = withoutExport.indexOf('=');
    const afterEq = withoutExport.slice(eqIndex + 1).trimStart();

    let quote: '"' | "'" | '' = '';
    if (afterEq.startsWith('"')) quote = '"';
    else if (afterEq.startsWith("'")) quote = "'";

    // ── Detect inline comment (only possible for unquoted values) ────────────
    const commentSuffix =
      line.inlineComment !== undefined ? ` ${line.inlineComment}` : '';

    // ── Reconstruct raw line ──────────────────────────────────────────────────
    const newRaw = `${prefix}${key}=${quote}${newValue}${quote}${commentSuffix}`;

    return {
      ...line,
      raw: newRaw,
      value: newValue,
    } satisfies EnvLine;
  });
}
