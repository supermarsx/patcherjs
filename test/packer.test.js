import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

jest.unstable_mockModule('../source/lib/auxiliary/file.js', () => ({
  default: {
    deleteFile: jest.fn(async () => {}),
    deleteFolder: jest.fn(async () => {}),
    firstFilenameInFolder: jest.fn(async () => '/tmp/temp-extracted/file.bin'),
    readBinaryFile: jest.fn(async () => Buffer.from('packed')),
    writeBinaryFile: jest.fn(async () => {})
  }
}));

jest.unstable_mockModule('tmp', () => ({
  default: { tmpNameSync: jest.fn(() => '/tmp/temp') }
}));

jest.unstable_mockModule('node-7z', () => {
  const mockEmitter = () => {
    const e = new EventEmitter();
    process.nextTick(() => e.emit('end'));
    return e;
  };
  return {
    default: {
      add: jest.fn(() => mockEmitter()),
      extractFull: jest.fn(() => mockEmitter())
    },
    ZipStream: EventEmitter
  };
});

let Packer;
let File;
let Seven;

beforeAll(async () => {
  Packer = (await import('../source/lib/filedrops/packer.ts')).Packer;
  File = await import('../source/lib/auxiliary/file.js');
  Seven = await import('node-7z');
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Packer.packFile', () => {
  test('packs buffer and cleans up', async () => {
    const buf = Buffer.from('data');
    const result = await Packer.packFile({ buffer: buf, password: 'pw', preserveSource: false });
    expect(File.default.writeBinaryFile).toHaveBeenCalledWith({ filePath: '/tmp/temp', buffer: buf });
    expect(Seven.default.add).toHaveBeenCalled();
    expect(File.default.deleteFile).toHaveBeenCalledWith({ filePath: '/tmp/temp.pack' });
    expect(File.default.deleteFile).toHaveBeenCalledWith({ filePath: '/tmp/temp' });
    expect(result).toEqual(Buffer.from('packed'));
  });

  test('removes temporary file even when preserveSource is true', async () => {
    const buf = Buffer.from('data');
    await Packer.packFile({ buffer: buf, password: 'pw' });
    expect(File.default.writeBinaryFile).toHaveBeenCalledWith({ filePath: '/tmp/temp', buffer: buf });
    expect(File.default.deleteFile).toHaveBeenCalledWith({ filePath: '/tmp/temp.pack' });
    expect(File.default.deleteFile).toHaveBeenCalledWith({ filePath: '/tmp/temp' });
  });
});

describe('Packer.unpackFile', () => {
  test('unpacks buffer archive and cleans up', async () => {
    File.default.readBinaryFile.mockResolvedValueOnce(Buffer.from('unpacked'));
    const buf = Buffer.from('archive');
    const result = await Packer.unpackFile({ buffer: buf, password: 'pw' });
    expect(File.default.writeBinaryFile).toHaveBeenCalledWith({ filePath: '/tmp/temp', buffer: buf });
    expect(Seven.default.extractFull).toHaveBeenCalled();
    expect(File.default.deleteFile).toHaveBeenCalledWith({ filePath: '/tmp/temp' });
    expect(File.default.deleteFolder).toHaveBeenCalledWith({ folderPath: '/tmp/temp-extracted' });
    expect(result).toEqual(Buffer.from('unpacked'));
  });
});
