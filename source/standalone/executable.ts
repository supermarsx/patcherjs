import Patcher from '../index.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const { runPatcher } = Patcher;

const argv = yargs(hideBin(process.argv))
  .option('config', {
    alias: 'c',
    type: 'string',
    describe: 'Path to configuration file',
  })
  .help()
  .version()
  .strict()
  .fail((msg, _err, yargsInstance) => {
    if (msg) console.error(msg);
    yargsInstance.showHelp();
    process.exit(1);
  })
  .parseSync();

/** Just run the patcher */
runPatcher({ configFilePath: argv.config as string | undefined });
