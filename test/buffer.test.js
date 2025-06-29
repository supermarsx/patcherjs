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
});

describe('BufferUtils.truncateBuffer', () => {
  test('buffers larger than 200 bytes are truncated', () => {
    const buf = Buffer.alloc(250, 0xff);
    const truncated = BufferUtils.truncateBuffer({ buffer: buf });
    expect(truncated.length).toBe(200);
  });
});
