import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

let Crypt;

beforeAll(async () => {
  ({ Encryption: Crypt } = await import('../source/lib/filedrops/crypt.ts'));
});

describe('Encryption.encryptFile and decryptFile', () => {
  test('roundtrips buffer data', async () => {
    const data = Buffer.from('secret');
    const key = 'pass';
    const encrypted = await Crypt.encryptFile({ buffer: data, key });
    const decrypted = await Crypt.decryptFile({ buffer: encrypted, key });
    expect(decrypted.equals(data)).toBe(true);
  });

  test('roundtrips binary data', async () => {
    const data = randomBytes(256);
    const key = 'bin';
    const encrypted = await Crypt.encryptFile({ buffer: data, key });
    const decrypted = await Crypt.decryptFile({ buffer: encrypted, key });
    expect(decrypted.equals(data)).toBe(true);
  });

  test('roundtrips file data', async () => {
    const data = randomBytes(512);
    const key = 'pw';
    const filePath = path.join(os.tmpdir(), 'crypt-file.bin');
    await fs.writeFile(filePath, data);
    const encrypted = await Crypt.encryptFile({ filePath, key });
    const decrypted = await Crypt.decryptFile({ buffer: encrypted, key });
    expect(decrypted.equals(data)).toBe(true);
    await fs.unlink(filePath);
  });
});

describe('getSlicedData', () => {
  test('slices with explicit bytes', () => {
    const buffer = Buffer.from('hello world');
    const result = Crypt.getSlicedData({
      data: buffer,
      subsetOptions: { offset: 0, bytes: 5 }
    });
    expect(result.toString()).toBe('hello');
  });

  test('slices to end when bytes omitted', () => {
    const buffer = Buffer.from('hello world');
    const result = Crypt.getSlicedData({
      data: buffer,
      subsetOptions: { offset: 6 }
    });
    expect(result.toString()).toBe('world');
  });
});

describe('large file encryption', () => {
  test('processes large files with stable memory usage', async () => {
    const size = 20 * 1024 * 1024; // 20MB
    const key = 'big';
    const filePath = path.join(os.tmpdir(), 'crypt-large.bin');
    await fs.writeFile(filePath, randomBytes(size));

    const start = process.memoryUsage().heapUsed;
    const encrypted = await Crypt.encryptFile({ filePath, key });
    const after = process.memoryUsage().heapUsed;
    const decrypted = await Crypt.decryptFile({ buffer: encrypted, key });

    expect(decrypted.length).toBe(size);
    expect(after - start).toBeLessThan(size * 1.5);

    await fs.unlink(filePath);
  }, 30_000);
});

