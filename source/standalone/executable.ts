import Patcher from '../index.js';
const { runPatcher } = Patcher;

function getConfigPathFromArgs(args: string[]): string | undefined {
  const index = args.indexOf('--config');
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

const configFilePath = getConfigPathFromArgs(process.argv.slice(2));

/** Just run the patcher */
runPatcher({ configFilePath });
