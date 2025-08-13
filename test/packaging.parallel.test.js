import { jest } from '@jest/globals';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';

const readResolvers = [];

jest.unstable_mockModule('../source/lib/auxiliary/file.js', () => ({
  default: {
    readBinaryFile: jest.fn(() => new Promise(resolve => readResolvers.push(resolve))),
    writeBinaryFile: jest.fn(async () => {})
  }
}));

jest.unstable_mockModule('../source/lib/filedrops/packer.js', () => ({
  default: { packFile: jest.fn(async ({ buffer }) => buffer) }
}));

jest.unstable_mockModule('../source/lib/filedrops/crypt.js', () => ({
  default: { encryptFile: jest.fn(async ({ buffer }) => buffer) }
}));

let Packaging;
let File;
let Packer;
let Crypt;

beforeAll(async () => {
  Packaging = (await import('../source/lib/build/packaging.ts')).Packaging;
  File = await import('../source/lib/auxiliary/file.js');
  Packer = await import('../source/lib/filedrops/packer.js');
  Crypt = await import('../source/lib/filedrops/crypt.js');
});

beforeEach(() => {
  jest.clearAllMocks();
  readResolvers.length = 0;
});

describe('Packaging.runPackings parallel execution', () => {
  test('processes filedrops concurrently', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.filedrops = [
      { name: 'a', fileDropName: 'out1', packedFileName: 'p1', fileNamePath: 'f1', decryptKey: 'k1', enabled: true },
      { name: 'b', fileDropName: 'out2', packedFileName: 'p2', fileNamePath: 'f2', decryptKey: 'k2', enabled: true }
    ];

    const promise = Packaging.runPackings({ configuration: config });

    expect(File.default.readBinaryFile).toHaveBeenCalledTimes(2);
    expect(Packer.default.packFile).not.toHaveBeenCalled();
    expect(Crypt.default.encryptFile).not.toHaveBeenCalled();
    expect(File.default.writeBinaryFile).not.toHaveBeenCalled();

    readResolvers.forEach(resolve => resolve(Buffer.from('data')));
    await promise;

    expect(Packer.default.packFile).toHaveBeenCalledTimes(2);
    expect(Crypt.default.encryptFile).toHaveBeenCalledTimes(2);
    expect(File.default.writeBinaryFile).toHaveBeenCalledTimes(2);
  });
});

