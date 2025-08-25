import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { PassThrough, Writable } from 'stream';

jest.unstable_mockModule('../source/lib/auxiliary/file.js', () => ({
  default: {
    deleteFile: jest.fn(async () => {}),
    deleteFolder: jest.fn(async () => {}),
    firstFilenameInFolder: jest.fn(async () => '/tmp/temp-extracted/file.bin'),
    readBinaryFile: jest.fn(async () => Buffer.from('packed')),
    writeBinaryFile: jest.fn(async () => {}),
    createReadStream: jest.fn(() => new PassThrough()),
    createWriteStream: jest.fn(() => new PassThrough())
  }
}));

jest.unstable_mockModule('fs/promises', async () => {
  const actual = await jest.requireActual('fs/promises');
  return {
    ...actual,
    open: jest.fn(async () => ({
      write: jest.fn(async () => {}),
      close: jest.fn(async () => {})
    }))
  };
});

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
let Packaging;

beforeAll(async () => {
  Packer = (await import('../source/lib/filedrops/packer.ts')).Packer;
  Packaging = (await import('../source/lib/build/packaging.ts')).Packaging;
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

describe('Packaging.runPackings large file handling', () => {
  test('processes large files using streams without high memory usage', async () => {
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    const CHUNKS = 20; // simulate 20MB file
    File.default.createReadStream.mockImplementation(() => {
      const stream = new PassThrough();
      let pushed = 0;
      const pushData = () => {
        if (pushed >= CHUNKS) {
          stream.end();
          return;
        }
        pushed++;
        stream.write(Buffer.alloc(CHUNK_SIZE));
        setImmediate(pushData);
      };
      setImmediate(pushData);
      return stream;
    });
    File.default.createWriteStream.mockImplementation(() => new Writable({ write(_c, _e, cb) { cb(); } }));

    const configuration = {
      options: { filedrops: { runFiledrops: true, isFiledropPacked: true, isFiledropCrypted: true } },
      filedrops: [
        { enabled: true, decryptKey: 'pw', fileNamePath: 'large.bin', packedFileName: 'large.bin', fileDropName: 'large.drop' }
      ]
    };

    const start = process.memoryUsage().heapUsed;
    await Packaging.runPackings({ configuration });
    const end = process.memoryUsage().heapUsed;

    expect(File.default.createReadStream).toHaveBeenCalled();
    expect(File.default.createWriteStream).toHaveBeenCalled();
    expect(end - start).toBeLessThan(50 * 1024 * 1024);
  });
});
