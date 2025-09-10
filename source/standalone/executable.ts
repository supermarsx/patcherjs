import Patcher, { Debug } from '../index.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const { runPatcher } = Patcher;

const argv = yargs(hideBin(process.argv))
  .option('config', {
    alias: 'c',
    type: 'string',
    describe: 'Path to configuration file',
  })
  .option('debug', {
    type: 'boolean',
    describe: 'Enable debug mode',
    default: false,
  })
  .option('wait', {
    type: 'boolean',
    describe: 'Wait for keypress before exiting',
    default: true,
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
try {
  if (argv.debug) Debug.enable({ logging: argv.debug });

  await runPatcher({
    configFilePath: argv.config as string | undefined,
    waitForExit: argv.wait as boolean,
  });
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
