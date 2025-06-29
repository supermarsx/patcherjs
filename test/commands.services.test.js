import { jest } from '@jest/globals';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';

async function loadModules(platform) {
  jest.resetModules();
  jest.clearAllMocks();

  const windows = platform === 'win';
  const mac = platform === 'mac';
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
    IS_MACOS: mac
  };

  jest.unstable_mockModule('../source/lib/configuration/constants.js', () => ({
    default: constants
  }));

  jest.unstable_mockModule('../source/lib/commands/command.js', () => ({
    default: { runCommand: jest.fn() }
  }));

  const mod = await import('../source/lib/commands/commands.services.js');
  const Command = await import('../source/lib/commands/command.js');

  return { CommandsServices: mod.CommandsServices, Command };
}

const removeAliases = ['remove', 'serviceRemove', 'svRemove', 'removeService', 'removeSv'];
const stopAliases = ['stop', 'serviceStop', 'svStop', 'stopService', 'stopSv'];

describe('CommandsServices parameter builders', () => {
  test.each(removeAliases)('remove alias %s on Windows', async (fn) => {
    const { CommandsServices, Command } = await loadModules('win');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'sc.exe',
      parameters: 'delete svc'
    });
  });

  test.each(removeAliases)('remove alias %s on macOS', async (fn) => {
    const { CommandsServices, Command } = await loadModules('mac');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: 'remove svc'
    });
  });

  test.each(removeAliases)('remove alias %s on Linux', async (fn) => {
    const { CommandsServices, Command } = await loadModules('linux');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: 'disable --now svc'
    });
  });

  test.each(stopAliases)('stop alias %s on Windows', async (fn) => {
    const { CommandsServices, Command } = await loadModules('win');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'sc.exe',
      parameters: 'stop svc'
    });
  });

  test.each(stopAliases)('stop alias %s on macOS', async (fn) => {
    const { CommandsServices, Command } = await loadModules('mac');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: 'stop svc'
    });
  });

  test.each(stopAliases)('stop alias %s on Linux', async (fn) => {
    const { CommandsServices, Command } = await loadModules('linux');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: 'stop svc'
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
      parameters: 'stop svc1'
    });
    expect(Command.default.runCommand).toHaveBeenNthCalledWith(2, {
      command: 'sc.exe',
      parameters: 'config svc2 start= disabled'
    });
  });
});
