import readline from 'node:readline';

export async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(`  ${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

export async function select(message: string, options: string[]): Promise<number> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  console.error(`  ${message}`);
  options.forEach((opt, i) => console.error(`    ${i + 1}) ${opt}`));
  return new Promise((resolve) => {
    rl.question('  Choose: ', (answer) => {
      rl.close();
      const idx = parseInt(answer, 10) - 1;
      resolve(idx >= 0 && idx < options.length ? idx : 0);
    });
  });
}
