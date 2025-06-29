import { jest } from '@jest/globals';
import Debug from '../source/lib/auxiliary/debug.ts';
import Constants from '../source/lib/configuration/constants.ts';

const { DEBUGGING, LOGGING } = Constants;

let originalDebugging;
let originalLogging;

beforeEach(() => {
  originalDebugging = process.env[DEBUGGING];
  originalLogging = process.env[LOGGING];
  delete process.env[DEBUGGING];
  delete process.env[LOGGING];
});

afterEach(() => {
  if (originalDebugging === undefined) delete process.env[DEBUGGING];
  else process.env[DEBUGGING] = originalDebugging;
  if (originalLogging === undefined) delete process.env[LOGGING];
  else process.env[LOGGING] = originalLogging;
});

describe('Debug.enable and disable', () => {
  test('enable sets env vars and isEnabled true', () => {
    Debug.enable({ logging: true });
    expect(process.env[DEBUGGING]).toBe('true');
    expect(process.env[LOGGING]).toBe('true');
    expect(Debug.isEnabled()).toEqual({ DEBUGGING: true, LOGGING: true });
  });

  test('disable unsets env vars and isEnabled false', () => {
    Debug.enable({ logging: true });
    Debug.disable();
    expect(process.env[DEBUGGING]).toBe('false');
    const logVal = process.env[LOGGING];
    expect(logVal === undefined || logVal === 'false').toBe(true);
    expect(Debug.isEnabled()).toEqual({ DEBUGGING: false, LOGGING: false });
  });
});
