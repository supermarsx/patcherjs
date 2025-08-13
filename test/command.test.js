import { jest } from '@jest/globals';

describe('Command.runCommand error handling', () => {
  test('logs error when command fails', async () => {
    jest.resetModules();
    jest.clearAllMocks();

    const logError = jest.fn();
    jest.unstable_mockModule('../source/lib/auxiliary/logger.js', () => ({
      default: { logError }
    }));

    const Command = (await import('../source/lib/commands/command.js')).default;

    await expect(Command.runCommand({
      command: 'node',
      parameters: ['-e', "console.error('line1\\r\\nline2'); process.exit(1)"],
      shell: false
    })).rejects.toMatchObject({ name: 'CommandError', exitCode: 1 });

    expect(logError).toHaveBeenCalledWith(
      'There was an error running a command: Command exited with code 1'
    );
  });
});

describe('Command.runCommandPromise timeout handling', () => {
  test('rejects when process exceeds timeout', async () => {
    const Command = (await import('../source/lib/commands/command.js')).default;

    await expect(
      Command.runCommandPromise({
        command: 'node',
        parameters: ['-e', "setTimeout(() => {}, 1000);"] ,
        timeout: 100,
        shell: false
      })
    ).rejects.toMatchObject({ name: 'CommandError' });
  });
});

describe('Command.runCommandPromise cwd handling', () => {
  test('runs command in specified cwd', async () => {
    const Command = (await import('../source/lib/commands/command.js')).default;
    const result = await Command.runCommandPromise({
      command: 'node',
      parameters: ['-e', "console.log(process.cwd())"],
      cwd: '/'
    });
    expect(result.stdout).toBe('/\n');
  });
});
