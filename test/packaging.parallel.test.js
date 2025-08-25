import { jest } from '@jest/globals';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';
import { PassThrough } from 'stream';

const pipelineResolvers = [];

jest.unstable_mockModule('stream/promises', () => ({
  pipeline: jest.fn(() => new Promise(resolve => pipelineResolvers.push(resolve)))
}));

jest.unstable_mockModule('fs/promises', () => {
  const actual = jest.requireActual('fs/promises');
  return {
    ...actual,
    open: jest.fn(async () => ({ write: jest.fn(async () => {}), close: jest.fn(async () => {}) }))
  };
});

jest.unstable_mockModule('../source/lib/auxiliary/file.js', () => ({
  default: {
    createReadStream: jest.fn(() => new PassThrough()),
    createWriteStream: jest.fn(() => new PassThrough())
  }
}));

let Packaging;
let File;

beforeAll(async () => {
  Packaging = (await import('../source/lib/build/packaging.ts')).Packaging;
  File = await import('../source/lib/auxiliary/file.js');
});

beforeEach(() => {
  jest.clearAllMocks();
  pipelineResolvers.length = 0;
});

describe('Packaging.runPackings parallel execution', () => {
  test('processes filedrops concurrently', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.options.filedrops.isFiledropPacked = false;
    config.options.filedrops.isFiledropCrypted = false;
    config.filedrops = [
      { name: 'a', fileDropName: 'out1', packedFileName: 'p1', fileNamePath: 'f1', decryptKey: 'k1', enabled: true },
      { name: 'b', fileDropName: 'out2', packedFileName: 'p2', fileNamePath: 'f2', decryptKey: 'k2', enabled: true }
    ];

    const promise = Packaging.runPackings({ configuration: config });

    expect(File.default.createReadStream).toHaveBeenCalledTimes(2);
    expect(File.default.createWriteStream).toHaveBeenCalledTimes(2);

    pipelineResolvers.forEach(resolve => resolve());
    await promise;

    expect(File.default.createWriteStream).toHaveBeenCalledTimes(2);
  });
});

