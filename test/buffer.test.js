import { BufferUtils } from '../source/lib/patches/buffer.ts';

describe('BufferUtils.patchBuffer', () => {
  test('patches buffer value', () => {
    const buf = Buffer.from([0x00, 0x01]);
    const patched = BufferUtils.patchBuffer({
      buffer: buf,
      offset: 0,
      previousValue: 0x00,
      newValue: 0xff,
      byteLength: 1,
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

  test('patches 16-bit, 32-bit and 64-bit values', () => {
    const buf = Buffer.alloc(14);
    BufferUtils.patchBuffer({
      buffer: buf,
      offset: 0,
      previousValue: 0x0000,
      newValue: 0x1234,
      byteLength: 2,
      options: {
        forcePatch: false,
        unpatchMode: false,
        nullPatch: false,
        failOnUnexpectedPreviousValue: false,
        warnOnUnexpectedPreviousValue: false,
        skipWritePatch: false
      }
    });
    BufferUtils.patchBuffer({
      buffer: buf,
      offset: 2,
      previousValue: 0x00000000,
      newValue: 0x89abcdef,
      byteLength: 4,
      options: {
        forcePatch: false,
        unpatchMode: false,
        nullPatch: false,
        failOnUnexpectedPreviousValue: false,
        warnOnUnexpectedPreviousValue: false,
        skipWritePatch: false
      }
    });
    BufferUtils.patchBuffer({
      buffer: buf,
      offset: 6,
      previousValue: 0x0000000000000000n,
      newValue: 0x1122334455667788n,
      byteLength: 8,
      options: {
        forcePatch: false,
        unpatchMode: false,
        nullPatch: false,
        failOnUnexpectedPreviousValue: false,
        warnOnUnexpectedPreviousValue: false,
        skipWritePatch: false
      }
    });
    expect(buf.readUInt16LE(0)).toBe(0x1234);
    expect(buf.readUInt32LE(2)).toBe(0x89abcdef);
    expect(buf.readBigUInt64LE(6)).toBe(0x1122334455667788n);
  });
});
