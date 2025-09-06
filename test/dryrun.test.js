import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.js';

jest.unstable_mockModule('../source/lib/commands/command.js', () => ({
  default: { runCommand: jest.fn() }
}));

jest.unstable_mockModule('../source/lib/auxiliary/file.js', () => ({
  default: {
    backupFile: jest.fn(),
    getFileSizeUsingPath: jest.fn(),
    readBinaryFile: jest.fn(),
    writeBinaryFile: jest.fn(),
    createReadStream: jest.fn()
  }
}));

jest.unstable_mockModule('../source/lib/patches/parser.js', () => ({
  default: { parsePatchFile: jest.fn() }
}));

let Commands;
let Filedrops;
let Patches;
let CommandModule;
let FileModule;
let ParserModule;

beforeAll(async () => {
  Commands = (await import('../source/lib/commands/commands.js')).Commands;
  Filedrops = (await import('../source/lib/filedrops/filedrops.js')).Filedrops;
  Patches = (await import('../source/lib/patches/patches.js')).Patches;
  CommandModule = (await import('../source/lib/commands/command.js')).default;
  FileModule = (await import('../source/lib/auxiliary/file.js')).default;
  ParserModule = (await import('../source/lib/patches/parser.js')).default;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('dry run mode', () => {
  test('does not execute side effects', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.options.general.dryRun = true;
    config.commands.general.push({ name: 'test', command: 'echo test', enabled: true });
    config.filedrops.push({
      name: 'drop',
      fileDropName: 'drop.bin',
      packedFileName: 'drop.bin',
      fileNamePath: 'dest.bin',
      decryptKey: 'key',
      enabled: true
    });
    config.patches.push({
      name: 'patch',
      patchFilename: 'patch.patch',
      fileNamePath: 'file.bin',
      enabled: true
    });

    await Commands.runCommands({ configuration: config });
    await Filedrops.runFiledrops({ configuration: config });
    await Patches.runPatches({ configuration: config });

    expect(CommandModule.runCommand).not.toHaveBeenCalled();
    expect(FileModule.writeBinaryFile).not.toHaveBeenCalled();
    expect(ParserModule.parsePatchFile).not.toHaveBeenCalled();
  });
});

