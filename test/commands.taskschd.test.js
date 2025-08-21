import { jest } from '@jest/globals';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';

const originalPlatform = process.platform;
afterEach(() => {
  Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
});

async function loadModules(platform) {
  jest.resetModules();
  jest.clearAllMocks();

  Object.defineProperty(process, 'platform', { value: platform, configurable: true });

  const constants = {
    COMM_TASKS_DELETE: 'delete',
    COMM_TASKS_STOP: 'stop',
    COMM_SERVICES_STOP: 'stop',
    COMM_SERVICES_DISABLE: 'disable',
    COMM_SERVICES_REMOVE: 'delete',
    TASKSCHD_BIN: platform === 'win32' ? 'schtasks.exe' : platform === 'darwin' ? 'launchctl' : 'systemctl',
    SERVICE_BIN: platform === 'win32' ? 'sc.exe' : platform === 'darwin' ? 'launchctl' : 'systemctl',
    TASKKILL_BIN: platform === 'win32' ? 'taskkill.exe' : 'kill'
  };

  jest.unstable_mockModule('../source/lib/configuration/constants.js', () => ({
    default: constants
  }));

  jest.unstable_mockModule('../source/lib/commands/command.js', () => ({
    default: { runCommand: jest.fn() }
  }));

  const mod = await import('../source/lib/commands/commands.taskschd.js');
  const Command = await import('../source/lib/commands/command.js');

  return { CommandsTaskscheduler: mod.CommandsTaskscheduler, Command };
}

const removeAliases = ['remove'];
const stopAliases = ['stop'];

describe('CommandsTaskscheduler parameter builders', () => {
  test.each(removeAliases)('remove alias %s on Windows', async (fn) => {
    const { CommandsTaskscheduler, Command } = await loadModules('win32');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsTaskscheduler[fn]({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'schtasks.exe',
      parameters: ['/delete', '/f', '/tn', 'task']
    });
  });

  test.each(removeAliases)('remove alias %s on macOS', async (fn) => {
    const { CommandsTaskscheduler, Command } = await loadModules('darwin');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsTaskscheduler[fn]({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: ['remove', 'task']
    });
  });

  test.each(removeAliases)('remove alias %s on Linux', async (fn) => {
    const { CommandsTaskscheduler, Command } = await loadModules('linux');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsTaskscheduler[fn]({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: ['disable', '--now', 'task']
    });
  });

  test.each(stopAliases)('stop alias %s on Windows', async (fn) => {
    const { CommandsTaskscheduler, Command } = await loadModules('win32');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsTaskscheduler[fn]({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'schtasks.exe',
      parameters: ['/end', '/tn', 'task']
    });
  });

  test.each(stopAliases)('stop alias %s on macOS', async (fn) => {
    const { CommandsTaskscheduler, Command } = await loadModules('darwin');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsTaskscheduler[fn]({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: ['stop', 'task']
    });
  });

  test.each(stopAliases)('stop alias %s on Linux', async (fn) => {
    const { CommandsTaskscheduler, Command } = await loadModules('linux');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsTaskscheduler[fn]({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: ['stop', 'task']
    });
  });
});

describe('CommandsTaskscheduler.runCommandsTaskScheduler', () => {
  test('runs only enabled tasks', async () => {
    const { CommandsTaskscheduler, Command } = await loadModules('win32');
    Command.default.runCommand.mockResolvedValue('');
    const cfg = ConfigurationDefaults.getDefaultConfigurationObject();
    cfg.commands.tasks = [
      { name: 't1', command: 'delete', enabled: true },
      { name: 't2', command: 'stop', enabled: false }
    ];
    await CommandsTaskscheduler.runCommandsTaskScheduler({ configuration: cfg });
    expect(Command.default.runCommand).toHaveBeenCalledTimes(1);
    expect(Command.default.runCommand).toHaveBeenCalledWith({
      command: 'schtasks.exe',
      parameters: ['/delete', '/f', '/tn', 't1']
    });
  });
});
