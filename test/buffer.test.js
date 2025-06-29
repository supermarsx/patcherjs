import { BufferUtils } from '../source/lib/patches/buffer.ts';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { join } from 'path';
import os from 'os';

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

  test('patches big-endian values', () => {
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
        skipWritePatch: false,
        bigEndian: true
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
        skipWritePatch: false,
        bigEndian: true
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
        skipWritePatch: false,
        bigEndian: true
      }
    });
    expect(buf.readUInt16BE(0)).toBe(0x1234);
    expect(buf.readUInt32BE(2)).toBe(0x89abcdef);
    expect(buf.readBigUInt64BE(6)).toBe(0x1122334455667788n);
  });

  test('verifyPatch succeeds', () => {
    const buf = Buffer.from([0x00]);
    BufferUtils.patchBuffer({
      buffer: buf,
      offset: 0,
      previousValue: 0x00,
      newValue: 0x01,
      byteLength: 1,
      options: {
        forcePatch: false,
        unpatchMode: false,
        nullPatch: false,
        failOnUnexpectedPreviousValue: false,
        warnOnUnexpectedPreviousValue: false,
        skipWritePatch: false,
        verifyPatch: true
      }
    });
    expect(buf[0]).toBe(0x01);
  });

  test('verifyPatch detects mismatch', () => {
    const buf = Buffer.from([0x00]);
    const originalWrite = Buffer.prototype.writeUInt8;
    Buffer.prototype.writeUInt8 = function(value, offset) {
      return originalWrite.call(this, value ^ 0xff, offset);
    };
    try {
      expect(() => {
        BufferUtils.patchBuffer({
          buffer: buf,
          offset: 0,
          previousValue: 0x00,
          newValue: 0x01,
          byteLength: 1,
          options: {
            forcePatch: false,
            unpatchMode: false,
            nullPatch: false,
            failOnUnexpectedPreviousValue: false,
            warnOnUnexpectedPreviousValue: false,
            skipWritePatch: false,
            verifyPatch: true
          }
        });
      }).toThrow('Failed to verify patch');
    } finally {
      Buffer.prototype.writeUInt8 = originalWrite;
    }
  });

  test('patches value when offset sits at end of buffer', () => {
    const buf = Buffer.from([0x00, 0x01]);
    BufferUtils.patchBuffer({
      buffer: buf,
      offset: 1,
      previousValue: 0x01,
      newValue: 0xaa,
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
    expect(Array.from(buf)).toEqual([0x00, 0xaa]);
  });

  test('skips patch that would overflow buffer', () => {
    const buf = Buffer.from([0x00, 0x01]);
    BufferUtils.patchBuffer({
      buffer: buf,
      offset: 1,
      previousValue: 0x0000,
      newValue: 0x1122,
      byteLength: 2,
      options: {
        forcePatch: false,
        unpatchMode: false,
        nullPatch: false,
        failOnUnexpectedPreviousValue: false,
        warnOnUnexpectedPreviousValue: false,
        skipWritePatch: false,
        allowOffsetOverflow: false
      }
    });
    expect(Array.from(buf)).toEqual([0x00, 0x01]);
  });
});

describe('BufferUtils.patchLargeFile', () => {
  test('throws on offsets beyond Number.MAX_SAFE_INTEGER', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'large-'));
    const filePath = join(dir, 'tmp.bin');
    fs.writeFileSync(filePath, Buffer.from([0x00]));
    const patchData = [
      { offset: BigInt(Number.MAX_SAFE_INTEGER) + 1n, previousValue: 0x00, newValue: 0xff, byteLength: 1 }
    ];
    const opts = {
      forcePatch: false,
      unpatchMode: false,
      nullPatch: false,
      failOnUnexpectedPreviousValue: false,
      warnOnUnexpectedPreviousValue: false,
      skipWritePatch: false,
      allowOffsetOverflow: true
    };
    await expect(BufferUtils.patchLargeFile({ filePath, patchData, options: opts })).rejects.toThrow('Number.MAX_SAFE_INTEGER');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('patches file content', async () => {
    const dir = await fsPromises.mkdtemp(join(os.tmpdir(), 'large-'));
    const filePath = join(dir, 'tmp.bin');
    await fsPromises.writeFile(filePath, Buffer.from([0x00, 0x01, 0x02, 0x03]));
    const patchData = [
      { offset: 1n, previousValue: 0x01, newValue: 0xff, byteLength: 1 },
      { offset: 3n, previousValue: 0x03, newValue: 0xaa, byteLength: 1 }
    ];
    const opts = {
      forcePatch: false,
      unpatchMode: false,
      nullPatch: false,
      failOnUnexpectedPreviousValue: false,
      warnOnUnexpectedPreviousValue: false,
      skipWritePatch: false,
      allowOffsetOverflow: false
    };
    await BufferUtils.patchLargeFile({ filePath, patchData, options: opts });
    const result = await fsPromises.readFile(filePath);
    expect(Array.from(result)).toEqual([0x00, 0xff, 0x02, 0xaa]);
    await fsPromises.rm(dir, { recursive: true, force: true });
  });

  test('skips patches that exceed file size', async () => {
    const dir = await fsPromises.mkdtemp(join(os.tmpdir(), 'large-'));
    const filePath = join(dir, 'tmp.bin');
    await fsPromises.writeFile(filePath, Buffer.from([0x00, 0x01, 0x02, 0x03]));
    const patchData = [
      { offset: 3n, previousValue: 0x0000, newValue: 0x1122, byteLength: 2 }
    ];
    const opts = {
      forcePatch: false,
      unpatchMode: false,
      nullPatch: false,
      failOnUnexpectedPreviousValue: false,
      warnOnUnexpectedPreviousValue: false,
      skipWritePatch: false,
      allowOffsetOverflow: false
    };
    await BufferUtils.patchLargeFile({ filePath, patchData, options: opts });
    const result = await fsPromises.readFile(filePath);
    expect(Array.from(result)).toEqual([0x00, 0x01, 0x02, 0x03]);
    await fsPromises.rm(dir, { recursive: true, force: true });
  });

  test('patches multi-byte value when it fits at end of file', async () => {
    const dir = await fsPromises.mkdtemp(join(os.tmpdir(), 'large-'));
    const filePath = join(dir, 'tmp.bin');
    await fsPromises.writeFile(filePath, Buffer.from([0x00, 0x01, 0x02, 0x03]));
    const patchData = [
      { offset: 2n, previousValue: 0x0302, newValue: 0xbbaa, byteLength: 2 }
    ];
    const opts = {
      forcePatch: false,
      unpatchMode: false,
      nullPatch: false,
      failOnUnexpectedPreviousValue: false,
      warnOnUnexpectedPreviousValue: false,
      skipWritePatch: false,
      allowOffsetOverflow: false
    };
    await BufferUtils.patchLargeFile({ filePath, patchData, options: opts });
    const result = await fsPromises.readFile(filePath);
    expect(Array.from(result)).toEqual([0x00, 0x01, 0xaa, 0xbb]);
    await fsPromises.rm(dir, { recursive: true, force: true });
  });

  test('patches big-endian file content', async () => {
    const dir = await fsPromises.mkdtemp(join(os.tmpdir(), 'large-'));
    const filePath = join(dir, 'tmp.bin');
    await fsPromises.writeFile(filePath, Buffer.from([0x00, 0x00, 0x00, 0x00]));
    const patchData = [
      { offset: 0n, previousValue: 0x0000, newValue: 0x1122, byteLength: 2 },
      { offset: 2n, previousValue: 0x0000, newValue: 0x3344, byteLength: 2 }
    ];
    const opts = {
      forcePatch: false,
      unpatchMode: false,
      nullPatch: false,
      failOnUnexpectedPreviousValue: false,
      warnOnUnexpectedPreviousValue: false,
      skipWritePatch: false,
      allowOffsetOverflow: false,
      bigEndian: true
    };
    await BufferUtils.patchLargeFile({ filePath, patchData, options: opts });
    const result = await fsPromises.readFile(filePath);
    expect(result.readUInt16BE(0)).toBe(0x1122);
    expect(result.readUInt16BE(2)).toBe(0x3344);
    await fsPromises.rm(dir, { recursive: true, force: true });
  });

  test('verifyPatch succeeds for files', async () => {
    const dir = await fsPromises.mkdtemp(join(os.tmpdir(), 'large-'));
    const filePath = join(dir, 'tmp.bin');
    await fsPromises.writeFile(filePath, Buffer.from([0x00]));
    const patchData = [
      { offset: 0n, previousValue: 0x00, newValue: 0xaa, byteLength: 1 }
    ];
    const opts = {
      forcePatch: false,
      unpatchMode: false,
      nullPatch: false,
      failOnUnexpectedPreviousValue: false,
      warnOnUnexpectedPreviousValue: false,
      skipWritePatch: false,
      allowOffsetOverflow: false,
      verifyPatch: true
    };
    await BufferUtils.patchLargeFile({ filePath, patchData, options: opts });
    const buf = await fsPromises.readFile(filePath);
    expect(buf[0]).toBe(0xaa);
    await fsPromises.rm(dir, { recursive: true, force: true });
  });

  test('verifyPatch detects mismatch for files', async () => {
    const dir = await fsPromises.mkdtemp(join(os.tmpdir(), 'large-'));
    const filePath = join(dir, 'tmp.bin');
    await fsPromises.writeFile(filePath, Buffer.from([0x00]));
    const patchData = [
      { offset: 0n, previousValue: 0x00, newValue: 0xaa, byteLength: 1 }
    ];
    const opts = {
      forcePatch: false,
      unpatchMode: false,
      nullPatch: false,
      failOnUnexpectedPreviousValue: false,
      warnOnUnexpectedPreviousValue: false,
      skipWritePatch: false,
      allowOffsetOverflow: false,
      verifyPatch: true
    };
    const originalWrite = Buffer.prototype.writeUInt8;
    Buffer.prototype.writeUInt8 = function(value, offset) {
      return originalWrite.call(this, value ^ 0xff, offset);
    };
    try {
      await expect(BufferUtils.patchLargeFile({ filePath, patchData, options: opts })).rejects.toThrow('Failed to verify patch');
    } finally {
      Buffer.prototype.writeUInt8 = originalWrite;
      await fsPromises.rm(dir, { recursive: true, force: true });
    }
  });
});

describe('BufferUtils.truncateBuffer', () => {
  test('buffers larger than 200 bytes are truncated', () => {
    const buf = Buffer.alloc(250, 0xff);
    const truncated = BufferUtils.truncateBuffer({ buffer: buf });
    expect(truncated.length).toBe(200);
  });
});
