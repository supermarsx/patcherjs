import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

describe('Command.runCommandPromise incremental logging', () => {
  test('forwards stdout and stderr chunks respecting maxBuffer', async () => {
    jest.resetModules();
    const spawnMock = jest.fn();
    jest.unstable_mockModule('child_process', () => ({ spawn: spawnMock }));
    const Command = (await import('../source/lib/commands/command.js')).default;

    const stdoutChunks = [];
    const stderrChunks = [];

    spawnMock.mockImplementation(() => {
      const cp = new EventEmitter();
      const stdout = new EventEmitter();
      const stderr = new EventEmitter();
      // @ts-ignore
      cp.stdout = stdout;
      // @ts-ignore
      cp.stderr = stderr;
      // @ts-ignore
      cp.kill = jest.fn();
      process.nextTick(() => {
        stdout.emit('data', Buffer.from('123'));
        stdout.emit('data', Buffer.from('456'));
        stdout.emit('data', Buffer.from('789'));
        stderr.emit('data', Buffer.from('err'));
        cp.emit('close', 0);
      });
      return cp;
    });

    const result = await Command.runCommandPromise({
      command: 'fake',
      parameters: [],
      maxBuffer: 5,
      onStdout: (chunk) => stdoutChunks.push(chunk),
      onStderr: (chunk) => stderrChunks.push(chunk)
    });

    expect(stdoutChunks).toEqual(['123', '45']);
    expect(stderrChunks).toEqual(['err']);
    expect(result).toEqual({ stdout: '12345', stderr: 'err', exitCode: 0 });
  });
});
