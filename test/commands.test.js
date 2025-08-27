import { jest } from '@jest/globals';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';

jest.unstable_mockModule('../source/lib/commands/commands.taskschd.js', () => ({
  default: { runCommandsTaskScheduler: jest.fn() }
}));

jest.unstable_mockModule('../source/lib/commands/commands.services.js', () => ({
  default: { runCommandsServices: jest.fn() }
}));

jest.unstable_mockModule('../source/lib/commands/commands.kill.js', () => ({
  default: { runCommandsKill: jest.fn() }
}));

jest.unstable_mockModule('../source/lib/commands/command.js', () => ({
  default: { runCommand: jest.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 }) }
}));

let Commands;
let CommandsTaskSchd;
let CommandsServices;
let CommandsKill;
let Command;

beforeAll(async () => {
  Commands = (await import('../source/lib/commands/commands.ts')).Commands;
  CommandsTaskSchd = await import('../source/lib/commands/commands.taskschd.js');
  CommandsServices = await import('../source/lib/commands/commands.services.js');
  CommandsKill = await import('../source/lib/commands/commands.kill.js');
  Command = await import('../source/lib/commands/command.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Commands.runCommands', () => {
  test('dispatches command types in order', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.commands = { tasks: [], services: [], kill: [], general: [] };
    await Commands.runCommands({ configuration: config });
    expect(CommandsTaskSchd.default.runCommandsTaskScheduler).toHaveBeenCalled();
    expect(CommandsServices.default.runCommandsServices).toHaveBeenCalled();
    expect(CommandsKill.default.runCommandsKill).toHaveBeenCalled();
    expect(Command.default.runCommand).not.toHaveBeenCalled();
  });
});

describe('Commands.runCommandsGeneral', () => {
  test('runs enabled general commands', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.commands.general = [
      { name: 'test', command: 'echo hi', enabled: true }
    ];
    await Commands.runCommandsGeneral({ configuration: config });
    expect(Command.default.runCommand).toHaveBeenCalledWith({ command: 'echo hi', parameters: [], timeout: 60000, cwd: undefined, onStdout: expect.any(Function), onStderr: expect.any(Function) });
  });

  test('skips disabled general commands', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.commands.general = [
      { name: 'test', command: 'echo hi', enabled: false }
    ];
    await Commands.runCommandsGeneral({ configuration: config });
    expect(Command.default.runCommand).not.toHaveBeenCalled();
  });

  test('respects timeout and cwd when provided', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.commands.general = [
      { name: 'test', command: 'echo hi', enabled: true, timeout: 500, cwd: '/tmp' }
    ];
    await Commands.runCommandsGeneral({ configuration: config });
    expect(Command.default.runCommand).toHaveBeenCalledWith({ command: 'echo hi', parameters: [], timeout: 500, cwd: '/tmp', onStdout: expect.any(Function), onStderr: expect.any(Function) });
  });
});
