import { jest } from '@jest/globals';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';

async function loadModules(platform) {
  jest.resetModules();
  jest.clearAllMocks();

  const windows = platform === 'win';
  const mac = platform === 'mac';
  const linux = platform === 'linux';
  const constants = {
    COMM_TASKS_DELETE: 'delete',
    COMM_TASKS_STOP: 'stop',
    COMM_SERVICES_STOP: 'stop',
    COMM_SERVICES_DISABLE: 'disable',
    COMM_SERVICES_REMOVE: 'delete',
    TASKSCHD_BIN: windows ? 'schtasks.exe' : mac ? 'launchctl' : 'systemctl',
    SERVICE_BIN: windows ? 'sc.exe' : mac ? 'launchctl' : 'systemctl',
    TASKKILL_BIN: windows ? 'taskkill.exe' : 'kill',
    IS_WINDOWS: windows,
    IS_MACOS: mac,
    IS_LINUX: linux
  };

  jest.unstable_mockModule('../source/lib/configuration/constants.js', () => ({
    default: constants
  }));

  jest.unstable_mockModule('../source/lib/commands/command.js', () => ({
    default: { runCommand: jest.fn() }
  }));

  const logger = {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logSuccess: jest.fn(),
    logWarn: jest.fn()
  };
  jest.unstable_mockModule('../source/lib/auxiliary/logger.js', () => ({
    default: logger
  }));

  const mod = await import('../source/lib/commands/commands.services.js');
  const Command = await import('../source/lib/commands/command.js');
  const Logger = await import('../source/lib/auxiliary/logger.js');

  return { CommandsServices: mod.CommandsServices, Command, Logger };
}

const removeAliases = ['remove'];
const stopAliases = ['stop'];
const disableAliases = ['disable'];

describe('CommandsServices parameter builders', () => {
  test.each(removeAliases)('remove alias %s on Windows', async (fn) => {
    const { CommandsServices, Command } = await loadModules('win');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'sc.exe',
      parameters: ['delete', 'svc']
    });
  });

  test.each(removeAliases)('remove alias %s on macOS', async (fn) => {
    const { CommandsServices, Command } = await loadModules('mac');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: ['remove', 'svc']
    });
  });

  test.each(removeAliases)('remove alias %s on Linux', async (fn) => {
    const { CommandsServices, Command } = await loadModules('linux');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: ['disable', '--now', 'svc']
    });
  });

  test.each(stopAliases)('stop alias %s on Windows', async (fn) => {
    const { CommandsServices, Command } = await loadModules('win');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'sc.exe',
      parameters: ['stop', 'svc']
    });
  });

  test.each(stopAliases)('stop alias %s on macOS', async (fn) => {
    const { CommandsServices, Command } = await loadModules('mac');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: ['stop', 'svc']
    });
  });

  test.each(stopAliases)('stop alias %s on Linux', async (fn) => {
    const { CommandsServices, Command } = await loadModules('linux');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: ['stop', 'svc']
    });
  });

  test.each(disableAliases)('disable alias %s on Windows', async (fn) => {
    const { CommandsServices, Command } = await loadModules('win');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'sc.exe',
      parameters: ['config', 'svc', 'start=', 'disabled']
    });
  });

  test.each(disableAliases)('disable alias %s on macOS', async (fn) => {
    const { CommandsServices, Command } = await loadModules('mac');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: ['disable', 'svc']
    });
  });

  test.each(disableAliases)('disable alias %s on Linux', async (fn) => {
    const { CommandsServices, Command } = await loadModules('linux');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: ['disable', 'svc']
    });
  });
});

describe('CommandsServices.runCommandsServices', () => {
  test('runs enabled services only', async () => {
    const { CommandsServices, Command } = await loadModules('win');
    Command.default.runCommand.mockResolvedValue('');
    const cfg = ConfigurationDefaults.getDefaultConfigurationObject();
    cfg.commands.services = [
      { name: 'svc1', command: 'stop', enabled: true },
      { name: 'svc2', command: 'disable', enabled: true },
      { name: 'svc3', command: 'delete', enabled: false }
    ];
    await CommandsServices.runCommandsServices({ configuration: cfg });
    expect(Command.default.runCommand).toHaveBeenCalledTimes(2);
    expect(Command.default.runCommand).toHaveBeenNthCalledWith(1, {
      command: 'sc.exe',
      parameters: ['stop', 'svc1']
    });
    expect(Command.default.runCommand).toHaveBeenNthCalledWith(2, {
      command: 'sc.exe',
      parameters: ['config', 'svc2', 'start=', 'disabled']
    });
  });
});

describe('CommandsServices.runCommandsServicesSingle', () => {
  test('logs error for unknown service command', async () => {
    const { CommandsServices, Logger } = await loadModules('win');
    await CommandsServices.runCommandsServicesSingle({ service: { name: 'svc', command: 'unknown' } });
    expect(Logger.default.logError).toHaveBeenCalledWith(
      expect.stringContaining('Unknown services command function: unknown')
    );
  });
});
