import { jest } from '@jest/globals';
import { randomBytes } from 'crypto';

jest.unstable_mockModule('../source/lib/auxiliary/file.js', () => ({
  default: {
    readBinaryFile: jest.fn(async () => Buffer.from('file')), // used when encryptFile uses filePath
    writeBinaryFile: jest.fn()
  }
}));

let Crypt;
let File;

beforeAll(async () => {
  Crypt = (await import('../source/lib/filedrops/crypt.ts')).Encryption;
  File = await import('../source/lib/auxiliary/file.js');
});

beforeEach(() => {
  jest.clearAllMocks();
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

  test('uses file input when encrypting', async () => {
    const key = 'pw';
    await Crypt.encryptFile({ filePath: 'a.bin', key });
    expect(File.default.readBinaryFile).toHaveBeenCalledWith({ filePath: 'a.bin' });
  });

  test('uses file input when decrypting', async () => {
    const key = 'pw';
    await Crypt.decryptFile({ filePath: 'b.bin', key });
    expect(File.default.readBinaryFile).toHaveBeenCalledWith({ filePath: 'b.bin' });
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
