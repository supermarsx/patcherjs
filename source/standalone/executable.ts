import Patcher from '../index.js';
const { runPatcher } = Patcher;

function getConfigPathFromArgs(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    // --config=path or --config path
    if (arg.startsWith('--config=')) {
      const value = arg.slice('--config='.length);
      if (value.length > 0) return value;
    } else if (arg === '--config') {
      if (i + 1 < args.length) return args[i + 1];
    }
    // short -c=path or -c path
    if (arg.startsWith('-c=')) {
      const value = arg.slice(3);
      if (value.length > 0) return value;
    } else if (arg === '-c') {
      if (i + 1 < args.length) return args[i + 1];
    }
  }
  return undefined;
}

const configFilePath = getConfigPathFromArgs(process.argv.slice(2));

/** Just run the patcher */
runPatcher({ configFilePath });
