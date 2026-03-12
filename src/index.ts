import { createRequire } from 'node:module';
import { Command } from 'commander';
import { EnviError } from './types.js';
import * as display from './utils/display.js';
import { registerInit } from './commands/init.js';
import { registerUse } from './commands/use.js';
import { registerList } from './commands/list.js';
import { registerDiff } from './commands/diff.js';
import { registerValidate } from './commands/validate.js';
import { registerCreate } from './commands/create.js';
import { registerSave } from './commands/save.js';
import { registerExport } from './commands/export.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();
program
  .name('envi')
  .description('Universal .env file manager — switch, diff, and validate environments')
  .version(pkg.version);

registerInit(program);
registerUse(program);
registerList(program);
registerDiff(program);
registerValidate(program);
registerCreate(program);
registerSave(program);
registerExport(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  if (err instanceof EnviError) {
    display.error(err.message, err.hint);
  } else {
    display.error('Unexpected error occurred.');
  }
  process.exit(1);
});
