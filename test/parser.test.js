import { Parser, ParserWrappers } from '../source/lib/patches/parser.ts';
import fs from 'fs';
import { join } from 'path';

const patchDir = join('patch_files');

describe('Parser.parsePatchFile', () => {
  test('parses patch data into objects', async () => {
    const data = '00000000: 00 01\n00000001: 02 03';
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches).toEqual([
      { offset: 0x00000000n, previousValue: 0x00, newValue: 0x01, byteLength: 1 },
      { offset: 0x00000001n, previousValue: 0x02, newValue: 0x03, byteLength: 1 }
    ]);
  });

  test('parses 64-bit offsets', async () => {
    const data = '100000000: 00 01';
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches[0].offset).toBe(0x100000000n);
    expect(patches[0].byteLength).toBe(1);
  });

  test('parses variable-length values', async () => {
    const data = [
      '00000000: 0001 0002',
      '00000002: 00000003 00000004',
      '00000006: 0000000000000005 0000000000000006'
    ].join('\n');
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches).toEqual([
      { offset: 0x0n, previousValue: 0x0001, newValue: 0x0002, byteLength: 2 },
      { offset: 0x2n, previousValue: 0x00000003, newValue: 0x00000004, byteLength: 4 },
      { offset: 0x6n, previousValue: 0x0000000000000005n, newValue: 0x0000000000000006n, byteLength: 8 }
    ]);
  });

  test('trailing newline does not produce extra patch', async () => {
    const data = '00000000: 00 01\n';
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches).toEqual([
      { offset: 0x00000000n, previousValue: 0x00, newValue: 0x01, byteLength: 1 }
    ]);
  });

  test('handles multiple spaces after colon', async () => {
    const data = '00000000:   00 01';
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches).toEqual([
      { offset: 0x00000000n, previousValue: 0x00, newValue: 0x01, byteLength: 1 }
    ]);
  });

  test('handles tab after colon', async () => {
    const data = '00000001:\t02 03';
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches).toEqual([
      { offset: 0x00000001n, previousValue: 0x02, newValue: 0x03, byteLength: 1 }
    ]);
  });

  test('skips comment lines', async () => {
    const data = [
      '# comment',
      '// another comment',
      '; yet another comment',
      '00000000: 00 01',
      '00000001: 02 03'
    ].join('\n');
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches).toEqual([
      { offset: 0x00000000n, previousValue: 0x00, newValue: 0x01, byteLength: 1 },
      { offset: 0x00000001n, previousValue: 0x02, newValue: 0x03, byteLength: 1 }
    ]);
  });

  test('returns empty array for unsupported patch size', async () => {
    const data = '00000000: 000 01';
    const patches = await Parser.parsePatchFile({ fileData: data });
    expect(patches).toEqual([]);
  });

  test('parses comments and empty lines identically to streaming parser', async () => {
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
    const patches = await Parser.parsePatchFile({ fileData: data });
    fs.mkdirSync(patchDir, { recursive: true });
    const filePath = join(patchDir, 'temp.patch');
    fs.writeFileSync(filePath, data);
    const streamPatches = await Parser.parsePatchFile({ filePath, useStream: true });
    fs.unlinkSync(filePath);
    expect(streamPatches).toEqual(patches);
  });
});

describe('ParserWrappers.hexParse', () => {
  test('returns 0 for invalid hex strings', () => {
    const value = ParserWrappers.hexParse({ hexString: 'g1' });
    expect(value).toBe(0);
  });
});
