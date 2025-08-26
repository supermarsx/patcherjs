/// <reference types="jest" />
import { jest, describe, test, expect, beforeAll, beforeEach } from '@jest/globals';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.js';
import Constants, { type Component } from '../source/lib/configuration/constants.js';
const { COMPONENTS } = Constants;

jest.unstable_mockModule('../source/lib/commands/commands.js', () => ({
  default: { runCommands: jest.fn() }
}));

jest.unstable_mockModule('../source/lib/filedrops/filedrops.js', () => ({
  default: { runFiledrops: jest.fn() }
}));

jest.unstable_mockModule('../source/lib/patches/patches.js', () => ({
  default: { runPatches: jest.fn() },
  patchEmitter: { on: jest.fn(), emit: jest.fn(), removeAllListeners: jest.fn() }
}));

jest.unstable_mockModule('../source/lib/build/packaging.js', () => ({
  default: { runPackings: jest.fn() }
}));

jest.unstable_mockModule('../source/lib/auxiliary/uac.js', () => ({
  default: { adminCheck: jest.fn() }
}));

jest.unstable_mockModule('../source/lib/auxiliary/debug.js', () => ({
  default: { enable: jest.fn(), log: jest.fn() }
}));

jest.unstable_mockModule('../source/lib/auxiliary/console.js', () => ({
  default: { waitForKeypress: jest.fn() }
}));

jest.unstable_mockModule('../source/lib/configuration/configuration.js', () => ({
  default: { readConfigurationFile: jest.fn() }
}));

let Patcher;
let Commands;
let Filedrops;
let Patches;
let Uac;
let Debug;
let Console;
let Configuration;

beforeAll(async () => {
  Patcher = (await import('../source/lib/composites.js')).Patcher;
  Commands = await import('../source/lib/commands/commands.js');
  Filedrops = await import('../source/lib/filedrops/filedrops.js');
  Patches = await import('../source/lib/patches/patches.js');
  Uac = await import('../source/lib/auxiliary/uac.js');
  Debug = await import('../source/lib/auxiliary/debug.js');
  Console = await import('../source/lib/auxiliary/console.js');
  Configuration = await import('../source/lib/configuration/configuration.js');
});

beforeEach(() => {
  jest.clearAllMocks();
  process.exitCode = undefined;
});

describe('Patcher.runFunction', () => {
  test('dispatches to correct modules', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    await Patcher.runFunction({ configuration: config, functionName: COMPONENTS.COMMANDS });
    expect(Commands.default.runCommands).toHaveBeenCalledWith({ configuration: config });
    await Patcher.runFunction({ configuration: config, functionName: COMPONENTS.FILEDROPS });
    expect(Filedrops.default.runFiledrops).toHaveBeenCalledWith({ configuration: config });
    await Patcher.runFunction({ configuration: config, functionName: COMPONENTS.PATCHES });
    expect(Patches.default.runPatches).toHaveBeenCalledWith({ configuration: config });
  });

  test('throws when unknown function is provided', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    await expect(
      // cast to bypass compile-time check for test purposes
      Patcher.runFunction({ configuration: config, functionName: 'bad' as unknown as Component })
    ).rejects.toThrow('Unknown function');
  });
});

describe('Patcher.runPatcher', () => {
  test('runs functions in order and waits for keypress by default', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.options.general.onlyPackingMode = false;
    config.options.general.runningOrder = [COMPONENTS.COMMANDS, COMPONENTS.FILEDROPS, COMPONENTS.PATCHES];
    Configuration.default.readConfigurationFile.mockResolvedValue(config);
    await Patcher.runPatcher({ configFilePath: 'cfg.json' });
    expect(Configuration.default.readConfigurationFile).toHaveBeenCalledWith({ filePath: 'cfg.json' });
    const order = [
      Commands.default.runCommands.mock.invocationCallOrder[0],
      Filedrops.default.runFiledrops.mock.invocationCallOrder[0],
      Patches.default.runPatches.mock.invocationCallOrder[0]
    ];
    expect(order).toEqual(order.slice().sort((a, b) => a - b));
    expect(Console.default.waitForKeypress).toHaveBeenCalled();
  });

  test('skips waiting when waitForExit is false', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.options.general.onlyPackingMode = false;
    config.options.general.runningOrder = [COMPONENTS.COMMANDS];
    Configuration.default.readConfigurationFile.mockResolvedValue(config);
    await Patcher.runPatcher({ configFilePath: 'cfg.json', waitForExit: false });
    expect(Console.default.waitForKeypress).not.toHaveBeenCalled();
  });

  test('rejects and sets exit code when a command fails', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.options.general.onlyPackingMode = false;
    config.options.general.runningOrder = [COMPONENTS.COMMANDS];
    Commands.default.runCommands.mockRejectedValue(new Error('cmd fail'));
    Configuration.default.readConfigurationFile.mockResolvedValue(config);
    await expect(Patcher.runPatcher({ configFilePath: 'cfg.json', waitForExit: false })).rejects.toThrow('cmd fail');
    expect(process.exitCode).toBe(1);
  });

  test('rejects and sets exit code when a filedrop fails', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.options.general.onlyPackingMode = false;
    config.options.general.runningOrder = [COMPONENTS.FILEDROPS];
    Filedrops.default.runFiledrops.mockRejectedValue(new Error('fd fail'));
    Configuration.default.readConfigurationFile.mockResolvedValue(config);
    await expect(Patcher.runPatcher({ configFilePath: 'cfg.json', waitForExit: false })).rejects.toThrow('fd fail');
    expect(process.exitCode).toBe(1);
  });

  test('rejects and sets exit code when a patch fails', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.options.general.onlyPackingMode = false;
    config.options.general.runningOrder = [COMPONENTS.PATCHES];
    Patches.default.runPatches.mockRejectedValue(new Error('patch fail'));
    Configuration.default.readConfigurationFile.mockResolvedValue(config);
    await expect(Patcher.runPatcher({ configFilePath: 'cfg.json', waitForExit: false })).rejects.toThrow('patch fail');
    expect(process.exitCode).toBe(1);
  });
});

describe('Patcher.runGeneralChecksAndInit', () => {
  test('enables debug and checks admin when configured', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.options.general.debug = true;
    config.options.general.logging = true;
    config.options.general.exitOnNonAdmin = true;
    await Patcher.runGeneralChecksAndInit({ configuration: config });
    expect(Debug.default.enable).toHaveBeenCalledWith({ logging: true });
    expect(Uac.default.adminCheck).toHaveBeenCalled();
  });

  test('skips when options disabled', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.options.general.debug = false;
    config.options.general.exitOnNonAdmin = false;
    await Patcher.runGeneralChecksAndInit({ configuration: config });
    expect(Debug.default.enable).not.toHaveBeenCalled();
    expect(Uac.default.adminCheck).not.toHaveBeenCalled();
  });
});
