import { BufferUtils } from '../source/lib/patches/buffer.ts';

describe('BufferUtils.patchBuffer', () => {
  test('patches buffer value', () => {
    const buf = Buffer.from([0x00, 0x01]);
    const patched = BufferUtils.patchBuffer({
      buffer: buf,
      offset: 0,
      previousValue: 0x00,
      newValue: 0xff,
      options: {
        forcePatch: false,
        unpatchMode: false,
        nullPatch: false,
        failOnUnexpectedPreviousValue: false,
        warnOnUnexpectedPreviousValue: false,
        skipWritePatch: false
      }
    });
    expect(patched[0]).toBe(0xff);
    expect(patched).toBe(buf);
  });
});
