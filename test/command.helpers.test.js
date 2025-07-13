import { jest } from '@jest/globals';

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

  const CommandsTaskscheduler = (await import('../source/lib/commands/commands.taskschd.js')).CommandsTaskscheduler;
  const CommandsServices = (await import('../source/lib/commands/commands.services.js')).CommandsServices;
  const CommandsKill = (await import('../source/lib/commands/commands.kill.js')).CommandsKill;
  const Command = await import('../source/lib/commands/command.js');

  return { CommandsTaskscheduler, CommandsServices, CommandsKill, Command };
}


describe('Command helpers - parameters', () => {
  test('Taskscheduler remove/stop on Windows', async () => {
    const { CommandsTaskscheduler, Command } = await loadModules('win');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsTaskscheduler.remove({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'schtasks.exe',
      parameters: ['/delete', '/f', '/tn', 'task']
    });
    await CommandsTaskscheduler.stop({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'schtasks.exe',
      parameters: ['/end', '/tn', 'task']
    });
  });

  test('Taskscheduler remove/stop on macOS', async () => {
    const { CommandsTaskscheduler, Command } = await loadModules('mac');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsTaskscheduler.remove({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: ['remove', 'task']
    });
    await CommandsTaskscheduler.stop({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: ['stop', 'task']
    });
  });

  test('Taskscheduler remove/stop on Linux', async () => {
    const { CommandsTaskscheduler, Command } = await loadModules('linux');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsTaskscheduler.remove({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: ['disable', '--now', 'task']
    });
    await CommandsTaskscheduler.stop({ taskName: 'task' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: ['stop', 'task']
    });
  });

  test('Services commands on Windows', async () => {
    const { CommandsServices, Command } = await loadModules('win');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices.stop({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'sc.exe',
      parameters: ['stop', 'svc']
    });
    await CommandsServices.disable({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'sc.exe',
      parameters: ['config', 'svc', 'start=', 'disabled']
    });
    await CommandsServices.remove({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'sc.exe',
      parameters: ['delete', 'svc']
    });
  });

  test('Services commands on macOS', async () => {
    const { CommandsServices, Command } = await loadModules('mac');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices.stop({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: ['stop', 'svc']
    });
    await CommandsServices.disable({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: ['disable', 'svc']
    });
    await CommandsServices.remove({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'launchctl',
      parameters: ['remove', 'svc']
    });
  });

  test('Services commands on Linux', async () => {
    const { CommandsServices, Command } = await loadModules('linux');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsServices.stop({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: ['stop', 'svc']
    });
    await CommandsServices.disable({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: ['disable', 'svc']
    });
    await CommandsServices.remove({ serviceName: 'svc' });
    expect(Command.default.runCommand).toHaveBeenLastCalledWith({
      command: 'systemctl',
      parameters: ['disable', '--now', 'svc']
    });
  });

  test('Kill command lines', async () => {
    const { CommandsKill, Command } = await loadModules('win');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsKill.killTask({ taskName: 'proc' });
    expect(Command.default.runCommand).toHaveBeenCalledWith({
      command: 'taskkill.exe',
      parameters: ['/f', '/im', 'proc']
    });
    const mods2 = await loadModules('linux');
    mods2.Command.default.runCommand.mockResolvedValue('');
    await mods2.CommandsKill.killTask({ taskName: 'proc' });
    expect(mods2.Command.default.runCommand).toHaveBeenCalledWith({
      command: 'kill',
      parameters: ['-9', '$(pgrep -f \'proc\')']
    });
  });

  test('Kill command handles spaces', async () => {
    const { CommandsKill, Command } = await loadModules('linux');
    Command.default.runCommand.mockResolvedValue('');
    await CommandsKill.killTask({ taskName: 'my proc' });
    expect(Command.default.runCommand).toHaveBeenCalledWith({
      command: 'kill',
      parameters: ['-9', '$(pgrep -f \'my proc\')']
    });
  });
});

describe('Command helpers - error handling', () => {
  test('propagates runCommand rejections', async () => {
    const { CommandsServices, Command } = await loadModules('win');
    Command.default.runCommand.mockRejectedValue(new Error('fail'));
    await expect(CommandsServices.stop({ serviceName: 'svc' })).rejects.toThrow('fail');

    const { CommandsTaskscheduler, Command: Cmd2 } = await loadModules('win');
    Cmd2.default.runCommand.mockRejectedValue(new Error('nope'));
    await expect(CommandsTaskscheduler.remove({ taskName: 't' })).rejects.toThrow('nope');

    const { CommandsKill, Command: Cmd3 } = await loadModules('linux');
    Cmd3.default.runCommand.mockRejectedValue(new Error('err'));
    await expect(CommandsKill.killTask({ taskName: 'p' })).rejects.toThrow('err');
  });
});

