import { jest } from '@jest/globals';

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

  test('uses file input when encrypting', async () => {
    const key = 'pw';
    await Crypt.encryptFile({ filePath: 'a.bin', key });
    expect(File.default.readBinaryFile).toHaveBeenCalledWith({ filePath: 'a.bin' });
  });
});
