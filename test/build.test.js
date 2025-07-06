import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { join } from 'path';
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
    mkdir: jest.fn(async () => {})
  };
});

jest.unstable_mockModule('node-7z', () => {
  const mockEmitter = () => { const e = new EventEmitter(); process.nextTick(() => e.emit('end')); return e; };
  return { default: { add: jest.fn(() => mockEmitter()) }, ZipStream: EventEmitter };
});

jest.unstable_mockModule('../source/lib/auxiliary/file.js', () => ({
  default: {
    readBinaryFile: jest.fn(async () => Buffer.from('buf')),
    writeBinaryFile: jest.fn(async () => {})
  }
}));

jest.unstable_mockModule('../source/lib/filedrops/packer.js', () => ({
  default: { packFile: jest.fn(async ({ buffer }) => Buffer.from('packed')) }
}));

jest.unstable_mockModule('../source/lib/filedrops/crypt.js', () => ({
  default: { encryptFile: jest.fn(async ({ buffer }) => Buffer.from('crypted')) }
}));

let Builder;
let Cleanup;
let Predist;
let Packaging;
let Command;
let Fs;
let Seven;
let File;
let Packer;
let Crypt;

beforeAll(async () => {
  Builder = (await import('../source/lib/build/builder.ts')).Builder;
  Cleanup = (await import('../source/lib/build/cleanup.ts')).Cleanup;
  Predist = (await import('../source/lib/build/predist.ts')).Predist;
  Packaging = (await import('../source/lib/build/packaging.ts')).Packaging;

  Command = await import('../source/lib/commands/command.js');
  Fs = await import('fs/promises');
  Seven = await import('node-7z');
  File = await import('../source/lib/auxiliary/file.js');
  Packer = await import('../source/lib/filedrops/packer.js');
  Crypt = await import('../source/lib/filedrops/crypt.js');
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
    await Predist.predistPackage();
    expect(Seven.default.add).toHaveBeenCalledWith(
      './sea/sea-archive.7z',
      './sea/predist/*',
      { method: Constants.PACKMETHOD, $bin: Constants.SEVENZIPBIN_FILEPATH }
    );
  });
});

describe('Packaging.runPackings', () => {
  test('runs packing and encryption in order', async () => {
    const config = ConfigurationDefaults.getDefaultConfigurationObject();
    config.filedrops = [
      { name: 'a', fileDropName: 'out1', packedFileName: 'p1', fileNamePath: 'f1', decryptKey: 'k1', enabled: true },
      { name: 'b', fileDropName: 'out2', packedFileName: 'p2', fileNamePath: 'f2', decryptKey: 'k2', enabled: true }
    ];
    await Packaging.runPackings({ configuration: config });

    const order = [
      File.default.readBinaryFile.mock.invocationCallOrder[0],
      Packer.default.packFile.mock.invocationCallOrder[0],
      Crypt.default.encryptFile.mock.invocationCallOrder[0],
      File.default.writeBinaryFile.mock.invocationCallOrder[0],
      File.default.readBinaryFile.mock.invocationCallOrder[1],
      Packer.default.packFile.mock.invocationCallOrder[1],
      Crypt.default.encryptFile.mock.invocationCallOrder[1],
      File.default.writeBinaryFile.mock.invocationCallOrder[1]
    ];
    expect(order).toEqual(order.slice().sort((a,b)=>a-b));

    expect(File.default.readBinaryFile).toHaveBeenNthCalledWith(1, { filePath: join(Constants.PATCHES_BASEUNPACKEDPATH, 'p1') });
    expect(Packer.default.packFile).toHaveBeenNthCalledWith(1, { buffer: expect.any(Buffer), password: 'k1' });
    expect(Crypt.default.encryptFile).toHaveBeenNthCalledWith(1, { buffer: expect.any(Buffer), key: 'k1' });
    expect(File.default.writeBinaryFile).toHaveBeenNthCalledWith(1, { filePath: join(Constants.PATCHES_BASEPATH, 'out1'), buffer: expect.any(Buffer) });
  });
});
