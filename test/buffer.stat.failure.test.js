import { jest } from '@jest/globals';

describe('BufferUtils.patchLargeFile', () => {
  test('closes handle when stat fails', async () => {
    const closeMock = jest.fn().mockResolvedValue(undefined);
    jest.unstable_mockModule('fs/promises', async () => {
      const actual = await jest.requireActual('fs/promises');
      return {
        ...actual,
        open: jest.fn(async () => ({
          stat: jest.fn().mockRejectedValue(new Error('stat failure')),
          close: closeMock
        }))
      };
    });
    const { BufferUtils } = await import('../source/lib/patches/buffer.ts');
    const opts = {
      forcePatch: false,
      unpatchMode: false,
      nullPatch: false,
      failOnUnexpectedPreviousValue: false,
      warnOnUnexpectedPreviousValue: false,
      skipWritePatch: false,
      allowOffsetOverflow: false
    };
    await expect(BufferUtils.patchLargeFile({ filePath: 'dummy', patchData: [], options: opts })).rejects.toThrow('stat failure');
    expect(closeMock).toHaveBeenCalled();
  });
});
