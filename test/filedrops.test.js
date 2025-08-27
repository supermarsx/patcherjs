import { jest } from '@jest/globals';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';
import { join } from 'path';

jest.unstable_mockModule('fs/promises', () => {
  const actual = jest.requireActual('fs/promises');
  return {
    ...actual,
    mkdir: jest.fn(async () => {})
  };
});

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

const logError = jest.fn();
const logSuccess = jest.fn();
jest.unstable_mockModule('../source/lib/auxiliary/logger.js', () => ({
  default: { logInfo: jest.fn(), logError, logSuccess }
}));

let Filedrops;
let Crypt;
let Packer;
let File;
let Fs;

beforeAll(async () => {
  Filedrops = (await import('../source/lib/filedrops/filedrops.ts')).Filedrops;
  Crypt = await import('../source/lib/filedrops/crypt.js');
  Packer = await import('../source/lib/filedrops/packer.js');
  File = await import('../source/lib/auxiliary/file.js');
  Fs = await import('fs/promises');
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

  test('disabled filedrops are skipped', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.filedrops = [
      { name: 'd', fileDropName: 'f.bin', packedFileName: 'f.pack', fileNamePath: 'out.bin', decryptKey: 'key', enabled: false }
    ];
    const opts = config.options.filedrops;
    opts.runFiledrops = true;
    opts.isFiledropPacked = true;
    opts.isFiledropCrypted = true;
    opts.backupFiles = false;
    await Filedrops.runFiledrops({ configuration: config });
    expect(Crypt.default.decryptFile).not.toHaveBeenCalled();
    expect(Packer.default.unpackFile).not.toHaveBeenCalled();
    expect(File.default.writeBinaryFile).not.toHaveBeenCalled();
    expect(File.default.readBinaryFile).not.toHaveBeenCalled();
    expect(File.default.backupFile).not.toHaveBeenCalled();
  });

  test('expands HOME variable in destination path', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    const dest = join(process.env.HOME, 'fd_home.bin');
    config.filedrops = [
      { name: 'd', fileDropName: 'f.bin', packedFileName: 'f.pack', fileNamePath: '${HOME}/fd_home.bin', decryptKey: '', enabled: true }
    ];
    const opts = config.options.filedrops;
    opts.runFiledrops = true;
    opts.isFiledropPacked = false;
    opts.isFiledropCrypted = false;
    opts.backupFiles = false;
    await Filedrops.runFiledrops({ configuration: config });
    expect(File.default.writeBinaryFile).toHaveBeenCalledWith({ filePath: dest, buffer: Buffer.from('binary') });
  });

  test('expands custom variable in destination path', async () => {
    const destDir = join(process.cwd(), 'filedrop_env');
    process.env.MY_DROP_PATH = destDir;
    const dest = join(destDir, 'fd_custom.bin');
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.filedrops = [
      { name: 'd', fileDropName: 'f.bin', packedFileName: 'f.pack', fileNamePath: '${MY_DROP_PATH}/fd_custom.bin', decryptKey: '', enabled: true }
    ];
    const opts = config.options.filedrops;
    opts.runFiledrops = true;
    opts.isFiledropPacked = false;
    opts.isFiledropCrypted = false;
    opts.backupFiles = false;
    await Filedrops.runFiledrops({ configuration: config });
    expect(File.default.writeBinaryFile).toHaveBeenCalledWith({ filePath: dest, buffer: Buffer.from('binary') });
    delete process.env.MY_DROP_PATH;
  });

  test('creates missing directories before backup and write', async () => {
    const destDir = join(process.cwd(), 'missing', 'dir');
    const dest = join(destDir, 'fd.bin');
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.filedrops = [
      { name: 'd', fileDropName: 'f.bin', packedFileName: 'f.pack', fileNamePath: dest, decryptKey: '', enabled: true }
    ];
    const opts = config.options.filedrops;
    opts.runFiledrops = true;
    opts.isFiledropPacked = false;
    opts.isFiledropCrypted = false;
    opts.backupFiles = true;
    await Filedrops.runFiledrops({ configuration: config });
    const order = [
      Fs.mkdir.mock.invocationCallOrder[0],
      File.default.backupFile.mock.invocationCallOrder[0],
      File.default.writeBinaryFile.mock.invocationCallOrder[0]
    ];
    expect(order).toEqual(order.slice().sort((a, b) => a - b));
    expect(Fs.mkdir).toHaveBeenCalledWith(destDir, { recursive: true });
    expect(File.default.writeBinaryFile).toHaveBeenCalledWith({ filePath: dest, buffer: Buffer.from('binary') });
  });

  test('sha256 mismatch aborts drop', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.filedrops = [
      {
        name: 'd',
        fileDropName: 'f.bin',
        packedFileName: 'f.pack',
        fileNamePath: 'out.bin',
        decryptKey: 'key',
        sha256: 'bad',
        enabled: true
      }
    ];
    const opts = config.options.filedrops;
    opts.runFiledrops = true;
    opts.isFiledropPacked = false;
    opts.isFiledropCrypted = false;
    opts.backupFiles = false;
    await Filedrops.runFiledrops({ configuration: config });
    expect(logError).toHaveBeenCalledWith('SHA256 mismatch for dropped file');
    expect(logSuccess).not.toHaveBeenCalled();
  });
});
