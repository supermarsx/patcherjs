import { Parser } from '../source/lib/patches/parser.ts';
import fs from 'fs';
import { join } from 'path';

const patchDir = join('patch_files');
const largePatchPath = join(patchDir, 'large.patch');

// Utility to create large patch file without holding full contents in memory
function createLargePatchFile(lines) {
  fs.mkdirSync(patchDir, { recursive: true });
  const stream = fs.createWriteStream(largePatchPath);
  for (let i = 0; i < lines; i++) {
    const line = `${i.toString(16).padStart(8, '0')}: 00 01\n`;
    stream.write(line);
  }
  return new Promise(resolve => stream.end(resolve));
}

describe('Parser.parsePatchFile streaming parsing', () => {
  test('handles comments and empty lines identically to parsePatchFile', async () => {
    const data = [
      '',
      '# comment',
      '',
      '00000000: 00 01',
      '',
      '// another comment',
      '',
      '00000001: 02 03',
      '; trailing comment',
      '',
    ].join('\n');
    fs.mkdirSync(patchDir, { recursive: true });
    const filePath = join(patchDir, 'stream-temp.patch');
    fs.writeFileSync(filePath, data);
    const streamPatches = await Parser.parsePatchFile({ filePath, useStream: true });
    const filePatches = await Parser.parsePatchFile({ fileData: data });
    fs.unlinkSync(filePath);
    expect(streamPatches).toEqual(filePatches);
  });
});

describe('Parser.parsePatchFile streaming memory usage', () => {
  const lines = 500000; // ~10MB file

  beforeAll(async () => {
    await createLargePatchFile(lines);
    global.gc?.();
  });

  afterAll(() => {
    fs.rmSync(largePatchPath, { force: true });
  });

  test('streaming parser uses less memory than non-streaming', async () => {
    const beforeStream = process.memoryUsage().heapUsed;
    const streamPatches = await Parser.parsePatchFile({ filePath: largePatchPath, useStream: true });
    expect(streamPatches.length).toBe(lines);
    const streamUsage = process.memoryUsage().heapUsed - beforeStream;

    global.gc?.();
    const fileData = fs.readFileSync(largePatchPath, 'utf-8');
    const before = process.memoryUsage().heapUsed;
    const patches = await Parser.parsePatchFile({ fileData });
    expect(patches.length).toBe(lines);
    const nonStreamUsage = process.memoryUsage().heapUsed - before;

    expect(streamUsage).toBeLessThan(nonStreamUsage);
  });
});
