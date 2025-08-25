import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { join } from 'path';
import { PassThrough } from 'stream';
import { ConfigurationDefaults } from '../source/lib/configuration/configuration.defaults.ts';
import Constants from '../source/lib/configuration/constants.ts';

jest.unstable_mockModule('../source/lib/commands/command.js', () => ({
  default: { runCommand: jest.fn(async () => {}) }
}));

jest.unstable_mockModule('fs/promises', () => {
  const actual = jest.requireActual('fs/promises');
  return {
    ...actual,
    rm: jest.fn(async () => {}),
    mkdir: jest.fn(async () => {}),
    open: jest.fn(async () => ({ write: jest.fn(async () => {}), close: jest.fn(async () => {}) }))
  };
});

jest.unstable_mockModule('stream/promises', () => ({
  pipeline: jest.fn(async () => {})
}));

let sevenEmitter;
jest.unstable_mockModule('node-7z', () => ({
  default: {
    add: jest.fn(() => {
      sevenEmitter = new EventEmitter();
      return sevenEmitter;
    })
  },
  ZipStream: EventEmitter
}));

jest.unstable_mockModule('../source/lib/auxiliary/file.js', () => ({
  default: {
    readBinaryFile: jest.fn(async () => Buffer.from('buf')),
    writeBinaryFile: jest.fn(async () => {}),
    createReadStream: jest.fn(() => new PassThrough()),
    createWriteStream: jest.fn(() => new PassThrough())
  }
}));

let Builder;
let Cleanup;
let Predist;
let Packaging;
let Command;
let Fs;
let Seven;
let File;

beforeAll(async () => {
  Builder = (await import('../source/lib/build/builder.ts')).Builder;
  Cleanup = (await import('../source/lib/build/cleanup.ts')).Cleanup;
  Predist = (await import('../source/lib/build/predist.ts')).Predist;
  Packaging = (await import('../source/lib/build/packaging.ts')).Packaging;

  Command = await import('../source/lib/commands/command.js');
  Fs = await import('fs/promises');
  Seven = await import('node-7z');
  File = await import('../source/lib/auxiliary/file.js');
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Builder.buildExecutable', () => {
  test('issues commands in sequence', async () => {
    const orig = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32' });
    await Builder.buildExecutable();
    Object.defineProperty(process, 'platform', { value: orig });

    expect(Command.default.runCommand).toHaveBeenNthCalledWith(1, {
      command: 'node',
      parameters: ['--experimental-sea-config', 'sea-config.json']
    });
    expect(Command.default.runCommand).toHaveBeenNthCalledWith(2, {
      command: 'node',
      parameters: ['-e', "require('fs').copyFileSync(process.execPath, './sea/predist/patcherjs.exe')"]
    });
    expect(Command.default.runCommand).toHaveBeenNthCalledWith(3, {
      command: 'signtool',
      parameters: ['remove', '/s', './sea/predist/patcherjs.exe']
    });
    expect(Command.default.runCommand).toHaveBeenNthCalledWith(4, {
      command: 'npx',
      parameters: [
        'postject',
        './sea/predist/patcherjs.exe',
        'NODE_SEA_BLOB',
        './sea/sea-prep.blob',
        '--sentinel-fuse',
        'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2'
      ]
    });
  });
});

describe('Cleanup.cleanupBuild', () => {
  test('deletes and recreates folders', async () => {
    await Cleanup.cleanupBuild();
    expect(Fs.rm).toHaveBeenNthCalledWith(1, join('sea','sea-prep.blob'), { force: true, recursive: false });
    expect(Fs.rm).toHaveBeenNthCalledWith(2, join('sea','sea-archive.7z'), { force: true, recursive: false });
    expect(Fs.rm).toHaveBeenNthCalledWith(3, join('sea','executable.js'), { force: true, recursive: false });
    expect(Fs.rm).toHaveBeenNthCalledWith(4, join('sea','predist'), { force: true, recursive: true });
    expect(Fs.mkdir).toHaveBeenNthCalledWith(1, join('sea','predist'), { recursive: true });
    expect(Fs.rm).toHaveBeenNthCalledWith(5, join('sea','dist'), { force: true, recursive: true });
    expect(Fs.mkdir).toHaveBeenNthCalledWith(2, join('sea','dist'), { recursive: true });
    expect(Fs.rm).toHaveBeenNthCalledWith(6, 'dist', { force: true, recursive: true });
    expect(Fs.mkdir).toHaveBeenNthCalledWith(3, 'dist', { recursive: true });
    expect(Fs.rm).toHaveBeenNthCalledWith(7, 'docs', { force: true, recursive: true });
    expect(Fs.mkdir).toHaveBeenNthCalledWith(4, 'docs', { recursive: true });
    expect(Fs.rm).toHaveBeenNthCalledWith(8, 'tsconfig.tsbuildinfo', { force: true, recursive: false });
  });
});

describe('Predist.predistPackage', () => {
  test('calls Seven.add with archive and options', async () => {
    const promise = Predist.predistPackage();
    process.nextTick(() => sevenEmitter.emit('end'));
    await promise;
    expect(Seven.default.add).toHaveBeenCalledWith(
      './sea/sea-archive.7z',
      './sea/predist/*',
      { method: Constants.PACKMETHOD, $bin: Constants.SEVENZIPBIN_FILEPATH }
    );
  });

  test('rejects when packaging fails', async () => {
    const promise = Predist.predistPackage();
    process.nextTick(() => sevenEmitter.emit('error', new Error('fail')));
    await expect(promise).rejects.toEqual(new Error('fail'));
  });
});

describe('Packaging.runPackings', () => {
  test('runs packing and encryption for enabled filedrops', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.options.filedrops.isFiledropPacked = false;
    config.options.filedrops.isFiledropCrypted = false;
    config.filedrops = [
      { name: 'a', fileDropName: 'out1', packedFileName: 'p1', fileNamePath: 'f1', decryptKey: 'k1', enabled: true },
      { name: 'b', fileDropName: 'out2', packedFileName: 'p2', fileNamePath: 'f2', decryptKey: 'k2', enabled: true }
    ];
    await Packaging.runPackings({ configuration: config });

    expect(File.default.createReadStream).toHaveBeenCalledWith({ filePath: join(Constants.PATCHES_BASEUNPACKEDPATH, 'p1') });
    expect(File.default.createReadStream).toHaveBeenCalledWith({ filePath: join(Constants.PATCHES_BASEUNPACKEDPATH, 'p2') });
    expect(File.default.createWriteStream).toHaveBeenCalledWith({ filePath: join(Constants.PATCHES_BASEPATH, 'out1') });
    expect(File.default.createWriteStream).toHaveBeenCalledWith({ filePath: join(Constants.PATCHES_BASEPATH, 'out2') });
  });

  test('disabled filedrops are skipped', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.filedrops = [
      { name: 'a', fileDropName: 'out', packedFileName: 'p', fileNamePath: 'f', decryptKey: 'k', enabled: false }
    ];

    await Packaging.runPackings({ configuration: config });

    expect(File.default.createReadStream).not.toHaveBeenCalled();
    expect(File.default.createWriteStream).not.toHaveBeenCalled();
  });
});
