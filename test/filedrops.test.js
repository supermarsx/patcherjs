import { jest } from '@jest/globals';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';

jest.unstable_mockModule('../source/lib/filedrops/crypt.js', () => ({
  default: { decryptFile: jest.fn(async () => Buffer.from('decrypted')) }
}));

jest.unstable_mockModule('../source/lib/filedrops/packer.js', () => ({
  default: { unpackFile: jest.fn(async () => Buffer.from('unpacked')) }
}));

jest.unstable_mockModule('../source/lib/auxiliary/file.js', () => ({
  default: {
    backupFile: jest.fn(),
    readBinaryFile: jest.fn(async () => Buffer.from('binary')),
    writeBinaryFile: jest.fn(async () => {})
  }
}));

let Filedrops;
let Crypt;
let Packer;
let File;

beforeAll(async () => {
  Filedrops = (await import('../source/lib/filedrops/filedrops.ts')).Filedrops;
  Crypt = await import('../source/lib/filedrops/crypt.js');
  Packer = await import('../source/lib/filedrops/packer.js');
  File = await import('../source/lib/auxiliary/file.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Filedrops.runFiledrops', () => {
  test('decrypts, unpacks and writes files', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.filedrops = [
      { name: 'd', fileDropName: 'f.bin', packedFileName: 'f.pack', fileNamePath: 'out.bin', decryptKey: 'key', enabled: true }
    ];
    const opts = config.options.filedrops;
    opts.runFiledrops = true;
    opts.isFiledropPacked = true;
    opts.isFiledropCrypted = true;
    opts.backupFiles = false;
    await Filedrops.runFiledrops({ configuration: config });
    expect(Crypt.default.decryptFile).toHaveBeenCalledWith({ filePath: expect.stringContaining('patch_files'), key: 'key' });
    expect(Packer.default.unpackFile).toHaveBeenCalledWith({ buffer: Buffer.from('decrypted'), password: 'key' });
    expect(File.default.writeBinaryFile).toHaveBeenCalledWith({ filePath: 'out.bin', buffer: Buffer.from('unpacked') });
    expect(File.default.readBinaryFile).not.toHaveBeenCalled();
    expect(File.default.backupFile).not.toHaveBeenCalled();
  });
});
