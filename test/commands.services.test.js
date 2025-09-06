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

  const logger = {
    logInfo: jest.fn(),
    logError: jest.fn(),
    logSuccess: jest.fn(),
    logWarn: jest.fn()
  };
  jest.unstable_mockModule('../source/lib/auxiliary/logger.js', () => ({
    default: logger
  }));

  const fsMock = {
    lstat: jest.fn().mockResolvedValue({ isSymbolicLink: () => false }),
    readlink: jest.fn(),
    unlink: jest.fn().mockResolvedValue()
  };
  jest.unstable_mockModule('fs/promises', () => fsMock);

  const mod = await import('../source/lib/commands/commands.services.js');
  const Command = await import('../source/lib/commands/command.js');
  const Logger = await import('../source/lib/auxiliary/logger.js');

  return { CommandsServices: mod.CommandsServices, Command, Logger, Fs: fsMock };
}

const removeAliases = ['remove'];
const stopAliases = ['stop'];
const disableAliases = ['disable'];

describe('CommandsServices parameter builders', () => {
  test.each(removeAliases)('remove alias %s on Windows', async (fn) => {
    const { CommandsServices, Command } = await loadModules('win32');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'sc.exe',
      parameters: ['delete', 'svc']
    });
  });

  test.each(removeAliases)('remove alias %s on macOS', async (fn) => {
    const { CommandsServices, Command } = await loadModules('darwin');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: ['remove', 'svc']
    });
  });

  test.each(removeAliases)('remove alias %s on Linux', async (fn) => {
    const { CommandsServices, Command, Fs } = await loadModules('linux');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenNthCalledWith(1, {
      command: 'systemctl',
      parameters: ['disable', '--now', 'svc']
    });
    expect(Command.default.runCommand).toHaveBeenNthCalledWith(2, {
      command: 'systemctl',
      parameters: ['mask', 'svc']
    });
    expect(Fs.lstat).toHaveBeenCalledWith('/etc/systemd/system/svc.service');
    expect(Fs.readlink).not.toHaveBeenCalled();
    expect(Fs.unlink).toHaveBeenCalledWith('/etc/systemd/system/svc.service');
  });

  test.each(stopAliases)('stop alias %s on Windows', async (fn) => {
    const { CommandsServices, Command } = await loadModules('win32');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'sc.exe',
      parameters: ['stop', 'svc']
    });
  });

  test.each(stopAliases)('stop alias %s on macOS', async (fn) => {
    const { CommandsServices, Command } = await loadModules('darwin');
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
    const { CommandsServices, Command } = await loadModules('win32');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices[fn]({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'sc.exe',
      parameters: ['config', 'svc', 'start=', 'disabled']
    });
  });

  test.each(disableAliases)('disable alias %s on macOS', async (fn) => {
    const { CommandsServices, Command } = await loadModules('darwin');
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

  test.each([...removeAliases, ...stopAliases, ...disableAliases])(
    '%s throws on unsupported platform',
    async (fn) => {
      const { CommandsServices, Command } = await loadModules('sunos');
      await expect(
        CommandsServices[fn]({ serviceName: 'svc' })
      ).rejects.toThrow(/Unsupported platform/);
      expect(Command.default.runCommand).not.toHaveBeenCalled();
    }
  );
});

describe('CommandsServices.runCommandsServices', () => {
  test('runs enabled services only', async () => {
    const { CommandsServices, Command } = await loadModules('win32');
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
    const { CommandsServices, Logger } = await loadModules('win32');
    await CommandsServices.runCommandsServicesSingle({ service: { name: 'svc', command: 'unknown' } });
    expect(Logger.default.logError).toHaveBeenCalledWith(
      expect.stringContaining('Unknown services command function: unknown')
    );
  });
});
