import fs from 'fs';
import { join } from 'path';
import os from 'os';
import { jest } from '@jest/globals';
import { File } from '../source/lib/auxiliary/file.ts';
import Constants from '../source/lib/configuration/constants.ts';

describe('File utilities', () => {
  test('readPatchFile reads UTF-8 data', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'fileutil-'));
    const p = join(dir, 'test.patch');
    fs.writeFileSync(p, 'hello', 'utf-8');
    const data = await File.readPatchFile({ filePath: p });
    expect(data).toBe('hello');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('readPatchFile returns empty string on failure', async () => {
    const res = await File.readPatchFile({ filePath: '/no/such/file' });
    expect(res).toBe('');
  });

  test('writeBinaryFile writes buffers and returns byte count', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'fileutil-'));
    const p = join(dir, 'out.bin');
    const buf = Buffer.from([1, 2, 3]);
    const bytes = await File.writeBinaryFile({ filePath: p, buffer: buf });
    expect(bytes).toBe(3);
    const data = fs.readFileSync(p);
    expect(data.equals(buf)).toBe(true);
    expect(fs.existsSync(p)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('writeBinaryFile returns 0 on failure', async () => {
    const bytes = await File.writeBinaryFile({ filePath: '/no/path/out.bin', buffer: Buffer.from([1]) });
    expect(bytes).toBe(0);
  });

  test('backupFile creates a .bak file', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'fileutil-'));
    const p = join(dir, 'file.txt');
    fs.writeFileSync(p, 'data');
    await File.backupFile({ filePath: p });
    const bak = `${p}${Constants.PATCHES_BACKUPEXT}`;
    expect(fs.existsSync(bak)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('backupFile throws on failure', async () => {
    await expect(File.backupFile({ filePath: '/bad/path/file.txt' })).rejects.toThrow();
  });

  test('firstFilenameInFolder returns the first entry', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'fileutil-'));
    const a = join(dir, 'a.txt');
    const b = join(dir, 'b.txt');
    fs.writeFileSync(a, '');
    fs.writeFileSync(b, '');
    const first = await File.firstFilenameInFolder({ folderPath: dir });
    expect(first).toBe(a);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('firstFilenameInFolder rejects when directory is empty', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'fileutil-'));
    await expect(File.firstFilenameInFolder({ folderPath: dir })).rejects.toThrow();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('firstFilenameInFolder rejects on failure', async () => {
    await expect(File.firstFilenameInFolder({ folderPath: '/missing' })).rejects.toThrow();
  });
});

describe('File utilities failure mocks', () => {
  test('readPatchFile returns empty string when open fails', async () => {
    jest.resetModules();
    jest.unstable_mockModule('fs/promises', () => {
      const actual = jest.requireActual('fs/promises');
      return { ...actual, open: jest.fn(async () => { throw new Error('fail'); }) };
    });
    const { File: MockFile } = await import('../source/lib/auxiliary/file.ts');
    const res = await MockFile.readPatchFile({ filePath: 'any' });
    expect(res).toBe('');
  });

  test('writeBinaryFile returns 0 when open fails', async () => {
    jest.resetModules();
    jest.unstable_mockModule('fs/promises', () => {
      const actual = jest.requireActual('fs/promises');
      return { ...actual, open: jest.fn(async () => { throw new Error('fail'); }) };
    });
    const { File: MockFile } = await import('../source/lib/auxiliary/file.ts');
    const bytes = await MockFile.writeBinaryFile({ filePath: 'any', buffer: Buffer.from([1]) });
    expect(bytes).toBe(0);
  });

  test('readPatchFile closes handle when read fails', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'fileutil-'));
    const p = join(dir, 'file.txt');
    fs.writeFileSync(p, 'data');
    const mockClose = jest.fn(async () => {});
    jest.resetModules();
    jest.unstable_mockModule('fs/promises', () => {
      const actual = jest.requireActual('fs/promises');
      return {
        ...actual,
        open: jest.fn(async () => ({
          readFile: jest.fn(async () => { throw new Error('fail'); }),
          close: mockClose,
          stat: jest.fn(async () => ({ size: 5 }))
        }))
      };
    });
    const { File: MockFile } = await import('../source/lib/auxiliary/file.ts');
    const res = await MockFile.readPatchFile({ filePath: p });
    expect(res).toBe('');
    expect(mockClose).toHaveBeenCalled();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('readBinaryFile closes handle when read fails', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'fileutil-'));
    const p = join(dir, 'file.bin');
    fs.writeFileSync(p, 'data');
    const mockClose = jest.fn(async () => {});
    jest.resetModules();
    jest.unstable_mockModule('fs/promises', () => {
      const actual = jest.requireActual('fs/promises');
      return {
        ...actual,
        open: jest.fn(async () => ({
          read: jest.fn(async () => { throw new Error('fail'); }),
          close: mockClose,
          stat: jest.fn(async () => ({ size: 5 }))
        }))
      };
    });
    const { File: MockFile } = await import('../source/lib/auxiliary/file.ts');
    const buf = await MockFile.readBinaryFile({ filePath: p });
    expect(buf.length).toBe(0);
    expect(mockClose).toHaveBeenCalled();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('writeBinaryFile closes handle when write fails', async () => {
    const dir = fs.mkdtempSync(join(os.tmpdir(), 'fileutil-'));
    const p = join(dir, 'out.bin');
    fs.writeFileSync(p, '');
    const mockClose = jest.fn(async () => {});
    jest.resetModules();
    jest.unstable_mockModule('fs/promises', () => {
      const actual = jest.requireActual('fs/promises');
      return {
        ...actual,
        open: jest.fn(async () => ({
          write: jest.fn(async () => { throw new Error('fail'); }),
          close: mockClose,
          stat: jest.fn(async () => ({ size: 0 }))
        }))
      };
    });
    const { File: MockFile } = await import('../source/lib/auxiliary/file.ts');
    const bytes = await MockFile.writeBinaryFile({ filePath: p, buffer: Buffer.from([1]) });
    expect(bytes).toBe(0);
    expect(mockClose).toHaveBeenCalled();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('backupFile rejects when copyFile fails', async () => {
    jest.resetModules();
    jest.unstable_mockModule('fs/promises', () => {
      const actual = jest.requireActual('fs/promises');
      return { ...actual, copyFile: jest.fn(async () => { throw new Error('fail'); }) };
    });
    const { FileWrappers } = await import('../source/lib/auxiliary/file.wrappers.ts');
    await expect(FileWrappers.backupFile({ filePath: 'any' })).rejects.toThrow();
  });

  test('firstFilenameInFolder rejects when readdir fails', async () => {
    jest.resetModules();
    jest.unstable_mockModule('fs/promises', () => {
      const actual = jest.requireActual('fs/promises');
      return { ...actual, readdir: jest.fn(async () => { throw new Error('fail'); }) };
    });
    const { FileWrappers } = await import('../source/lib/auxiliary/file.wrappers.ts');
    await expect(FileWrappers.firstFilenameInFolder({ folderPath: 'dir' })).rejects.toThrow();
  });
});
