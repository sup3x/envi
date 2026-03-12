import chalk from 'chalk';
import Table from 'cli-table3';

export function success(msg: string): void {
  console.error(chalk.green('  \u2714 ') + msg);
}
export function info(msg: string): void {
  console.error(chalk.blue('  \u2139 ') + msg);
}
export function warn(msg: string): void {
  console.error(chalk.yellow('  \u26A0 ') + msg);
}
export function error(msg: string, hint?: string): void {
  console.error(chalk.red('  \u2716 ') + msg);
  if (hint) console.error(chalk.dim('  ' + hint));
}
export function createTable(head: string[]): Table.Table {
  return new Table({
    head: head.map((h) => chalk.bold(h)),
    style: { head: [], border: [] },
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '  ',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
      middle: '  ',
    },
  });
}
export function maskValue(value: string): string {
  return '\u2588'.repeat(Math.min(value.length, 10));
}
