import { jest } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import { join, resolve } from 'path';

import Constants from '../source/lib/configuration/constants.ts';
const { DEBUGGING, LOGGING, LOGGING_FILEPATH } = Constants;

jest.unstable_mockModule('fs/promises', () => ({
  appendFile: jest.fn(async () => {})
}));

let Debug;
let DebugLogging;
let appendFile;

beforeAll(async () => {
  Debug = (await import('../source/lib/auxiliary/debug.ts')).default;
  DebugLogging = (await import('../source/lib/auxiliary/debug.logging.ts')).DebugLogging;
  appendFile = (await import('fs/promises')).appendFile;
});

let originalEnv;

beforeEach(() => {
  originalEnv = process.env;
  process.env = { ...originalEnv };
  jest.clearAllMocks();
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Debug utilities', () => {
  test('enable sets env vars and isEnabled status', () => {
    Debug.enable({ logging: true });
    expect(process.env[DEBUGGING]).toBe('true');
    expect(process.env[LOGGING]).toBe('true');
    expect(Debug.isEnabled()).toEqual({ DEBUGGING: true, LOGGING: true });
  });

  test('logToFile resolves path and writes via appendFile', async () => {
    const tmp = fs.mkdtempSync(join(os.tmpdir(), 'debug-'));
    const rel = join(tmp, 'foo', '..', 'out.log');
    process.env[LOGGING_FILEPATH] = rel;
    await DebugLogging.logToFile({ message: 'hello' });
    expect(appendFile).toHaveBeenCalledWith(resolve(rel), 'hello');
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
