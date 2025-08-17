import { jest } from '@jest/globals';

async function loadUac(checkValue) {
  jest.resetModules();
  const checkFn = jest.fn(() => checkValue);
  jest.unstable_mockModule('elevated', () => ({ check: checkFn }));
  const logFn = jest.fn();
  jest.unstable_mockModule('../source/lib/auxiliary/debug.js', () => ({ default: { log: logFn } }));
  const mod = await import('../source/lib/auxiliary/uac.ts');
  const Debug = await import('../source/lib/auxiliary/debug.js');
  return { Uac: mod.Uac, logFn: Debug.default.log, checkFn };
}

describe('Uac.isAdmin', () => {
  test('returns true and logs', async () => {
    const { Uac, logFn, checkFn } = await loadUac(true);
    const res = await Uac.isAdmin();
    expect(res).toBe(true);
    expect(checkFn).toHaveBeenCalled();
    expect(logFn).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Is current user admin: true'),
      color: expect.any(Function)
    }));
  });

  test('returns false and logs', async () => {
    const { Uac, logFn } = await loadUac(false);
    const res = await Uac.isAdmin();
    expect(res).toBe(false);
    expect(logFn).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('Is current user admin: false'),
      color: expect.any(Function)
    }));
  });
});

describe('Uac.adminCheck', () => {
  test('exits when user is not admin', async () => {
    jest.resetModules();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const checkFn = jest.fn(() => false);
    jest.unstable_mockModule('elevated', () => ({ check: checkFn }));
    const logFn = jest.fn();
    jest.unstable_mockModule('../source/lib/auxiliary/debug.js', () => ({ default: { log: logFn } }));
    const { Uac } = await import('../source/lib/auxiliary/uac.ts');
    await Uac.adminCheck();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(logFn).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining("Exiting because user doesn't have administrator privileges"),
      color: expect.any(Function)
    }));
    exitSpy.mockRestore();
  });
});

