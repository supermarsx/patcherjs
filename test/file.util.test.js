import fs from 'fs';
import { join } from 'path';
import os from 'os';
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
    fs.writeFileSync(p, '');
    const buf = Buffer.from([1, 2, 3]);
    const bytes = await File.writeBinaryFile({ filePath: p, buffer: buf });
    expect(bytes).toBe(3);
    const data = fs.readFileSync(p);
    expect(data.equals(buf)).toBe(true);
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

  test('firstFilenameInFolder rejects on failure', async () => {
    await expect(File.firstFilenameInFolder({ folderPath: '/missing' })).rejects.toThrow();
  });
});
