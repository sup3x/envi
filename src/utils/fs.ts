import fs from 'node:fs';
import path from 'node:path';

export function fileExists(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

export function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

export function writeFileContent(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function copyFile(src: string, dest: string): void {
  fs.copyFileSync(src, dest);
}

export function appendToGitignore(dir: string, entries: string[]): void {
  const gitignorePath = path.join(dir, '.gitignore');
  let content = '';
  if (fileExists(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  }
  const linesToAdd = entries.filter((entry) => !content.includes(entry));
  if (linesToAdd.length === 0) return;
  const suffix = content.endsWith('\n') || content === '' ? '' : '\n';
  fs.writeFileSync(
    gitignorePath,
    content + suffix + linesToAdd.join('\n') + '\n',
    'utf-8',
  );
}
