import { jest } from '@jest/globals';
import readline from 'readline';

let Console;

beforeAll(async () => {
  Console = (await import('../source/lib/auxiliary/console.ts')).default;
});

test('waitForKeypress resolves immediately when stdin is not a TTY', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
  const spy = jest.spyOn(readline, 'createInterface');

  await expect(Console.waitForKeypress()).resolves.toBeUndefined();
  expect(spy).not.toHaveBeenCalled();

  if (descriptor)
    Object.defineProperty(process.stdin, 'isTTY', descriptor);
  spy.mockRestore();
});
