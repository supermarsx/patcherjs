import { jest } from '@jest/globals';

const realPlatform = process.platform;
const realGetuid = process.getuid;

afterEach(() => {
  Object.defineProperty(process, 'platform', { value: realPlatform });
  if (typeof realGetuid === 'function') {
    process.getuid = realGetuid;
  } else {
    delete process.getuid;
  }
  jest.resetModules();
});

async function loadWindows(checkValue) {
  Object.defineProperty(process, 'platform', { value: 'win32' });
  delete process.getuid;
  const checkFn = jest.fn(() => checkValue);
  jest.unstable_mockModule('elevated', () => ({ check: checkFn }));
  const logInfo = jest.fn();
  const logError = jest.fn();
  jest.unstable_mockModule('../source/lib/auxiliary/logger.js', () => ({ default: { logInfo, logError } }));
  const mod = await import('../source/lib/auxiliary/uac.ts');
  return { Uac: mod.Uac, logInfo, logError, checkFn };
}

async function loadUnix(uid) {
  Object.defineProperty(process, 'platform', { value: 'linux' });
  process.getuid = jest.fn(() => uid);
  const checkFn = jest.fn();
  jest.unstable_mockModule('elevated', () => ({ check: checkFn }));
  const logInfo = jest.fn();
  const logError = jest.fn();
  jest.unstable_mockModule('../source/lib/auxiliary/logger.js', () => ({ default: { logInfo, logError } }));
  const mod = await import('../source/lib/auxiliary/uac.ts');
  return { Uac: mod.Uac, logInfo, logError, checkFn, getuid: process.getuid };
}

describe('Uac.isAdmin on Windows', () => {
  test('returns true and logs', async () => {
    const { Uac, logInfo, checkFn } = await loadWindows(true);
    const res = await Uac.isAdmin();
    expect(res).toBe(true);
    expect(checkFn).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Is current user admin: true'));
  });

  test('returns false and logs', async () => {
    const { Uac, logInfo, checkFn } = await loadWindows(false);
    const res = await Uac.isAdmin();
    expect(res).toBe(false);
    expect(checkFn).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Is current user admin: false'));
  });
});

describe('Uac.isAdmin on Unix', () => {
  test('returns true and logs', async () => {
    const { Uac, logInfo, getuid, checkFn } = await loadUnix(0);
    const res = await Uac.isAdmin();
    expect(res).toBe(true);
    expect(checkFn).not.toHaveBeenCalled();
    expect(getuid).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Is current user admin: true'));
  });

  test('returns false and logs', async () => {
    const { Uac, logInfo, getuid, checkFn } = await loadUnix(1000);
    const res = await Uac.isAdmin();
    expect(res).toBe(false);
    expect(checkFn).not.toHaveBeenCalled();
    expect(getuid).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith(expect.stringContaining('Is current user admin: false'));
  });
});

describe('Uac.adminCheck', () => {
  test('exits when user is not admin', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    delete process.getuid;
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const checkFn = jest.fn(() => false);
    jest.unstable_mockModule('elevated', () => ({ check: checkFn }));
    const logInfo = jest.fn();
    const logError = jest.fn();
    jest.unstable_mockModule('../source/lib/auxiliary/logger.js', () => ({ default: { logInfo, logError } }));
    const { Uac } = await import('../source/lib/auxiliary/uac.ts');
    await Uac.adminCheck();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(logError).toHaveBeenCalledWith(expect.stringContaining("Exiting because user doesn't have administrator privileges"));
    exitSpy.mockRestore();
  });
});

